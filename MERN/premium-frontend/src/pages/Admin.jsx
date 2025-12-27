import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { toast } from "react-toastify";
import { Plus, Edit2, Trash2, X, Check, Search, Eye, EyeOff, UserPlus } from "lucide-react";

const Admin = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        user_name: "",
        email: "",
        password: "",
        role: "",
        active: true,
    });
    const [originalForm, setOriginalForm] = useState({});
    const [isEdit, setIsEdit] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const res = await api.get("/admin/users");
            setUsers(res.data.users || []);
            setRoles(res.data.roles || []);
        } catch (error) {
            console.error("Error fetching users:", error);
            // toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    }

    function openModal(user = null) {
        if (user) {
            setForm({
                user_name: user.user_name || "",
                email: user.email,
                password: "",
                role: user.role,
                active: !!user.is_active,
            });
            setOriginalForm({
                user_name: user.user_name || "",
                email: user.email,
                role: user.role,
                active: !!user.is_active,
            });
            setIsEdit(true);
            setEditingUserId(user.user_id);
        } else {
            setForm({
                user_name: "",
                email: "",
                password: "",
                role: "",
                active: true,
            });
            setOriginalForm({});
            setIsEdit(false);
            setEditingUserId(null);
        }
        setShowPassword(false);
        setModalOpen(true);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        try {
            if (isEdit) {
                let changes = {};
                if (form.user_name !== originalForm.user_name) changes.user_name = form.user_name;
                if (form.email !== originalForm.email) changes.email = form.email;
                if (form.role !== originalForm.role) changes.role = form.role;
                if (form.active !== originalForm.active) changes.is_active = form.active ? 1 : 0;
                if (form.password && form.password.trim() !== "") changes.password = form.password;
                
                if (Object.keys(changes).length === 0) {
                    toast.info("No changes detected.");
                    setModalOpen(false);
                    return;
                }
                
                await api.put(`/admin/user/${editingUserId}`, changes);
                toast.success("User updated successfully");
            } else {
                let payload = {
                    user_name: form.user_name,
                    email: form.email,
                    role: form.role,
                    is_active: form.active ? 1 : 0,
                    password: form.password,
                };
                await api.post("/auth/addUser", payload);
                toast.success("User created successfully");
            }
            setModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error("Error saving user:", error);
            toast.error(error.response?.data?.message || "Failed to save user");
        }
    }

    async function handleDelete(user_id) {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`/admin/user/${user_id}`);
            toast.success("User deleted successfully");
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("Failed to delete user");
        }
    }

    const filteredUsers = users.filter(user => 
        user.user_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout title="User Management">
            {/* Header Actions */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-poppins text-sm"
                    />
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm hover:shadow-md"
                >
                    <UserPlus size={18} />
                    Add User
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                                <th className="p-4">User</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">Loading users...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-medium text-slate-800 dark:text-white">{user.user_name}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{user.email}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium capitalize border border-slate-200 dark:border-slate-600">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                                                user.is_active
                                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800"
                                                    : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800"
                                            }`}>
                                                {user.is_active ? <Check size={12} /> : <X size={12} />}
                                                {user.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => openModal(user)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.user_id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {isEdit ? "Edit User" : "Add New User"}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">User Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                    value={form.user_name}
                                    onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Password {isEdit && <span className="text-slate-400 font-normal ml-1">(Leave blank to keep unchanged)</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        required={!isEdit}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                                <select
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                    required
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                >
                                    <option value="">Select role</option>
                                    {roles.map((role) => (
                                        <option value={role} key={role}>
                                            {role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ")}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="active-check"
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                                    checked={form.active}
                                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                                />
                                <label htmlFor="active-check" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                                    Active User
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                                    onClick={() => setModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                                >
                                    Save User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Admin;
