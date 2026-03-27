"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function AuthorsPage() {
    const [authors, setAuthors] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAuthors() {
            try {
                const snapshot = await getDocs(collection(db, "authors"));
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Local sort by createdAt if it exists
                data.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
                setAuthors(data);
            } catch (error) {
                console.error("Error fetching authors:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchAuthors();
    }, []);

    const filteredAuthors = authors.filter(author =>
        author.name?.toLowerCase().includes(search.toLowerCase()) ||
        author.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Authors</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage your publishing authors and their details.</p>
                </div>
                <Link
                    href="/authors/new"
                    className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 shrink-0"
                >
                    Add Author
                </Link>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search authors by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Genre</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Assigned PM</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Contacted</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">Loading authors...</td></tr>
                        ) : filteredAuthors.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No authors found.</td></tr>
                        ) : (
                            filteredAuthors.map((author) => (
                                <tr key={author.id} className="transition-colors hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <Link href={`/authors/${author.id}`} className="font-medium text-blue-600 hover:underline">
                                            {author.name}
                                        </Link>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{author.email}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{author.genre || "N/A"}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{author.assignedPM || "Unassigned"}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                        {author.lastContactedAt?.toMillis ? new Date(author.lastContactedAt.toMillis()).toLocaleDateString() : "Never"}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
