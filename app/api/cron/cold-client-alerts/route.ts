import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
    // Protect the route with CRON_SECRET
    const authHeader = req.headers.get("authorization");
    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;
    if (authHeader !== expectedSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let notificationsCreated = 0;

    try {
        // 1. Fetch all active projects
        const projectsSnap = await adminDb
            .collection("projects")
            .where("status", "==", "active")
            .get();

        for (const projectDoc of projectsSnap.docs) {
            const project = projectDoc.data();

            // 2. Parse lastContactedAt
            let lastContactedAt: Date | null = null;

            if (project.lastContactedAt?.toDate) {
                // Firestore Timestamp
                lastContactedAt = project.lastContactedAt.toDate();
            } else if (project.lastContactedAt) {
                lastContactedAt = new Date(project.lastContactedAt);
            }

            // 3. Check if last contact was more than 14 days ago
            if (!lastContactedAt || lastContactedAt > fourteenDaysAgo) {
                continue;
            }

            // 4. Avoid duplicate notifications — check if one already exists for this project
            const existingSnap = await adminDb
                .collection("notifications")
                .where("projectId", "==", projectDoc.id)
                .where("type", "==", "cold-client")
                .where("read", "==", false)
                .get();

            if (!existingSnap.empty) continue;

            // 5. Create the notification
            await adminDb.collection("notifications").add({
                type: "cold-client",
                projectId: projectDoc.id,
                authorId: project.authorId || null,
                assignedPmId: project.assignedPMId || null,
                message: `No contact with ${project.authorName || "the author"} in 14+ days`,
                createdAt: FieldValue.serverTimestamp(),
                read: false,
            });

            notificationsCreated++;
        }

        return NextResponse.json({ ok: true, notificationsCreated });
    } catch (err: any) {
        console.error("Cold client cron failed:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
