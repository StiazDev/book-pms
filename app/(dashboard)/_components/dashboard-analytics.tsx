"use client";

import React, { useEffect, useState } from "react";
import {
    collection,
    collectionGroup,
    getDocs,
    query,
    where,
    Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from "recharts";

interface DashboardAnalyticsProps { }

export default function DashboardAnalytics({ }: DashboardAnalyticsProps) {
    const [loading, setLoading] = useState(true);
    const [projectStageData, setProjectStageData] = useState<any[]>([]);
    const [upsellFunnelData, setUpsellFunnelData] = useState<any[]>([]);
    const [coldClients, setColdClients] = useState<any[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                // 1. Fetch all active projects and authors
                const [projectsSnap, authorsSnap, upsellSnap, stagesSnap] = await Promise.all([
                    getDocs(query(collection(db, "projects"), where("status", "==", "active"))),
                    getDocs(collection(db, "authors")),
                    getDocs(collection(db, "upsellOpportunities")),
                    getDocs(collectionGroup(db, "stages"))
                ]);

                const authorsMap = new Map();
                authorsSnap.forEach(doc => authorsMap.set(doc.id, doc.data()));

                const projects = projectsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // 2. Process Projects by Stage
                const stagesCounts = {
                    pending: 0,
                    active: 0,
                    done: 0
                };

                // Filter stages to only include those belonging to active projects
                const activeProjectIds = new Set(projects.map(p => p.id));
                stagesSnap.forEach(doc => {
                    const projectId = doc.ref.parent.parent?.id;
                    if (projectId && activeProjectIds.has(projectId)) {
                        const status = doc.data().status as keyof typeof stagesCounts;
                        if (stagesCounts[status] !== undefined) {
                            stagesCounts[status]++;
                        }
                    }
                });

                setProjectStageData([
                    { name: "Pending", count: stagesCounts.pending, color: "#94a3b8" },
                    { name: "Active", count: stagesCounts.active, color: "#3b82f6" },
                    { name: "Done", count: stagesCounts.done, color: "#22c55e" }
                ]);

                // 3. Process Upsell Funnel
                const upsellCounts = {
                    pending: 0,
                    presented: 0,
                    converted: 0,
                    declined: 0
                };

                upsellSnap.forEach(doc => {
                    const status = doc.data().status as keyof typeof upsellCounts;
                    if (upsellCounts[status] !== undefined) {
                        upsellCounts[status]++;
                    }
                });

                setUpsellFunnelData([
                    { name: "Pending", count: upsellCounts.pending, color: "#f59e0b" },
                    { name: "Presented", count: upsellCounts.presented, color: "#3b82f6" },
                    { name: "Converted", count: upsellCounts.converted, color: "#10b981" },
                    { name: "Declined", count: upsellCounts.declined, color: "#ef4444" }
                ]);

                // 4. Process Cold Clients
                const now = new Date();
                const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

                const cold = projects
                    .filter(p => {
                        const lastContacted = (p as any).lastContactedAt?.toDate?.() || null;
                        return lastContacted && lastContacted < fourteenDaysAgo;
                    })
                    .map(p => {
                        const lastContacted = (p as any).lastContactedAt?.toDate();
                        const diffInMs = now.getTime() - lastContacted.getTime();
                        const daysSince = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
                        const author = authorsMap.get((p as any).authorId);

                        return {
                            id: p.id,
                            title: (p as any).title || "Untitled Project",
                            authorName: author?.name || "Unknown Author",
                            daysSince,
                            isCritical: daysSince > 30
                        };
                    })
                    .sort((a, b) => b.daysSince - a.daysSince);

                setColdClients(cold);

            } catch (error) {
                console.error("Error fetching analytics data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="mt-8 flex h-64 items-center justify-center rounded-xl border border-gray-100 bg-white">
                <p className="text-gray-400">Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="mt-8 space-y-8">
            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Project Stages Chart */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-lg font-semibold text-gray-900">Projects by Stage</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectStageData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {projectStageData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Upsell Funnel Chart */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-lg font-semibold text-gray-900">Upsell Conversion Funnel</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={upsellFunnelData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {upsellFunnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Cold Clients List */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Cold Clients</h3>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                        {coldClients.length} Projects Needing Attention
                    </span>
                </div>

                {coldClients.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border border-gray-100">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Author</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Project</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Last Contact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white text-sm">
                                {coldClients.map((client) => (
                                    <tr key={client.id} className="transition-colors hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{client.authorName}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-600">{client.title}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right">
                                            <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${client.isCritical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {client.daysSince} days ago
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-8 text-center">
                        <p className="text-sm text-gray-500">All set! No cold clients detected.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
