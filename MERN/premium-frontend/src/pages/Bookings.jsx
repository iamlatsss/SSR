import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { Save, ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";

const PORTS = [
  "Nhava Sheva, INNSA", "Mundra, INMUN", "Chennai, INMAA", "Mumbai, INBOM",
  "Singapore, SGSIN", "Shanghai, CNSHA", "Rotterdam, NLRTM", "Jebel Ali, AEJEA",
];
const CONTAINER_SIZES = ["20' GP", "40' GP", "40' HC", "45' HC"];
const CARGO_TYPES = ["HAZ", "General Cargo", "Special Equipment", "Machineries", "Spare Parts"];

const Bookings = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [jobNo, setJobNo] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [activeTab, setActiveTab] = useState("booking"); 

    const [bookingForm, setBookingForm] = useState({
        dateOfNomination: new Date().toISOString().slice(0, 10),
        shipper: "",
        consignee: "",
        pol: "",
        pod: "",
        finalPod: "",
        containerSize: "",
        containerCount: 1,
        agent: "",
    });

    const [updateForm, setUpdateForm] = useState({
        hblNo: "", mblNo: "", eta: "", etd: "", shipperInvoiceNo: "",
        netWeight: "", grossWeight: "", cargoType: "", shippingLineName: "",
        hblTelexReceived: "No", mblTelexReceived: "No", noOfPalette: "", marksAndNumbers: "",
    });
    
    // Display names for summary
    const [names, setNames] = useState({ shipper: "", consignee: "", agent: "" });

    useEffect(() => {
        initPage();
    }, [location.search]);

    const initPage = async () => {
        try {
            const searchParams = new URLSearchParams(location.search);
            const jobNoParam = searchParams.get("jobNo");
            
            // 1. Fetch Init Data (Customers & Next Job No)
            const initRes = await api.get("/booking/init");
            if (initRes.data.success) {
                setCustomers(initRes.data.customers || []);
                if (!jobNoParam) {
                    setJobNo(initRes.data.nextJobNo);
                }
            }

            // 2. Fetch Existing Job if param present
            if (jobNoParam) {
                setJobNo(jobNoParam);
                const jobRes = await api.get(`/booking/get/${jobNoParam}`);
                if (jobRes.data.success) {
                    const b = jobRes.data.booking;
                    // Populate Booking Form
                    setBookingForm({
                        dateOfNomination: b.date_of_nomination ? b.date_of_nomination.slice(0,10) : "",
                        shipper: b.shipper,
                        consignee: b.consignee,
                        pol: b.pol,
                        pod: b.pod,
                        finalPod: b.final_pod,
                        containerSize: b.container_size,
                        containerCount: b.container_count,
                        agent: b.agent,
                    });
                     // Populate Update Form
                    setUpdateForm({
                        hblNo: b.hbl_no || "",
                        mblNo: b.mbl_no || "",
                        eta: b.eta ? b.eta.slice(0, 10) : "",
                        etd: b.etd ? b.etd.slice(0, 10) : "",
                        shipperInvoiceNo: b.shipper_invoice_no || "",
                        netWeight: b.net_weight || "",
                        grossWeight: b.gross_weight || "",
                        cargoType: b.cargo_type || "",
                        shippingLineName: b.shipping_line_name || "",
                        hblTelexReceived: b.hbl_telex_received || "No",
                        mblTelexReceived: b.mbl_telex_received || "No",
                        noOfPalette: b.no_of_palette || "",
                        marksAndNumbers: b.marks_and_numbers || "",
                    });
                    
                    setNames({
                        shipper: b.shipper_name,
                        consignee: b.consignee_name,
                        agent: b.agent_name
                    });
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load booking data");
        }
    };

    const handleBookingChange = (e) => {
        const { name, value } = e.target;
        setBookingForm((prev) => ({ ...prev, [name]: value }));
        
        // Update summary names if customer selected
        if (['shipper', 'consignee', 'agent'].includes(name)) {
             const cust = customers.find(c => c.customer_id == value);
             if (cust) {
                 setNames(prev => ({...prev, [name]: cust.name}));
             } else {
                 setNames(prev => ({...prev, [name]: ""}));
             }
        }
    };

    const handleUpdateChange = (e) => {
        const { name, value } = e.target;
        setUpdateForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSaveBooking = async () => {
        try {
             // Map to snake_case
             const payload = {
                 job_no: jobNo,
                 date_of_nomination: bookingForm.dateOfNomination,
                 shipper: bookingForm.shipper,
                 consignee: bookingForm.consignee,
                 pol: bookingForm.pol,
                 pod: bookingForm.pod,
                 final_pod: bookingForm.finalPod,
                 container_size: bookingForm.containerSize,
                 container_count: bookingForm.containerCount,
                 agent: bookingForm.agent,
             };
             
             await api.post("/booking/insert", payload);
             toast.success("Booking saved successfully!");
             navigate('/bookings');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to save booking");
        }
    };

    const handleSaveBookingUpdate = async () => {
         try {
             // Map to snake_case
             const payload = {
                 hbl_no: updateForm.hblNo,
                 mbl_no: updateForm.mblNo,
                 eta: updateForm.eta,
                 etd: updateForm.etd,
                 shipper_invoice_no: updateForm.shipperInvoiceNo,
                 net_weight: updateForm.netWeight,
                 gross_weight: updateForm.grossWeight,
                 cargo_type: updateForm.cargoType,
                 shipping_line_name: updateForm.shippingLineName,
                 hbl_telex_received: updateForm.hblTelexReceived,
                 mbl_telex_received: updateForm.mblTelexReceived,
                 no_of_palette: updateForm.noOfPalette,
                 marks_and_numbers: updateForm.marksAndNumbers,
             };
             
             await api.put(`/booking/update/${jobNo}`, payload);
             toast.success("Booking update saved!");
             navigate('/bookings');
        } catch (error) {
            console.error(error);
             toast.error(error.response?.data?.message || "Failed to save update");
        }
    };

    return (
        <DashboardLayout title="Booking Form">
             <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/bookings')} className="p-2 bg-white dark:bg-dark-card rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300"/>
                </button>
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Job #{jobNo || "..."}</h2>
                    <span className="text-sm text-slate-500">{bookingForm.dateOfNomination}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Main Form Area */}
                <div className="lg:col-span-2 space-y-6">
                     {/* Tabs */}
                    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('booking')}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'booking' ? 'bg-white dark:bg-dark-card shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                            Booking Details
                        </button>
                        <button
                            onClick={() => setActiveTab('update')}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'update' ? 'bg-white dark:bg-dark-card shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                            Shipment Update
                        </button>
                    </div>

                    <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        {activeTab === 'booking' ? (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Initial Booking</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Shipper/Consignee */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shipper</label>
                                        <select name="shipper" value={bookingForm.shipper} onChange={handleBookingChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                            <option value="">Select Shipper</option>
                                            {customers.map(s => <option key={s.customer_id} value={s.customer_id}>{s.name} ({s.customer_type})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Consignee</label>
                                        <select name="consignee" value={bookingForm.consignee} onChange={handleBookingChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                            <option value="">Select Consignee</option>
                                            {customers.map(s => <option key={s.customer_id} value={s.customer_id}>{s.name} ({s.customer_type})</option>)}
                                        </select>
                                    </div>
                                     {/* POL/POD */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">POL</label>
                                        <select name="pol" value={bookingForm.pol} onChange={handleBookingChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                            <option value="">Select POL</option>
                                            {PORTS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">POD</label>
                                        <select name="pod" value={bookingForm.pod} onChange={handleBookingChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                            <option value="">Select POD</option>
                                            {PORTS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                     {/* Final POD */}
                                     <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Final POD</label>
                                        <select name="finalPod" value={bookingForm.finalPod} onChange={handleBookingChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                            <option value="">Select Final POD</option>
                                            {PORTS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                     {/* Agent */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Agent</label>
                                        <select name="agent" value={bookingForm.agent} onChange={handleBookingChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                            <option value="">Select Agent</option>
                                            {customers.map(s => <option key={s.customer_id} value={s.customer_id}>{s.name} ({s.customer_type})</option>)}
                                        </select>
                                    </div>
                                    {/* Containers */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Container Size</label>
                                        <select name="containerSize" value={bookingForm.containerSize} onChange={handleBookingChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                            <option value="">Select Size</option>
                                            {CONTAINER_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Count</label>
                                        <select name="containerCount" value={bookingForm.containerCount} onChange={handleBookingChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                            {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="pt-4">
                                     <button onClick={handleSaveBooking} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md transition-all flex items-center justify-center gap-2">
                                        <Save size={20} /> Save Booking
                                     </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Update Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {['hblNo', 'mblNo'].map(f => (
                                         <div key={f}>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 uppercase">{f.replace(/([A-Z])/g, ' $1').trim()}</label>
                                            <input type="text" name={f} value={updateForm[f]} onChange={handleUpdateChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" />
                                        </div>
                                    ))}
                                    {['eta', 'etd'].map(f => (
                                         <div key={f}>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 uppercase">{f}</label>
                                            <input type="date" name={f} value={updateForm[f]} onChange={handleUpdateChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" />
                                        </div>
                                    ))}
                                    {['netWeight', 'grossWeight', 'noOfPalette', 'shipperInvoiceNo', 'shippingLineName'].map(f => (
                                         <div key={f}>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 capitalize">{f.replace(/([A-Z])/g, ' $1').trim()}</label>
                                            <input type={f.includes('Weight') || f.includes('Palette') ? "number" : "text"} name={f} value={updateForm[f]} onChange={handleUpdateChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" />
                                        </div>
                                    ))}
                                     <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cargo Type</label>
                                        <select name="cargoType" value={updateForm.cargoType} onChange={handleUpdateChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                            <option value="">Select Type</option>
                                            {CARGO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    {['hblTelexReceived', 'mblTelexReceived'].map(f => (
                                         <div key={f}>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 uppercase">{f.replace(/([A-Z])/g, ' $1').trim().replace('Received', '')} Received</label>
                                            <select name={f} value={updateForm[f]} onChange={handleUpdateChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                                <option value="No">No</option>
                                                <option value="Yes">Yes</option>
                                            </select>
                                        </div>
                                    ))}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Marks & Numbers</label>
                                        <textarea name="marksAndNumbers" value={updateForm.marksAndNumbers} onChange={handleUpdateChange} rows={3} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white resize-none" />
                                    </div>
                                </div>
                                 <div className="pt-4">
                                     <button onClick={handleSaveBookingUpdate} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all flex items-center justify-center gap-2">
                                        <Save size={20} /> Save Update
                                     </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Summary */}
                 <div className="space-y-6">
                    <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 sticky top-6">
                        <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Summary</h4>
                        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                             <div className="flex justify-between">
                                <span>Shipper:</span>
                                <span className="font-medium text-slate-800 dark:text-white truncate max-w-[150px]">{names.shipper || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Consignee:</span>
                                <span className="font-medium text-slate-800 dark:text-white truncate max-w-[150px]">{names.consignee || "—"}</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Route:</span>
                                <span className="font-medium text-slate-800 dark:text-white">{bookingForm.pol && bookingForm.pod ? `${bookingForm.pol.split(',')[0]} → ${bookingForm.pod.split(',')[0]}` : "—"}</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Agent:</span>
                                <span className="font-medium text-slate-800 dark:text-white truncate max-w-[150px]">{names.agent || "—"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Bookings;
