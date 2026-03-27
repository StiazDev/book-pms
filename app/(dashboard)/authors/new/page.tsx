"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function NewAuthorPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        genre: "",
        linkedin: "",
        twitter: "",
        website: "",
        wordCount: "",
        interests: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, "authors"), {
                ...formData,
                wordCount: Number(formData.wordCount) || 0,
                interests: formData.interests.split(",").map(i => i.trim()).filter(Boolean),
                createdAt: serverTimestamp(),
                lastContactedAt: serverTimestamp(),
            });
            router.push("/authors");
        } catch (error) {
            console.error("Error creating author:", error);
            alert("Failed to create author.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl">
            <div className="mb-8">
                <Link href="/authors" className="text-sm text-gray-500 hover:text-black mb-4 inline-block">&larr; Back to Authors</Link>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Add New Author</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name *</label>
                        <input required type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email *</label>
                        <input required type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Genre</label>
                        <input type="text" name="genre" value={formData.genre} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Total Word Count</label>
                        <input type="number" name="wordCount" value={formData.wordCount} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Interests (comma separated)</label>
                        <input type="text" name="interests" value={formData.interests} onChange={handleChange} placeholder="Sci-Fi, Marketing, Podcasting" className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                    </div>
                    <div className="md:col-span-2">
                        <h3 className="text-sm font-medium text-gray-900 mb-3 border-b pb-2">Social Links</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Website</label>
                                <input type="url" name="website" value={formData.website} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">LinkedIn</label>
                                <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Twitter</label>
                                <input type="url" name="twitter" value={formData.twitter} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <button disabled={loading} type="submit" className="rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:bg-gray-400">
                        {loading ? "Creating..." : "Save Author"}
                    </button>
                </div>
            </form>
        </div>
    );
}
