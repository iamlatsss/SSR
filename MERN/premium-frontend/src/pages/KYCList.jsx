import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import {
    Search, Plus, Filter, FileText, Edit, Trash2, X, Download, Eye, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "react-toastify";

const INITIAL_FORM = {
    customer_id: null,
    date: "", branch: "", name: "", address: "", customer_type: "", status: "",
    year_of_establishment: "", director: "", pan: "", aadhar: "", branch_office: "",
    office_address: "", state: "", gstin: "", gst_remarks: "", annual_turnover: "",
    mto_iec_cha_validity: "", aeo_validity: "", export_commodities: "",
    email_export: "", email_import: "", bank_details: "",
    contact_person_export: "", contact_person_import: ""
};

const KYCList = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(INITIAL_FORM);
    const [files, setFiles] = useState({
        gstin_doc: null, pan_doc: null, iec_doc: null, kyc_letterhead_doc: null
    });
    const [submitting, setSubmitting] = useState(false);
    const [detailsCustomer, setDetailsCustomer] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        loadCustomers();
    }, []);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const loadCustomers = async () => {
        try {
            const res = await api.get("/kyc");
            setCustomers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load customers");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (cust = null) => {
        if (cust) {
            setForm({ ...INITIAL_FORM, ...cust });
        } else {
            setForm({
                ...INITIAL_FORM,
                date: (() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                })(),
            });
        }
        setFiles({ gstin_doc: null, pan_doc: null, iec_doc: null, kyc_letterhead_doc: null });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete customer?")) return;
        try {
            await api.delete(`/kyc/delete/${id}`);
            setCustomers(prev => prev.filter(c => c.customer_id !== id));
            toast.success("Customer deleted");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete customer");
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const { name, files: selected } = e.target;
        setFiles(prev => ({ ...prev, [name]: selected[0] || null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const isEdit = !!form.customer_id;
            const url = isEdit ? `/kyc/update/${form.customer_id}` : "/kyc/add";

            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== "") {
                    formData.append(key, value);
                }
            });
            Object.entries(files).forEach(([key, file]) => {
                if (file) formData.append(key, file);
            });

            const res = isEdit
                ? await api.put(url, formData)
                : await api.post(url, formData);

            const data = res.data;
            if (isEdit) {
                toast.success("Customer updated");
            } else {
                toast.success("Customer added");
            }
            await loadCustomers(); // Refresh list to get generated signed URLs
            setShowModal(false);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to save customer");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.gstin || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    return (
        <DashboardLayout title="KYC Management">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search Name or GSTIN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm"
                >
                    <Plus size={20} /> Add Customer
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>
            ) : (
                <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                                    <th className="p-4">Customer Name</th>
                                    <th className="p-4">Type & Role</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {currentCustomers.length === 0 ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-slate-500">No customers found.</td></tr>
                                ) : (
                                    currentCustomers.map(c => (
                                        <tr key={c.customer_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => setDetailsCustomer(c)}>
                                            <td className="p-4">
                                                <div className="font-medium text-slate-800 dark:text-white">{c.name}</div>
                                                <div className="text-xs text-slate-500">{c.gstin || "No GSTIN"}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-slate-700 dark:text-slate-300">{c.customer_type}</div>
                                                <div className="text-xs text-slate-500">{c.status} (Role)</div>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                                                <div>{c.email_export || c.email_import || "—"}</div>
                                                <div>{c.contact_person_export || "—"}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
                                                    {c.status || "Unknown"}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setDetailsCustomer(c)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors" title="View Details">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => handleOpenModal(c)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(c.customer_id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredCustomers.length > 0 && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/20">
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <span>Rows per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                                <span className="ml-2">
                                    Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredCustomers.length)} of {filteredCustomers.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                <div className="flex gap-1">
                                    {(() => {
                                        const pages = [];
                                        let startPage = Math.max(1, currentPage - 2);
                                        let endPage = Math.min(totalPages, startPage + 4);

                                        if (endPage - startPage + 1 < Math.min(5, totalPages)) {
                                            startPage = Math.max(1, endPage - Math.min(5, totalPages) + 1);
                                        }

                                        for (let p = startPage; p <= endPage; p++) {
                                            pages.push(p);
                                        }
                                        return pages.map(pageNum => (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                                                    ? "bg-indigo-600 text-white"
                                                    : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        ));
                                    })()}
                                </div>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-5xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                {form.customer_id ? "Edit Customer" : "Add New Customer"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>

                        <form id="kycForm" onSubmit={handleSubmit} className="p-6">
                            <table className="w-full border border-gray-400 text-sm">
                                <tbody>
                                    {/* Date / Branch */}
                                    <tr className="border-b border-gray-400">
                                        <td className="w-1/4 border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Date
                                        </td>
                                        <td className="w-1/4 border-r border-gray-400 px-1 py-1">
                                            <input
                                                type="date"
                                                name="date"
                                                value={form.date}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                                required
                                            />
                                        </td>
                                        <td className="w-1/4 border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Branch
                                        </td>
                                        <td className="w-1/4 px-1 py-1">
                                            <input
                                                type="text"
                                                name="branch"
                                                value={form.branch}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                                required
                                            />
                                        </td>
                                    </tr>

                                    {/* Name of the Customer */}
                                    <tr className="border-b border-gray-400">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Name of the Customer
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <input
                                                type="text"
                                                name="name"
                                                value={form.name}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                                required
                                            />
                                        </td>
                                    </tr>

                                    {/* Address */}
                                    <tr className="border-b border-gray-400 align-top">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Address along with the State, Pin Code, Telephone Number and Website
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <textarea
                                                name="address"
                                                value={form.address}
                                                onChange={handleFormChange}
                                                className="w-full outline-none resize-none bg-transparent dark:text-white"
                                                rows={2}
                                                required
                                            />
                                        </td>
                                    </tr>

                                    {/* Constitution - Type */}
                                    <tr className="border-b border-gray-400">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Constitution - Type of Customer (Pvt Limited, LTD, Partnership, Proprietorship etc.)
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <input
                                                type="text"
                                                name="customer_type"
                                                value={form.customer_type}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                                required
                                            />
                                        </td>
                                    </tr>

                                    {/* Constitution - Status */}
                                    <tr className="border-b border-gray-400">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Constitution - Status of Customer (Shipping Line, Exporter, Importer, CHA, Freight Forwarder, Business Associate)
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <input
                                                type="text"
                                                name="status"
                                                value={form.status}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                                required
                                            />
                                        </td>
                                    </tr>

                                    {/* Year of Establishment */}
                                    <tr className="border-b border-gray-400">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Year of Establishment
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <input
                                                type="text"
                                                name="year_of_establishment"
                                                value={form.year_of_establishment}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                                required
                                            />
                                        </td>
                                    </tr>

                                    {/* Director / Partner */}
                                    <tr className="border-b border-gray-400 align-top">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Name of Director/Partner with address and email Id
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <textarea
                                                name="director"
                                                value={form.director}
                                                onChange={handleFormChange}
                                                className="w-full outline-none resize-none bg-transparent dark:text-white"
                                                rows={2}
                                                required
                                            />
                                        </td>
                                    </tr>

                                    {/* PAN */}
                                    <tr className="border-b border-gray-400">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            PAN Number of the customer
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <input
                                                type="text"
                                                name="pan"
                                                value={form.pan}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                                required
                                            />
                                        </td>
                                    </tr>

                                    {/* Aadhar */}
                                    <tr className="border-b border-gray-400">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Aadhar Card No. (In case of Sole Proprietor)
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <input
                                                type="text"
                                                name="aadhar"
                                                value={form.aadhar}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                            />
                                        </td>
                                    </tr>

                                    {/* Branch Offices */}
                                    <tr className="border-b border-gray-400 align-top">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Branch Offices &amp; Address
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <textarea
                                                name="branch_office"
                                                value={form.branch_office}
                                                onChange={handleFormChange}
                                                className="w-full outline-none resize-none bg-transparent dark:text-white"
                                                rows={2}
                                            />
                                        </td>
                                    </tr>

                                    {/* GSTIN Details header row */}
                                    <tr className="border-b border-gray-400 bg-gray-100 dark:bg-slate-800">
                                        <td className="border-r border-gray-400 px-1 py-1 font-semibold dark:text-gray-300">
                                            GSTIN Details
                                        </td>
                                        <td className="border-r border-gray-400 px-1 py-1 font-semibold dark:text-gray-300">
                                            Office/Billing Address
                                        </td>
                                        <td className="border-r border-gray-400 px-1 py-1 font-semibold dark:text-gray-300">
                                            State
                                        </td>
                                        <td className="px-1 py-1 font-semibold dark:text-gray-300">GSTIN</td>
                                    </tr>

                                    {/* GSTIN Details row */}
                                    <tr className="border-b border-gray-400 align-top">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Remarks, if Any
                                        </td>
                                        <td className="border-r border-gray-400 px-1 py-1">
                                            <textarea
                                                name="office_address"
                                                value={form.office_address}
                                                onChange={handleFormChange}
                                                className="w-full outline-none resize-none bg-transparent dark:text-white"
                                                rows={2}
                                            />
                                        </td>
                                        <td className="border-r border-gray-400 px-1 py-1">
                                            <input
                                                type="text"
                                                name="state"
                                                value={form.state}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            <input
                                                type="text"
                                                name="gstin"
                                                value={form.gstin}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                            />
                                        </td>
                                    </tr>

                                    {/* GST Remarks */}
                                    <tr className="border-b border-gray-400">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            GST Remarks
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <input
                                                type="text"
                                                name="gst_remarks"
                                                value={form.gst_remarks}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                            />
                                        </td>
                                    </tr>

                                    {/* Annual Turnover */}
                                    <tr className="border-b border-gray-400">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Annual Turnover
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <input
                                                type="text"
                                                name="annual_turnover"
                                                value={form.annual_turnover}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                            />
                                        </td>
                                    </tr>

                                    {/* MTO / IEC / CHA and validity */}
                                    <tr className="border-b border-gray-400">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            MTO/IEC Code/CHA and validity
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <input
                                                type="text"
                                                name="mto_iec_cha_validity"
                                                value={form.mto_iec_cha_validity}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                            />
                                        </td>
                                    </tr>

                                    {/* AEO with Validity */}
                                    <tr className="border-b border-gray-400">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            AEO with Validity
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <input
                                                type="text"
                                                name="aeo_validity"
                                                value={form.aeo_validity}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                            />
                                        </td>
                                    </tr>

                                    {/* Export Commodities */}
                                    <tr className="border-b border-gray-400 align-top">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Export Commodities
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <textarea
                                                name="export_commodities"
                                                value={form.export_commodities}
                                                onChange={handleFormChange}
                                                className="w-full outline-none resize-none bg-transparent dark:text-white"
                                                rows={2}
                                            />
                                        </td>
                                    </tr>

                                    {/* Email for Export */}
                                    <tr className="border-b border-gray-400">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Email ID for receiving BL Drafts, Export Queries, DSR, Invoice
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <input
                                                type="email"
                                                name="email_export"
                                                value={form.email_export}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                            />
                                        </td>
                                    </tr>

                                    {/* Email for Import */}
                                    <tr className="border-b border-gray-400">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Email Id for receiving Arrival Notices, DO, Import Queries, DSR, Invoices
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <input
                                                type="email"
                                                name="email_import"
                                                value={form.email_import}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                            />
                                        </td>
                                    </tr>

                                    {/* Bank Details */}
                                    <tr className="border-b border-gray-400 align-top">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Bank Details
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <textarea
                                                name="bank_details"
                                                value={form.bank_details}
                                                onChange={handleFormChange}
                                                className="w-full outline-none resize-none bg-transparent dark:text-white"
                                                rows={2}
                                            />
                                        </td>
                                    </tr>

                                    {/* Contact Person with Phone Number */}
                                    <tr className="border-b border-gray-400 bg-gray-100 dark:bg-slate-800">
                                        <td className="border-r border-gray-400 px-1 py-1 font-semibold dark:text-gray-300">
                                            Contact Person with Phone Number
                                        </td>
                                        <td className="border-r border-gray-400 px-1 py-1 font-semibold dark:text-gray-300">
                                            Export
                                        </td>
                                        <td colSpan={2} className="px-1 py-1 font-semibold dark:text-gray-300">
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
                                                className="w-full outline-none bg-transparent dark:text-white"
                                            />
                                        </td>
                                        <td colSpan={2} className="px-1 py-1">
                                            <input
                                                type="text"
                                                name="contact_person_import"
                                                value={form.contact_person_import}
                                                onChange={handleFormChange}
                                                className="w-full outline-none bg-transparent dark:text-white"
                                            />
                                        </td>
                                    </tr>

                                    {/* Document uploads row */}
                                    <tr className="border-b border-gray-400 align-top">
                                        <td className="border-r border-gray-400 px-1 py-1 font-medium align-top bg-gray-50 dark:bg-slate-700/50 dark:text-gray-300">
                                            Upload Documents (self-attested copies)
                                        </td>
                                        <td colSpan={3} className="px-1 py-1">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {[
                                                    { label: "GST Certificate", name: "gstin_doc" },
                                                    { label: "PAN Card", name: "pan_doc" },
                                                    { label: "IEC Form", name: "iec_doc" },
                                                    { label: "KYC Form (Signed with Letterhead)", name: "kyc_letterhead_doc" }
                                                ].map((field) => (
                                                    <div key={field.name}>
                                                        <div className="flex justify-between items-center mb-1">
                                                            <label className="block text-gray-700 dark:text-gray-300 font-medium text-xs">
                                                                {field.label}
                                                            </label>
                                                            {form[`${field.name}_url`] && (
                                                                <a
                                                                    href={form[`${field.name}_url`]}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-indigo-600 dark:text-indigo-400 text-xs hover:underline flex items-center gap-1"
                                                                >
                                                                    <Eye size={12} /> View Current
                                                                </a>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            name={field.name}
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={handleFileChange}
                                                            className="block w-full text-xs text-slate-700 dark:text-slate-300
                                                            file:mr-3 file:py-1 file:px-3
                                                            file:rounded-lg file:border-0
                                                            file:text-xs file:font-semibold
                                                            file:bg-blue-50 file:text-blue-700
                                                            hover:file:bg-blue-100 dark:file:bg-slate-700 dark:file:text-slate-200 border border-gray-300 dark:border-slate-600 rounded-lg
                                                            focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="flex justify-center mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 mr-4 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium">Cancel</button>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-2 rounded-lg text-sm shadow-md"
                                >
                                    {submitting ? "Submitting..." : "Submit"}
                                </button>
                            </div>

                            {/* Legacy container for potential error messages if needed, though toast handles it */}
                            <div className="text-center text-xs text-gray-700 mt-1"></div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {detailsCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDetailsCustomer(null)}>
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{detailsCustomer.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Customer ID: {detailsCustomer.customer_id} • Status: {detailsCustomer.status}</p>
                            </div>
                            <button onClick={() => setDetailsCustomer(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <X size={24} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                            </button>
                        </div>

                        <div className="p-6 space-y-8 text-sm">
                            {/* Section 1: General Info */}
                            <div>
                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">General Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">Date</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.date || "—"}</span></div>
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">Branch</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.branch || "—"}</span></div>
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">Year of Est.</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.year_of_establishment || "—"}</span></div>
                                    <div className="md:col-span-3"><span className="block text-slate-500 text-xs uppercase mb-1">Address</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.address || "—"}</span></div>
                                </div>
                            </div>

                            {/* Section 2: Constitution & Legal */}
                            <div>
                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Constitution & Legal</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">Type</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.customer_type || "—"}</span></div>
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">PAN No</span> <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">{detailsCustomer.pan || "—"}</span></div>
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">Aadhar No</span> <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">{detailsCustomer.aadhar || "—"}</span></div>
                                    <div className="md:col-span-3"><span className="block text-slate-500 text-xs uppercase mb-1">Director/Partner</span> <span className="font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{detailsCustomer.director || "—"}</span></div>
                                </div>
                            </div>

                            {/* Section 3: Branch & GST Details */}
                            <div>
                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Branch & GST Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2"><span className="block text-slate-500 text-xs uppercase mb-1">Branch Offices</span> <span className="font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{detailsCustomer.branch_office || "—"}</span></div>

                                    <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div><span className="block text-slate-500 text-xs uppercase mb-1">GSTIN</span> <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">{detailsCustomer.gstin || "—"}</span></div>
                                            <div><span className="block text-slate-500 text-xs uppercase mb-1">State</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.state || "—"}</span></div>
                                            <div><span className="block text-slate-500 text-xs uppercase mb-1">Specific Remarks</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.office_address || "—"}</span></div>
                                            <div className="md:col-span-3 pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                                                <span className="block text-slate-500 text-xs uppercase mb-1">GST Remarks</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.gst_remarks || "—"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Business Info */}
                            <div>
                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Business Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">Annual Turnover</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.annual_turnover || "—"}</span></div>
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">MTO/IEC/CHA Validity</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.mto_iec_cha_validity || "—"}</span></div>
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">AEO Validity</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.aeo_validity || "—"}</span></div>
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">Export Commodities</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.export_commodities || "—"}</span></div>
                                </div>
                            </div>

                            {/* Section 5: Contact & Banking */}
                            <div>
                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Contact & Banking</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">Email (Export)</span> <span className="font-medium text-indigo-600 dark:text-indigo-400">{detailsCustomer.email_export || "—"}</span></div>
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">Email (Import)</span> <span className="font-medium text-indigo-600 dark:text-indigo-400">{detailsCustomer.email_import || "—"}</span></div>
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">Contact Person (Export)</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.contact_person_export || "—"}</span></div>
                                    <div><span className="block text-slate-500 text-xs uppercase mb-1">Contact Person (Import)</span> <span className="font-medium text-slate-800 dark:text-slate-200">{detailsCustomer.contact_person_import || "—"}</span></div>
                                    <div className="md:col-span-2 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                        <span className="block text-orange-600 dark:text-orange-400 text-xs uppercase mb-1 font-bold">Bank Details</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{detailsCustomer.bank_details || "—"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Documents Section */}
                            <div>
                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Uploaded Documents</h4>
                                <div className="flex flex-wrap gap-4">
                                    {['gstin_doc', 'pan_doc', 'iec_doc', 'kyc_letterhead_doc'].map(doc => (
                                        detailsCustomer[`${doc}_url`] ? (
                                            <a key={doc} href={detailsCustomer[`${doc}_url`]} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all">
                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{doc.replace('_doc', '').replace('_', ' ')}</span>
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">View Document</span>
                                                </div>
                                            </a>
                                        ) : (
                                            <div key={doc} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl opacity-60 grayscale">
                                                <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-400">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <span className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{doc.replace('_doc', '').replace('_', ' ')}</span>
                                                    <span className="text-sm font-semibold text-slate-500">Not Uploaded</span>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end rounded-b-2xl">
                            <button onClick={() => setDetailsCustomer(null)} className="px-6 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default KYCList;
