import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { Search, Plus, Trash2, X, FileText, Calculator, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import InvoicePreview from "../components/InvoicePreview";

const INITIAL_ROW = {
    id: Date.now(),
    chargeName: "",
    isGST: false,
    isTDS: false,
    unit: "20' GP",
    qty: 1,
    rate: 0,
    currency: "INR",
    exRate: 1.0,
    amountINR: 0,
    amountFC: 0,
    narration: ""
};

const Invoice = () => {
    const navigate = useNavigate();

    // Job Selection State
    const [jobs, setJobs] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Invoice Modal State (Removed - Refactored to Page)
    const [showPreview, setShowPreview] = useState(false);

    // Preview States (Only needed for Dashboard Preview)
    const [selectedJob, setSelectedJob] = useState(null);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [invoiceDate, setInvoiceDate] = useState("");
    const [totals, setTotals] = useState({});

    // Totals State (Removed from here, calculated in Generator or Preview only)

    const [chargeOptions, setChargeOptions] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [jobsResponse, invoiceResponse, customersResponse] = await Promise.all([
                api.get("/booking/get"),
                api.get("/invoice/all"),
                api.get("/booking/init")
            ]);

            if (jobsResponse.data.success) {
                setJobs(jobsResponse.data.bookings || []);
            }
            if (invoiceResponse.data.success) {
                setInvoices(invoiceResponse.data.invoices || []);
            }
            if (customersResponse.data.success) {
                setCustomers(customersResponse.data.customers || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const filteredOptions = useMemo(() => {
        if (!jobs) return [];

        // Filter jobs based on status (in-transit, completed) and search query
        const allowedStatuses = ["completed", "in-transit", "in transit"];

        return jobs.filter(job => {
            const matchesStatus = allowedStatuses.includes(job.status?.toLowerCase());
            const matchesSearch =
                job.job_no?.toString().includes(searchQuery) ||
                job.shipper_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.consignee_name?.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesStatus && matchesSearch;
        });
    }, [jobs, searchQuery]);

    // Pagination Logic
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredOptions.slice(indexOfFirstRow, indexOfLastRow);

    const handleCreateInvoice = (job) => {
        navigate(`/invoice/edit/${job.job_no}`);
    };

    // Removed handleSaveInvoice, updateRow, effects etc. as they are now in InvoiceGenerator.

    const getCustomerDetails = () => {
        if (!selectedJob || !customers.length) return null;
        return customers.find(c => c.name?.toLowerCase() === selectedJob.shipper_name?.toLowerCase()) ||
            { name: selectedJob.shipper_name, address: "Address not found in KYC", gstin: "N/A" };
    };

    return (
        <DashboardLayout title="Generate Invoice">
            {/* Dashboard Table View */}
            <div className="bg-white dark:bg-dark-card rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
                {/* Search Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Recent Jobs</h2>
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by Job No, Shipper..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                                    <th className="p-4 w-16">Edit</th>
                                    <th className="p-4">Job No</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Shipper</th>
                                    <th className="p-4">Route</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Invoice Status</th>
                                    <th className="p-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <tr><td colSpan="8" className="p-8 text-center text-slate-500">Loading jobs...</td></tr>
                                ) : filteredOptions.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="p-8 text-center text-slate-500">
                                            No active jobs found (In-Transit or Completed).
                                        </td>
                                    </tr>
                                ) : currentRows.map((job) => {
                                    // Check if we have an existing invoice for this job
                                    const inv = invoices.find(i => i.job_no === job.job_no);
                                    const totals = inv?.totals ? (typeof inv.totals === 'string' ? JSON.parse(inv.totals) : inv.totals) : { grandTotal: 0 };

                                    return (
                                        <tr key={job.job_no} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            {/* Edit Action */}
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleCreateInvoice(job)}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                                                    title={inv ? "Edit Invoice" : "Create Invoice"}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                </button>
                                            </td>

                                            {/* Job No */}
                                            <td className="p-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                                                #{job.job_no}
                                            </td>

                                            {/* Date */}
                                            <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                                                {new Date(job.created_at).toLocaleDateString()}
                                            </td>

                                            {/* Shipper */}
                                            <td className="p-4">
                                                <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">{job.shipper_name || "—"}</div>
                                                <div className="text-xs text-slate-500">{job.consignee_name}</div>
                                            </td>

                                            {/* Route */}
                                            <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                                                {job.pol} → {job.pod}
                                            </td>

                                            {/* Job Status */}
                                            <td className="p-4">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize
                                                ${job.status === 'completed' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
                                                        job.status === 'in-transit' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                                                            'bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'}`}>
                                                    {job.status}
                                                </span>
                                            </td>

                                            {/* Invoice Status */}
                                            <td className="p-4">
                                                {inv ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded text-xs font-medium">Generated</span>
                                                        <span className="text-xs text-slate-500">{inv.invoice_no}</span>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedJob(job);
                                                                if (inv) {
                                                                    setInvoiceNo(inv.invoice_no);
                                                                    setInvoiceDate(inv.invoice_date);
                                                                    setTotals(totals);
                                                                    setInvoiceItems(typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items);
                                                                }
                                                                setShowPreview(true);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-indigo-600"
                                                            title="View PDF"
                                                        >
                                                            <Printer size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-sm italic">Pending</span>
                                                )}
                                            </td>

                                            {/* Amount */}
                                            <td className="p-4 text-right font-medium text-slate-900 dark:text-white">
                                                {totals.grandTotal > 0 ? totals.grandTotal.toFixed(2) : "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Pagination Controls */}
                {filteredOptions.length > 0 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/20">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <span>Rows per page:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
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
                                Showing {indexOfFirstRow + 1}-{Math.min(indexOfLastRow, filteredOptions.length)} of {filteredOptions.length}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex gap-1">
                                {(() => {
                                    const totalPages = Math.ceil(filteredOptions.length / rowsPerPage);
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
                                            onClick={() => setCurrentPage(pageNum)}
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
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredOptions.length / rowsPerPage)))}
                                disabled={currentPage === Math.ceil(filteredOptions.length / rowsPerPage)}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showPreview && selectedJob && (
                <InvoicePreview
                    data={{
                        invoiceNo,
                        invoiceDate,
                        job: selectedJob,
                        customer: getCustomerDetails(),
                        items: invoiceItems,
                        totals
                    }}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </DashboardLayout>
    );

};

export default Invoice;
