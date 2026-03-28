import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { renderToBuffer } from "@react-pdf/renderer";
import { StatusReportPDF } from "@/lib/pdf/status-report";
import React from "react";

export async function POST(req: NextRequest) {
    try {
        const { projectId } = await req.json();
        if (!projectId) {
            return NextResponse.json({ error: "projectId is required" }, { status: 400 });
        }

        // 1. Fetch project
        const projectSnap = await adminDb.collection("projects").doc(projectId).get();
        if (!projectSnap.exists) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }
        const project = { id: projectSnap.id, ...projectSnap.data() };

        // 2. Fetch author
        let author: any = null;
        if ((project as any).authorId) {
            const authorSnap = await adminDb.collection("authors").doc((project as any).authorId).get();
            if (authorSnap.exists) author = authorSnap.data();
        }

        // 3. Fetch stages (sorted by order)
        const stagesSnap = await adminDb
            .collection("projects").doc(projectId)
            .collection("stages")
            .orderBy("order")
            .get();
        const stages = stagesSnap.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                completedAt: data.completedAt?.toDate?.()?.toISOString() ?? null,
            };
        });

        // 4. Fetch milestones
        const msSnap = await adminDb
            .collection("projects").doc(projectId)
            .collection("milestones")
            .get();
        const milestones = msSnap.docs.map(d => d.data());

        // 5. Fetch last 3 communications (sorted by sentAt desc)
        const commsSnap = await adminDb
            .collection("projects").doc(projectId)
            .collection("communications")
            .orderBy("sentAt", "desc")
            .limit(3)
            .get();
        const communications = commsSnap.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                sentAt: data.sentAt?.toDate?.()?.toISOString() ?? null,
            };
        });

        // 6. Generate PDF buffer
        const buffer = await renderToBuffer(
            React.createElement(StatusReportPDF, {
                project,
                author,
                stages,
                milestones,
                communications,
            })
        );

        // 7. Return PDF
        const filename = `status-report-${(project as any).title?.replace(/\s+/g, "-") || projectId}.pdf`;

        // Return PDF as Uint8Array (valid BodyInit)
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": buffer.length.toString(),
            },
        });
    } catch (err: any) {
        console.error("PDF generation error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
