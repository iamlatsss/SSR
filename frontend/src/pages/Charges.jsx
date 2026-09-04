import React, { useState, useEffect } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, Save, RotateCcw, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';

const UNITS = ["--- None ---", "20", "20 DC", "20 F/R", "20 OT", "40", "40 F/R", "40 HQ", "40 OT", "CBM", "FLAT", "MAX WT/CBM", "PERCENT", "Wt"];
const CURRENCIES = ["USD", "INR", "EUR", "AED"];

const GST_CHARGE_TYPES = ["Taxable", "Nil Rated", "Zero Rated / Export", "Exempted"];
const CHARGE_TYPES = ["Exemption", "NonTaxable", "Pure Agent", "Reverse Charge", "Taxable"];
const TAX_TYPES = ["Standard GST", "HSN Based By Price", "Charge Based IGST Fixed"];
const TAX_CLASSES = [
    "5% GST On Freight",
    "5% GST On Transportation",
    "12% GST On Rail Freight",
    "12% GST On Purchase",
    "18% GST"
];
const INCOME_TYPES = ["Both", "Expense", "Income"];

const Charges = () => {
    // List & pagination states
    const [charges, setCharges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Form states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form inputs matching reference layout
    const [form, setForm] = useState({
        name: '',
        gst_charge_type: 'Taxable',
        unit: '--- None ---',
        sac: '',
        short_name: '',
        currency: 'INR',
        charge_type: 'Taxable',
        income_type: 'Both',
        rcm: 'No',
        tax_type: 'Standard GST',
        tax_class: '',
        tds_applicable: 'No',
        reimbursement_applicable: 'No',
        status: 'Enabled'
    });

    const [validationErrors, setValidationErrors] = useState({});

    // Load data
    useEffect(() => {
        if (!isFormOpen) {
            loadCharges();
        }
    }, [currentPage, searchTerm, isFormOpen]);

    const loadCharges = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/invoice/charges/search`, {
                params: {
                    page: currentPage,
                    limit: 20,
                    search: searchTerm
                }
            });
            if (res.data.success) {
                setCharges(res.data.charges || []);
                setTotalPages(res.data.totalPages || 1);
                setTotalItems(res.data.total || 0);
            }
        } catch (error) {
            console.error("Error loading charges:", error);
            toast.error("Failed to load charges from server.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleOpenCreateForm = () => {
        setForm({
            name: '',
            gst_charge_type: 'Taxable',
            unit: '--- None ---',
            sac: '',
            short_name: '',
            currency: 'INR',
            charge_type: 'Taxable',
            income_type: 'Both',
            rcm: 'No',
            tax_type: 'Standard GST',
            tax_class: '',
            tds_applicable: 'No',
            reimbursement_applicable: 'No',
            status: 'Enabled'
        });
        setValidationErrors({});
        setIsEditing(false);
        setEditingId(null);
        setIsFormOpen(true);
    };

    const handleOpenEditForm = (charge) => {
        setForm({
            name: charge.name || '',
            gst_charge_type: charge.gst_charge_type || 'Taxable',
            unit: charge.unit || '--- None ---',
            sac: charge.sac || '',
            short_name: charge.short_name || '',
            currency: charge.currency || 'INR',
            charge_type: charge.charge_type || 'Taxable',
            income_type: charge.income_type || 'Both',
            rcm: charge.rcm || 'No',
            tax_type: charge.tax_type || 'Standard GST',
            tax_class: charge.tax_class || '',
            tds_applicable: charge.tds_applicable || 'No',
            reimbursement_applicable: charge.reimbursement_applicable || 'No',
            status: charge.status || 'Enabled'
        });
        setValidationErrors({});
        setIsEditing(true);
        setEditingId(charge.id);
        setIsFormOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear validation errors on type
        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!form.name.trim()) errors.name = 'Charge Title is required';
        if (!form.income_type) errors.income_type = 'Income Type is required';
        if (!form.tax_type) errors.tax_type = 'Tax Type is required';
        if (!form.status) errors.status = 'Status is required';
        if (!form.tds_applicable) errors.tds_applicable = 'TDS Applicable field is required';
        if (!form.reimbursement_applicable) errors.reimbursement_applicable = 'Reimbursement Applicable is required';

        setValidationErrors(errors);

        if (Object.keys(errors).length > 0) {
            // Show clear toast notifications
            Object.values(errors).forEach(err => toast.warning(err));
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            if (isEditing) {
                const res = await api.put(`/invoice/charges/${editingId}`, form);
                if (res.data.success) {
                    toast.success("Charge Master updated successfully!");
                    setIsFormOpen(false);
                }
            } else {
                const res = await api.post('/invoice/charges', form);
                if (res.data.success) {
                    toast.success("New Charge Master saved successfully!");
                    setIsFormOpen(false);
                }
            }
        } catch (error) {
            console.error("Save Charge Error:", error);
            const msg = error.response?.data?.message || "Failed to save Charge Master.";
            toast.error(msg);
        }
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
    };

    return (
        <DashboardLayout title="Charge Master">
            <div className="flex flex-col h-full bg-slate-50/50 dark:bg-dark-bg transition-colors duration-300">
                
                {isFormOpen && (
                    <div className="flex justify-end gap-2 mb-6">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                            title="Save Charge"
                        >
                            <Save size={15} />
                            Save
                        </button>
                        <button
                            onClick={handleCloseForm}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-xs font-bold shadow-sm transition-all duration-200 cursor-pointer"
                            title="Back to List"
                        >
                            <RotateCcw size={15} />
                            Cancel
                        </button>
                    </div>
                )}

                {!isFormOpen ? (
                    /* LIST VIEW COMPONENT */
                    <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 flex flex-col h-auto transition-all duration-300">
                        {/* Search and Action Header */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search by Title, Short Name, HSN/SAC..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="pl-9 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-poppins text-xs"
                                />
                            </div>

                            <button
                                onClick={handleOpenCreateForm}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition-all duration-200 font-bold text-xs shadow-md hover:shadow-lg ml-auto whitespace-nowrap cursor-pointer"
                            >
                                <Plus size={16} /> Add Charge Master
                            </button>
                        </div>

                        {/* Charges Table */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl mb-4 overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse text-xs table-auto min-w-[750px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-150 dark:border-slate-850 text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider select-none">
                                        <th className="p-3.5 pl-6">Charge Title</th>
                                        <th className="p-3.5">HSN/SAC</th>
                                        <th className="p-3.5">Income Type</th>
                                        <th className="p-3.5">Tax Type</th>
                                        <th className="p-3.5">Currency</th>
                                        <th className="p-3.5">Status</th>
                                        <th className="p-3.5 text-center pr-6 w-24">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" />
                                                    <span className="text-xs font-semibold">Loading Charge Master records...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : charges.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-slate-500 dark:text-slate-400 italic">
                                                No charges found. Click "Add Charge Master" to create a new one.
                                            </td>
                                        </tr>
                                    ) : (
                                        charges.map((charge) => (
                                            <tr key={charge.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/10 transition-colors text-slate-800 dark:text-slate-200">
                                                <td className="p-3.5 pl-6 font-semibold text-slate-900 dark:text-white max-w-[250px] truncate" title={charge.short_name || charge.name}>
                                                    {charge.short_name || charge.name}
                                                </td>
                                                <td className="p-3.5 font-mono">{charge.sac || '—'}</td>
                                                <td className="p-3.5 font-medium">{charge.income_type}</td>
                                                <td className="p-3.5 text-slate-550 dark:text-slate-450">{charge.tax_type}</td>
                                                <td className="p-3.5 font-bold text-slate-500">{charge.currency}</td>
                                                <td className="p-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        charge.status === 'Enabled' 
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450'
                                                    }`}>
                                                        {charge.status}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-center pr-6">
                                                    <button
                                                        onClick={() => handleOpenEditForm(charge)}
                                                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {charges.length > 0 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="text-xs text-slate-550 dark:text-slate-400">
                                    Showing <span className="font-bold">{(currentPage - 1) * 20 + 1}</span> to <span className="font-bold">{Math.min(currentPage * 20, totalItems)}</span> of <span className="font-bold">{totalItems}</span> charges
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="flex gap-1 text-xs font-bold">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p)}
                                                className={`w-8 h-8 rounded-lg transition-colors ${currentPage === p ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* FORM VIEW COMPONENT (ADD/EDIT CHARGE MASTER) */
                    <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col h-auto transition-all duration-300">
                        {/* Title bar mimicking the screenshot */}
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-6">
                            <ShieldCheck className="text-indigo-600 dark:text-indigo-400 stroke-[1.5]" size={22} />
                            <h3 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                {isEditing ? 'Edit Charge Master' : 'Add Charge Master'}
                            </h3>
                        </div>

                        {/* Fields Grid exactly matching reference layout structure */}
                        <div className="space-y-6 pb-2">
                            
                            {/* Row 1: Charge Title | GST Charge Type | Unit */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5 flex items-center gap-1">
                                        <span className="text-red-500 font-bold">*</span> Charge Title
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter Charge Title"
                                        className={`w-full px-4 py-2.5 rounded-lg border text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${
                                            validationErrors.name ? 'border-rose-450 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    />
                                    {validationErrors.name && (
                                        <span className="text-[10px] text-rose-550 font-semibold mt-1 block">{validationErrors.name}</span>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">
                                        GST Charge Type
                                    </label>
                                    <select
                                        name="gst_charge_type"
                                        value={form.gst_charge_type}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                    >
                                        {GST_CHARGE_TYPES.map(gct => (
                                            <option key={gct} value={gct}>{gct}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">
                                        Unit
                                    </label>
                                    <select
                                        name="unit"
                                        value={form.unit}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                    >
                                        {UNITS.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: SAC | Short Name | Currency */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">
                                        HSN/SAC Code
                                    </label>
                                    <input
                                        type="text"
                                        name="sac"
                                        value={form.sac}
                                        onChange={handleInputChange}
                                        placeholder="Enter HSN/SAC Code"
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">
                                        Short Name
                                    </label>
                                    <input
                                        type="text"
                                        name="short_name"
                                        value={form.short_name}
                                        onChange={handleInputChange}
                                        placeholder="Enter Short Name"
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">
                                        Currency
                                    </label>
                                    <select
                                        name="currency"
                                        value={form.currency}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                    >
                                        {CURRENCIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 3: Charge Type | Income Type | RCM */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">
                                        Charge Type
                                    </label>
                                    <select
                                        name="charge_type"
                                        value={form.charge_type}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                    >
                                        {CHARGE_TYPES.map(ct => (
                                            <option key={ct} value={ct}>{ct}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5 flex items-center gap-1">
                                        <span className="text-red-500 font-bold">*</span> Income Type
                                    </label>
                                    <select
                                        name="income_type"
                                        value={form.income_type}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer ${
                                            validationErrors.income_type ? 'border-rose-450 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    >
                                        {INCOME_TYPES.map(it => (
                                            <option key={it} value={it}>{it}</option>
                                        ))}
                                    </select>
                                    {validationErrors.income_type && (
                                        <span className="text-[10px] text-rose-550 font-semibold mt-1 block">{validationErrors.income_type}</span>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">
                                        RCM
                                    </label>
                                    <select
                                        name="rcm"
                                        value={form.rcm}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 4: Tax Type | Tax Class (if Standard GST) | TDS Applicable | Reimbursement Applicable */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5 flex items-center gap-1">
                                        <span className="text-red-500 font-bold">*</span> Tax Type
                                    </label>
                                    <select
                                        name="tax_type"
                                        value={form.tax_type}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer ${
                                            validationErrors.tax_type ? 'border-rose-450 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    >
                                        {TAX_TYPES.map(tt => (
                                            <option key={tt} value={tt}>{tt}</option>
                                        ))}
                                    </select>
                                    {validationErrors.tax_type && (
                                        <span className="text-[10px] text-rose-550 font-semibold mt-1 block">{validationErrors.tax_type}</span>
                                    )}
                                </div>

                                {form.tax_type === 'Standard GST' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">
                                            Tax Class
                                        </label>
                                        <select
                                            name="tax_class"
                                            value={form.tax_class || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="">Select GST tax_class</option>
                                            {TAX_CLASSES.map(tc => (
                                                <option key={tc} value={tc}>{tc}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex flex-col justify-center">
                                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 mb-3 flex items-center gap-1">
                                        <span className="text-red-500 font-bold">*</span> TDS Applicable
                                    </label>
                                    <div className="flex gap-6 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="radio"
                                                name="tds_applicable"
                                                value="Yes"
                                                checked={form.tds_applicable === 'Yes'}
                                                onChange={handleInputChange}
                                                className="accent-indigo-650 w-4 h-4 cursor-pointer"
                                            />
                                            Yes
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="radio"
                                                name="tds_applicable"
                                                value="No"
                                                checked={form.tds_applicable === 'No'}
                                                onChange={handleInputChange}
                                                className="accent-indigo-650 w-4 h-4 cursor-pointer"
                                            />
                                            No
                                        </label>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center">
                                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 mb-3 flex items-center gap-1">
                                        <span className="text-red-500 font-bold">*</span> Reimbursement Applicable
                                    </label>
                                    <div className="flex gap-6 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="radio"
                                                name="reimbursement_applicable"
                                                value="Yes"
                                                checked={form.reimbursement_applicable === 'Yes'}
                                                onChange={handleInputChange}
                                                className="accent-indigo-650 w-4 h-4 cursor-pointer"
                                            />
                                            Yes
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="radio"
                                                name="reimbursement_applicable"
                                                value="No"
                                                checked={form.reimbursement_applicable === 'No'}
                                                onChange={handleInputChange}
                                                className="accent-indigo-650 w-4 h-4 cursor-pointer"
                                            />
                                            No
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5 flex items-center gap-1">
                                        <span className="text-red-500 font-bold">*</span> Status
                                    </label>
                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer ${
                                            validationErrors.status ? 'border-rose-450 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    >
                                        <option value="Enabled">Enabled</option>
                                        <option value="Disabled">Disabled</option>
                                    </select>
                                    {validationErrors.status && (
                                        <span className="text-[10px] text-rose-550 font-semibold mt-1 block">{validationErrors.status}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Charges;
