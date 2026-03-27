"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function ProjectsPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProjects() {
            try {
                const snapshot = await getDocs(collection(db, "projects"));
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProjects(data);
            } catch (error) {
                console.error("Error fetching projects:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchProjects();
    }, []);

    const activeProjects = projects.filter(p => p.status === "active");
    const onHoldProjects = projects.filter(p => p.status === "on-hold");
    const completedProjects = projects.filter(p => p.status === "completed");

    const renderColumn = (title: string, items: any[], bgClass: string) => (
        <div className={`flex flex-col rounded-xl p-4 ${bgClass} min-h-[500px]`}>
            <h3 className="mb-4 font-semibold text-gray-900 flex items-center justify-between">
                {title}
                <span className="bg-white text-gray-500 text-xs px-2.5 py-1 rounded-full shadow-sm">{items.length}</span>
            </h3>
            <div className="space-y-4 flex-1">
                {items.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-8">No projects</div>
                ) : (
                    items.map(project => (
                        <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-gray-300">
                            <h4 className="font-bold text-gray-900 mb-1">{project.title || "Untitled Project"}</h4>
                            <p className="text-xs text-gray-500 mb-3">Author: <span className="text-gray-700 font-medium">{project.authorName || "Unknown"}</span></p>

                            <div className="text-xs text-gray-600 space-y-1.5 border-t pt-3">
                                <p className="flex justify-between"><span className="font-medium text-gray-500">Stage:</span> <span>{project.currentStage || "Not started"}</span></p>
                                <p className="flex justify-between"><span className="font-medium text-gray-500">PM:</span> <span>{project.assignedPMName || "Unassigned"}</span></p>
                                <p className="flex justify-between"><span className="font-medium text-gray-500">End Date:</span> <span>{project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString() : "TBD"}</span></p>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="p-8 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Projects Board</h1>
                    <p className="mt-1 text-sm text-gray-500">Track and manage publishing workflows visually.</p>
                </div>
                <Link
                    href="/projects/new"
                    className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 shrink-0"
                >
                    Add Project
                </Link>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading projects...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-x-auto pb-4">
                    {renderColumn("Active", activeProjects, "bg-blue-50/60")}
                    {renderColumn("On Hold", onHoldProjects, "bg-amber-50/60")}
                    {renderColumn("Completed", completedProjects, "bg-green-50/60")}
                </div>
            )}
        </div>
    );
}
