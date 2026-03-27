"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function CalendarPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);

    // Form states
    const [showAddForm, setShowAddForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'client-call',
        projectId: '',
        scheduledDate: '',
        scheduledTime: '',
        notes: ''
    });

    // Detail states
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    const fetchData = useCallback(async () => {
        try {
            // Fetch events
            const eventsRef = collection(db, "calendarEvents");
            const eventsSnap = await getDocs(eventsRef);
            setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Fetch projects
            const projectsRef = collection(db, "projects");
            const projSnap = await getDocs(projectsRef);
            setProjects(projSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const project = projects.find(p => p.id === formData.projectId);

            // Format scheduledAt properly
            const scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();

            const eventsRef = collection(db, "calendarEvents");
            await addDoc(eventsRef, {
                title: formData.title,
                type: formData.type,
                projectId: formData.projectId || null,
                projectName: project?.title || 'None',
                scheduledAt: scheduledAt,
                notes: formData.notes,
                status: 'upcoming',
                createdAt: serverTimestamp()
            });

            setShowAddForm(false);
            setFormData({ title: '', type: 'client-call', projectId: '', scheduledDate: '', scheduledTime: '', notes: '' });
            fetchData();
        } catch (error) {
            console.error("Error adding event:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkNoShow = async () => {
        if (!selectedEvent) return;
        try {
            const eventRef = doc(db, "calendarEvents", selectedEvent.id);
            await updateDoc(eventRef, {
                status: 'no-show'
            });
            setSelectedEvent({ ...selectedEvent, status: 'no-show' });
            fetchData();
        } catch (error) {
            console.error("Error marking no-show:", error);
        }
    };

    // Calendar grid calculations
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    // Grid rendering logic
    const renderCalendarGrid = () => {
        const headers = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-sm text-gray-500 py-2 border-b">
                {day}
            </div>
        ));

        const emptyCells = [];
        for (let i = 0; i < firstDay; i++) {
            emptyCells.push(<div key={`empty-${i}`} className="bg-gray-50 border border-gray-100 min-h-[120px]"></div>);
        }

        const dayCells = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEvents = events.filter(e => {
                if (!e.scheduledAt) return false;
                const eDate = new Date(e.scheduledAt);
                return eDate.getDate() === i && eDate.getMonth() === month && eDate.getFullYear() === year;
            });

            dayCells.push(
                <div key={`day-${i}`} className="border border-gray-100 bg-white min-h-[120px] p-2 flex flex-col gap-1 transition-colors hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-700">{i}</span>
                    <div className="flex flex-col gap-1 overflow-y-auto w-full">
                        {dayEvents.map(ev => (
                            <button
                                key={ev.id}
                                onClick={() => setSelectedEvent(ev)}
                                className="text-left w-full rounded px-1.5 py-1 text-xs font-semibold truncate hover:opacity-80 transition flex items-center gap-1.5 border shadow-sm"
                            >
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.type === 'client-call' ? 'bg-blue-500' : 'bg-gray-500'}`}></span>
                                <span className={ev.status === 'no-show' ? 'line-through text-red-500' : 'text-gray-900'}>
                                    {ev.title}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-7 border-t border-l border-gray-200 mt-4 rounded-xl overflow-hidden shadow-sm bg-white">
                {headers}
                {emptyCells}
                {dayCells}
            </div>
        );
    };

    if (loading) return <div className="p-8 text-gray-500">Loading calendar...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Calendar</h1>
                    <p className="mt-2 text-sm text-gray-600">Track and manage upcoming active calls safely.</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
                >
                    {showAddForm ? "Cancel" : "+ Add Event"}
                </button>
            </div>

            {showAddForm && (
                <form onSubmit={handleAddEvent} className="rounded-xl border border-gray-200 shadow-sm bg-white p-6 space-y-4 max-w-3xl">
                    <h2 className="text-lg font-bold">New Calendar Event</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-md border-gray-300 border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. Discovery Call" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                            <select required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full rounded-md border-gray-300 border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                <option value="client-call">Client Call</option>
                                <option value="internal">Internal Sync</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Project (Optional)</label>
                            <select value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })} className="w-full rounded-md border-gray-300 border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                <option value="">Select a Project...</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input required type="date" value={formData.scheduledDate} onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })} className="w-full rounded-md border-gray-300 border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                            <input required type="time" value={formData.scheduledTime} onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })} className="w-full rounded-md border-gray-300 border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                            <textarea rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full rounded-md border-gray-300 border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={submitting} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50">
                            {submitting ? "Saving..." : "Save Event"}
                        </button>
                    </div>
                </form>
            )}

            <div className="rounded-xl border border-gray-200 shadow-sm bg-white p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={handlePrevMonth} className="px-3 py-1.5 border border-gray-300 rounded font-medium text-sm hover:bg-gray-50 transition">&larr; Prev</button>
                    <h2 className="text-xl font-bold text-gray-900">{monthName} {year}</h2>
                    <button onClick={handleNextMonth} className="px-3 py-1.5 border border-gray-300 rounded font-medium text-sm hover:bg-gray-50 transition">Next &rarr;</button>
                </div>
                {renderCalendarGrid()}
            </div>

            {/* Event Detail Modal Component */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900 truncate pr-4">{selectedEvent.title}</h3>
                            <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-xs uppercase font-bold text-gray-500 mb-1">Type & Status</p>
                                <div className="flex gap-2 items-center">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded ${selectedEvent.type === 'client-call' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {selectedEvent.type}
                                    </span>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded uppercase tracking-wider ${selectedEvent.status === 'no-show' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                        {selectedEvent.status}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-gray-500 mb-1">Scheduled For</p>
                                <p className="text-sm font-medium text-gray-900">{new Date(selectedEvent.scheduledAt).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-gray-500 mb-1">Linked Project</p>
                                <p className="text-sm font-medium text-gray-900">{selectedEvent.projectName}</p>
                            </div>
                            {selectedEvent.notes && (
                                <div>
                                    <p className="text-xs uppercase font-bold text-gray-500 mb-1">Notes</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedEvent.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
                            {selectedEvent.status !== 'no-show' && (
                                <button onClick={handleMarkNoShow} className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded transition">
                                    Mark as No-Show
                                </button>
                            )}
                            <button onClick={() => setSelectedEvent(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
