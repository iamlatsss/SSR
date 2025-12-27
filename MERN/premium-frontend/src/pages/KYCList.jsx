import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { 
    Search, Plus, Filter, FileText, Edit, Trash2, X, Download, Eye 
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

    useEffect(() => {
        loadCustomers();
    }, []);

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
                date: new Date().toISOString().slice(0, 10),
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
                setCustomers(prev => prev.map(c => c.customer_id === data.customer_id ? data : c));
                toast.success("Customer updated");
            } else {
                setCustomers(prev => [data, ...prev]);
                toast.success("Customer added");
            }
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
                                {filteredCustomers.length === 0 ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-slate-500">No customers found.</td></tr>
                                ) : (
                                    filteredCustomers.map(c => (
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
                        
                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 border-b pb-2">Basic Info</h4>
                                <input type="date" name="date" value={form.date} onChange={handleFormChange} className="input-field" required placeholder="Date" />
                                <input type="text" name="branch" value={form.branch} onChange={handleFormChange} className="input-field" placeholder="Branch" required />
                                <input type="text" name="name" value={form.name} onChange={handleFormChange} className="input-field" placeholder="Customer Name" required />
                                <textarea name="address" value={form.address} onChange={handleFormChange} className="input-field resize-none" rows="3" placeholder="Address" required />
                                <input type="text" name="customer_type" value={form.customer_type} onChange={handleFormChange} className="input-field" placeholder="Org Type (Pvt Ltd, etc.)" required />
                                <input type="text" name="status" value={form.status} onChange={handleFormChange} className="input-field" placeholder="Role (Shipper/CHA...)" required />
                            </div>

                             {/* Legal & Finance */}
                             <div className="space-y-4">
                                <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 border-b pb-2">Legal & Finance</h4>
                                <input type="text" name="year_of_establishment" value={form.year_of_establishment} onChange={handleFormChange} className="input-field" placeholder="Year Est." />
                                <input type="text" name="pan" value={form.pan} onChange={handleFormChange} className="input-field" placeholder="PAN" required />
                                <input type="text" name="gstin" value={form.gstin} onChange={handleFormChange} className="input-field" placeholder="GSTIN" />
                                <input type="text" name="state" value={form.state} onChange={handleFormChange} className="input-field" placeholder="State" />
                                <textarea name="bank_details" value={form.bank_details} onChange={handleFormChange} className="input-field resize-none" rows="3" placeholder="Bank Details" />
                                <input type="text" name="annual_turnover" value={form.annual_turnover} onChange={handleFormChange} className="input-field" placeholder="Annual Turnover" />
                             </div>

                             {/* Contact & Docs */}
                             <div className="space-y-4">
                                <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 border-b pb-2">Contact & Docs</h4>
                                <input type="email" name="email_export" value={form.email_export} onChange={handleFormChange} className="input-field" placeholder="Export Email" />
                                <input type="email" name="email_import" value={form.email_import} onChange={handleFormChange} className="input-field" placeholder="Import Email" />
                                <input type="text" name="contact_person_export" value={form.contact_person_export} onChange={handleFormChange} className="input-field" placeholder="Contact Person (Export)" />
                                
                                <div className="pt-2 space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Documents</label>
                                    <input type="file" name="gstin_doc" onChange={handleFileChange} className="file-input" />
                                    <input type="file" name="pan_doc" onChange={handleFileChange} className="file-input" />
                                    <input type="file" name="iec_doc" onChange={handleFileChange} className="file-input" />
                                    <input type="file" name="kyc_letterhead_doc" onChange={handleFileChange} className="file-input" />
                                </div>
                             </div>
                             
                             <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-md">
                                    {submitting ? "Saving..." : "Save Customer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {detailsCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDetailsCustomer(null)}>
                     <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{detailsCustomer.name}</h3>
                            <button onClick={() => setDetailsCustomer(null)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="space-y-6">
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-slate-500 block text-xs uppercase">GSTIN</span> <span className="text-slate-800 dark:text-slate-200 font-medium">{detailsCustomer.gstin || "—"}</span></div>
                                <div><span className="text-slate-500 block text-xs uppercase">PAN</span> <span className="text-slate-800 dark:text-slate-200 font-medium">{detailsCustomer.pan || "—"}</span></div>
                                <div><span className="text-slate-500 block text-xs uppercase">Role</span> <span className="text-slate-800 dark:text-slate-200 font-medium">{detailsCustomer.status}</span></div>
                                <div><span className="text-slate-500 block text-xs uppercase">Type</span> <span className="text-slate-800 dark:text-slate-200 font-medium">{detailsCustomer.customer_type}</span></div>
                             </div>
                             <div><span className="text-slate-500 block text-xs uppercase">Address</span> <p className="text-slate-800 dark:text-slate-200">{detailsCustomer.address}</p></div>
                             
                             {/* Documents Links */}
                             <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="font-medium text-slate-800 dark:text-white mb-3">Documents</h4>
                                <div className="flex flex-wrap gap-3">
                                    {['gstin_doc', 'pan_doc', 'iec_doc', 'kyc_letterhead_doc'].map(doc => (
                                        detailsCustomer[`${doc}_url`] && (
                                            <a key={doc} href={detailsCustomer[`${doc}_url`]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm transition-colors">
                                                <FileText size={16} /> 
                                                <span className="capitalize">{doc.replace('_doc', '').replace('_', ' ')}</span>
                                            </a>
                                        )
                                    ))}
                                    {!['gstin_doc', 'pan_doc', 'iec_doc', 'kyc_letterhead_doc'].some(doc => detailsCustomer[`${doc}_url`]) && (
                                        <span className="text-sm text-slate-500 italic">No documents uploaded.</span>
                                    )}
                                </div>
                             </div>
                        </div>
                     </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default KYCList;
