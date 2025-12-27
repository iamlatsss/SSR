import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { Search, Printer, FileText } from "lucide-react";
import { toast } from "react-toastify";

const DOFC = () => {
    const [activeTab, setActiveTab] = useState("DO"); // "DO" or "FC"
    const [jobs, setJobs] = useState([]);
    const [selectedJobNo, setSelectedJobNo] = useState("");
    const [selectedType, setSelectedType] = useState(""); // "HBL" or "MBL"
    const [previewData, setPreviewData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await api.get("/booking/get");
            if (res.data.success) {
                setJobs(res.data.bookings || []);
            }
        } catch (error) {
            console.error("Error loading jobs:", error);
            toast.error("Failed to load jobs");
        } finally {
            setLoading(false);
        }
    };

    const selectedJob = useMemo(
        () => jobs.find((j) => String(j.job_no) === String(selectedJobNo)),
        [jobs, selectedJobNo]
    );

    // Compute options based on available data in the job
    const typeOptions = useMemo(() => {
        if (!selectedJob) return [];
        const opts = [];
        if (selectedJob.mbl_no) opts.push({ value: "MBL", label: `MBL - ${selectedJob.mbl_no}` });
        if (selectedJob.hbl_no) opts.push({ value: "HBL", label: `HBL - ${selectedJob.hbl_no}` });
        return opts;
    }, [selectedJob]);

    const handleGeneratePreview = () => {
        if (!selectedJob || !selectedType) return;

        // Base Data Mapping (similar to old DOPage logic but adapted for new API fields)
        const base = {
            companyName: "SSR LOGISTIC SOLUTIONS PVT. LTD.",
            addressLine1: "Office No. 612, 6th Floor, Vashi Infotech Park, Sector - 30 A, Near Raghuleela Mall, Vashi, Navi Mumbai-400703, Maharashtra, India",
            email: "customerservice@ssrlogistic.net",
            phone: "7700990630",
            
            // Common Fields
            doNo: selectedJob.mbl_no || "", // Defaulting to MBL per old logic
            doDate: new Date().toLocaleDateString(),
            
            hblNo: selectedJob.hbl_no || "",
            hblDate: selectedJob.hbl_date || "", 
            mblNo: selectedJob.mbl_no || "",
            mblDate: selectedJob.mbl_date || "",
            
            containerNos: selectedJob.container_number || "", // From IGM/Booking
            containerDetails: `${selectedJob.container_count || 0} x ${selectedJob.container_size || ""}`,

            mblConsignee: selectedJob.consignee_name || "",
            hblConsignee: selectedJob.consignee_name || "", // Often same, or logic can differ
            notifyParty: "", // No specific field in booking yet, placeholder
            
            cha: selectedJob.cha_name || "",
            cargoDescription: selectedJob.cargo_type || "",
            delivery: "Full", // Static per old code
            noOfPackages: selectedJob.no_of_palette || "", // Mapping palette to packages
            measurement: "", // Not in booking
            grossWeight: selectedJob.gross_weight || "",
            vesselVoyage: selectedJob.shipping_line_name || "", // Approx mapping
            igmNo: selectedJob.igm_no || "",
            lineNo: "", // Not in booking
            subLineNo: "", // Not in booking
            marksAndNos: selectedJob.marks_and_numbers || "",
            validity: selectedJob.do_validity ? new Date(selectedJob.do_validity).toLocaleDateString() : "",
        };

        // Specific Logic based on Type (MBL vs HBL)
        let specific = {};
        if (selectedType === "MBL") {
             specific = {
                toParty: "BUDGET CFS TERMINALS PRIVATE LIMITED", // Static per old code
                notifyParty: "SSR LOGISTIC SOLUTIONS PVT LTD",
                lineNo: "252", // sample
                marksAndNos: selectedJob.marks_and_numbers || "MADE IN CHINA",
             };
        } else {
             specific = {
                toParty: selectedJob.shipping_line_name || "MSC MEDITERRANEAN SHIPPING CO. S.A. (G)",
                notifyParty: selectedJob.consignee_name || "SHLOKA ENTERPRISES",
                lineNo: selectedJob.igm_no || "1139433",
                marksAndNos: selectedJob.marks_and_numbers || "RECARBURIZER LOT NO:202504-01 MADE IN CHINA",
             };
        }

        setPreviewData({ ...base, ...specific, docType: activeTab === 'DO' ? 'DELIVERY ORDER' : 'FREIGHT CERTIFICATE' });
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <DashboardLayout title="Documents (DO / FC)">
             {/* Tabs */}
             <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => { setActiveTab("DO"); setPreviewData(null); }}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                        activeTab === "DO" 
                        ? "text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                >
                    Delivery Order
                    {activeTab === "DO" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />}
                </button>
                <button
                    onClick={() => { setActiveTab("FC"); setPreviewData(null); }}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                        activeTab === "FC" 
                        ? "text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                >
                    Freight Certificate
                    {activeTab === "FC" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />}
                </button>
            </div>

            {/* Controls */}
            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Job</label>
                        <select
                            value={selectedJobNo}
                            onChange={(e) => {
                                setSelectedJobNo(e.target.value);
                                setSelectedType("");
                                setPreviewData(null);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            <option value="">-- Choose Job --</option>
                            {jobs.map(j => (
                                <option key={j.job_no} value={j.job_no}>#{j.job_no} - {j.shipper_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Document Type</label>
                        <select
                            value={selectedType}
                            onChange={(e) => {
                                setSelectedType(e.target.value);
                                setPreviewData(null);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            disabled={!selectedJobNo}
                        >
                            <option value="">-- Select HBL / MBL --</option>
                            {typeOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleGeneratePreview}
                        disabled={!selectedJobNo || !selectedType}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Search size={18} /> Generate Preview
                    </button>
                </div>
            </div>

            {/* Preview Area */}
            {previewData ? (
                 <div className="bg-white p-8 md:p-12 rounded-xl shadow-lg border border-slate-200 max-w-4xl mx-auto print:shadow-none print:border-0 print:w-full print:max-w-none">
                    {/* Print Header - Hidden in Screen used for actual printing usually, but here simulating paper look */}
                    <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-wide uppercase">{previewData.companyName}</h2>
                        <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">{previewData.addressLine1}</p>
                        <p className="text-sm text-slate-600 mt-1">Email: {previewData.email} | Tel: {previewData.phone}</p>
                        
                        <h1 className="text-xl font-black text-slate-900 mt-6 underline decoration-2 underline-offset-4 uppercase">
                            {previewData.docType}
                        </h1>
                    </div>

                    <div className="grid grid-cols-2 gap-8 text-sm text-slate-800 mb-8">
                        <div>
                             <p><span className="font-bold">To,</span></p>
                             <p className="uppercase font-medium mt-1">{previewData.toParty}</p>
                        </div>
                        <div className="text-right">
                             <p><span className="font-bold">{activeTab === 'DO' ? 'DO' : 'FC'} No:</span> {previewData.doNo}</p>
                             <p><span className="font-bold">Date:</span> {previewData.doDate}</p>
                        </div>
                    </div>

                    <div className="mb-6 text-sm text-slate-800">
                        <p>You are requested to kindly make delivery of the below mentioned container(s), whose details are as follows:</p>
                    </div>

                    <div className="border border-slate-300 rounded-lg overflow-hidden text-sm">
                         <div className="grid grid-cols-2 border-b border-slate-300">
                            <div className="p-3 border-r border-slate-300"><span className="font-bold">HBL No:</span> {previewData.hblNo}</div>
                            <div className="p-3"><span className="font-bold">Date:</span> {previewData.hblDate || "-"}</div>
                         </div>
                         <div className="grid grid-cols-2 border-b border-slate-300">
                            <div className="p-3 border-r border-slate-300"><span className="font-bold">MBL No:</span> {previewData.mblNo}</div>
                            <div className="p-3"><span className="font-bold">Date:</span> {previewData.mblDate || "-"}</div>
                         </div>
                         <div className="p-3 border-b border-slate-300">
                             <span className="font-bold">Container No(s):</span> {previewData.containerNos} ({previewData.containerDetails})
                         </div>
                         <div className="grid grid-cols-2 border-b border-slate-300">
                            <div className="p-3 border-r border-slate-300">
                                <span className="font-bold block mb-1">MBL Consignee:</span>
                                {previewData.mblConsignee}
                            </div>
                             <div className="p-3">
                                <span className="font-bold block mb-1">HBL Consignee:</span>
                                {previewData.hblConsignee}
                            </div>
                         </div>
                         <div className="p-3 border-b border-slate-300">
                             <span className="font-bold">Notify Party:</span> {previewData.notifyParty}
                         </div>
                         <div className="p-3 border-b border-slate-300">
                             <span className="font-bold">CHA:</span> {previewData.cha}
                         </div>
                         <div className="grid grid-cols-2 border-b border-slate-300">
                            <div className="p-3 border-r border-slate-300">
                                <span className="font-bold">Cargo:</span> {previewData.cargoDescription}
                            </div>
                             <div className="p-3">
                                <span className="font-bold">Delivery:</span> {previewData.delivery}
                            </div>
                         </div>
                         <div className="grid grid-cols-3 border-b border-slate-300">
                            <div className="p-3 border-r border-slate-300"><span className="font-bold">Pkgs:</span> {previewData.noOfPackages}</div>
                            <div className="p-3 border-r border-slate-300"><span className="font-bold">G. Weight:</span> {previewData.grossWeight}</div>
                             <div className="p-3"><span className="font-bold">Voyage:</span> {previewData.vesselVoyage}</div>
                         </div>
                         <div className="grid grid-cols-3 border-b border-slate-300">
                            <div className="p-3 border-r border-slate-300"><span className="font-bold">IGM No:</span> {previewData.igmNo}</div>
                            <div className="p-3 border-r border-slate-300"><span className="font-bold">Line No:</span> {previewData.lineNo}</div>
                             <div className="p-3"><span className="font-bold">Sub Line:</span> {previewData.subLineNo}</div>
                         </div>
                         <div className="p-3">
                            <span className="font-bold block mb-1">Marks & Numbers:</span>
                            {previewData.marksAndNos}
                         </div>
                    </div>

                    {activeTab === 'DO' && (
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                            <span className="font-bold">VALIDITY:</span> This Delivery Order is Valid Till <span className="font-bold">{previewData.validity}</span>.
                            <div className="mt-1 text-xs">NOTE: NO MANUAL REVALIDATION OF DATE IS ALLOWED ON THIS DELIVERY ORDER, ONLY FRESH DELIVERY ORDER TO BE ACCEPTED.</div>
                        </div>
                    )}

                    <div className="mt-12 flex justify-between items-end">
                        <div className="text-sm">
                            {/* Footer info/QR if needed */}
                        </div>
                        <div className="text-right text-sm">
                            <p className="mb-8">For <strong>SSR LOGISTIC SOLUTIONS PVT. LTD.</strong></p>
                            <p className="border-t border-slate-400 pt-2 inline-block">Authorized Signatory</p>
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end print:hidden">
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-medium transition-colors shadow-sm"
                        >
                            <Printer size={18} /> Print {activeTab}
                        </button>
                    </div>
                 </div>
            ) : (
                !loading && (
                    <div className="text-center py-20 text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Select a Job and Document Type to generate a preview.</p>
                    </div>
                )
            )}
        </DashboardLayout>
    );
};

export default DOFC;
