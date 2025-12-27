import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Save, FilePlus, ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";

const PORTS = [
  "Nhava Sheva, INNSA", "Mundra, INMUN", "Chennai, INMAA", "Mumbai, INBOM",
  "Singapore, SGSIN", "Shanghai, CNSHA", "Rotterdam, NLRTM", "Jebel Ali, AEJEA",
];
const CONTAINER_SIZES = ["20' GP", "40' GP", "40' HC", "45' HC"];
const CARGO_TYPES = ["HAZ", "General Cargo", "Special Equipment", "Machineries", "Spare Parts"];
const BASE_JOB_NO = 6000;

const INITIAL_KYC = {
  shippers: ["ABC Exports Pvt Ltd", "Global Traders Inc"],
  consignees: ["XYZ Imports LLC", "Oceanic Retailers"],
  agents: ["SeaLink Logistics", "PortSide Agencies"],
};

const getNextJobNo = () => {
  const existingJobs = JSON.parse(localStorage.getItem("savedJobs") || "[]");
  if (!existingJobs.length) return BASE_JOB_NO;
  // Simple max + 1
  const maxJob = existingJobs.reduce((max, job) => Math.max(max, job.jobNo), BASE_JOB_NO - 1);
  return maxJob + 1;
};

const Bookings = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [kycData, setKycData] = useState(INITIAL_KYC);
    const [jobNo, setJobNo] = useState(BASE_JOB_NO);
    const [activeTab, setActiveTab] = useState("booking"); // booking | update

    const [bookingForm, setBookingForm] = useState({
        dateOfNomination: "",
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

    const [showAddNew, setShowAddNew] = useState({ type: null, value: "" });

    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        const searchParams = new URLSearchParams(location.search);
        const jobNoParam = searchParams.get("jobNo");
        const savedJobs = JSON.parse(localStorage.getItem("savedJobs") || "[]");

        if (jobNoParam) {
            const jobNoInt = parseInt(jobNoParam, 10);
            const existingJob = savedJobs.find((j) => j.jobNo === jobNoInt);

            if (existingJob) {
                setJobNo(existingJob.jobNo);
                setBookingForm({
                    dateOfNomination: existingJob.dateOfNomination || today,
                    shipper: existingJob.shipper || "",
                    consignee: existingJob.consignee || "",
                    pol: existingJob.pol || "",
                    pod: existingJob.pod || "",
                    finalPod: existingJob.finalPod || "",
                    containerSize: existingJob.containerSize || "",
                    containerCount: existingJob.containerCount || 1,
                    agent: existingJob.agent || "",
                });

                const lastUpdate = existingJob.updates && existingJob.updates.length
                    ? existingJob.updates[existingJob.updates.length - 1]
                    : {};

                setUpdateForm({
                    hblNo: lastUpdate.hblNo || "",
                    mblNo: lastUpdate.mblNo || "",
                    eta: lastUpdate.eta || "",
                    etd: lastUpdate.etd || "",
                    shipperInvoiceNo: lastUpdate.shipperInvoiceNo || "",
                    netWeight: lastUpdate.netWeight || "",
                    grossWeight: lastUpdate.grossWeight || "",
                    cargoType: lastUpdate.cargoType || "",
                    shippingLineName: lastUpdate.shippingLineName || "",
                    hblTelexReceived: lastUpdate.hblTelexReceived || "No",
                    mblTelexReceived: lastUpdate.mblTelexReceived || "No",
                    noOfPalette: lastUpdate.noOfPalette || "",
                    marksAndNumbers: lastUpdate.marksAndNumbers || "",
                });
                return;
            }
        }

        // New Job
        const nextJob = getNextJobNo();
        setJobNo(nextJob);
        setBookingForm((prev) => ({ ...prev, dateOfNomination: today }));
    }, [location.search]);

    const handleBookingChange = (e) => {
        const { name, value } = e.target;
        setBookingForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleUpdateChange = (e) => {
        const { name, value } = e.target;
        setUpdateForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectKyc = (role, value) => {
        if (value === "ADD_NEW") {
            setShowAddNew({ type: role, value: "" });
        } else {
            setBookingForm((prev) => ({ ...prev, [role]: value }));
        }
    };

    const handleSaveNewKyc = () => {
        if (!showAddNew.type || !showAddNew.value.trim()) return;
        const trimmed = showAddNew.value.trim();
        setKycData(prev => ({
            ...prev,
            [showAddNew.type + "s"]: [...prev[showAddNew.type + "s"], trimmed]
        }));
        setBookingForm(prev => ({ ...prev, [showAddNew.type]: trimmed }));
        setShowAddNew({ type: null, value: "" });
        toast.success(`New ${showAddNew.type} added`);
    };

    const handleSaveBooking = () => {
        const jobData = { jobNo, ...bookingForm, status: "draft", updates: [] };
        const existingJobs = JSON.parse(localStorage.getItem("savedJobs") || "[]");
        
        // Remove existing if overwriting
        const updatedJobs = existingJobs.filter((j) => j.jobNo !== jobNo).concat(jobData);
        
        localStorage.setItem("savedJobs", JSON.stringify(updatedJobs));
        toast.success("Booking saved successfully!");
        navigate('/bookings');
    };

    const handleSaveBookingUpdate = () => {
        const updateData = updateForm;
        const existingJobs = JSON.parse(localStorage.getItem("savedJobs") || "[]");
        const jobIndex = existingJobs.findIndex((j) => j.jobNo === jobNo);

        if (jobIndex !== -1) {
            existingJobs[jobIndex].updates = existingJobs[jobIndex].updates || [];
            existingJobs[jobIndex].updates.push({
                ...updateData,
                date: new Date().toISOString().slice(0, 10),
            });
            existingJobs[jobIndex].status = "confirmed"; // Auto confirm on update
            localStorage.setItem("savedJobs", JSON.stringify(existingJobs));
            toast.success("Booking update saved!");
            navigate('/bookings');
        } else {
            toast.error("Job not found. Save booking first.");
        }
    };

    return (
        <DashboardLayout title="Booking Form">
             <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/bookings')} className="p-2 bg-white dark:bg-dark-card rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300"/>
                </button>
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Job #{jobNo}</h2>
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
                                        <select name="shipper" value={bookingForm.shipper} onChange={(e) => handleSelectKyc('shipper', e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                            <option value="">Select Shipper</option>
                                            {kycData.shippers.map(s => <option key={s} value={s}>{s}</option>)}
                                            <option value="ADD_NEW">+ Add New</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Consignee</label>
                                        <select name="consignee" value={bookingForm.consignee} onChange={(e) => handleSelectKyc('consignee', e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                            <option value="">Select Consignee</option>
                                            {kycData.consignees.map(s => <option key={s} value={s}>{s}</option>)}
                                            <option value="ADD_NEW">+ Add New</option>
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
                                        <select name="agent" value={bookingForm.agent} onChange={(e) => handleSelectKyc('agent', e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                            <option value="">Select Agent</option>
                                            {kycData.agents.map(s => <option key={s} value={s}>{s}</option>)}
                                            <option value="ADD_NEW">+ Add New</option>
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
                                <span className="font-medium text-slate-800 dark:text-white truncate max-w-[150px]">{bookingForm.shipper || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Consignee:</span>
                                <span className="font-medium text-slate-800 dark:text-white truncate max-w-[150px]">{bookingForm.consignee || "—"}</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Route:</span>
                                <span className="font-medium text-slate-800 dark:text-white">{bookingForm.pol && bookingForm.pod ? `${bookingForm.pol.split(',')[0]} → ${bookingForm.pod.split(',')[0]}` : "—"}</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Agent:</span>
                                <span className="font-medium text-slate-800 dark:text-white truncate max-w-[150px]">{bookingForm.agent || "—"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add New Modal */}
            {showAddNew.type && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddNew({type:null, value:''})}>
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 capitalize">Add New {showAddNew.type}</h3>
                        <input
                            autoFocus
                            type="text"
                            value={showAddNew.value}
                            onChange={(e) => setShowAddNew(prev => ({...prev, value: e.target.value}))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white mb-4"
                            placeholder={`Enter ${showAddNew.type} name`}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAddNew({type:null, value:''})} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
                            <button onClick={handleSaveNewKyc} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Bookings;
