import React, { useState, useEffect } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, Save, RotateCcw, ShieldCheck, MapPin, Trash2, Mail, Phone, Edit, CheckCircle, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';

const CATEGORY_TYPES = ["--- None ---", "Customer", "Vendor", "Agent", "Carrier", "Broker", "Others"];
const PARTY_TYPES = ["--- None ---", "Local", "Overseas", "Special"];
const ENTITY_TYPES = ["--- None ---", "Proprietorship", "Partnership", "Private Limited", "Public Limited", "LLP", "Trust", "Individual", "Others"];
const GST_REG_TYPES = ["--- None ---", "Registered", "Unregistered", "Composition", "SEZ", "Input Service Distributor"];
const MSME_TYPES = ["--- None ---", "Micro", "Small", "Medium"];

const Parties = () => {
    // List & pagination states
    const [parties, setParties] = useState([]);
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
    const [gstFetchInput, setGstFetchInput] = useState('');

    // Form inputs matching reference layout
    const [form, setForm] = useState({
        category_type: '--- None ---',
        party_type: '--- None ---',
        name: '',
        legal_name: '',
        gst_no: '',
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
        gst_reg_type: '--- None ---',
        referred_by: '',
        fac: 'No',
        iata_code: '',
        is_iata_agent: 'No',
        is_airline: 'No',
        is_msme: 'No',
        msme_type: '--- None ---',
        msme_no: '',
        tds_rate: '',
        rcm: 'No',
        usd_party: 'No',
        os_active: 'No',
        commodity: '',
        special_instruction: '',
        info_by_sales: '',
        hod_feedback: '',
        no_of_employees: '',
        marketing: '',
        party_status: 'Draft',
        status: 'Enabled',
        addresses: []
    });

    // Selected address for editing in the address tab
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);

    const [files, setFiles] = useState({
        gstin_doc: null,
        pan_doc: null,
        iec_doc: null,
        kyc_letterhead_doc: null
    });

    const [validationErrors, setValidationErrors] = useState({});

    // Load data
    useEffect(() => {
        if (!isFormOpen) {
            loadParties();
        }
    }, [currentPage, searchTerm, isFormOpen]);

    const loadParties = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/party/search`, {
                params: {
                    page: currentPage,
                    limit: 20,
                    search: searchTerm
                }
            });
            if (res.data.success) {
                setParties(res.data.parties || []);
                setTotalPages(res.data.totalPages || 1);
                setTotalItems(res.data.total || 0);
            }
        } catch (error) {
            console.error("Error loading parties:", error);
            toast.error("Failed to load parties from server.");
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
            category_type: '--- None ---',
            party_type: '--- None ---',
            name: '',
            legal_name: '',
            gst_no: '',
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
            gst_reg_type: '--- None ---',
            referred_by: '',
            fac: 'No',
            iata_code: '',
            is_iata_agent: 'No',
            is_airline: 'No',
            is_msme: 'No',
            msme_type: '--- None ---',
            msme_no: '',
            tds_rate: '',
            rcm: 'No',
            usd_party: 'No',
            os_active: 'No',
            commodity: '',
            special_instruction: '',
            info_by_sales: '',
            hod_feedback: '',
            no_of_employees: '',
            marketing: '',
            party_status: 'Draft',
            status: 'Enabled',
            addresses: [],
            gstin_doc_url: null,
            pan_doc_url: null,
            iec_doc_url: null,
            kyc_letterhead_doc_url: null
        });
        setFiles({
            gstin_doc: null,
            pan_doc: null,
            iec_doc: null,
            kyc_letterhead_doc: null
        });
        setGstFetchInput('');
        setSelectedAddressIndex(null);
        setValidationErrors({});
        setIsEditing(false);
        setEditingId(null);
        setActiveTab('general');
        setIsFormOpen(true);
    };

    const handleOpenEditForm = (party) => {
        const resolvedGst = party.gst_no || (party.addresses && party.addresses.find(a => a.is_default)?.gst_no) || '';
        setForm({
            category_type: party.category_type || '--- None ---',
            party_type: party.party_type || '--- None ---',
            name: party.name || '',
            legal_name: party.legal_name || '',
            gst_no: resolvedGst,
            email: party.email || '',
            pan_no: party.pan_no || '',
            cin_no: party.cin_no || '',
            entity_type: party.entity_type || '--- None ---',
            web_url: party.web_url || '',
            director_name: party.director_name || '',
            turnover: party.turnover || '',
            group_companies: party.group_companies || '',
            business_type: party.business_type || '',
            incorporation_year: party.incorporation_year || '',
            gst_reg_type: party.gst_reg_type || '--- None ---',
            referred_by: party.referred_by || '',
            fac: party.fac || 'No',
            iata_code: party.iata_code || '',
            is_iata_agent: party.is_iata_agent || 'No',
            is_airline: party.is_airline || 'No',
            is_msme: party.is_msme || 'No',
            msme_type: party.msme_type || '--- None ---',
            msme_no: party.msme_no || '',
            tds_rate: party.tds_rate || '',
            rcm: party.rcm || 'No',
            usd_party: party.usd_party || 'No',
            os_active: party.os_active || 'No',
            commodity: party.commodity || '',
            special_instruction: party.special_instruction || '',
            info_by_sales: party.info_by_sales || '',
            hod_feedback: party.hod_feedback || '',
            no_of_employees: party.no_of_employees || '',
            marketing: party.marketing || '',
            party_status: party.party_status || 'Draft',
            status: party.status || 'Enabled',
            addresses: party.addresses || [],
            gstin_doc_url: party.gstin_doc_url || null,
            pan_doc_url: party.pan_doc_url || null,
            iec_doc_url: party.iec_doc_url || null,
            kyc_letterhead_doc_url: party.kyc_letterhead_doc_url || null
        });
        setFiles({
            gstin_doc: null,
            pan_doc: null,
            iec_doc: null,
            kyc_letterhead_doc: null
        });
        setGstFetchInput(resolvedGst);
        setSelectedAddressIndex(party.addresses && party.addresses.length > 0 ? 0 : null);
        setValidationErrors({});
        setIsEditing(true);
        setEditingId(party.id);
        setActiveTab('general');
        setIsFormOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: value
        }));

        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleFileChange = (e) => {
        const { name, files: selected } = e.target;
        setFiles(prev => ({
            ...prev,
            [name]: selected[0] || null
        }));
    };

    const handleGstAutoFetch = async () => {
        if (selectedAddressIndex === null) {
            toast.warning("Please select or add an address first.");
            return;
        }

        const cleanGst = gstFetchInput.trim().toUpperCase();

        // Simple regex format validation on the frontend
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(cleanGst)) {
            toast.error("Please enter a valid 15-character GSTIN format (e.g. 27AAFCS0000A1Z1).");
            return;
        }

        try {
            toast.info("Fetching GSTIN details...");
            const res = await api.get(`/party/gstin-lookup/${cleanGst}`);
            if (res.data.success && res.data.data) {
                const info = res.data.data;

                setForm(prev => {
                    const updatedAddresses = [...prev.addresses];
                    if (selectedAddressIndex !== null && updatedAddresses[selectedAddressIndex]) {
                        updatedAddresses[selectedAddressIndex] = {
                            ...updatedAddresses[selectedAddressIndex],
                            gst_no: cleanGst,
                            address_line1: info.address_line1 || updatedAddresses[selectedAddressIndex].address_line1,
                            address_line2: info.address_line2 || updatedAddresses[selectedAddressIndex].address_line2,
                            city: info.city || updatedAddresses[selectedAddressIndex].city,
                            district: info.district || updatedAddresses[selectedAddressIndex].district,
                            state_code: info.state_code || updatedAddresses[selectedAddressIndex].state_code,
                            pin_code: info.pincode || updatedAddresses[selectedAddressIndex].pin_code,
                            gst_state: info.state || updatedAddresses[selectedAddressIndex].gst_state,
                            country: info.country || updatedAddresses[selectedAddressIndex].country
                        };
                    }
                    return {
                        ...prev,
                        addresses: updatedAddresses
                    };
                });
                toast.success(`GSTIN details fetched successfully! (Source: ${res.data.source})`);
            } else {
                toast.error("GST number details not found.");
            }
        } catch (error) {
            console.error("GST Auto-Fetch failed:", error);
            const errMsg = error.response?.data?.message || "Failed to fetch GST details. Please try again or enter details manually.";
            toast.error(errMsg);
        }
    };

    const handleGstLookup = async (index, gstinVal) => {
        const cleanGst = gstinVal.trim().toUpperCase();
        if (cleanGst.length !== 15) return;

        try {
            toast.info("Fetching address details for GSTIN...");
            const res = await api.get(`/party/gstin-lookup/${cleanGst}`);
            if (res.data.success && res.data.data) {
                const info = res.data.data;
                const updatedAddresses = [...form.addresses];
                updatedAddresses[index] = {
                    ...updatedAddresses[index],
                    gst_no: cleanGst,
                    address_line1: info.address_line1 || updatedAddresses[index].address_line1,
                    address_line2: info.address_line2 || updatedAddresses[index].address_line2,
                    city: info.city || updatedAddresses[index].city,
                    district: info.district || updatedAddresses[index].district,
                    state_code: info.state_code || updatedAddresses[index].state_code,
                    pin_code: info.pincode || updatedAddresses[index].pin_code,
                    gst_state: info.state || updatedAddresses[index].gst_state,
                    country: info.country || updatedAddresses[index].country
                };

                setForm(prev => ({
                    ...prev,
                    addresses: updatedAddresses
                }));
                toast.success(`Address details auto-populated! (Source: ${res.data.source})`);
            }
        } catch (error) {
            console.error("GSTIN lookup failed:", error);
            toast.error("Could not fetch address details for this GSTIN");
        }
    };

    // Address changes handler
    const handleAddressChange = (index, field, value) => {
        const updatedAddresses = [...form.addresses];
        updatedAddresses[index] = {
            ...updatedAddresses[index],
            [field]: value
        };

        // If setting default, unset others
        if (field === 'is_default' && value === true) {
            updatedAddresses.forEach((addr, idx) => {
                if (idx !== index) {
                    addr.is_default = false;
                }
            });
        }

        setForm(prev => ({
            ...prev,
            addresses: updatedAddresses
        }));

        if (field === 'gst_no' && value.trim().length === 15) {
            handleGstLookup(index, value);
        }
    };

    const handleAddAddress = () => {
        const newAddress = {
            email: '',
            telephone: '',
            fax: '',
            tan_no: '',
            gst_no: '',
            address_line1: '',
            address_line2: '',
            city: '',
            district: '',
            state_code: '',
            pin_code: '',
            country: 'India',
            gst_state: '',
            is_head_office: 'No',
            is_sez: 'No',
            status: 'Enabled',
            is_default: form.addresses.length === 0 // default if it is the first one
        };
        setForm(prev => ({
            ...prev,
            addresses: [...prev.addresses, newAddress]
        }));
        setSelectedAddressIndex(form.addresses.length);
    };

    const handleRemoveAddress = (index) => {
        const updated = form.addresses.filter((_, idx) => idx !== index);

        // Ensure at least one default if we have addresses remaining
        if (updated.length > 0 && !updated.some(a => a.is_default)) {
            updated[0].is_default = true;
        }

        setForm(prev => ({
            ...prev,
            addresses: updated
        }));
        setSelectedAddressIndex(updated.length > 0 ? 0 : null);
    };

    const validateForm = () => {
        const errors = {};
        if (!form.name.trim()) errors.name = 'Party Name is required';
        if (!form.email.trim()) errors.email = 'E-Mail Id is required';
        if (!form.status) errors.status = 'Status is required';

        setValidationErrors(errors);

        if (Object.keys(errors).length > 0) {
            Object.values(errors).forEach(err => toast.warning(err));
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (key.endsWith('_url')) return; // skip signed url fields
                if (key === 'addresses') {
                    formData.append('addresses', JSON.stringify(value));
                } else if (value !== null && value !== undefined && value !== "") {
                    formData.append(key, value);
                }
            });

            Object.entries(files).forEach(([key, file]) => {
                if (file) {
                    formData.append(key, file);
                }
            });

            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            };

            if (isEditing) {
                const res = await api.put(`/party/${editingId}`, formData, config);
                if (res.data.success) {
                    toast.success("Party updated successfully!");
                    setIsFormOpen(false);
                }
            } else {
                const res = await api.post('/party', formData, config);
                if (res.data.success) {
                    toast.success("New Party saved successfully!");
                    setIsFormOpen(false);
                }
            }
        } catch (error) {
            console.error("Save Party Error:", error);
            const msg = error.response?.data?.message || "Failed to save Party.";
            toast.error(msg);
        }
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
    };

    return (
        <DashboardLayout title="Party Master">
            <div className="flex flex-col h-full bg-slate-50/50 dark:bg-dark-bg transition-colors duration-300">

                {isFormOpen && (
                    <div className="flex justify-between items-center mb-6">
                        {/* Tab Toggle buttons */}
                        <div className="flex bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-xl gap-1">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'general'
                                        ? 'bg-white dark:bg-dark-card text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                            >
                                General Information
                            </button>
                            <button
                                onClick={() => setActiveTab('address')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'address'
                                        ? 'bg-white dark:bg-dark-card text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                            >
                                Addresses ({form.addresses.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('kyc')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'kyc'
                                        ? 'bg-white dark:bg-dark-card text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                            >
                                KYC Documents
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                                title="Save Party"
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
                                    placeholder="Search by Name, Email, PAN, Marketing..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="pl-9 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-poppins text-xs"
                                />
                            </div>

                            <button
                                onClick={handleOpenCreateForm}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition-all duration-200 font-bold text-xs shadow-md hover:shadow-lg ml-auto whitespace-nowrap cursor-pointer"
                            >
                                <Plus size={16} /> Add Party
                            </button>
                        </div>

                        {/* Parties Table */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl mb-4 overflow-x-auto overflow-y-visible">
                            <table className="w-full text-left border-collapse text-xs table-auto">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-150 dark:border-slate-850 text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider select-none">
                                        <th className="p-3.5 pl-6">Party Name</th>
                                        <th className="p-3.5">Marketing</th>
                                        <th className="p-3.5">Email</th>
                                        <th className="p-3.5">PAN No.</th>
                                        <th className="p-3.5">GST No.</th>
                                        <th className="p-3.5">Party Status</th>
                                        <th className="p-3.5">Status</th>
                                        <th className="p-3.5 text-center pr-6 w-24">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" className="p-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" />
                                                    <span className="text-xs font-semibold">Loading Party records...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : parties.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="p-12 text-center text-slate-500 dark:text-slate-400 italic">
                                                No parties found. Click "Add Party" to create a new one.
                                            </td>
                                        </tr>
                                    ) : (
                                        parties.map((party) => {
                                            const defaultGst = party.addresses && party.addresses.find(a => a.is_default)?.gst_no || '—';
                                            return (
                                                <tr key={party.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/10 transition-colors text-slate-800 dark:text-slate-200">
                                                    <td className="p-3.5 pl-6 font-semibold text-slate-900 dark:text-white max-w-[220px] truncate" title={party.name}>
                                                        {party.name}
                                                    </td>
                                                    <td className="p-3.5 font-medium">{party.marketing || '—'}</td>
                                                    <td className="p-3.5 text-slate-550 dark:text-slate-450 truncate max-w-[150px]">{party.email}</td>
                                                    <td className="p-3.5 font-mono">{party.pan_no || '—'}</td>
                                                    <td className="p-3.5 font-mono">{defaultGst}</td>
                                                    <td className="p-3.5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${party.party_status === 'Data Updated'
                                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450'
                                                            }`}>
                                                            {party.party_status || 'Draft'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${party.status === 'Enabled'
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450'
                                                            }`}>
                                                            {party.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 text-center pr-6">
                                                        <button
                                                            onClick={() => handleOpenEditForm(party)}
                                                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {parties.length > 0 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="text-xs text-slate-550 dark:text-slate-400">
                                    Showing <span className="font-bold">{(currentPage - 1) * 20 + 1}</span> to <span className="font-bold">{Math.min(currentPage * 20, totalItems)}</span> of <span className="font-bold">{totalItems}</span> parties
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="flex gap-1 text-xs font-bold max-w-[200px] overflow-x-auto">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p)}
                                                className={`w-8 h-8 min-w-[32px] rounded-lg transition-colors ${currentPage === p ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
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
                    /* FORM VIEW COMPONENT (ADD/EDIT PARTY MASTER) */
                    <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col h-auto transition-all duration-300">
                        {/* Title bar */}
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-6">
                            <ShieldCheck className="text-indigo-600 dark:text-indigo-400 stroke-[1.5]" size={22} />
                            <h3 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                {isEditing ? 'Edit Party Master' : 'Add Party Master'}
                            </h3>
                        </div>

                        {activeTab === 'general' ? (
                            /* GENERAL TAB FIELDS */
                            <div className="space-y-6 pb-2">

                                {/* Row 1: Category Type | Party Type | Party Name | E-Mail Id */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Category Type</label>
                                        <select
                                            name="category_type"
                                            value={form.category_type}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            {CATEGORY_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Party Type</label>
                                        <select
                                            name="party_type"
                                            value={form.party_type}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            {PARTY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5 flex items-center gap-1">
                                            <span className="text-red-500 font-bold">*</span> Party Name
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={form.name}
                                            onChange={handleInputChange}
                                            placeholder="Enter Party Name"
                                            className={`w-full px-4 py-2.5 rounded-lg border text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${validationErrors.name ? 'border-rose-450 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                                                }`}
                                        />
                                        {validationErrors.name && <span className="text-[10px] text-rose-550 font-semibold mt-1 block">{validationErrors.name}</span>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5 flex items-center gap-1">
                                            <span className="text-red-500 font-bold">*</span> E-Mail Id
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleInputChange}
                                            placeholder="Enter E-Mail Id"
                                            className={`w-full px-4 py-2.5 rounded-lg border text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${validationErrors.email ? 'border-rose-450 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                                                }`}
                                        />
                                        {validationErrors.email && <span className="text-[10px] text-rose-550 font-semibold mt-1 block">{validationErrors.email}</span>}
                                    </div>
                                </div>

                                {/* Row 2: Legal Name | GST No. | PAN No | CIN No */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Legal Name</label>
                                        <input
                                            type="text"
                                            name="legal_name"
                                            value={form.legal_name}
                                            onChange={handleInputChange}
                                            placeholder="Enter Legal Name"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">GST No.</label>
                                        <input
                                            type="text"
                                            name="gst_no"
                                            value={form.gst_no}
                                            onChange={handleInputChange}
                                            placeholder="Enter GST No"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono uppercase"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">PAN No</label>
                                        <input
                                            type="text"
                                            name="pan_no"
                                            value={form.pan_no}
                                            onChange={handleInputChange}
                                            placeholder="Enter PAN No"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all uppercase"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">CIN No</label>
                                        <input
                                            type="text"
                                            name="cin_no"
                                            value={form.cin_no}
                                            onChange={handleInputChange}
                                            placeholder="Enter CIN No"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all uppercase"
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Type Of Entity | Web URL | Director/Partner Name | Turnover of the Company */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Type Of Entity</label>
                                        <select
                                            name="entity_type"
                                            value={form.entity_type}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            {ENTITY_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Web URL</label>
                                        <input
                                            type="text"
                                            name="web_url"
                                            value={form.web_url}
                                            onChange={handleInputChange}
                                            placeholder="Enter Web URL"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Director/Partner Name</label>
                                        <input
                                            type="text"
                                            name="director_name"
                                            value={form.director_name}
                                            onChange={handleInputChange}
                                            placeholder="Enter Director Name"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Turnover of the Company</label>
                                        <input
                                            type="text"
                                            name="turnover"
                                            value={form.turnover}
                                            onChange={handleInputChange}
                                            placeholder="Enter Turnover"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Row 4: Name of Group Companies | Type Of Business | Date Of Incorporation Year | GST Reg. Type */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Name of Group Companies</label>
                                        <input
                                            type="text"
                                            name="group_companies"
                                            value={form.group_companies}
                                            onChange={handleInputChange}
                                            placeholder="Enter Group Companies"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Type Of Business</label>
                                        <input
                                            type="text"
                                            name="business_type"
                                            value={form.business_type}
                                            onChange={handleInputChange}
                                            placeholder="Enter Type of Business"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Date Of Incorporation Year</label>
                                        <input
                                            type="text"
                                            name="incorporation_year"
                                            value={form.incorporation_year}
                                            onChange={handleInputChange}
                                            placeholder="Enter Incorporation Year"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">GST Reg. Type</label>
                                        <select
                                            name="gst_reg_type"
                                            value={form.gst_reg_type}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            {GST_REG_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Row 5: Referred By | FAC | IATA Code | Is IATA Agent */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Referred By</label>
                                        <input
                                            type="text"
                                            name="referred_by"
                                            value={form.referred_by}
                                            onChange={handleInputChange}
                                            placeholder="Enter Referred By"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">FAC</label>
                                        <select
                                            name="fac"
                                            value={form.fac}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">IATA Code</label>
                                        <input
                                            type="text"
                                            name="iata_code"
                                            value={form.iata_code}
                                            onChange={handleInputChange}
                                            placeholder="Enter IATA Code"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-655 dark:text-slate-355 mb-1.5">Is IATA Agent</label>
                                        <select
                                            name="is_iata_agent"
                                            value={form.is_iata_agent}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 6: Is Air Line | Is MSME | MSME Type | MSME No. */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-655 dark:text-slate-355 mb-1.5">Is Air Line</label>
                                        <select
                                            name="is_airline"
                                            value={form.is_airline}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-655 dark:text-slate-355 mb-1.5">Is MSME</label>
                                        <select
                                            name="is_msme"
                                            value={form.is_msme}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">MSME Type</label>
                                        <select
                                            name="msme_type"
                                            value={form.msme_type}
                                            onChange={handleInputChange}
                                            disabled={form.is_msme !== 'Yes'}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            {MSME_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">MSME No.</label>
                                        <input
                                            type="text"
                                            name="msme_no"
                                            value={form.msme_no}
                                            onChange={handleInputChange}
                                            disabled={form.is_msme !== 'Yes'}
                                            placeholder="Enter MSME No"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Row 7: TDS Rate | RCM | USD Party | O/S Active */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">TDS Rate</label>
                                        <input
                                            type="text"
                                            name="tds_rate"
                                            value={form.tds_rate}
                                            onChange={handleInputChange}
                                            placeholder="Enter TDS Rate"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">RCM</label>
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
                                    <div>
                                        <label className="block text-xs font-bold text-slate-655 dark:text-slate-355 mb-1.5">USD Party</label>
                                        <select
                                            name="usd_party"
                                            value={form.usd_party}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-655 dark:text-slate-355 mb-1.5">O/S Active</label>
                                        <select
                                            name="os_active"
                                            value={form.os_active}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 8: Marketing | Party Status | Status | No. Of Employees */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Marketing</label>
                                        <input
                                            type="text"
                                            name="marketing"
                                            value={form.marketing}
                                            onChange={handleInputChange}
                                            placeholder="Enter Marketing Person Name"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Party Status</label>
                                        <select
                                            name="party_status"
                                            value={form.party_status}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="Draft">Draft</option>
                                            <option value="Data Updated">Data Updated</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5 flex items-center gap-1">
                                            <span className="text-red-500 font-bold">*</span> Status
                                        </label>
                                        <select
                                            name="status"
                                            value={form.status}
                                            onChange={handleInputChange}
                                            className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer ${validationErrors.status ? 'border-rose-450 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                                                }`}
                                        >
                                            <option value="Enabled">Enabled</option>
                                            <option value="Disabled">Disabled</option>
                                        </select>
                                        {validationErrors.status && <span className="text-[10px] text-rose-550 font-semibold mt-1 block">{validationErrors.status}</span>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">No. Of Employees</label>
                                        <input
                                            type="text"
                                            name="no_of_employees"
                                            value={form.no_of_employees}
                                            onChange={handleInputChange}
                                            placeholder="Enter No. of Employees"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Row 9: Commodity | Special Instruction | Sales Info | HOD Feedback */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Name Of Commodity</label>
                                        <textarea
                                            name="commodity"
                                            value={form.commodity}
                                            onChange={handleInputChange}
                                            rows="3"
                                            placeholder="Describe commodity..."
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Any Special Instruction</label>
                                        <textarea
                                            name="special_instruction"
                                            value={form.special_instruction}
                                            onChange={handleInputChange}
                                            rows="3"
                                            placeholder="Enter special instructions..."
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Info By Sales Person</label>
                                        <textarea
                                            name="info_by_sales"
                                            value={form.info_by_sales}
                                            onChange={handleInputChange}
                                            rows="3"
                                            placeholder="Enter sales feedback/info..."
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">HOD Feedback on Visit</label>
                                        <textarea
                                            name="hod_feedback"
                                            value={form.hod_feedback}
                                            onChange={handleInputChange}
                                            rows="3"
                                            placeholder="Enter HOD visit feedback..."
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'address' ? (
                            /* ADDRESS TAB SUB-FORM */
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Left Side: Address List */}
                                <div className="w-full md:w-80 flex flex-col border-r border-slate-200 dark:border-slate-800 pr-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Party Addresses</h4>
                                        <button
                                            type="button"
                                            onClick={handleAddAddress}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                        >
                                            <Plus size={12} /> Add New
                                        </button>
                                    </div>

                                    <div className="space-y-3 pb-4">
                                        {form.addresses.length === 0 ? (
                                            <div className="text-xs italic text-slate-400 p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
                                                No addresses added yet. Click "Add New" to create one.
                                            </div>
                                        ) : (
                                            form.addresses.map((addr, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setSelectedAddressIndex(idx)}
                                                    className={`p-3.5 border rounded-xl cursor-pointer relative transition-all group flex flex-col gap-1.5 ${selectedAddressIndex === idx
                                                            ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/15'
                                                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/40'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin size={13} className={selectedAddressIndex === idx ? 'text-indigo-500' : 'text-slate-400'} />
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                Address {idx + 1}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveAddress(idx);
                                                                }}
                                                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                        {addr.address_line1 || '(No address lines entered)'}
                                                    </div>

                                                    <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-850">
                                                        {addr.is_default ? (
                                                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                                                                Default
                                                            </span>
                                                        ) : <span />}
                                                        <span className={`text-[8px] font-bold ${addr.status === 'Enabled' ? 'text-emerald-500' : 'text-rose-500'
                                                            }`}>
                                                            {addr.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Address Form Details */}
                                <div className="flex-1 pb-4">
                                    {selectedAddressIndex === null ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-xs">
                                            Select an address from the left list or add a new one to view and edit details.
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                                                <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">Address {selectedAddressIndex + 1} Details</h4>
                                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.addresses[selectedAddressIndex].is_default}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'is_default', e.target.checked)}
                                                        className="accent-indigo-600 w-4 h-4 cursor-pointer"
                                                    />
                                                    Set as Default Address
                                                </label>
                                            </div>

                                            {/* GST Auto-Fetch Panel */}
                                            <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/40 rounded-2xl">
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-bold text-slate-655 dark:text-slate-355 mb-1.5">
                                                            GST Number (for Auto-Fetch)
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={gstFetchInput}
                                                                onChange={(e) => setGstFetchInput(e.target.value.toUpperCase())}
                                                                placeholder="Enter 15-digit GSTIN (e.g. 27AAFCS0000A1Z1)"
                                                                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono uppercase"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={handleGstAutoFetch}
                                                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer whitespace-nowrap"
                                                            >
                                                                Fetch GST Details
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 leading-relaxed">
                                                            Tip: Entering a valid GSTIN and clicking "Fetch" will auto-populate the Address, City, Pincode, District, GST State, State Code, and Country for this Address record.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Line 1: Address Line 1 | Address Line 2 */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Address Line 1</label>
                                                    <input
                                                        type="text"
                                                        value={form.addresses[selectedAddressIndex].address_line1}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'address_line1', e.target.value)}
                                                        placeholder="Enter Address Line 1"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Address Line 2</label>
                                                    <input
                                                        type="text"
                                                        value={form.addresses[selectedAddressIndex].address_line2}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'address_line2', e.target.value)}
                                                        placeholder="Enter Address Line 2"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>

                                            {/* Line 2: City | Pin Code | District | GST State */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">City</label>
                                                    <input
                                                        type="text"
                                                        value={form.addresses[selectedAddressIndex].city}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'city', e.target.value)}
                                                        placeholder="Enter City"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Pin Code</label>
                                                    <input
                                                        type="text"
                                                        value={form.addresses[selectedAddressIndex].pin_code}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'pin_code', e.target.value)}
                                                        placeholder="Enter Pin Code"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">District</label>
                                                    <input
                                                        type="text"
                                                        value={form.addresses[selectedAddressIndex].district || ''}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'district', e.target.value)}
                                                        placeholder="Enter District"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">GST State</label>
                                                    <input
                                                        type="text"
                                                        value={form.addresses[selectedAddressIndex].gst_state}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'gst_state', e.target.value)}
                                                        placeholder="Enter GST State (e.g. Maharashtra)"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>

                                            {/* Line 3: State Code | Country | GST No | TAN No */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">State Code</label>
                                                    <input
                                                        type="text"
                                                        value={form.addresses[selectedAddressIndex].state_code || ''}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'state_code', e.target.value)}
                                                        placeholder="Enter State Code (e.g. 27)"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Country</label>
                                                    <input
                                                        type="text"
                                                        value={form.addresses[selectedAddressIndex].country}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'country', e.target.value)}
                                                        placeholder="Enter Country"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">GST No</label>
                                                    <input
                                                        type="text"
                                                        value={form.addresses[selectedAddressIndex].gst_no}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'gst_no', e.target.value)}
                                                        placeholder="Enter GST No"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono uppercase"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">TAN No</label>
                                                    <input
                                                        type="text"
                                                        value={form.addresses[selectedAddressIndex].tan_no}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'tan_no', e.target.value)}
                                                        placeholder="Enter TAN No"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                                                    />
                                                </div>
                                            </div>

                                            {/* Line 4: E-Mail Id | Telephone | Fax | Is Head Office */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">E-Mail Id</label>
                                                    <input
                                                        type="email"
                                                        value={form.addresses[selectedAddressIndex].email}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'email', e.target.value)}
                                                        placeholder="Enter E-Mail"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Telephone</label>
                                                    <input
                                                        type="text"
                                                        value={form.addresses[selectedAddressIndex].telephone}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'telephone', e.target.value)}
                                                        placeholder="Enter Telephone"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 mb-1.5">Fax</label>
                                                    <input
                                                        type="text"
                                                        value={form.addresses[selectedAddressIndex].fax}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'fax', e.target.value)}
                                                        placeholder="Enter Fax"
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-355 mb-1.5">Is Head Office</label>
                                                    <select
                                                        value={form.addresses[selectedAddressIndex].is_head_office}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'is_head_office', e.target.value)}
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                                    >
                                                        <option value="No">No</option>
                                                        <option value="Yes">Yes</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Line 5: Is SEZ Address | Address Status */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-355 mb-1.5">Is SEZ Address</label>
                                                    <select
                                                        value={form.addresses[selectedAddressIndex].is_sez}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'is_sez', e.target.value)}
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                                    >
                                                        <option value="No">No</option>
                                                        <option value="Yes">Yes</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-355 mb-1.5">Address Status</label>
                                                    <select
                                                        value={form.addresses[selectedAddressIndex].status}
                                                        onChange={(e) => handleAddressChange(selectedAddressIndex, 'status', e.target.value)}
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-card text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                                    >
                                                        <option value="Enabled">Enabled</option>
                                                        <option value="Disabled">Disabled</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* KYC TAB SUB-FORM */
                            <div className="space-y-6 pb-4">
                                <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Uploaded Documents</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[
                                        { label: "GST Certificate (GSTIN)", name: "gstin_doc" },
                                        { label: "PAN Card", name: "pan_doc" },
                                        { label: "IEC Form", name: "iec_doc" },
                                        { label: "KYC Form (Letterhead)", name: "kyc_letterhead_doc" }
                                    ].map((field) => (
                                        <div key={field.name} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-dark-card flex flex-col gap-4 shadow-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide">{field.label}</span>
                                                {form[`${field.name}_url`] ? (
                                                    <a
                                                        href={form[`${field.name}_url`]}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                                    >
                                                        <Eye size={14} /> View Document
                                                    </a>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-400">Not Uploaded</span>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                name={field.name}
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={handleFileChange}
                                                className="block w-full text-xs text-slate-700 dark:text-slate-300
                                                file:mr-3 file:py-1.5 file:px-3.5
                                                file:rounded-lg file:border-0
                                                file:text-xs file:font-semibold
                                                file:bg-indigo-50 file:text-indigo-600
                                                hover:file:bg-indigo-100 dark:file:bg-slate-700 dark:file:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg
                                                focus:outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Parties;
