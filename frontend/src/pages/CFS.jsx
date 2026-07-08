import React, { useState, useEffect } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, Save, RotateCcw, MapPin, Trash2, Mail, Phone, Edit, CheckCircle, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';

const PARTY_TYPES = ["--- None ---", "Local", "Overseas", "Special"];
const ENTITY_TYPES = ["--- None ---", "Proprietorship", "Partnership", "Private Limited", "Public Limited", "LLP", "Trust", "Individual", "Others"];

const CFS = () => {
    // List & pagination states
    const [cfsList, setCfsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Form states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'address'

    // Form inputs matching reference layout
    const [form, setForm] = useState({
        party_type: '--- None ---',
        name: '',
        legal_name: '',
        email: '',
        pan_no: '',
        cin_no: '',
        entity_type: '--- None ---',
        web_url: '',
        director_name: '',
        turnover: '',
        group_companies: '',
        business_type: '',
        incorporation_year: '',
        referred_by: '',
        marketing: '',
        party_status: 'Draft',
        status: 'Enabled',
        addresses: []
    });

    const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
    const [addressForm, setAddressForm] = useState({
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pin_code: '',
        country: 'India',
        gst_no: '',
        email: '',
        telephone: '',
        fax: '',
        tan_no: '',
        contact_person: '',
        is_head_office: 'No',
        is_sez: 'No',
        status: 'Enabled',
        is_default: false
    });

    const [validationErrors, setValidationErrors] = useState({});

    // Load data
    useEffect(() => {
        if (!isFormOpen) {
            loadCFS();
        }
    }, [currentPage, searchTerm, isFormOpen]);

    const loadCFS = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/cfs/search`, {
                params: {
                    page: currentPage,
                    limit: 15,
                    search: searchTerm
                }
            });
            if (res.data.success) {
                setCfsList(res.data.parties || []);
                setTotalPages(res.data.totalPages || 1);
                setTotalItems(res.data.total || 0);
            }
        } catch (error) {
            console.error("Error loading CFS:", error);
            toast.error("Failed to load CFS from server.");
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
            party_type: '--- None ---',
            name: '',
            legal_name: '',
            email: '',
            pan_no: '',
            cin_no: '',
            entity_type: '--- None ---',
            web_url: '',
            director_name: '',
            turnover: '',
            group_companies: '',
            business_type: '',
            incorporation_year: '',
            referred_by: '',
            marketing: '',
            party_status: 'Draft',
            status: 'Enabled',
            addresses: []
        });
        setSelectedAddressIndex(null);
        setValidationErrors({});
        setIsEditing(false);
        setEditingId(null);
        setActiveTab('general');
        setIsFormOpen(true);
    };

    const handleOpenEditForm = (cfs) => {
        setForm({
            party_type: cfs.party_type || '--- None ---',
            name: cfs.name || '',
            legal_name: cfs.legal_name || '',
            email: cfs.email || '',
            pan_no: cfs.pan_no || '',
            cin_no: cfs.cin_no || '',
            entity_type: cfs.entity_type || '--- None ---',
            web_url: cfs.web_url || '',
            director_name: cfs.director_name || '',
            turnover: cfs.turnover || '',
            group_companies: cfs.group_companies || '',
            business_type: cfs.business_type || '',
            incorporation_year: cfs.incorporation_year || '',
            referred_by: cfs.referred_by || '',
            marketing: cfs.marketing || '',
            party_status: cfs.party_status || 'Draft',
            status: cfs.status || 'Enabled',
            addresses: cfs.addresses || []
        });
        setSelectedAddressIndex(null);
        setValidationErrors({});
        setIsEditing(true);
        setEditingId(cfs.id);
        setActiveTab('general');
        setIsFormOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const copy = { ...prev };
                delete copy[name];
                return copy;
            });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        // Simple client side validation
        const errors = {};
        if (!form.name || form.name.trim() === "") {
            errors.name = "CFS Name is required";
        }
        
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            toast.error("Please correct the validation errors.");
            return;
        }

        try {
            const payload = {
                ...form
            };

            if (isEditing) {
                const res = await api.put(`/cfs/update/${editingId}`, payload);
                if (res.data.success) {
                    toast.success("CFS details updated successfully!");
                    setIsFormOpen(false);
                }
            } else {
                const res = await api.post(`/cfs/insert`, payload);
                if (res.data.success) {
                    toast.success("New CFS added successfully!");
                    setIsFormOpen(false);
                }
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error(error.response?.data?.message || "Failed to save CFS details.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this CFS?")) return;
        try {
            const res = await api.delete(`/cfs/delete/${id}`);
            if (res.data.success) {
                toast.success("CFS deleted successfully");
                loadCFS();
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Failed to delete CFS.");
        }
    };

    // Address list manipulation
    const handleAddAddress = () => {
        // Simple address validation
        if (!addressForm.address_line1 || addressForm.address_line1.trim() === "") {
            toast.error("Address Line 1 is required");
            return;
        }

        const addressesCopy = [...(form.addresses || [])];
        
        // If is_default is true, uncheck default from all other addresses
        if (addressForm.is_default) {
            addressesCopy.forEach(a => a.is_default = false);
        }

        if (selectedAddressIndex !== null) {
            // Edit existing address
            addressesCopy[selectedAddressIndex] = { ...addressForm };
            toast.info("Address entry updated");
        } else {
            // Add new address
            const isFirst = addressesCopy.length === 0;
            addressesCopy.push({ ...addressForm, is_default: isFirst ? true : addressForm.is_default });
            toast.info("Address entry added");
        }

        setForm(prev => ({ ...prev, addresses: addressesCopy }));
        
        // Reset address form
        setAddressForm({
            address_line1: '',
            address_line2: '',
            city: '',
            state: '',
            pin_code: '',
            country: 'India',
            gst_no: '',
            email: '',
            telephone: '',
            fax: '',
            tan_no: '',
            contact_person: '',
            is_head_office: 'No',
            is_sez: 'No',
            status: 'Enabled',
            is_default: false
        });
        setSelectedAddressIndex(null);
    };

    const handleEditAddress = (idx) => {
        setSelectedAddressIndex(idx);
        setAddressForm({ ...form.addresses[idx] });
    };

    const handleDeleteAddress = (idx) => {
        if (!window.confirm("Are you sure you want to delete this address?")) return;
        const addressesCopy = (form.addresses || []).filter((_, i) => i !== idx);
        
        // Ensure at least one default remains if list not empty
        if (addressesCopy.length > 0 && !addressesCopy.some(a => a.is_default)) {
            addressesCopy[0].is_default = true;
        }

        setForm(prev => ({ ...prev, addresses: addressesCopy }));
        if (selectedAddressIndex === idx) {
            setSelectedAddressIndex(null);
            setAddressForm({
                address_line1: '',
                address_line2: '',
                city: '',
                state: '',
                pin_code: '',
                country: 'India',
                gst_no: '',
                email: '',
                telephone: '',
                fax: '',
                tan_no: '',
                contact_person: '',
                is_head_office: 'No',
                is_sez: 'No',
                status: 'Enabled',
                is_default: false
            });
        }
        toast.info("Address entry deleted");
    };

    return (
        <DashboardLayout title="CFS Directory">
            {!isFormOpen ? (
                /* LIST VIEW */
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Search size={16} />
                            </span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                placeholder="Search by name, email or PAN..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <button
                            onClick={handleOpenCreateForm}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                        >
                            <Plus size={16} /> Add New CFS
                        </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Entity Type</th>
                                    <th className="p-4">Marketing</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center">
                                            <div className="flex justify-center items-center">
                                                <div className="animate-spin h-6 w-6 border-b-2 border-indigo-600 rounded-full" />
                                            </div>
                                        </td>
                                    </tr>
                                ) : cfsList.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-400 italic">
                                            No CFS records found
                                        </td>
                                    </tr>
                                ) : (
                                    cfsList.map(cfs => (
                                        <tr key={cfs.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                            <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{cfs.name}</td>
                                            <td className="p-4 text-slate-500">{cfs.entity_type || '—'}</td>
                                            <td className="p-4 text-slate-500">{cfs.marketing || '—'}</td>
                                            <td className="p-4">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    cfs.status === 'Enabled' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {cfs.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEditForm(cfs)}
                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cfs.id)}
                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                            <div className="text-xs text-slate-500">
                                Showing {cfsList.length} of {totalItems} CFS records
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50 text-slate-600 dark:text-slate-400"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50 text-slate-600 dark:text-slate-400"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* FORM VIEW */
                <form onSubmit={handleSave} className="space-y-6 max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                            {isEditing ? "Edit CFS Details" : "Add New CFS"}
                        </h3>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('general')}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                    activeTab === 'general' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                General Info
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('address')}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                    activeTab === 'address' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                Address Entries ({form.addresses.length})
                            </button>
                        </div>
                    </div>

                    {activeTab === 'general' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">CFS Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter CFS Name"
                                    className={`w-full px-3 py-2 border rounded-lg text-xs dark:bg-slate-950 ${validationErrors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
                                />
                                {validationErrors.name && <span className="text-[10px] text-red-500 mt-1">{validationErrors.name}</span>}
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Legal Name</label>
                                <input
                                    type="text"
                                    name="legal_name"
                                    value={form.legal_name}
                                    onChange={handleInputChange}
                                    placeholder="Enter Legal Name"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">CFS Type</label>
                                <select
                                    name="party_type"
                                    value={form.party_type}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                >
                                    {PARTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Entity Type</label>
                                <select
                                    name="entity_type"
                                    value={form.entity_type}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                >
                                    {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleInputChange}
                                    placeholder="Enter Email"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">PAN Number</label>
                                <input
                                    type="text"
                                    name="pan_no"
                                    value={form.pan_no}
                                    onChange={handleInputChange}
                                    placeholder="Enter PAN Number"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">CIN Number</label>
                                <input
                                    type="text"
                                    name="cin_no"
                                    value={form.cin_no}
                                    onChange={handleInputChange}
                                    placeholder="Enter CIN Number"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Website URL</label>
                                <input
                                    type="text"
                                    name="web_url"
                                    value={form.web_url}
                                    onChange={handleInputChange}
                                    placeholder="Enter Website URL"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                >
                                    <option value="Enabled">Enabled</option>
                                    <option value="Disabled">Disabled</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        /* ADDRESS TAB */
                        <div className="space-y-6">
                            {/* Address form block */}
                            <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    {selectedAddressIndex !== null ? "Edit Address Entry" : "Create Address Entry"}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">Address Line 1</label>
                                        <input
                                            type="text"
                                            value={addressForm.address_line1}
                                            onChange={(e) => setAddressForm(prev => ({ ...prev, address_line1: e.target.value }))}
                                            placeholder="Room, Building, Street Address"
                                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">Address Line 2</label>
                                        <input
                                            type="text"
                                            value={addressForm.address_line2}
                                            onChange={(e) => setAddressForm(prev => ({ ...prev, address_line2: e.target.value }))}
                                            placeholder="Area, Locality"
                                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">City</label>
                                        <input
                                            type="text"
                                            value={addressForm.city}
                                            onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                                            placeholder="City"
                                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">State</label>
                                        <input
                                            type="text"
                                            value={addressForm.state}
                                            onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                                            placeholder="State"
                                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">Pin Code</label>
                                        <input
                                            type="text"
                                            value={addressForm.pin_code}
                                            onChange={(e) => setAddressForm(prev => ({ ...prev, pin_code: e.target.value }))}
                                            placeholder="Pin Code"
                                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">GSTIN</label>
                                        <input
                                            type="text"
                                            value={addressForm.gst_no}
                                            onChange={(e) => setAddressForm(prev => ({ ...prev, gst_no: e.target.value }))}
                                            placeholder="GST Number"
                                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:bg-slate-950"
                                        />
                                    </div>
                                    <div className="flex items-center gap-4 pt-4">
                                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={addressForm.is_default}
                                                onChange={(e) => setAddressForm(prev => ({ ...prev, is_default: e.target.checked }))}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            Default
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={addressForm.is_head_office === 'Yes'}
                                                onChange={(e) => setAddressForm(prev => ({ ...prev, is_head_office: e.target.checked ? 'Yes' : 'No' }))}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            Head Office
                                        </label>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    {selectedAddressIndex !== null && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedAddressIndex(null);
                                                setAddressForm({
                                                    address_line1: '', address_line2: '', city: '', state: '', pin_code: '', country: 'India',
                                                    gst_no: '', email: '', telephone: '', fax: '', tan_no: '', contact_person: '',
                                                    is_head_office: 'No', is_sez: 'No', status: 'Enabled', is_default: false
                                                });
                                            }}
                                            className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold transition-colors"
                                        >
                                            Cancel Edit
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleAddAddress}
                                        className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors"
                                    >
                                        {selectedAddressIndex !== null ? "Update Address" : "Add Address Option"}
                                    </button>
                                </div>
                            </div>

                            {/* Existing addresses list */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    Addresses Saved ({form.addresses.length})
                                </h4>
                                {form.addresses.length === 0 ? (
                                    <div className="text-xs text-slate-400 italic p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                        No addresses added to this CFS record yet.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {form.addresses.map((addr, index) => (
                                            <div
                                                key={index}
                                                className={`relative p-4 border rounded-xl flex flex-col justify-between gap-3 shadow-sm ${
                                                    addr.is_default
                                                        ? 'border-indigo-200 dark:border-indigo-950/40 bg-indigo-50/20 dark:bg-indigo-950/5'
                                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                                                }`}
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Address #{index + 1}</span>
                                                        {addr.is_default && (
                                                            <span className="inline-block bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                Default
                                                            </span>
                                                        )}
                                                        {addr.is_head_office === 'Yes' && (
                                                            <span className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                Head Office
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                        {addr.address_line1}
                                                        {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                                                        {addr.city ? `, ${addr.city}` : ''}
                                                        {addr.state ? `, ${addr.state}` : ''}
                                                        {addr.pin_code ? ` - ${addr.pin_code}` : ''}
                                                    </p>
                                                    {addr.gst_no && (
                                                        <div className="text-[10px] text-slate-500 font-mono">
                                                            GSTIN: {addr.gst_no}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-end gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditAddress(index)}
                                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded"
                                                    >
                                                        <Edit size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteAddress(index)}
                                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-red-600 rounded"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsFormOpen(false)}
                            className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                        >
                            <Save size={16} /> Save CFS
                        </button>
                    </div>
                </form>
            )}
        </DashboardLayout>
    );
};

export default CFS;
