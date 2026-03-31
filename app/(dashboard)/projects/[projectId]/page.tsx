"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp, updateDoc, query, where, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function ProjectDetailPage() {
    const { projectId } = useParams();
    const [project, setProject] = useState<any>(null);
    const [stages, setStages] = useState<any[]>([]);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { data: session } = useSession();

    // Add Comm State
    const [smtpConfigs, setSmtpConfigs] = useState<any[]>([]);
    const [showCommForm, setShowCommForm] = useState(false);
    const [submittingComm, setSubmittingComm] = useState(false);
    const [commForm, setCommForm] = useState({ type: 'email', subject: '', body: '', overrideSmtpConfigId: '' });

    // Add Stage State
    const [showStageForm, setShowStageForm] = useState(false);
    const [submittingStage, setSubmittingStage] = useState(false);
    const [stageForm, setStageForm] = useState({ name: '', order: '', duration: '', keywords: '', fileType: '' });

    // Add Milestone State
    const [showMilestoneForm, setShowMilestoneForm] = useState(false);
    const [submittingMilestone, setSubmittingMilestone] = useState(false);
    const [milestoneForm, setMilestoneForm] = useState({ title: '', dueDate: '', linkedStageId: '' });

    // Stage Transition Notification
    const [stageTransitionNotif, setStageTransitionNotif] = useState<any>(null);

    // Upsell Tags
    const [upsellTags, setUpsellTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [savingTag, setSavingTag] = useState(false);

    // PDF Report
    const [generatingReport, setGeneratingReport] = useState(false);

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        try {
            const docRef = doc(db, "projects", projectId as string);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };
                setProject(data);
                setUpsellTags((data as any).upsellTags || []);
            }

            // Safely fetch subcollections without orderBy to avoid index errors, sort locally
            const stagesRef = collection(db, "projects", projectId as string, "stages");
            const stagesSnap = await getDocs(stagesRef);
            const stagesData = stagesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setStages(stagesData.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));

            const msRef = collection(db, "projects", projectId as string, "milestones");
            const msSnap = await getDocs(msRef);
            setMilestones(msSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const logsRef = collection(db, "projects", projectId as string, "communications");
            const logsSnap = await getDocs(logsRef);
            const logsData = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setLogs(logsData.sort((a: any, b: any) => (b.sentAt?.toMillis?.() || 0) - (a.sentAt?.toMillis?.() || 0)));

            const smtpRef = collection(db, "smtpConfigs");
            const smtpSnap = await getDocs(smtpRef);
            setSmtpConfigs(smtpSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Check for unread stage-transition notification for this project
            const notifQ = query(
                collection(db, "notifications"),
                where("projectId", "==", projectId as string),
                where("type", "==", "stage-transition"),
                where("read", "==", false)
            );
            const notifSnap = await getDocs(notifQ);
            setStageTransitionNotif(notifSnap.empty ? null : { id: notifSnap.docs[0].id, ...notifSnap.docs[0].data() });

        } catch (error) {
            console.error("Error fetching project data:", error);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddStage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;
        setSubmittingStage(true);
        try {
            const stagesRef = collection(db, "projects", projectId as string, "stages");
            await addDoc(stagesRef, {
                name: stageForm.name,
                order: Number(stageForm.order),
                expectedDuration: Number(stageForm.duration),
                triggerKeywords: stageForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
                expectedFileType: stageForm.fileType,
                status: 'pending'
            });
            setShowStageForm(false);
            setStageForm({ name: '', order: '', duration: '', keywords: '', fileType: '' });
            fetchData();
        } catch (error) {
            console.error("Error adding stage:", error);
        } finally {
            setSubmittingStage(false);
        }
    };

    const handleAddMilestone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;
        setSubmittingMilestone(true);
        try {
            const msRef = collection(db, "projects", projectId as string, "milestones");
            await addDoc(msRef, {
                title: milestoneForm.title,
                dueDate: milestoneForm.dueDate,
                linkedStageId: milestoneForm.linkedStageId,
                status: 'upcoming'
            });
            setShowMilestoneForm(false);
            setMilestoneForm({ title: '', dueDate: '', linkedStageId: '' });
            fetchData();
        } catch (error) {
            console.error("Error adding milestone:", error);
        } finally {
            setSubmittingMilestone(false);
        }
    };

    const handleAddComm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;
        setSubmittingComm(true);

        try {
            // If the communication is an email, trigger the Nodemailer API immediately prior to storage.
            if (commForm.type === 'email') {
                const res = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subject: commForm.subject,
                        body: commForm.body,
                        projectId: projectId,
                        overrideSmtpConfigId: commForm.overrideSmtpConfigId
                    })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Failed invoking internal Next.js email API gateway.");
                }
            }

            // Secure persistence layer tracking log properties directly down into the specialized subcollection
            const commRef = collection(db, "projects", projectId as string, "communications");
            await addDoc(commRef, {
                type: commForm.type,
                subject: commForm.subject,
                body: commForm.body,
                sentAt: serverTimestamp(),
                sentBy: session?.user?.email || "Unknown",
                smtpUsed: commForm.type === 'email' ? (commForm.overrideSmtpConfigId || 'project-default') : null
            });

            setShowCommForm(false);
            setCommForm({ type: 'email', subject: '', body: '', overrideSmtpConfigId: '' });
            fetchData();
        } catch (error: any) {
            console.error("Error logging communication module:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setSubmittingComm(false);
        }
    };

    const handleToggleStageStatus = async (stageId: string, currentStatus: string) => {
        if (!projectId) return;

        const statusMap: Record<string, string> = {
            'pending': 'active',
            'active': 'done',
            'done': 'pending'
        };

        const newStatus = statusMap[currentStatus] || 'pending';
        const updateData: any = { status: newStatus };

        if (newStatus === 'active') {
            updateData.startedAt = serverTimestamp();
        } else if (newStatus === 'done') {
            updateData.completedAt = serverTimestamp();
        }

        try {
            const stageRef = doc(db, "projects", projectId as string, "stages", stageId);
            await updateDoc(stageRef, updateData);
            fetchData();
        } catch (error) {
            console.error("Error updating stage status:", error);
        }
    };

    const handleMarkStageComplete = async () => {
        if (!projectId || !stages.length) return;
        // Find the first active or pending stage to mark complete
        const currentStage = stages.find(s => s.status === 'active') || stages.find(s => s.status === 'pending');
        if (!currentStage) return;

        try {
            // Update the stage status
            const stageRef = doc(db, "projects", projectId as string, "stages", currentStage.id);
            await updateDoc(stageRef, {
                status: 'done',
                completedAt: serverTimestamp()
            });

            // Mark the notification as read
            if (stageTransitionNotif?.id) {
                const notifRef = doc(db, "notifications", stageTransitionNotif.id);
                await updateDoc(notifRef, { read: true });
            }

            fetchData();
        } catch (error) {
            console.error("Error marking stage complete:", error);
        }
    };

    const handleAddTag = async () => {
        const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
        if (!tag || upsellTags.includes(tag)) { setTagInput(""); return; }
        setSavingTag(true);
        try {
            await updateDoc(doc(db, "projects", projectId as string), { upsellTags: arrayUnion(tag) });
            setUpsellTags(prev => [...prev, tag]);
            setTagInput("");
        } catch (err) { console.error("Error adding tag:", err); }
        finally { setSavingTag(false); }
    };

    const handleRemoveTag = async (tag: string) => {
        try {
            await updateDoc(doc(db, "projects", projectId as string), { upsellTags: arrayRemove(tag) });
            setUpsellTags(prev => prev.filter(t => t !== tag));
        } catch (err) { console.error("Error removing tag:", err); }
    };

    const handleGenerateReport = async () => {
        setGeneratingReport(true);
        try {
            const res = await fetch("/api/generate-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            });
            if (!res.ok) throw new Error("Report generation failed");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `status-report-${project?.title?.replace(/\s+/g, "-") || projectId}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error generating report:", err);
            alert("Failed to generate report. Please try again.");
        } finally {
            setGeneratingReport(false);
        }
    };

    if (loading) return <div className="p-8 text-sm text-gray-500">Loading project...</div>;
    if (!project) return <div className="p-8 text-sm text-red-500">Project not found.</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
            {/* LEFT COLUMN - Info & Milestones */}
            <div className="lg:w-2/3 space-y-8">
                <div>
                    <Link href="/projects" className="text-sm text-gray-500 hover:text-black mb-4 inline-block">&larr; Back to Board</Link>
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{project.title}</h1>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${project.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                project.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                {project.status || 'unknown'}
                            </span>
                            <button
                                onClick={handleGenerateReport}
                                disabled={generatingReport}
                                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {generatingReport ? "Generating..." : "Status Report"}
                            </button>
                        </div>
                    </div>
                    <p className="mt-2 text-lg text-gray-600">Author: <Link href={`/authors/${project.authorId}`} className="text-blue-600 hover:underline">{project.authorName}</Link></p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned PM</h3>
                        <p className="mt-1 text-gray-900 font-medium">{project.assignedPMName || "Unassigned"}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expected End Date</h3>
                        <p className="mt-1 text-gray-900 font-medium">{project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString() : "TBD"}</p>
                    </div>
                </div>

                {/* Upsell Tags */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Upsell Tags</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {upsellTags.length === 0 && <p className="text-sm text-gray-400">No tags yet.</p>}
                        {upsellTags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="text-purple-500 hover:text-purple-900 leading-none" title="Remove tag">&times;</button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                            placeholder="e.g. marketing, social-media"
                            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleAddTag}
                            disabled={savingTag || !tagInput.trim()}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition disabled:opacity-50"
                        >
                            Add
                        </button>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
                        <h2 className="text-lg font-bold text-gray-900">Milestones</h2>
                        <button onClick={() => setShowMilestoneForm(!showMilestoneForm)} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition">
                            {showMilestoneForm ? "Cancel" : "+ Add Milestone"}
                        </button>
                    </div>
                    {showMilestoneForm && (
                        <div className="border-b px-6 py-4 bg-gray-50/50">
                            <form onSubmit={handleAddMilestone} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                    <input required type="text" value={milestoneForm.title} onChange={e => setMilestoneForm({ ...milestoneForm, title: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. Outline Complete" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                        <input required type="date" value={milestoneForm.dueDate} onChange={e => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Linked Stage (Optional)</label>
                                        <select value={milestoneForm.linkedStageId} onChange={e => setMilestoneForm({ ...milestoneForm, linkedStageId: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                            <option value="">None</option>
                                            {stages.map(s => (
                                                <option key={s.id} value={s.id}>{s.name || 'Unnamed Stage'}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setShowMilestoneForm(false)} className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition">Cancel</button>
                                    <button type="submit" disabled={submittingMilestone} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50">
                                        {submittingMilestone ? "Saving..." : "Save Milestone"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                    <div className="p-6">
                        {milestones.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No milestones created yet.</p>
                        ) : (
                            <ul className="space-y-4">
                                {milestones.map(m => (
                                    <li key={m.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-semibold text-gray-900">{m.title}</p>
                                            <p className="text-xs text-gray-500">{m.description}</p>
                                        </div>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{m.status || "Draft"}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
                        <h2 className="text-lg font-bold text-gray-900">Communications Log</h2>
                        <button onClick={() => setShowCommForm(!showCommForm)} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition">
                            {showCommForm ? "Cancel" : "+ Log Communication"}
                        </button>
                    </div>
                    {showCommForm && (
                        <div className="border-b px-6 py-4 bg-gray-50/50">
                            <form onSubmit={handleAddComm} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select required value={commForm.type} onChange={e => setCommForm({ ...commForm, type: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                        <option value="email">Email</option>
                                        <option value="call">Call</option>
                                        <option value="note">Note</option>
                                    </select>
                                </div>
                                {commForm.type === 'email' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Send from Email Identity</label>
                                        <select value={commForm.overrideSmtpConfigId} onChange={e => setCommForm({ ...commForm, overrideSmtpConfigId: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                            <option value="">Project Default</option>
                                            {smtpConfigs.map(s => (
                                                <option key={s.id} value={s.id}>{s.label || s.host || s.id}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <input required type="text" value={commForm.subject} onChange={e => setCommForm({ ...commForm, subject: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. Checking on manuscript" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                                    <textarea required rows={4} value={commForm.body} onChange={e => setCommForm({ ...commForm, body: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Write details or your email message output..." />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setShowCommForm(false)} className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition">Cancel</button>
                                    <button type="submit" disabled={submittingComm} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50">
                                        {submittingComm ? "Processing..." : (commForm.type === 'email' ? "Send & Log Email" : "Save Log")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                    <div className="p-6">
                        {logs.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No communications logged yet.</p>
                        ) : (
                            <ul className="space-y-6">
                                {logs.map(log => (
                                    <li key={log.id} className="border-l-2 border-blue-500 pl-4 py-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase tracking-widest ${log.type === 'email' ? 'bg-blue-100 text-blue-800' :
                                                log.type === 'call' ? 'bg-amber-100 text-amber-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {log.type}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                By <strong className="text-gray-600">{log.sentBy}</strong> on {log.sentAt?.toMillis ? new Date(log.sentAt.toMillis()).toLocaleString() : "Unknown date"}
                                            </span>
                                        </div>
                                        <p className="font-semibold text-gray-900 mt-2">{log.subject}</p>
                                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{log.body || log.message}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN - Vertical Pipeline */}
            <div className="lg:w-1/3">
                {stageTransitionNotif && (
                    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-800">Suggested: Mark current stage as complete</p>
                            <p className="text-xs text-amber-700 mt-0.5">Based on recent email from author</p>
                        </div>
                        <button
                            onClick={handleMarkStageComplete}
                            className="flex-shrink-0 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-md transition"
                        >
                            Mark Complete
                        </button>
                    </div>
                )}
                <div className="sticky top-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
                        <h2 className="text-lg font-bold text-gray-900">Stage Pipeline</h2>
                        <button onClick={() => setShowStageForm(!showStageForm)} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition">
                            {showStageForm ? "Cancel" : "+ Add Stage"}
                        </button>
                    </div>
                    {showStageForm && (
                        <div className="border-b px-6 py-4 bg-gray-50/50">
                            <form onSubmit={handleAddStage} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stage Name</label>
                                    <input required type="text" value={stageForm.name} onChange={e => setStageForm({ ...stageForm, name: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. Outlining" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                                        <input required type="number" value={stageForm.order} onChange={e => setStageForm({ ...stageForm, order: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="10" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                                        <input required type="number" value={stageForm.duration} onChange={e => setStageForm({ ...stageForm, duration: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="7" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Keywords (comma separated)</label>
                                    <input type="text" value={stageForm.keywords} onChange={e => setStageForm({ ...stageForm, keywords: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. outline, plot, structure" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected File Type</label>
                                    <input type="text" value={stageForm.fileType} onChange={e => setStageForm({ ...stageForm, fileType: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. .docx" />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setShowStageForm(false)} className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition">Cancel</button>
                                    <button type="submit" disabled={submittingStage} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50">
                                        {submittingStage ? "Saving..." : "Save Stage"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                    <div className="p-6">
                        {stages.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No pipeline stages defined.</p>
                        ) : (
                            <div className="relative pl-1">
                                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200"></div>
                                <ul className="space-y-6 relative z-10">
                                    {stages.map((stage, i) => (
                                        <li key={stage.id} className="flex gap-4 items-start">
                                            <button
                                                onClick={() => handleToggleStageStatus(stage.id, stage.status)}
                                                className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white transition-colors hover:shadow-md ${stage.status === 'done' ? 'border-green-500 bg-green-500 text-white' :
                                                    stage.status === 'active' ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'
                                                    }`}
                                            >
                                                {stage.status === 'done' && (
                                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                                    </svg>
                                                )}
                                                {stage.status === 'active' && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-white opacity-40 animate-pulse"></div>
                                                )}
                                            </button>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-medium ${stage.status === 'done' ? 'text-gray-500' : 'text-gray-900'}`}>{stage.name || "Unnamed Stage"}</p>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight ${stage.status === 'done' ? 'bg-green-100 text-green-700' :
                                                        stage.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {stage.status || 'pending'}
                                                    </span>
                                                </div>
                                                {stage.expectedDuration && (
                                                    <p className="text-[10px] font-semibold text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {stage.expectedDuration} days
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-1">{stage.description}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
