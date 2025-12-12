import React, { useState, useEffect } from "react";
import Navbar from "../NavBar/navbar";

const initialForm = {
  customer_id: null,
  date: "",
  branch: "",
  name: "",
  address: "",
  customer_type: "",
  status: "",
  year_of_establishment: "",
  director: "",
  pan: "",
  aadhar: "",
  branch_office: "",
  office_address: "",
  state: "",
  gstin: "",
  gst_remarks: "",
  annual_turnover: "",
  mto_iec_cha_validity: "",
  aeo_validity: "",
  export_commodities: "",
  email_export: "",
  email_import: "",
  bank_details: "",
  contact_person_export: "",
  contact_person_import: "",
};

const CUSTOMER_ROLES = [
  "Shipper",
  "Consignee",
  "Exporter",
  "Importer",
  "CHA",
  "CFS",
  "Freight Forwarder",
  "Business Associate",
  "Agent",
];

export default function KycListPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showModal, setShowModal] = useState(false); // add/edit modal
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState({
    gstin_doc: null,
    pan_doc: null,
    iec_doc: null,
    kyc_letterhead_doc: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [detailsCustomer, setDetailsCustomer] = useState(null); // view‑only modal

  function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  }

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
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      ...initialForm,
      date: today,
    });
    setFiles({
      gstin_doc: null,
      pan_doc: null,
      iec_doc: null,
      kyc_letterhead_doc: null,
    });
    setShowModal(true);
  }

  function handleEdit(cust) {
    setForm({
      ...initialForm,
      ...cust, // keep date from DB for existing records
    });
    setFiles({
      gstin_doc: null,
      pan_doc: null,
      iec_doc: null,
      kyc_letterhead_doc: null,
    });
    setShowModal(true);
  }

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

  function handleFileChange(e) {
    const { name, files: selected } = e.target;
    setFiles((prev) => ({ ...prev, [name]: selected[0] || null }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isEdit = !!form.customer_id;

      const formDataToSend = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataToSend.append(key, value);
        }
      });
      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          formDataToSend.append(key, file);
        }
      });

      const url = isEdit
        ? `/api/kyc/update/${form.customer_id}`
        : "/api/kyc/add";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          // don't set Content-Type manually for FormData
          ...getAuthHeaders(),
        },
        body: formDataToSend,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.message || "Failed to save customer");
        return;
      }

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

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.gstin?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  });

  function buildDocUrl(customerId, fieldName) {
    if (!customerId) return null;
    return `/s3/file?directory=customers/${customerId}&key=${fieldName}`;
  }

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
                    Customer Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">
                    Branch
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
                  <tr
                    key={c.customer_id}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={(e) => {
                      if (e.target.closest && e.target.closest("button"))
                        return;
                      setDetailsCustomer(c);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                      {c.name}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {c.customer_type || "-"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {c.branch || "-"}
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

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsCustomer(c);
                          }}
                          className="px-3 py-1 bg-slate-200 text-slate-800 rounded-md"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(c);
                          }}
                          className="px-3 py-1 bg-yellow-500 text-white rounded-md"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(c.customer_id);
                          }}
                          className="px-3 py-1 bg-red-500 text-white rounded-md"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal with table-based form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center text-gray-800">
          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold text-gray-800">
                KYC Customers Form
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-600 hover:text-gray-900 text-xl"
              >
                ✕
              </button>
            </div>

            <form id="kycForm" onSubmit={handleSubmit}>
              <table className="w-full border border-gray-400 text-sm">
                <tbody>
                  {/* Date / Branch */}
                  <tr className="border-b border-gray-400">
                    <td className="w-1/4 border-r border-gray-400 px-1 py-1 font-medium">
                      Date
                    </td>
                    <td className="w-1/4 border-r border-gray-400 px-1 py-1">
                      <input
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                        required
                        disabled
                      />
                    </td>
                    <td className="w-1/4 border-r border-gray-400 px-1 py-1 font-medium">
                      Branch
                    </td>
                    <td className="w-1/4 px-1 py-1">
                      <input
                        type="text"
                        name="branch"
                        value={form.branch}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                        required
                      />
                    </td>
                  </tr>

                  {/* Name of the Customer */}
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Name of the Customer
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                        required
                      />
                    </td>
                  </tr>

                  {/* Address */}
                  <tr className="border-b border-gray-400 align-top">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Address along with the State, Pin Code, Telephone Number
                      and Website
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <textarea
                        name="address"
                        value={form.address}
                        onChange={handleFormChange}
                        className="w-full outline-none resize-none"
                        rows={2}
                        required
                      />
                    </td>
                  </tr>

                  {/* Constitution - Type */}
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Constitution - Type of Customer (Pvt Limited, LTD,
                      Partnership, Proprietorship etc.)
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <input
                        type="text"
                        name="customer_type"
                        value={form.customer_type}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                        required
                      />
                    </td>
                  </tr>

                  {/* Constitution - Status (role text field) */}
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Constitution - Status of Customer (Shipping Line,
                      Exporter, Importer, CHA, Freight Forwarder, Business
                      Associate)
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <input
                        type="text"
                        name="status"
                        value={form.status}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                        required
                      />
                    </td>
                  </tr>

                  {/* Year of Establishment */}
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Year of Establishment
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <input
                        type="text"
                        name="year_of_establishment"
                        value={form.year_of_establishment}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                        required
                      />
                    </td>
                  </tr>

                  {/* Director / Partner */}
                  <tr className="border-b border-gray-400 align-top">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Name of Director/Partner with address and email Id
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <textarea
                        name="director"
                        value={form.director}
                        onChange={handleFormChange}
                        className="w-full outline-none resize-none"
                        rows={2}
                        required
                      />
                    </td>
                  </tr>

                  {/* PAN */}
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      PAN Number of the customer
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <input
                        type="text"
                        name="pan"
                        value={form.pan}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                        required
                      />
                    </td>
                  </tr>

                  {/* Aadhar */}
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Aadhar Card No. (In case of Sole Proprietor)
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <input
                        type="text"
                        name="aadhar"
                        value={form.aadhar}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                      />
                    </td>
                  </tr>

                  {/* Branch Offices */}
                  <tr className="border-b border-gray-400 align-top">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Branch Offices &amp; Address
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <textarea
                        name="branch_office"
                        value={form.branch_office}
                        onChange={handleFormChange}
                        className="w-full outline-none resize-none"
                        rows={2}
                      />
                    </td>
                  </tr>

                  {/* GSTIN header */}
                  <tr className="border-b border-gray-400 bg-gray-100">
                    <td className="border-r border-gray-400 px-1 py-1 font-semibold">
                      GSTIN Details
                    </td>
                    <td className="border-r border-gray-400 px-1 py-1 font-semibold">
                      Office/Billing Address
                    </td>
                    <td className="border-r border-gray-400 px-1 py-1 font-semibold">
                      State
                    </td>
                    <td className="px-1 py-1 font-semibold">GSTIN</td>
                  </tr>

                  {/* GSTIN row */}
                  <tr className="border-b border-gray-400 align-top">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Remarks, if Any
                    </td>
                    <td className="border-r border-gray-400 px-1 py-1">
                      <textarea
                        name="office_address"
                        value={form.office_address}
                        onChange={handleFormChange}
                        className="w-full outline-none resize-none"
                        rows={2}
                      />
                    </td>
                    <td className="border-r border-gray-400 px-1 py-1">
                      <input
                        type="text"
                        name="state"
                        value={form.state}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        name="gstin"
                        value={form.gstin}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                      />
                    </td>
                  </tr>

                  {/* GST remarks */}
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      GST Remarks
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <input
                        type="text"
                        name="gst_remarks"
                        value={form.gst_remarks}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                      />
                    </td>
                  </tr>

                  {/* Annual Turnover */}
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Annual Turnover
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <input
                        type="text"
                        name="annual_turnover"
                        value={form.annual_turnover}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                      />
                    </td>
                  </tr>

                  {/* MTO / IEC / CHA */}
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      MTO/IEC Code/CHA and validity
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <input
                        type="text"
                        name="mto_iec_cha_validity"
                        value={form.mto_iec_cha_validity}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                      />
                    </td>
                  </tr>

                  {/* AEO */}
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      AEO with Validity
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <input
                        type="text"
                        name="aeo_validity"
                        value={form.aeo_validity}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                      />
                    </td>
                  </tr>

                  {/* Export commodities */}
                  <tr className="border-b border-gray-400 align-top">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Export Commodities
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <textarea
                        name="export_commodities"
                        value={form.export_commodities}
                        onChange={handleFormChange}
                        className="w-full outline-none resize-none"
                        rows={2}
                      />
                    </td>
                  </tr>

                  {/* Email export */}
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Email ID for receiving BL Drafts, Export Queries, DSR,
                      Invoice
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <input
                        type="email"
                        name="email_export"
                        value={form.email_export}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                      />
                    </td>
                  </tr>

                  {/* Email import */}
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Email Id for receiving Arrival Notices, DO, Import
                      Queries, DSR, Invoices
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <input
                        type="email"
                        name="email_import"
                        value={form.email_import}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                      />
                    </td>
                  </tr>

                  {/* Bank details */}
                  <tr className="border-b border-gray-400 align-top">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium">
                      Bank Details
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <textarea
                        name="bank_details"
                        value={form.bank_details}
                        onChange={handleFormChange}
                        className="w-full outline-none resize-none"
                        rows={2}
                      />
                    </td>
                  </tr>

                  {/* Contact person header */}
                  <tr className="border-b border-gray-400 bg-gray-100">
                    <td className="border-r border-gray-400 px-1 py-1 font-semibold">
                      Contact Person with Phone Number
                    </td>
                    <td className="border-r border-gray-400 px-1 py-1 font-semibold">
                      Export
                    </td>
                    <td colSpan={2} className="px-1 py-1 font-semibold">
                      Import
                    </td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="border-r border-gray-400 px-1 py-1"></td>
                    <td className="border-r border-gray-400 px-1 py-1">
                      <input
                        type="text"
                        name="contact_person_export"
                        value={form.contact_person_export}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                      />
                    </td>
                    <td colSpan={2} className="px-1 py-1">
                      <input
                        type="text"
                        name="contact_person_import"
                        value={form.contact_person_import}
                        onChange={handleFormChange}
                        className="w-full outline-none"
                      />
                    </td>
                  </tr>

                  {/* Upload docs */}
                  <tr className="border-b border-gray-400 align-top">
                    <td className="border-r border-gray-400 px-1 py-1 font-medium align-top">
                      Upload Documents (self-attested copies)
                    </td>
                    <td colSpan={3} className="px-1 py-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-xs">
                            GST Certificate
                          </label>
                          <input
                            type="file"
                            name="gstin_doc"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="block w-full text-xs text-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-xs">
                            PAN Card
                          </label>
                          <input
                            type="file"
                            name="pan_doc"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="block w-full text-xs text-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-xs">
                            IEC Form
                          </label>
                          <input
                            type="file"
                            name="iec_doc"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="block w-full text-xs text-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-xs">
                            KYC Form (Signed with Letterhead)
                          </label>
                          <input
                            type="file"
                            name="kyc_letterhead_doc"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="block w-full text-xs text-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-center mt-4 gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-2 rounded-lg text-sm"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-blue-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>

              {msg && (
                <div className="text-center text-xs text-gray-700 mt-1">
                  {msg}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* View-only details + docs modal */}
      {detailsCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={() => setDetailsCustomer(null)}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold text-gray-800">
                Customer Details
              </h3>
              <button
                onClick={() => setDetailsCustomer(null)}
                className="text-gray-600 hover:text-gray-900 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold">Name:</span>{" "}
                  {detailsCustomer.name}
                </div>
                <div>
                  <span className="font-semibold">Role:</span>{" "}
                  {detailsCustomer.customer_type || "-"}
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{" "}
                  {detailsCustomer.status}
                </div>
                <div>
                  <span className="font-semibold">Branch:</span>{" "}
                  {detailsCustomer.branch || "-"}
                </div>
              </div>

              <div>
                <span className="font-semibold">Address:</span>
                <div className="mt-1 text-slate-700 whitespace-pre-wrap">
                  {detailsCustomer.address || "-"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold">
                    Year of Establishment:
                  </span>{" "}
                  {detailsCustomer.year_of_establishment || "-"}
                </div>
                <div>
                  <span className="font-semibold">PAN:</span>{" "}
                  {detailsCustomer.pan || "-"}
                </div>
              </div>

              <div>
                <span className="font-semibold">
                  Director / Partner details:
                </span>
                <div className="mt-1 text-slate-700 whitespace-pre-wrap">
                  {detailsCustomer.director || "-"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold">Aadhar:</span>{" "}
                  {detailsCustomer.aadhar || "-"}
                </div>
                <div>
                  <span className="font-semibold">Branch Offices:</span>{" "}
                  {detailsCustomer.branch_office || "-"}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold mt-4 mb-2">
                  GST Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <span className="font-semibold">
                      Office/Billing Address:
                    </span>
                    <div className="mt-1 text-slate-700 whitespace-pre-wrap">
                      {detailsCustomer.office_address || "-"}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold">State:</span>{" "}
                    {detailsCustomer.state || "-"}
                    <br />
                    <span className="font-semibold">GSTIN:</span>{" "}
                    {detailsCustomer.gstin || "-"}
                  </div>
                </div>
              </div>

              <div>
                <span className="font-semibold">Remarks:</span>
                <div className="mt-1 text-slate-700 whitespace-pre-wrap">
                  {detailsCustomer.remarks || "-"}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-lg font-semibold mb-2">Documents</h4>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  <li>
                    GST Certificate:{" "}
                    <a
                      href={buildDocUrl(
                        detailsCustomer.customer_id,
                        "gstin_doc"
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View
                    </a>
                  </li>
                  <li>
                    PAN Card:{" "}
                    <a
                      href={buildDocUrl(
                        detailsCustomer.customer_id,
                        "pan_doc"
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View
                    </a>
                  </li>
                  <li>
                    IEC Form:{" "}
                    <a
                      href={buildDocUrl(detailsCustomer.customer_id, "iec_doc")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View
                    </a>
                  </li>
                  <li>
                    KYC Form (Signed Letterhead):{" "}
                    <a
                      href={buildDocUrl(
                        detailsCustomer.customer_id,
                        "kyc_letterhead_doc"
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-center mt-6">
              <button
                onClick={() => setDetailsCustomer(null)}
                className="px-8 py-2 bg-gray-800 rounded-xl text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
