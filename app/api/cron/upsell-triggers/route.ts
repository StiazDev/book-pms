import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const EXCLUDED_AUDIOBOOK_GENRES = ["Children", "Picture Book"];

async function upsellExists(projectId: string, type: string): Promise<boolean> {
    const snap = await adminDb
        .collection("upsellOpportunities")
        .where("projectId", "==", projectId)
        .where("type", "==", type)
        .get();
    return !snap.empty;
}

async function createUpsell(projectId: string, type: string, project: any, author: any) {
    await adminDb.collection("upsellOpportunities").add({
        projectId,
        authorId: project.authorId || null,
        authorName: author?.name || "Unknown",
        projectTitle: project.title || "Unknown",
        type,
        status: "pending",
        assignedUpsellerId: project.assignedPMId || null,
        assignedUpsellerName: project.assignedPMName || "Unassigned",
        triggeredAt: FieldValue.serverTimestamp(),
        triggeredByRule: true,
    });
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let created = 0;

    try {
        const projectsSnap = await adminDb
            .collection("projects")
            .where("status", "==", "active")
            .get();

        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        for (const projectDoc of projectsSnap.docs) {
            const project = projectDoc.data();
            const projectId = projectDoc.id;

            // Fetch linked author
            let author: any = null;
            if (project.authorId) {
                const authorSnap = await adminDb.collection("authors").doc(project.authorId).get();
                if (authorSnap.exists) author = authorSnap.data();
            }

            // ── Rule 1: Audiobook Trigger ──────────────────────────────────
            const genre = author?.genre || "";
            const wordCount = author?.wordCount || 0;
            if (
                wordCount > 50000 &&
                !EXCLUDED_AUDIOBOOK_GENRES.includes(genre) &&
                !(await upsellExists(projectId, "audiobook"))
            ) {
                await createUpsell(projectId, "audiobook", project, author);
                created++;
            }

            // ── Rule 2: Marketing Package Trigger ─────────────────────────
            const expectedEndDate = project.expectedEndDate
                ? new Date(project.expectedEndDate)
                : null;
            if (
                expectedEndDate &&
                expectedEndDate <= in30Days &&
                expectedEndDate > now &&
                !(await upsellExists(projectId, "marketing-package"))
            ) {
                await createUpsell(projectId, "marketing-package", project, author);
                created++;
            }

            // ── Rule 3: Cover Upgrade Trigger ─────────────────────────────
            const upsellTags: string[] = project.upsellTags || [];
            if (
                upsellTags.some(tag => ["marketing", "social-media"].includes(tag)) &&
                !(await upsellExists(projectId, "cover-upgrade"))
            ) {
                await createUpsell(projectId, "cover-upgrade", project, author);
                created++;
            }
        }

        return NextResponse.json({ ok: true, upsellsCreated: created });
    } catch (err: any) {
        console.error("Upsell triggers cron failed:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
