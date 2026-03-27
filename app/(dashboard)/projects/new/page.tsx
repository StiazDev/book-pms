"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function NewProjectPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [authors, setAuthors] = useState<any[]>([]);
    const [pms, setPms] = useState<any[]>([]);
    const [smtpConfigs, setSmtpConfigs] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: "",
        authorId: "",
        assignedPMId: "",
        startDate: "",
        expectedEndDate: "",
        smtpConfigId: "",
    });

    useEffect(() => {
        async function fetchLookups() {
            try {
                const [authSnap, userSnap, smtpSnap] = await Promise.all([
                    getDocs(collection(db, "authors")),
                    getDocs(collection(db, "users")),
                    getDocs(collection(db, "smtpConfigs"))
                ]);

                setAuthors(authSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                // Filter PMs client side to avoid missing index errors on 'role'
                const users = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setPms(users.filter((u: any) => u.role === "pm" || u.role === "admin"));

                setSmtpConfigs(smtpSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Error fetching lookups:", error);
            }
        }
        fetchLookups();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Get display names
        const author = authors.find(a => a.id === formData.authorId);
        const pm = pms.find(p => p.id === formData.assignedPMId);

        try {
            await addDoc(collection(db, "projects"), {
                ...formData,
                authorName: author?.name || "Unknown Author",
                assignedPMName: pm?.name || pm?.email || "Unknown PM",
                status: "active",
                currentStage: "Initial Setup",
                createdAt: serverTimestamp(),
                lastContactedAt: serverTimestamp(),
            });
            router.push("/projects");
        } catch (error) {
            console.error("Error creating project:", error);
            alert("Failed to create project.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl">
            <div className="mb-8">
                <Link href="/projects" className="text-sm text-gray-500 hover:text-black mb-4 inline-block">&larr; Back to Projects</Link>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create New Project</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Project Title / Book Name *</label>
                        <input required type="text" name="title" value={formData.title} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Author *</label>
                        <select required name="authorId" value={formData.authorId} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none bg-white">
                            <option value="">Select an Author</option>
                            {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Assigned PM *</label>
                        <select required name="assignedPMId" value={formData.assignedPMId} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none bg-white">
                            <option value="">Select a PM</option>
                            {pms.map(p => <option key={p.id} value={p.id}>{p.name || p.email}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                        <input required type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Expected End Date *</label>
                        <input required type="date" name="expectedEndDate" value={formData.expectedEndDate} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">SMTP Config (Optional)</label>
                        <select name="smtpConfigId" value={formData.smtpConfigId} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none bg-white">
                            <option value="">Select SMTP Configuration</option>
                            {smtpConfigs.map(s => <option key={s.id} value={s.id}>{s.label || s.host || s.id}</option>)}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Used for automated communications on this project.</p>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <button disabled={loading} type="submit" className="rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:bg-gray-400">
                        {loading ? "Creating..." : "Save Project"}
                    </button>
                </div>
            </form>
        </div>
    );
}
