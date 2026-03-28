import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { google } from "googleapis";
import { FieldValue } from "firebase-admin/firestore";

const TRIGGER_KEYWORDS = ["approved", "attached", "finished", "completed", "done", "final", "ready", "signed"];

function buildOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );
}

async function decodeEmailBody(payload: any): Promise<string> {
    const parts = payload?.parts || [];
    let body = "";

    if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, "base64url").toString("utf-8");
    }

    for (const part of parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
            body += Buffer.from(part.body.data, "base64url").toString("utf-8");
        }
    }

    return body;
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let scanned = 0;
    let notificationsCreated = 0;

    try {
        // 1. Fetch all PM and admin users with stored tokens
        const usersSnap = await adminDb.collection("users").get();
        const pmUsers = usersSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((u: any) => (u.role === "pm" || u.role === "admin") && u.accessToken);

        const now = new Date();
        const since = Math.floor((now.getTime() - 24 * 60 * 60 * 1000) / 1000);

        for (const user of pmUsers as any[]) {
            try {
                // 2. Set up OAuth2 client with stored tokens
                const oauth2Client = buildOAuth2Client();
                oauth2Client.setCredentials({
                    access_token: user.accessToken,
                    refresh_token: user.refreshToken,
                });

                // Auto-refresh handling
                oauth2Client.on("tokens", async (tokens) => {
                    if (tokens.access_token) {
                        await adminDb.collection("users").doc(user.id).update({
                            accessToken: tokens.access_token,
                        });
                    }
                });

                const gmail = google.gmail({ version: "v1", auth: oauth2Client });

                // 3. Fetch last 10 unread emails from past 24h
                const listRes = await gmail.users.messages.list({
                    userId: "me",
                    maxResults: 10,
                    q: `is:unread after:${since}`,
                });

                const messages = listRes.data.messages || [];

                for (const msg of messages) {
                    const msgRes = await gmail.users.messages.get({
                        userId: "me",
                        id: msg.id!,
                        format: "full",
                    });

                    const headers = msgRes.data.payload?.headers || [];
                    const subjectHeader = headers.find((h: any) => h.name === "Subject");
                    const fromHeader = headers.find((h: any) => h.name === "From");

                    const subject = subjectHeader?.value || "";
                    const from = fromHeader?.value || "";
                    const body = await decodeEmailBody(msgRes.data.payload);

                    const combined = `${subject} ${body}`.toLowerCase();

                    // 4. Check for trigger keywords
                    const hasKeyword = TRIGGER_KEYWORDS.some(kw => combined.includes(kw));
                    if (!hasKeyword) continue;

                    // 5. Extract sender email address
                    const senderEmailMatch = from.match(/<(.+?)>/);
                    const senderEmail = senderEmailMatch ? senderEmailMatch[1] : from.trim();

                    // 6. Match sender against authors collection
                    const authorSnap = await adminDb
                        .collection("authors")
                        .where("email", "==", senderEmail)
                        .get();

                    if (authorSnap.empty) continue;

                    const authorDoc = authorSnap.docs[0];
                    const authorData = authorDoc.data();

                    // 7. Find author's active project
                    const projectSnap = await adminDb
                        .collection("projects")
                        .where("authorId", "==", authorDoc.id)
                        .where("status", "==", "active")
                        .get();

                    if (projectSnap.empty) continue;

                    const projectDoc = projectSnap.docs[0];
                    const projectData = projectDoc.data();

                    // 8. Avoid duplicate notifications for this message
                    const existingSnap = await adminDb
                        .collection("notifications")
                        .where("projectId", "==", projectDoc.id)
                        .where("type", "==", "stage-transition")
                        .where("read", "==", false)
                        .get();

                    if (!existingSnap.empty) continue;

                    // 9. Create the notification
                    await adminDb.collection("notifications").add({
                        type: "stage-transition",
                        projectId: projectDoc.id,
                        authorId: authorDoc.id,
                        assignedPmId: projectData.assignedPMId || null,
                        message: `Email from ${authorData.name || senderEmail} suggests stage may be complete: ${subject}`,
                        createdAt: FieldValue.serverTimestamp(),
                        read: false,
                    });

                    notificationsCreated++;
                }

                scanned++;
            } catch (userErr: any) {
                console.error(`Error scanning inbox for ${user.id}:`, userErr.message);
            }
        }

        return NextResponse.json({ ok: true, scanned, notificationsCreated });
    } catch (err: any) {
        console.error("Inbox scan cron failed:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
