"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
    const { data: session } = useSession();
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        label: '',
        fromName: '',
        fromEmail: '',
        host: '',
        port: '',
        username: '',
        password: ''
    });
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

    // User Management State
    const [usersList, setUsersList] = useState<any[]>([]);
    const [showUserForm, setShowUserForm] = useState(false);
    const [submittingUser, setSubmittingUser] = useState(false);
    const [userFormData, setUserFormData] = useState({
        name: '',
        email: '',
        role: 'pm'
    });

    const fetchConfigs = async () => {
        try {
            const configRef = collection(db, "smtpConfigs");
            const snap = await getDocs(configRef);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setConfigs(data.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
        } catch (error) {
            console.error("Error fetching SMTP configs:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const usersRef = collection(db, "users");
            const snap = await getDocs(usersRef);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsersList(data.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    useEffect(() => {
        fetchConfigs();
        fetchUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.user?.email) {
            alert("No logged in user found.");
            return;
        }
        setSubmitting(true);
        try {
            if (editingConfigId) {
                const configRef = doc(db, "smtpConfigs", editingConfigId);
                await updateDoc(configRef, {
                    label: formData.label,
                    fromName: formData.fromName,
                    fromEmail: formData.fromEmail,
                    host: formData.host,
                    port: Number(formData.port),
                    username: formData.username,
                    password: formData.password
                });
            } else {
                const configRef = collection(db, "smtpConfigs");
                await addDoc(configRef, {
                    label: formData.label,
                    fromName: formData.fromName,
                    fromEmail: formData.fromEmail,
                    host: formData.host,
                    port: Number(formData.port),
                    username: formData.username,
                    password: formData.password,
                    createdBy: session.user.email,
                    createdAt: serverTimestamp()
                });
            }
            setShowForm(false);
            setEditingConfigId(null);
            setFormData({ label: '', fromName: '', fromEmail: '', host: '', port: '', username: '', password: '' });
            fetchConfigs();
        } catch (error) {
            console.error("Error saving SMTP config:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (config: any) => {
        setFormData({
            label: config.label || '',
            fromName: config.fromName || '',
            fromEmail: config.fromEmail || '',
            host: config.host || '',
            port: config.port?.toString() || '',
            username: config.username || '',
            password: config.password || ''
        });
        setEditingConfigId(config.id);
        setShowForm(true);
    };

    const handleCancelConfig = () => {
        setShowForm(false);
        setEditingConfigId(null);
        setFormData({ label: '', fromName: '', fromEmail: '', host: '', port: '', username: '', password: '' });
    };

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingUser(true);
        try {
            const emailId = userFormData.email.trim().toLowerCase();
            const userRef = doc(db, "users", emailId);
            await setDoc(userRef, {
                name: userFormData.name,
                email: emailId,
                role: userFormData.role,
                createdAt: serverTimestamp()
            });
            setShowUserForm(false);
            setUserFormData({ name: '', email: '', role: 'pm' });
            fetchUsers();
        } catch (error) {
            console.error("Error adding user:", error);
        } finally {
            setSubmittingUser(false);
        }
    };

    if (loading) return <div className="p-8 text-sm text-gray-500">Loading settings...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
                <p className="mt-2 text-sm text-gray-600">Manage application settings and configurations.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-900">Email Identities</h2>
                    <button
                        onClick={showForm ? handleCancelConfig : () => setShowForm(true)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                    >
                        {showForm ? "Cancel" : "+ Add Email Identity"}
                    </button>
                </div>

                {showForm && (
                    <div className="border-b px-6 py-6 bg-gray-50/50">
                        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 max-w-2xl">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Label (e.g. Sales, Support)</label>
                                    <input required type="text" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                                    <input required type="text" value={formData.fromName} onChange={e => setFormData({ ...formData, fromName: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">From Email Address</label>
                                    <input required type="email" value={formData.fromEmail} onChange={e => setFormData({ ...formData, fromEmail: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                                    <input required type="text" value={formData.host} onChange={e => setFormData({ ...formData, host: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="smtp.example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                                    <input required type="number" value={formData.port} onChange={e => setFormData({ ...formData, port: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="587" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
                                    <input required type="text" autoComplete="off" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                                    <input required type="password" autoComplete="new-password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50 shadow-sm">
                                    {submitting ? "Saving..." : (editingConfigId ? "Update Identity" : "Save Identity")}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="p-6">
                    {configs.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-gray-500">No email identities configured yet.</p>
                            <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition">
                                Add your first identity
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="text-xs uppercase bg-gray-50 text-gray-700 border-b">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-500">Label</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">From Name</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">From Email</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">SMTP Host</th>
                                        <th className="px-4 py-3 font-medium text-gray-500 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {configs.map((config) => (
                                        <tr key={config.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900">{config.label}</td>
                                            <td className="px-4 py-3">{config.fromName}</td>
                                            <td className="px-4 py-3">{config.fromEmail}</td>
                                            <td className="px-4 py-3 font-mono text-xs">{config.host}:{config.port}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => handleEditClick(config)} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition">Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* User Management Section */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-900">User Management</h2>
                    <button
                        onClick={() => setShowUserForm(!showUserForm)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                    >
                        {showUserForm ? "Cancel" : "+ Add User"}
                    </button>
                </div>

                {showUserForm && (
                    <div className="border-b px-6 py-6 bg-gray-50/50">
                        <form onSubmit={handleUserSubmit} autoComplete="off" className="space-y-4 max-w-2xl">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input required type="text" value={userFormData.name} onChange={e => setUserFormData({ ...userFormData, name: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input required type="email" value={userFormData.email} onChange={e => setUserFormData({ ...userFormData, email: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select required value={userFormData.role} onChange={e => setUserFormData({ ...userFormData, role: e.target.value })} className="w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                        <option value="admin">Admin</option>
                                        <option value="pm">Project Manager (PM)</option>
                                        <option value="upseller">Upseller</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={submittingUser} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50 shadow-sm">
                                    {submittingUser ? "Adding..." : "Add User"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="p-6">
                    {usersList.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-gray-500">No users found.</p>
                            <button onClick={() => setShowUserForm(true)} className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition">
                                Add a user
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="text-xs uppercase bg-gray-50 text-gray-700 border-b">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">Role</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {usersList.map((usr) => (
                                        <tr key={usr.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900">{usr.name}</td>
                                            <td className="px-4 py-3">{usr.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${usr.role === 'admin' ? 'bg-black text-white' :
                                                    usr.role === 'pm' ? 'bg-blue-100 text-blue-800' :
                                                        usr.role === 'upseller' ? 'bg-green-100 text-green-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {usr.role?.toUpperCase() || 'UNKNOWN'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
