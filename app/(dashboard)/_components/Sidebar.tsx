"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Authors", href: "/authors" },
    { name: "Projects", href: "/projects" },
    { name: "Calendar", href: "/calendar" },
    { name: "Upsells", href: "/upsells" },
    { name: "Settings", href: "/settings" },
];

export default function Sidebar({ user }: { user: any }) {
    const pathname = usePathname();

    return (
        <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-100">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">BookPMS</h1>
            </div>

            <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
                {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`block rounded-md px-4 py-2.5 text-sm transition-colors ${isActive
                                ? "bg-gray-100 font-medium text-gray-900"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            {link.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-gray-100 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                        <span className="w-32 truncate text-xs text-gray-500">{user?.email}</span>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="rounded px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </aside>
    );
}
