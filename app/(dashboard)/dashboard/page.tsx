import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { adminDb } from "@/lib/firebase/admin";
import DashboardAnalytics from "../_components/dashboard-analytics";

async function getStats() {
    const [authorsSnap, projectsSnap, calendarSnap, upsellsSnap] = await Promise.all([
        adminDb.collection("authors").get(),
        adminDb.collection("projects").where("status", "==", "active").get(),
        adminDb.collection("calendarEvents").where("status", "==", "upcoming").get(),
        adminDb.collection("upsellOpportunities").where("status", "==", "pending").get(),
    ]);

    return {
        totalAuthors: authorsSnap.size,
        activeProjects: projectsSnap.size,
        upcomingCalls: calendarSnap.size,
        pendingUpsells: upsellsSnap.size,
    };
}

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const firstName = session?.user?.name?.split(" ")[0] || "there";

    const stats = await getStats();

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    Welcome back, {firstName}!
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Here's an overview of what's happening with your publishing business today.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <h3 className="text-sm font-medium text-gray-500">Total Authors</h3>
                    <p className="mt-2 text-4xl font-bold text-gray-900">{stats.totalAuthors}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <h3 className="text-sm font-medium text-gray-500">Active Projects</h3>
                    <p className="mt-2 text-4xl font-bold text-gray-900">{stats.activeProjects}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <h3 className="text-sm font-medium text-gray-500">Upcoming Calls</h3>
                    <p className="mt-2 text-4xl font-bold text-gray-900">{stats.upcomingCalls}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <h3 className="text-sm font-medium text-gray-500">Upsell Opportunities</h3>
                    <p className="mt-2 text-4xl font-bold text-gray-900">{stats.pendingUpsells}</p>
                </div>
            </div>

            <DashboardAnalytics />
        </div>
    );
}
