import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { 
    Search, Plus, Edit2, Save, XCircle, Trash2, FileText, Anchor, Container 
} from "lucide-react";
import { toast } from "react-toastify";

const EMPTY_FORM = {
    job_no: "",
    hbl_no: "", mbl_no: "", eta: "", etd: "",
    igm_on: "HBL", igm_no: "",
    cha: "", cfs: "", // IDs
    freight_amount: "", freight_currency: "INR",
    do_validity: "", container_number: "",
    // Display only
    shipper_name: "", consignee_name: "" 
};

const IGM = () => {
    const [bookings, setBookings] = useState([]); // All bookings
    const [igmList, setIgmList] = useState([]); // Bookings with IGM details
    const [customers, setCustomers] = useState([]); // For CHA/CFS
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [igmForm, setIgmForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [initRes, bookingsRes] = await Promise.all([
                api.get("/booking/init"),
                api.get("/booking/get")
            ]);

            if (initRes.data.success) {
                setCustomers(initRes.data.customers || []);
            }
            if (bookingsRes.data.success) {
                const allBookings = bookingsRes.data.bookings || [];
                setBookings(allBookings);
                // Filter for list view: show existing IGMs (those with an igm_no)
                setIgmList(allBookings.filter(b => b.igm_no));
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("Failed to load IGM data");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setIgmForm(prev => ({ ...prev, [name]: value }));
    };

    const handleJobSelect = (e) => {
        const jobNo = e.target.value;
        if (!jobNo) {
            setIgmForm(EMPTY_FORM);
            return;
        }

        const selectedBooking = bookings.find(b => b.job_no == jobNo);
        if (selectedBooking) {
            setIgmForm({
                ...EMPTY_FORM,
                ...selectedBooking, // Auto-fill existing booking data
                // Ensure defaults for IGM specific fields if they are null
                igm_on: selectedBooking.igm_on || "HBL",
                freight_currency: selectedBooking.freight_currency || "INR",
                // Map API fields if different (they match snake_case now)
             });
        }
    };

    const handleOpenModal = (record = null) => {
        if (record) {
            setIgmForm(record);
        } else {
            setIgmForm(EMPTY_FORM);
        }
        setIsModalOpen(true);
    };

    const handleSaveIGM = async (e) => {
        e.preventDefault();
        try {
            if (!igmForm.job_no) {
                toast.error("Please select a Job No");
                return;
            }

            // Update the booking with IGM details
            await api.put(`/booking/update/${igmForm.job_no}`, igmForm);
            
            toast.success("IGM details saved successfully");
            setIsModalOpen(false);
            fetchData(); // Refresh list
        } catch (error) {
            console.error(error);
            toast.error("Failed to save IGM");
        }
    };

    const handleDeleteIGM = async (jobNo) => {
        if(window.confirm("Are you sure you want to remove IGM details for this Job?")) {
            try {
                // We don't delete the booking, we just clear IGM fields
                await api.put(`/booking/update/${jobNo}`, {
                    igm_no: null, igm_on: null, cha: null, cfs: null, 
                    do_validity: null, container_number: null // Clear others if needed
                });
                toast.info("IGM details removed");
                fetchData();
            } catch (error) {
                console.error(error);
                toast.error("Failed to remove IGM");
            }
        }
    };

    const filteredIGMs = igmList.filter(item => {
        const term = searchTerm.toLowerCase();
        return (
            (item.hbl_no || "").toLowerCase().includes(term) ||
            (item.mbl_no || "").toLowerCase().includes(term) ||
            (item.igm_no || "").toLowerCase().includes(term) ||
            (item.container_number || "").toLowerCase().includes(term) ||
            String(item.job_no).toLowerCase().includes(term)
        );
    });

    return (
        <DashboardLayout title="IGM Management">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search Job / HBL / MBL / IGM..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm"
                >
                    <Plus size={20} /> Add / Update IGM
                </button>
            </div>

            {/* List */}
             <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                                <th className="p-4">Job No</th>
                                <th className="p-4">HBL / MBL</th>
                                <th className="p-4">IGM Details</th>
                                <th className="p-4">Container</th>
                                <th className="p-4">Parties (CHA/CFS)</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                             {loading ? (
                                 <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading...</td></tr>
                             ) : filteredIGMs.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">No IGM records found.</td></tr>
                             ) : (
                                 filteredIGMs.map(item => (
                                     <tr key={item.job_no} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                          <td className="p-4 text-sm font-medium text-slate-900 dark:text-white">
                                             #{item.job_no}
                                         </td>
                                         <td className="p-4">
                                            <div className="font-mono text-sm text-indigo-600 dark:text-indigo-400">{item.hbl_no || "—"}</div>
                                            <div className="text-xs text-slate-500">{item.mbl_no}</div>
                                         </td>
                                         <td className="p-4">
                                             <div className="flex items-center gap-2 text-sm text-slate-800 dark:text-white">
                                                 <FileText size={16} className="text-slate-400"/> {item.igm_no} <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{item.igm_on}</span>
                                             </div>
                                         </td>
                                         <td className="p-4">
                                             <div className="flex items-center gap-2 text-sm text-slate-800 dark:text-white">
                                                <Container size={16} className="text-slate-400"/> {item.container_number}
                                             </div>
                                         </td>
                                         <td className="p-4 text-sm">
                                             <div className="text-slate-800 dark:text-white truncate max-w-[150px]" title={item.cha_name}>{item.cha_name || "—"}</div>
                                             <div className="text-xs text-slate-500 truncate max-w-[150px]" title={item.cfs_name}>{item.cfs_name || "—"}</div>
                                         </td>
                                         <td className="p-4 text-right flex justify-end gap-2">
                                             <button onClick={() => handleOpenModal(item)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                                                 <Edit2 size={18} />
                                             </button>
                                              <button onClick={() => handleDeleteIGM(item.job_no)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                IGM Details
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveIGM} className="p-6 space-y-6">
                            
                            {/* Job Select */}
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Job No. (Booking)</label>
                                <select 
                                    name="job_no" 
                                    value={igmForm.job_no || ""} 
                                    onChange={handleJobSelect} 
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    disabled={!!igmForm.job_no} // If editing existing IGM, maybe lock it? Or user can clear and select another. Let's allowing switching if needed, but normally editing implies same job.
                                >
                                    <option value="">-- Select Job --</option>
                                    {bookings.map(b => (
                                        <option key={b.job_no} value={b.job_no}>
                                            #{b.job_no} - {b.shipper_name} → {b.consignee_name} (HBL: {b.hbl_no})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* HBL / MBL (Editable as per user request to be synced) */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">HBL No.</label>
                                    <input type="text" name="hbl_no" value={igmForm.hbl_no || ""} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">MBL No.</label>
                                    <input type="text" name="mbl_no" value={igmForm.mbl_no || ""} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                </div>

                                {/* Dates */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ETA</label>
                                    <input type="date" name="eta" value={igmForm.eta ? igmForm.eta.slice(0, 10) : ""} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ETD</label>
                                    <input type="date" name="etd" value={igmForm.etd ? igmForm.etd.slice(0, 10) : ""} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                </div>

                                {/* IGM Info */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IGM On</label>
                                        <select name="igm_on" value={igmForm.igm_on || "HBL"} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                            <option value="HBL">HBL</option>
                                            <option value="MBL">MBL</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IGM No.</label>
                                        <input type="text" name="igm_no" value={igmForm.igm_no || ""} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                    </div>
                                </div>

                                {/* CHA / CFS (Foreign Keys) */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CHA (Customer)</label>
                                    <select name="cha" value={igmForm.cha || ""} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                        <option value="">Select CHA</option>
                                        {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CFS (Customer)</label>
                                    <select name="cfs" value={igmForm.cfs || ""} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                        <option value="">Select CFS</option>
                                        {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.name}</option>)}
                                    </select>
                                </div>

                                {/* Freight / Container */}
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Freight Amount</label>
                                        <input type="number" name="freight_amount" value={igmForm.freight_amount || ""} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                    </div>
                                    <div>
                                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                                         <select name="freight_currency" value={igmForm.freight_currency || "INR"} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                            <option value="INR">INR</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">DO Validity</label>
                                     <input type="date" name="do_validity" value={igmForm.do_validity ? igmForm.do_validity.slice(0, 10) : ""} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                </div>
                                <div className="md:col-span-2">
                                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Container Number</label>
                                     <input type="text" name="container_number" value={igmForm.container_number || ""} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Enter container number"/>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-md flex items-center gap-2">
                                    <Save size={18} /> Save IGM
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default IGM;
