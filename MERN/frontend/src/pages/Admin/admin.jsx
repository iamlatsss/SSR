import React, { useState, useEffect } from "react";
import Navbar from "../NavBar/navbar";

function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
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

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      const data = await res.json();
      setUsers(data.users || []);
      setRoles(data.roles || []);
    } catch (error) {
      console.error("Error fetching users:", error);
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
      let changes = {};
      if (isEdit) {
        if (form.user_name !== originalForm.user_name) changes.user_name = form.user_name;
        if (form.email !== originalForm.email) changes.email = form.email;
        if (form.role !== originalForm.role) changes.role = form.role;
        if (form.active !== originalForm.active) changes.is_active = form.active ? 1 : 0;
        if (form.password && form.password.trim() !== "") changes.password = form.password;
        if (Object.keys(changes).length === 0) {
          alert("No changes detected.");
          setModalOpen(false);
          return;
        }
        const res = await fetch(`/api/admin/user/${editingUserId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        });
        if (!res.ok) throw new Error("Failed to update user");
      } else {
        let payload = {
          user_name: form.user_name,
          email: form.email,
          role: form.role,
          is_active: form.active ? 1 : 0,
          password: form.password,
        };
        const res = await fetch("/api/auth/addUser", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create user");
      }
      setModalOpen(false);
      setForm({ user_name: "", email: "", password: "", role: "", active: true });
      fetchUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Failed to save user. Check console for details.");
    }
  }

  async function handleDelete(user_id) {
    const ok = window.confirm(
      "Are you sure you want to delete this user? This action cannot be undone."
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/user/${user_id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user. Check console for details.");
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto bg-white rounded-lg p-8 mt-8 shadow-lg text-black  mt-30">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">Admin: User Management</h3>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => openModal()}
          >
            + Add User
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 font-semibold text-left">User Name</th>
                <th className="px-4 py-2 font-semibold text-left">Email</th>
                <th className="px-4 py-2 font-semibold text-left">Role</th>
                <th className="px-4 py-2 font-semibold text-left">Status</th>
                <th className="px-4 py-2 font-semibold text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id} className="border-t">
                  <td className="px-4 py-2">{user.user_name}</td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">{user.role}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${user.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-200 text-gray-600"
                        }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    <button
                      className="text-xs px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      title="Edit"
                      onClick={() => openModal(user)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      title="Delete"
                      onClick={() => handleDelete(user.user_id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white p-6 rounded shadow-lg min-w-[320px] max-w-sm w-full">
              <form onSubmit={handleFormSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">User Name</label>
                  <input
                    type="text"
                    className="w-full border px-3 py-2 rounded"
                    required
                    value={form.user_name}
                    onChange={(e) =>
                      setForm({ ...form, user_name: e.target.value })
                    }
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border px-3 py-2 rounded"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Password{" "}
                    {isEdit && (
                      <span className="text-xs text-gray-400">
                        (Leave blank to keep unchanged)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full border px-3 py-2 rounded pr-10"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      required={!isEdit}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-2 flex items-center text-gray-500"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        // Eye off SVG
                        <svg className="h-5 w-5" fill="none" stroke="currentColor"
                          viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.03-10-9a9.978 9.978 0 011.682-5.722M20.683 14.653a9.967 9.967 0 01-1.658 2.822M15.232 17.786A9.953 9.953 0 0112 19c-5.523 0-10-4.03-10-9 .02-.268.055-.533.1-.797M23 3L1 21"/>
                        </svg>
                      ) : (
                        // Eye SVG
                        <svg className="h-5 w-5" fill="none" stroke="currentColor"
                          viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-5.2 6.6a9.987 9.987 0 0014.4-7.6c-1-4.4-6.1-9-11.2-9S2.6 6.2 1.6 10.6A10.016 10.016 0 002.8 15M17.8 18.6a10.05 10.05 0 00-2.6 1.4"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full border px-3 py-2 rounded"
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="">Select role</option>
                    {roles.map((role) => (
                      <option value={role} key={role}>
                        {role.charAt(0).toUpperCase() +
                          role.slice(1).replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) =>
                        setForm({ ...form, active: e.target.checked })
                      }
                    />
                    <span>Active User</span>
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUserManagement;
