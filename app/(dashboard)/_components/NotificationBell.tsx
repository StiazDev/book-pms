"use client";

import { useEffect, useRef, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function NotificationBell({ userEmail }: { userEmail: string }) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        if (!userEmail) return;
        try {
            const q = query(
                collection(db, "notifications"),
                where("assignedPmId", "==", userEmail),
                where("read", "==", false)
            );
            const snap = await getDocs(q);
            setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Error fetching notifications:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60s for new notifications
        const interval = setInterval(fetchNotifications, 60_000);
        return () => clearInterval(interval);
    }, [userEmail]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleMarkRead = async (notifId: string) => {
        try {
            await updateDoc(doc(db, "notifications", notifId), { read: true });
            setNotifications(prev => prev.filter(n => n.id !== notifId));
        } catch (err) {
            console.error("Error marking notification read:", err);
        }
    };

    const unreadCount = notifications.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                title="Notifications"
                aria-label="Notifications"
            >
                {/* Bell Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-10 z-50 w-80 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        <span className="text-xs text-gray-400">{unreadCount} unread</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                        {notifications.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">You're all caught up!</p>
                        ) : (
                            notifications.map(notif => (
                                <div key={notif.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50 transition">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide block mb-0.5">{notif.type}</span>
                                        <p className="text-sm text-gray-800 leading-snug">{notif.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {notif.createdAt?.toMillis ? new Date(notif.createdAt.toMillis()).toLocaleDateString() : ""}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleMarkRead(notif.id)}
                                        className="flex-shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 transition whitespace-nowrap"
                                    >
                                        Mark read
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
