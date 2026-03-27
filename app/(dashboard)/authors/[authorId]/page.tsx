"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function AuthorDetailPage() {
    const { authorId } = useParams();
    const [author, setAuthor] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '', email: '', phone: '', genre: '', wordCount: '', interests: '', website: '', linkedin: '', twitter: ''
    });

    useEffect(() => {
        async function fetchData() {
            if (!authorId) return;
            try {
                const docRef = doc(db, "authors", authorId as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setAuthor({ id: docSnap.id, ...docSnap.data() });
                }

                const q = query(collection(db, "projects"), where("authorId", "==", authorId));
                const projectsSnap = await getDocs(q);
                setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Error fetching author data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [authorId]);

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const authorRef = doc(db, "authors", authorId as string);
            const updatedData = {
                name: editForm.name,
                email: editForm.email,
                phone: editForm.phone,
                genre: editForm.genre,
                wordCount: editForm.wordCount ? Number(editForm.wordCount) : 0,
                interests: editForm.interests ? editForm.interests.split(',').map(i => i.trim()).filter(Boolean) : [],
                website: editForm.website,
                linkedin: editForm.linkedin,
                twitter: editForm.twitter
            };
            await updateDoc(authorRef, updatedData);
            setAuthor({ ...author, ...updatedData });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating author:", error);
            alert("Failed to update author.");
        } finally {
            setSaving(false);
        }
    };

    const toggleEdit = () => {
        if (!isEditing) {
            setEditForm({
                name: author.name || '',
                email: author.email || '',
                phone: author.phone || '',
                genre: author.genre || '',
                wordCount: author.wordCount || '',
                interests: author.interests?.join(', ') || '',
                website: author.website || '',
                linkedin: author.linkedin || '',
                twitter: author.twitter || ''
            });
        }
        setIsEditing(!isEditing);
    };

    if (loading) return <div className="p-8 text-sm text-gray-500">Loading author details...</div>;
    if (!author) return <div className="p-8 text-sm text-red-500">Author not found.</div>;

    return (
        <div className="p-8 max-w-5xl">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <Link href="/authors" className="text-sm text-gray-500 hover:text-black mb-4 inline-block">&larr; Back to Authors</Link>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{author.name}</h1>
                    <p className="mt-1 text-sm text-gray-500">{author.email} {author.phone && `• ${author.phone}`}</p>
                </div>
                <button
                    onClick={toggleEdit}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition shadow-sm"
                >
                    {isEditing ? 'Cancel Edit' : 'Edit Author'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                    {isEditing ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Edit Author</h3>
                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                    <input required type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                    <input required type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                                    <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Genre</label>
                                    <input type="text" value={editForm.genre} onChange={e => setEditForm({ ...editForm, genre: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Word Count</label>
                                    <input type="number" value={editForm.wordCount} onChange={e => setEditForm({ ...editForm, wordCount: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Interests (comma separated)</label>
                                    <input type="text" value={editForm.interests} onChange={e => setEditForm({ ...editForm, interests: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Website URL</label>
                                    <input type="url" value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL</label>
                                    <input type="url" value={editForm.linkedin} onChange={e => setEditForm({ ...editForm, linkedin: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Twitter URL</label>
                                    <input type="url" value={editForm.twitter} onChange={e => setEditForm({ ...editForm, twitter: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="pt-2">
                                    <button type="submit" disabled={saving} className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50">
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Profile</h3>
                                <div className="space-y-4 text-sm text-gray-600">
                                    <div>
                                        <strong className="text-gray-900 text-xs uppercase tracking-wide">Genre:</strong>
                                        <p className="mt-1">{author.genre || "N/A"}</p>
                                    </div>
                                    <div>
                                        <strong className="text-gray-900 text-xs uppercase tracking-wide">Word Count:</strong>
                                        <p className="mt-1">{author.wordCount ? author.wordCount.toLocaleString() : "N/A"} words</p>
                                    </div>
                                    <div>
                                        <strong className="text-gray-900 text-xs uppercase tracking-wide">Interests:</strong>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {author.interests?.length ? author.interests.map((i: string) => (
                                                <span key={i} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{i}</span>
                                            )) : "None"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Links</h3>
                                <div className="space-y-3 text-sm">
                                    {author.website && <a href={author.website} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline">Website</a>}
                                    {author.linkedin && <a href={author.linkedin} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline">LinkedIn</a>}
                                    {author.twitter && <a href={author.twitter} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline">Twitter</a>}
                                    {!author.website && !author.linkedin && !author.twitter && <p className="text-gray-500">No links provided</p>}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Projects</h2>
                        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 transition">+ Add Project</button>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        {projects.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500 bg-gray-50/50">No projects found for this author.</div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {projects.map(project => (
                                    <li key={project.id} className="p-5 hover:bg-gray-50 transition-colors">
                                        <p className="font-semibold text-gray-900">{project.name || project.title || "Untitled Project"}</p>
                                        <p className="text-sm text-gray-500 mt-1">Status: {project.status || "Draft"} • Phase: {project.phase || "N/A"}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
