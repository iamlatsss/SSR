import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { Plus, Trash2, ArrowLeft, Save, Printer } from "lucide-react";
import { toast } from "react-toastify";
import InvoicePreview from "../components/InvoicePreview";
import ChargeSelect from "../components/ChargeSelect";

const INITIAL_ROW = {
    id: Date.now(),
    chargeName: "",
    isGST: false,
    taxType: null, // 'GST' | 'IGST' | null
    taxPercent: 0,
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

const InvoiceGenerator = () => {
    const { jobNo } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [jobDetails, setJobDetails] = useState(null);
    const [customerDetails, setCustomerDetails] = useState(null);
    const [customers, setCustomers] = useState([]);

    // Invoice State
    const [invoiceNo, setInvoiceNo] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceItems, setInvoiceItems] = useState([INITIAL_ROW]);
    const [chargeOptions, setChargeOptions] = useState([]);

    // UI State
    const [showPreview, setShowPreview] = useState(false);

    // Totals
    const [totals, setTotals] = useState({
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        grandTotal: 0
    });

    useEffect(() => {
        loadData();
    }, [jobNo]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [jobRes, initRes, chargesRes] = await Promise.all([
                api.get("/booking/get"), // Fetch all jobs to find the specific one. Ideally backend should have /booking/get/:id
                api.get("/booking/init"),
                api.get("/invoice/charges")
            ]);

            // Find Job
            const job = jobRes.data.bookings.find(j => j.job_no == jobNo);
            if (!job) {
                toast.error("Job not found");
                navigate("/invoice");
                return;
            }
            setJobDetails(job);

            // Customers & Charges
            if (initRes.data.success) setCustomers(initRes.data.customers || []);
            if (chargesRes.data.success) setChargeOptions(chargesRes.data.charges || []);

            // Invoice Data from Job Object itself (New Logic)
            if (job.invoice_no) {
                setInvoiceNo(job.invoice_no);
                setInvoiceDate(job.invoice_date ? new Date(job.invoice_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

                let items = job.invoice_items ? (typeof job.invoice_items === 'string' ? JSON.parse(job.invoice_items) : job.invoice_items) : [];
                // Re-hydrate backend items too
                items = items.map(item => {
                        // Try to find the charge in the master list to get definitive tax info
                    const foundCharge = (chargesRes.data.charges || []).find(c => c.name === item.chargeName);
                    
                    if (foundCharge) {
                        return {
                            ...item,
                            isGST: foundCharge.gst || foundCharge.igst,
                            taxType: foundCharge.gst ? 'GST' : (foundCharge.igst ? 'IGST' : null),
                            taxPercent: foundCharge.percentage || 0
                        };
                    }
                    return item;
                });
                if (items.length > 0) setInvoiceItems(items);
            } else {
                 setInvoiceNo(job.invoice_no || ""); // Might be null
            }

        } catch (error) {
            console.error("Error loading invoice data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    // Calculate Totals Effect
    useEffect(() => {
        let taxable = 0;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        invoiceItems.forEach(item => {
            const baseAmount = Number(item.amountINR || 0);
            taxable += baseAmount;

            if (item.isGST) {
                // If taxType is explicitly known
                if (item.taxType === 'GST') {
                    // Split 50-50
                    const rate = item.taxPercent || 18; 
                    const halfRate = rate / 2;
                    cgst += baseAmount * (halfRate / 100);
                    sgst += baseAmount * (halfRate / 100);
                } else {
                    // Default to IGST if not explicitly GST
                    const rate = item.taxPercent || 18; 
                    igst += baseAmount * (rate / 100);
                }
            }
        });

        // Current UI only showed 'igst' for total GST in the GST column, which is confusing. 
        // We should sum up all tax components for the display if needed, 
        // but the state stores breakdown.
        setTotals({
            taxable: taxable,
            cgst: cgst,
            sgst: sgst,
            igst: igst,
            grandTotal: taxable + cgst + sgst + igst
        });
    }, [invoiceItems]);

    // Derived Customer Details
    useEffect(() => {
        if (jobDetails && customers.length) {
            const found = customers.find(c => c.name?.toLowerCase() === jobDetails.shipper_name?.toLowerCase());
            setCustomerDetails(found || { name: jobDetails.shipper_name, address: "Address not found", gstin: "N/A" });
        }
    }, [jobDetails, customers]);


    const handleSave = async () => {
        if (!invoiceNo) {
            toast.warning("Please enter Invoice No");
            return;
        }

        try {
            const payload = {
                invoice_no: invoiceNo,
                invoice_date: invoiceDate,
                invoice_customer: JSON.stringify(customerDetails),
                invoice_items: JSON.stringify(invoiceItems),
                invoice_totals: JSON.stringify(totals)
            };

            const res = await api.put(`/booking/update/${jobNo}`, payload);
            
            if (res.data.success) {
                toast.success("Invoice saved successfully linked to Booking!");
                localStorage.removeItem(`invoice_${jobNo}`); // Clear local draft if any
                setTimeout(() => {
                    navigate('/invoice');
                }, 1000);
            } else {
                toast.error("Failed to save invoice.");
            }

        } catch (error) {
            console.error("Error saving invoice:", error);
            toast.error("Failed to save invoice");
        }
    };

    // Row Operations
    const handleAddRow = () => {
        setInvoiceItems(prev => [...prev, { ...INITIAL_ROW, id: Date.now() }]);
    };

    const handleRemoveRow = (id) => {
        if (invoiceItems.length === 1) return;
        setInvoiceItems(prev => prev.filter(item => item.id !== id));
    };

    const updateRow = (id, field, value) => {
        setInvoiceItems(prev => prev.map(item => {
            if (item.id !== id) return item;

            const updated = { ...item, [field]: value };

            // Auto-detect tax info when charge name changes
            if (field === 'chargeName') {
                const foundCharge = chargeOptions.find(c => c.name === value);
                if (foundCharge) {
                    updated.isGST = foundCharge.gst || foundCharge.igst;
                    updated.taxType = foundCharge.gst ? 'GST' : (foundCharge.igst ? 'IGST' : null);
                    updated.taxPercent = foundCharge.percentage || 0;
                } else {
                    // Custom value - no assumptions
                    updated.isGST = false;
                    updated.taxType = null;
                    updated.taxPercent = 0;
                }
            }

            // If user manually toggles isGST, we should try to re-parse or set defaults?
            // If they verify check, we keep existing taxType (which might be null).
            // If they UNCHECK, we should probably clear taxType? No, keep it in case they re-check.

            if (['qty', 'rate', 'exRate', 'currency'].includes(field)) {
                // ... existing calc logic
                const qty = Number(updated.qty) || 0;
                const rate = Number(updated.rate) || 0;
                const exRate = updated.currency === 'USD' ? (Number(updated.exRate) || 1) : 1;

                if (updated.currency === 'INR') {
                    updated.amountINR = rate * qty;
                    updated.amountFC = 0;
                    updated.exRate = 1.0;
                } else {
                    updated.amountINR = rate * qty * exRate;
                    updated.amountFC = rate * qty;
                }
            }

            if (field === 'currency' && value === 'INR') {
                updated.exRate = 1.0;
                updated.amountFC = 0;
                updated.amountINR = updated.rate * updated.qty;
            }

            return updated;
        }));
    };

    if (loading) {
        return (
            <DashboardLayout title="Create Invoice">
                <div className="flex justify-center h-96 items-center">
                    <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title={`Invoice for Job #${jobNo}`}>
            <div className="flex flex-col h-full gap-4">
                {/* Header Actions */}
                <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button onClick={() => navigate('/invoice')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Invoice Details</h2>
                            <p className="text-sm text-slate-500">Job #{jobNo} • {jobDetails?.shipper_name}</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-semibold uppercase text-slate-500">Inv No:</span>
                            <input
                                type="text"
                                value={invoiceNo}
                                onChange={(e) => setInvoiceNo(e.target.value)}
                                placeholder="Enter No"
                                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-800 dark:text-white p-0 w-32"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-semibold uppercase text-slate-500">Date:</span>
                            <input
                                type="date"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-800 dark:text-white p-0"
                            />
                        </div>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>

                        <button onClick={() => setShowPreview(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium text-sm hover:bg-indigo-100 transition-colors">
                            <Printer size={18} /> Preview
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all">
                            <Save size={18} /> Save Details
                        </button>
                    </div>
                </div>

                {/* Main Editor Table */}
                <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold shadow-sm">
                                <tr>
                                    <th className="p-4 w-64 border-b border-slate-200 dark:border-slate-700">Description / Charge</th>
                                    <th className="p-4 w-32 border-b border-slate-200 dark:border-slate-700">Unit</th>
                                    <th className="p-4 w-24 border-b border-slate-200 dark:border-slate-700">Qty</th>
                                    <th className="p-4 w-32 border-b border-slate-200 dark:border-slate-700">Rate</th>
                                    <th className="p-4 w-24 border-b border-slate-200 dark:border-slate-700">Cur</th>
                                    <th className="p-4 w-24 border-b border-slate-200 dark:border-slate-700">Ex.Rate</th>
                                    <th className="p-4 w-32 border-b border-slate-200 dark:border-slate-700 text-right">Amount (INR)</th>
                                    <th className="p-4 w-24 border-b border-slate-200 dark:border-slate-700 text-right">CGST</th>
                                    <th className="p-4 w-24 border-b border-slate-200 dark:border-slate-700 text-right">SGST</th>
                                    <th className="p-4 w-24 border-b border-slate-200 dark:border-slate-700 text-right">IGST</th>
                                    <th className="p-4 w-32 border-b border-slate-200 dark:border-slate-700 text-right">Amount (FC)</th>
                                    <th className="p-4 w-16 border-b border-slate-200 dark:border-slate-700"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                {invoiceItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 group">
                                        <td className="p-3">
                                            <ChargeSelect
                                                value={item.chargeName}
                                                onChange={(val) => updateRow(item.id, 'chargeName', val)}
                                                options={chargeOptions}
                                                placeholder="Select Charge..."
                                            />
                                        </td>
                                        <td className="p-3">
                                            <select value={item.unit} onChange={(e) => updateRow(item.id, 'unit', e.target.value)} className="w-full bg-transparent border-none text-slate-700 dark:text-slate-300 text-sm focus:ring-0 cursor-pointer">
                                                <option value="20' GP">20' GP</option>
                                                <option value="40' GP">40' GP</option>
                                                <option value="40' HC">40' HC</option>
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <input type="number" value={item.qty} onChange={(e) => updateRow(item.id, 'qty', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded px-2 py-1 text-center font-medium" />
                                        </td>
                                        <td className="p-3">
                                            <input type="number" value={item.rate} onChange={(e) => updateRow(item.id, 'rate', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded px-2 py-1 text-right font-medium" />
                                        </td>
                                        <td className="p-3">
                                            <select value={item.currency} onChange={(e) => updateRow(item.id, 'currency', e.target.value)} className="w-full bg-transparent border-none text-sm focus:ring-0 cursor-pointer">
                                                <option value="INR">INR</option>
                                                <option value="USD">USD</option>
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <input type="number" value={item.exRate} disabled={item.currency === 'INR'} onChange={(e) => updateRow(item.id, 'exRate', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded px-2 py-1 text-right disabled:opacity-50" />
                                        </td>
                                        <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-200">
                                            {item.amountINR.toFixed(2)}
                                        </td>
                                        {/* Tax Calculations for Display */}
                                        {(() => {
                                            let c = 0, s = 0, i = 0;
                                            if (item.isGST) {
                                                const base = item.amountINR || 0;
                                                if (item.taxType === 'GST') {
                                                    const r = (item.taxPercent || 18) / 2;
                                                    c = base * (r / 100);
                                                    s = base * (r / 100);
                                                } else {
                                                    // IGST / Default
                                                    const r = item.taxPercent || 18;
                                                    i = base * (r / 100);
                                                }
                                            }
                                            return (
                                                <>
                                                    <td className="p-3 text-right text-slate-500">{c > 0 ? c.toFixed(2) : '-'}</td>
                                                    <td className="p-3 text-right text-slate-500">{s > 0 ? s.toFixed(2) : '-'}</td>
                                                    <td className="p-3 text-right text-slate-500">{i > 0 ? i.toFixed(2) : '-'}</td>
                                                </>
                                            );
                                        })()}
                                        <td className="p-3 text-right text-slate-500">
                                            {item.amountFC.toFixed(2)}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleRemoveRow(item.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                            <button onClick={handleAddRow} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold text-sm px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                                <Plus size={18} /> Add New Charge
                            </button>
                        </div>
                    </div>

                    {/* Totals Footer */}
                    <div className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-6 gap-4 p-4 text-center text-sm">
                            <div className="flex flex-col">
                                <span className="text-xs uppercase text-slate-500 font-semibold mb-1">Taxable</span>
                                <span className="font-bold text-slate-800 dark:text-white text-lg">₹{totals.taxable.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 dark:border-slate-700">
                                <span className="text-xs uppercase text-slate-500 font-semibold mb-1">Total GST</span>
                                <span className="font-bold text-slate-600 dark:text-slate-300">₹{totals.igst.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 dark:border-slate-700">
                                <span className="text-xs uppercase text-slate-500 font-semibold mb-1">CGST</span>
                                <span className="font-medium text-slate-500">₹{totals.cgst.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 dark:border-slate-700">
                                <span className="text-xs uppercase text-slate-500 font-semibold mb-1">SGST</span>
                                <span className="font-medium text-slate-500">₹{totals.sgst.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 dark:border-slate-700">
                                <span className="text-xs uppercase text-slate-500 font-semibold mb-1">IGST</span>
                                <span className="font-medium text-slate-500">₹{totals.igst.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/20 -my-4 py-4 justify-center">
                                <span className="text-xs uppercase text-indigo-600 dark:text-indigo-400 font-bold mb-1">Grand Total</span>
                                <span className="font-extrabold text-indigo-700 dark:text-indigo-300 text-xl">₹{totals.grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showPreview && jobDetails && (
                <InvoicePreview
                    data={{
                        invoiceNo,
                        invoiceDate,
                        job: jobDetails,
                        customer: customerDetails,
                        items: invoiceItems,
                        totals
                    }}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </DashboardLayout>
    );
};

export default InvoiceGenerator;
