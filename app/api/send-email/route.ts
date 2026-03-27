import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
    try {
        const { subject, body, projectId, overrideSmtpConfigId } = await req.json();

        if (!subject || !body || !projectId) {
            return NextResponse.json({ error: "Missing required fields: subject, body, or projectId" }, { status: 400 });
        }

        // 1. Fetch project to extract authorId and smtpConfigId
        const projectSnap = await adminDb.collection("projects").doc(projectId).get();
        if (!projectSnap.exists) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const projectData = projectSnap.data();
        const authorId = projectData?.authorId;
        const smtpConfigId = overrideSmtpConfigId || projectData?.smtpConfigId;

        if (!authorId || !smtpConfigId) {
            return NextResponse.json({ error: "Linked Project is missing a defined authorId or smtpConfigId" }, { status: 400 });
        }

        // 2. Fetch Author payload mapping the destination Email
        const authorSnap = await adminDb.collection("authors").doc(authorId).get();
        if (!authorSnap.exists) {
            return NextResponse.json({ error: "Author not found" }, { status: 404 });
        }
        const authorEmail = authorSnap.data()?.email;

        if (!authorEmail) {
            return NextResponse.json({ error: "Author does not possess a valid email address representation" }, { status: 400 });
        }

        // 3. Fetch specific active SMTP Configurations dynamically
        const smtpSnap = await adminDb.collection("smtpConfigs").doc(smtpConfigId).get();
        if (!smtpSnap.exists) {
            return NextResponse.json({ error: "SMTP Configuration properties not found" }, { status: 404 });
        }
        const smtpData = smtpSnap.data();

        // 4. Secure Nodemailer Transport construction
        const transporter = nodemailer.createTransport({
            host: smtpData?.host,
            port: Number(smtpData?.port) || 587,
            secure: Number(smtpData?.port) === 465,
            auth: {
                user: smtpData?.username,
                pass: smtpData?.password,
            },
        });

        // 5. Payload dispatching logic
        const mailOptions = {
            from: `"${smtpData?.fromName}" <${smtpData?.fromEmail}>`,
            to: authorEmail,
            subject: subject,
            text: body,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Critical error dispatching API Nodemailer email route:", error);
        return NextResponse.json({ error: error.message || "Failed to dispatch email securely" }, { status: 500 });
    }
}
