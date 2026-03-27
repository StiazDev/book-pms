import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import Sidebar from "./_components/Sidebar";
import NotificationBell from "./_components/NotificationBell";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar user={session.user} />
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top bar with notification bell */}
                <div className="flex h-12 items-center justify-end border-b border-gray-200 bg-white px-6 shrink-0">
                    <NotificationBell userEmail={session.user?.email || ""} />
                </div>
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
