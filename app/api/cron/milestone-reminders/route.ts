import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import nodemailer from "nodemailer";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
    // Protect the route with CRON_SECRET
    const authHeader = req.headers.get("authorization");
    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;
    if (authHeader !== expectedSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    let emailsSent = 0;
    let errors: string[] = [];

    try {
        // 1. Fetch all active projects
        const projectsSnap = await adminDb
            .collection("projects")
            .where("status", "==", "active")
            .get();

        for (const projectDoc of projectsSnap.docs) {
            const project = projectDoc.data();

            // 2. Fetch upcoming milestones for this project
            const milestonesSnap = await adminDb
                .collection("projects")
                .doc(projectDoc.id)
                .collection("milestones")
                .where("status", "==", "upcoming")
                .get();

            for (const milestoneDoc of milestonesSnap.docs) {
                const milestone = milestoneDoc.data();

                if (!milestone.dueDate) continue;

                const dueDate = new Date(milestone.dueDate);
                const remindersSent: string[] = milestone.remindersSent || [];

                // Determine which reminder window we're in
                let reminderKey: "24h" | "48h" | null = null;

                if (dueDate <= in24h && dueDate > now && !remindersSent.includes("24h")) {
                    reminderKey = "24h";
                } else if (dueDate <= in48h && dueDate > now && !remindersSent.includes("48h")) {
                    reminderKey = "48h";
                }

                if (!reminderKey) continue;

                try {
                    // 3. Fetch author email
                    if (!project.authorId) continue;
                    const authorSnap = await adminDb.collection("authors").doc(project.authorId).get();
                    if (!authorSnap.exists) continue;
                    const authorEmail = authorSnap.data()?.email;
                    if (!authorEmail) continue;

                    // 4. Fetch SMTP config
                    if (!project.smtpConfigId) continue;
                    const smtpSnap = await adminDb.collection("smtpConfigs").doc(project.smtpConfigId).get();
                    if (!smtpSnap.exists) continue;
                    const smtp = smtpSnap.data();

                    // 5. Send email
                    const transporter = nodemailer.createTransport({
                        host: smtp?.host,
                        port: Number(smtp?.port) || 587,
                        secure: Number(smtp?.port) === 465,
                        auth: { user: smtp?.username, pass: smtp?.password },
                    });

                    const subject = `Reminder: "${milestone.title}" is due in ${reminderKey}`;
                    const body = `Hi,\n\nThis is a reminder that the milestone "${milestone.title}" for the project "${project.title}" is due on ${dueDate.toLocaleDateString()}.\n\nPlease make sure everything is on track!\n\nBookPMS Team`;

                    await transporter.sendMail({
                        from: `"${smtp?.fromName}" <${smtp?.fromEmail}>`,
                        to: authorEmail,
                        subject,
                        text: body,
                    });

                    // 6. Mark reminder as sent
                    await adminDb
                        .collection("projects")
                        .doc(projectDoc.id)
                        .collection("milestones")
                        .doc(milestoneDoc.id)
                        .update({
                            remindersSent: FieldValue.arrayUnion(reminderKey),
                        });

                    emailsSent++;
                } catch (err: any) {
                    console.error(`Error sending reminder for milestone ${milestoneDoc.id}:`, err.message);
                    errors.push(`${milestone.title}: ${err.message}`);
                }
            }
        }

        return NextResponse.json({
            ok: true,
            emailsSent,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err: any) {
        console.error("Cron job failed:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
