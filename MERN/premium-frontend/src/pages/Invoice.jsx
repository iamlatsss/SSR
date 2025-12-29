import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { Search, Plus, Trash2, X, FileText, Calculator, Printer } from "lucide-react";
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
    // Job Selection State
    const [jobs, setJobs] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);

    // Invoice Modal State
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [invoiceItems, setInvoiceItems] = useState([INITIAL_ROW]);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

    // Totals State
    const [totals, setTotals] = useState({
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        grandTotal: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    // Load Jobs and Customers
    const fetchData = async () => {
        try {
            const [jobsRes, initRes] = await Promise.all([
                api.get("/booking/get"),
                api.get("/booking/init")
            ]);

            if (jobsRes.data.success) {
                setJobs(jobsRes.data.bookings || []);
            }
            if (initRes.data.success) {
                setCustomers(initRes.data.customers || []);
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    // Filter Jobs (Confirmed/Completed/In-Transit)
    const filteredOptions = useMemo(() => {
        const allowedStatuses = ["confirmed", "completed", "in-transit"];
        const validJobs = jobs.filter(j => allowedStatuses.includes(j.status));

        if (!searchQuery) return validJobs;

        return validJobs.filter(j =>
            String(j.job_no).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (j.shipper_name || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [jobs, searchQuery]);

    const handleSelectJob = (job) => {
        setSelectedJob(job);
        setSearchQuery(`#${job.job_no} - ${job.shipper_name}`);
        setIsDropdownOpen(false);
        // Reset modal state when new job selected
        setInvoiceNo("");
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setInvoiceItems([{ ...INITIAL_ROW, id: Date.now() }]);
    };

    // --- Invoice Logic ---

    const handleOpenModal = () => {
        if (!selectedJob) return;
        setShowInvoiceModal(true);
    };

    const handleAddRow = () => {
        setInvoiceItems(prev => [...prev, { ...INITIAL_ROW, id: Date.now() }]);
    };

    const handleRemoveRow = (id) => {
        if (invoiceItems.length === 1) return; // Prevent deleting last row
        setInvoiceItems(prev => prev.filter(item => item.id !== id));
    };

    const updateRow = (id, field, value) => {
        setInvoiceItems(prev => prev.map(item => {
            if (item.id !== id) return item;

            const updated = { ...item, [field]: value };

            // Recalculate amounts if relevant fields change
            if (['qty', 'rate', 'exRate', 'currency'].includes(field)) {
                const qty = Number(updated.qty) || 0;
                const rate = Number(updated.rate) || 0;
                const exRate = updated.currency === 'USD' ? (Number(updated.exRate) || 1) : 1;

                updated.amountFC = (updated.currency === 'USD') ? (rate * qty) : 0;
                // Note: Logic adjustment based on screenshot columns (Amnt_FC is typically for foreign currency)
                // If INR, usually Amnt_FC is empty or same. Let's strictly calculate amountINR.

                if (updated.currency === 'INR') {
                    updated.amountINR = rate * qty;
                    updated.amountFC = 0;
                    updated.exRate = 1.0;
                } else {
                    updated.amountINR = rate * qty * exRate; // Assuming rate is in USD
                }
            }

            // Auto-reset ExRate to 1 if currency is INR
            if (field === 'currency' && value === 'INR') {
                updated.exRate = 1.0;
                updated.amountFC = 0;
                updated.amountINR = updated.rate * updated.qty;
            }

            return updated;
        }));
    };

    // Recalculate Totals whenever items change
    useEffect(() => {
        let taxable = 0;
        let gstTotal = 0;

        invoiceItems.forEach(item => {
            taxable += item.amountINR;
            if (item.isGST) {
                // Assuming 18% GST for now
                gstTotal += (item.amountINR * 0.18);
            }
        });

        // Split GST (simplified logic: if intra-state split, else IGST. 
        // For now, logic is generic, purely visual based on user request to see tax breakdown)
        // We will default to showing IGST for simplicity or split equally for CGST/SGST if needed.
        // Let's assume IGST for now as it's common in logistics across states.

        setTotals({
            taxable: taxable,
            cgst: 0, // Placeholder
            sgst: 0, // Placeholder
            igst: gstTotal,
            grandTotal: taxable + gstTotal
        });
    }, [invoiceItems]);

    const getCustomerDetails = () => {
        if (!selectedJob || !customers.length) return null;
        // Try to find customer by shipper name
        // This is a loose match. Ideally we should have customer_id in booking.
        // For now, assume shipper_name matches customer Name or we look up by some other means if available.
        // If not found, returns a dummy object or null.
        return customers.find(c => c.name?.toLowerCase() === selectedJob.shipper_name?.toLowerCase()) ||
            { name: selectedJob.shipper_name, address: "Address not found in KYC", gstin: "N/A" };
    };

    return (
        <DashboardLayout title="Generate Invoice">
            {/* Job Selection Section */}
            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="relative flex-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Job</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Type Job No or Shipper..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsDropdownOpen(true);
                                    if (e.target.value === "") setSelectedJob(null);
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                                className="w-full px-3 py-2 pl-10 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <Search className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={18} />
                        </div>
                        {isDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((job) => (
                                        <div
                                            key={job.job_no}
                                            onClick={() => handleSelectJob(job)}
                                            className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-sm"
                                        >
                                            <div className="font-medium text-slate-900 dark:text-white">#{job.job_no}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{job.shipper_name}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-slate-500 text-center">No jobs found</div>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleOpenModal}
                        disabled={!selectedJob}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Calculator size={18} /> Create Invoice
                    </button>
                </div>
            </div>

            {/* Instruction / Placeholder */}
            {!showInvoiceModal && (
                <div className="text-center py-20 text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Select a job and click "Create Invoice" to start.</p>
                </div>
            )}

            {/* Invoice Modal - Full Screen / Large */}
            {showInvoiceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">New Invoice for Job #{selectedJob?.job_no}</h2>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Invoice No:</label>
                                    <input
                                        type="text"
                                        value={invoiceNo}
                                        onChange={(e) => setInvoiceNo(e.target.value)}
                                        className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-dark-card text-sm w-40"
                                        placeholder="Enter Invoice No"
                                    />
                                    <input
                                        type="date"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                        className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-dark-card text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowPreview(true)}
                                    className="px-4 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-900 flex items-center gap-2"
                                >
                                    <Printer size={16} /> Preview / Print
                                </button>
                                <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-red-500">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body - Scrollable Table */}
                        <div className="flex-1 overflow-auto p-4">
                            <table className="w-full text-left border-collapse min-w-[1200px]">
                                <thead>
                                    <tr className="bg-slate-100 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-3 w-48">Description / Charge</th>
                                        <th className="p-3 text-center w-12">GST</th>
                                        <th className="p-3 text-center w-12">TDS</th>
                                        <th className="p-3 w-28">Type of Unit</th>
                                        <th className="p-3 w-20">Qty</th>
                                        <th className="p-3 w-28">Rate</th>
                                        <th className="p-3 w-20">Cur</th>
                                        <th className="p-3 w-20">Ex.Rate</th>
                                        <th className="p-3 w-28 text-right">Amount (INR)</th>
                                        <th className="p-3 w-28 text-right">Amount (FC)</th>
                                        <th className="p-3 w-40">Narration</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-700">
                                    {invoiceItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.chargeName}
                                                    onChange={(e) => updateRow(item.id, 'chargeName', e.target.value)}
                                                    className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none dark:text-white"
                                                    placeholder="Charge Name"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={item.isGST}
                                                    onChange={(e) => updateRow(item.id, 'isGST', e.target.checked)}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={item.isTDS}
                                                    onChange={(e) => updateRow(item.id, 'isTDS', e.target.checked)}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <select
                                                    value={item.unit}
                                                    onChange={(e) => updateRow(item.id, 'unit', e.target.value)}
                                                    className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-xs dark:text-slate-300"
                                                >
                                                    <option value="20' GP">20' GP</option>
                                                    <option value="40' GP">40' GP</option>
                                                    <option value="40' HC">40' HC</option>
                                                    <option value="45' HC">45' HC</option>
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    value={item.qty}
                                                    onChange={(e) => updateRow(item.id, 'qty', e.target.value)}
                                                    className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-right dark:text-white"
                                                    min="0"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    value={item.rate}
                                                    onChange={(e) => updateRow(item.id, 'rate', e.target.value)}
                                                    className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-right dark:text-white"
                                                    min="0"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <select
                                                    value={item.currency}
                                                    onChange={(e) => updateRow(item.id, 'currency', e.target.value)}
                                                    className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-xs dark:text-slate-300"
                                                >
                                                    <option value="INR">INR</option>
                                                    <option value="USD">USD</option>
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    value={item.exRate}
                                                    onChange={(e) => updateRow(item.id, 'exRate', e.target.value)}
                                                    disabled={item.currency === 'INR'}
                                                    className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-right disabled:opacity-50 dark:text-white"
                                                    min="0"
                                                />
                                            </td>
                                            <td className="p-2 text-right font-medium dark:text-white">{item.amountINR.toFixed(2)}</td>
                                            <td className="p-2 text-right text-slate-500 dark:text-slate-400">{item.amountFC.toFixed(2)}</td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.narration}
                                                    onChange={(e) => updateRow(item.id, 'narration', e.target.value)}
                                                    className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none dark:text-slate-300 text-xs"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    onClick={() => handleRemoveRow(item.id)}
                                                    disabled={invoiceItems.length === 1}
                                                    className="text-slate-400 hover:text-red-500 disabled:opacity-30 p-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button
                                onClick={handleAddRow}
                                className="mt-4 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition-colors"
                            >
                                <Plus size={16} /> Add Charge
                            </button>
                        </div>

                        {/* Modal Footer - Totals Table */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card rounded-lg overflow-hidden">
                                    <thead>
                                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                            <th className="py-2 px-4 text-center font-medium border-r border-slate-200 dark:border-slate-700">Taxable Amount</th>
                                            <th className="py-2 px-4 text-center font-medium border-r border-slate-200 dark:border-slate-700">Total GST</th>
                                            <th className="py-2 px-4 text-center font-medium border-r border-slate-200 dark:border-slate-700">CGST</th>
                                            <th className="py-2 px-4 text-center font-medium border-r border-slate-200 dark:border-slate-700">SGST</th>
                                            <th className="py-2 px-4 text-center font-medium border-r border-slate-200 dark:border-slate-700">IGST</th>
                                            <th className="py-2 px-4 text-center font-medium">Grand Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="text-slate-800 dark:text-white font-medium">
                                            <td className="py-3 px-4 text-center border-r border-slate-200 dark:border-slate-700">{totals.taxable.toFixed(2)}</td>
                                            <td className="py-3 px-4 text-center border-r border-slate-200 dark:border-slate-700 text-slate-500">{totals.igst.toFixed(2)}</td>
                                            <td className="py-3 px-4 text-center border-r border-slate-200 dark:border-slate-700 text-slate-500">{totals.cgst.toFixed(2)}</td>
                                            <td className="py-3 px-4 text-center border-r border-slate-200 dark:border-slate-700 text-slate-500">{totals.sgst.toFixed(2)}</td>
                                            <td className="py-3 px-4 text-center border-r border-slate-200 dark:border-slate-700 text-slate-500">{totals.igst.toFixed(2)}</td>
                                            <td className="py-3 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">{totals.grandTotal.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
