import React, { useState } from "react";

const defaultUsers = [
  {
    email: "admin@example.com",
    role: "admin",
    active: true,
  },
  {
    email: "sales@example.com",
    role: "sales",
    active: false,
  },
];

const ROLES = [
  { label: "Admin", value: "admin" },
  { label: "Operations", value: "operations" },
  { label: "Customer Service", value: "customer_service" },
  { label: "Viewer", value: "viewer" },
  { label: "Sales", value: "sales" },
];

function AdminUserManagement() {
  const [users, setUsers] = useState(defaultUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "",
    active: true,
  });
  const [isEdit, setIsEdit] = useState(false);
  const [editIdx, setEditIdx] = useState(null);

  // Open modal & optionally fill form for edit
  function openModal(user = null, idx = null) {
    if (user) {
      setForm({
        email: user.email,
        password: "",
        role: user.role,
        active: user.active,
      });
      setIsEdit(true);
      setEditIdx(idx);
    } else {
      setForm({
        email: "",
        password: "",
        role: "",
        active: true,
      });
      setIsEdit(false);
      setEditIdx(null);
    }
    setModalOpen(true);
  }

  // Save user action (add or edit)
  function handleFormSubmit(e) {
    e.preventDefault();
    if (isEdit && editIdx !== null) {
      const updatedUsers = users.map((u, i) =>
        i === editIdx ? { email: form.email, role: form.role, active: form.active } : u
      );
      setUsers(updatedUsers);
    } else {
      setUsers(users.concat({ email: form.email, role: form.role, active: form.active }));
    }
    setModalOpen(false);
    setForm({ email: "", password: "", role: "", active: true });
  }

  // Fill form for editing
  function handleEdit(idx) {
    openModal(users[idx], idx);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(to right, rgb(236, 190, 126), white, white)"
    }}>
      <div className="container" style={{
        background: "#fff", padding: 30, borderRadius: 10, marginTop: 30,
        boxShadow: "0 0 15px rgba(0,0,0,0.1)"
      }}>
        <div className="d-flex justify-content-between align-items-center admin-heading" style={{ marginBottom: "1.5em" }}>
          <h3>Admin: User Management</h3>
          <button className="btn btn-primary"
            onClick={() => openModal()}>
            + Add User
          </button>
        </div>
        <table className="table table-bordered align-middle">
          <thead className="table-dark">
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={user.email}>
                <td>{user.email}</td>
                <td>{ROLES.find(r => r.value === user.role)?.label || user.role}</td>
                <td>
                  <span className={`badge bg-${user.active ? "success" : "secondary"}`}>
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-warning" onClick={() => handleEdit(idx)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Modal, simple implementation (show/hide with modalOpen) */}
        {modalOpen && (
          <div className="modal show fade" tabIndex={-1} style={{
            display: "block",
            background: "rgba(0,0,0,0.3)"
          }}>
            <div className="modal-dialog">
              <form className="modal-content" onSubmit={handleFormSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">{isEdit ? "Edit User" : "Add User"}</h5>
                  <button type="button" className="btn-close"
                    onClick={() => setModalOpen(false)}></button>
                </div>
                <div className="modal-body row g-3">
                  <div className="col-12">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control"
                      required value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Password</label>
                    <input type="password" className="form-control"
                      required value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Role</label>
                    <select className="form-select" required
                      value={form.role}
                      onChange={e => setForm({ ...form, role: e.target.value })}>
                      <option value="">Select role</option>
                      {ROLES.map(role =>
                        <option value={role.value} key={role.value}>{role.label}</option>
                      )}
                    </select>
                  </div>
                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox"
                        checked={form.active}
                        id="activeSwitch"
                        onChange={e => setForm({ ...form, active: e.target.checked })} />
                      <label className="form-check-label" htmlFor="activeSwitch">
                        Active User
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => setModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      {/* Bootstrap 5 CSS */}
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
    </div>
  );
}

export default AdminUserManagement;
