"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function UpsellsPage() {
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [authors, setAuthors] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [upsellers, setUpsellers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        authorId: '',
        projectId: '',
        type: 'cover-upgrade',
        assignedUpsellerId: ''
    });

    const fetchData = useCallback(async () => {
        try {
            // Fetch Upsells
            const upsellsRef = collection(db, "upsellOpportunities");
            const upsellsSnap = await getDocs(upsellsRef);
            const upsellsData = upsellsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setOpportunities(upsellsData.sort((a: any, b: any) => (b.triggeredAt?.toMillis?.() || 0) - (a.triggeredAt?.toMillis?.() || 0)));

            // Fetch Authors
            const authorsRef = collection(db, "authors");
            const authorsSnap = await getDocs(authorsRef);
            setAuthors(authorsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Fetch Projects
            const projectsRef = collection(db, "projects");
            const projectsSnap = await getDocs(projectsRef);
            setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Fetch Users (Admins & Upsellers)
            const usersRef = collection(db, "users");
            const usersSnap = await getDocs(usersRef);
            const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setUpsellers(allUsers.filter((u: any) => u.role === 'upseller' || u.role === 'admin'));

        } catch (error) {
            console.error("Error fetching upsell data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddOpportunity = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const author = authors.find(a => a.id === formData.authorId);
            const project = projects.find(p => p.id === formData.projectId);
            const upseller = upsellers.find(u => u.id === formData.assignedUpsellerId);

            const upsellsRef = collection(db, "upsellOpportunities");
            await addDoc(upsellsRef, {
                authorId: formData.authorId,
                authorName: author?.name || 'Unknown',
                projectId: formData.projectId,
                projectTitle: project?.title || 'Unknown',
                type: formData.type,
                assignedUpsellerId: formData.assignedUpsellerId,
                assignedUpsellerName: upseller?.name || upseller?.email || 'Unassigned',
                status: 'pending',
                triggeredAt: serverTimestamp()
            });

            setShowForm(false);
            setFormData({ authorId: '', projectId: '', type: 'cover-upgrade', assignedUpsellerId: '' });
            fetchData();
        } catch (error) {
            console.error("Error adding upsell opportunity:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (oppId: string, newStatus: string) => {
        try {
            const oppRef = doc(db, "upsellOpportunities", oppId);
            await updateDoc(oppRef, { status: newStatus });

            // Optimistic update locally
            setOpportunities(prev => prev.map(opp => opp.id === oppId ? { ...opp, status: newStatus } : opp));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
            fetchData(); // Revert on failure
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        if (!status) return null;
        let colorClass = "bg-gray-100 text-gray-800";
        if (status === "pending") colorClass = "bg-yellow-100 text-yellow-800";
        if (status === "presented") colorClass = "bg-blue-100 text-blue-800";
        if (status === "converted") colorClass = "bg-green-100 text-green-800";
        if (status === "declined") colorClass = "bg-red-100 text-red-800";

        return (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${colorClass}`}>
                {status}
            </span>
        );
    };

    // Derived filtered projects based on selected author
    const availableProjects = formData.authorId
        ? projects.filter(p => p.authorId === formData.authorId)
        : [];

    if (loading) return <div className="p-8 text-gray-500">Loading upsells...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Upsell Opportunities</h1>
                    <p className="mt-2 text-sm text-gray-600">Track secondary engagements safely navigating between Pending to Converted.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition shadow-sm"
                >
                    {showForm ? "Cancel" : "+ Add Opportunity"}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleAddOpportunity} className="rounded-xl border border-gray-200 shadow-sm bg-white p-6 space-y-5 max-w-3xl">
                    <h2 className="text-lg font-bold">New Opportunity</h2>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
                            <select required value={formData.authorId} onChange={e => setFormData({ ...formData, authorId: e.target.value, projectId: '' })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                <option value="">Select Author...</option>
                                {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                            <select required disabled={!formData.authorId} value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400">
                                <option value="">Select Project...</option>
                                {availableProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type *</label>
                            <select required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                <option value="cover-upgrade">Cover Upgrade</option>
                                <option value="audiobook">Audiobook</option>
                                <option value="marketing-package">Marketing Package</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Upseller *</label>
                            <select required value={formData.assignedUpsellerId} onChange={e => setFormData({ ...formData, assignedUpsellerId: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                <option value="">Select Upseller...</option>
                                {upsellers.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-gray-100">
                        <button type="submit" disabled={submitting} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50">
                            {submitting ? "Saving..." : "Save Opportunity"}
                        </button>
                    </div>
                </form>
            )}

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {opportunities.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-sm text-gray-500">No upsell opportunities generated yet.</p>
                        <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition border border-transparent hover:border-blue-200">
                            Create the first opportunity
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Author</th>
                                    <th className="px-6 py-4 font-semibold">Project Title</th>
                                    <th className="px-6 py-4 font-semibold">Type</th>
                                    <th className="px-6 py-4 font-semibold">Triggered At</th>
                                    <th className="px-6 py-4 font-semibold">Upseller</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {opportunities.map((opp) => (
                                    <tr key={opp.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-gray-900">{opp.authorName}</td>
                                        <td className="px-6 py-4">{opp.projectTitle}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs truncate max-w-[150px] inline-block">
                                                {opp.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                                            {opp.triggeredAt?.toMillis ? new Date(opp.triggeredAt.toMillis()).toLocaleDateString() : "Unknown"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">
                                            {opp.assignedUpsellerName}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-24">
                                                    <StatusBadge status={opp.status} />
                                                </div>
                                                <select
                                                    value={opp.status}
                                                    onChange={e => handleStatusChange(opp.id, e.target.value)}
                                                    className="opacity-0 group-hover:opacity-100 text-xs border-gray-300 rounded px-1.5 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-opacity bg-white"
                                                    title="Update Status"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="presented">Presented</option>
                                                    <option value="converted">Converted</option>
                                                    <option value="declined">Declined</option>
                                                </select>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
