import React, { useState, useEffect } from "react";
import Navbar from "../NavBar/navbar";

const initialForm = {
  customer_id: null,
  date: "",
  branch: "",
  name: "",
  address: "",
  customer_type: "",
  status: "Active",
  year_of_establishment: "",
  pan: "",
  director: "",
  aadhar: "",
  branch_office: "",
  office_address: "",
  state: "",
  gstin: "",
  remarks: "",
};

export default function KycListPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  // helper to add auth header if you use JWT
  function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  }

  // LOAD ALL CUSTOMERS (GET /api/kyc)
  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetch("/api/kyc", {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });

      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setMsg(data?.message || "Failed to fetch customers");
      } else {
        // backend returns plain array: res.json(customers)
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function openAddModal() {
    setForm(initialForm);
    setShowModal(true);
  }

  function handleEdit(cust) {
    setForm({
      ...initialForm,
      ...cust, // contains customer_id from DB
    });
    setShowModal(true);
  }

  // DELETE /api/kyc/delete/:id
  async function handleDelete(id) {
    if (!window.confirm("Delete customer?")) return;

    try {
      const res = await fetch(`/api/kyc/delete/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.message || "Failed to delete customer");
        return;
      }

      setCustomers((prev) => prev.filter((c) => c.customer_id !== id));
      setMsg("Customer deleted");
      setTimeout(() => setMsg(""), 2000);
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // CREATE or UPDATE
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isEdit = !!form.customer_id;

      // routes from your code
      const url = isEdit
        ? `/api/kyc/update/${form.customer_id}`
        : "/api/kyc/add";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.message || "Failed to save customer");
        return;
      }

      // backend returns `res.json(customer)` for update, and similar for add
      const savedCustomer = data;

      if (isEdit) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.customer_id === savedCustomer.customer_id ? savedCustomer : c
          )
        );
        setMsg("Customer updated");
      } else {
        setCustomers((prev) => [savedCustomer, ...prev]);
        setMsg("Customer added");
      }

      setTimeout(() => setMsg(""), 2500);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  // simple client-side search
  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.gstin?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen p-20">
      <Navbar />
      <div className="max-w-5xl mx-auto mt-8 p-10 bg-white rounded-3xl shadow-2xl text-black">
        <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
          KYC Customers
        </h3>

        {msg && (
          <div className="mb-4 p-2 rounded bg-green-100 text-green-700">
            {msg}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">
            Customer List
          </h2>

          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name / GSTIN / address..."
              aria-label="Search customers"
              className="px-3 py-2 rounded-full bg-gray-100 placeholder-slate-500 text-slate-800 w-64 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />

            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full"
            >
              Add Customer +
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">
                    GSTIN
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 text-center text-sm text-slate-500"
                    >
                      No customers found
                    </td>
                  </tr>
                )}
                {filteredCustomers.map((c) => (
                  <tr key={c.customer_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                      {c.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {c.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {c.gstin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          c.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded-md"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c.customer_id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-md"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold text-gray-800">
                KYC Form
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-600 hover:text-gray-900 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    name="date"
                    value={form.date}
                    onChange={handleFormChange}
                    type="date"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <input
                    name="branch"
                    value={form.branch}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name of the Customer
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                  className="w-full p-3 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address with State, Pin Code, Phone, Website
                </label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full p-3 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type of Customer
                  </label>
                  <input
                    name="customer_type"
                    value={form.customer_type}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                    placeholder="Type / Category"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year of Establishment
                  </label>
                  <input
                    name="year_of_establishment"
                    value={form.year_of_establishment}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Number
                  </label>
                  <input
                    name="pan"
                    value={form.pan}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name of Director/Partner with address and email
                </label>
                <textarea
                  name="director"
                  value={form.director}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full p-3 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhar Card No. (For Sole Proprietor)
                  </label>
                  <input
                    name="aadhar"
                    value={form.aadhar}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Offices & Address
                  </label>
                  <input
                    name="branch_office"
                    value={form.branch_office}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-lg font-medium text-gray-700 mb-2">
                  GST Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Office/Billing Address
                    </label>
                    <textarea
                      name="office_address"
                      value={form.office_address}
                      onChange={handleFormChange}
                      rows={2}
                      className="w-full p-3 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      name="state"
                      value={form.state}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GSTIN
                    </label>
                    <input
                      name="gstin"
                      value={form.gstin}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full p-3 border rounded-xl"
                />
              </div>

              <div className="flex items-center justify-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-10 py-3 bg-blue-600 text-white rounded-xl hover:scale-[1.02] transform transition"
                >
                  {submitting ? "Saving..." : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-blue-200 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
