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

    // Compute options - MBL Disabled for now
    const typeOptions = useMemo(() => {
        if (!selectedJob) return [];
        const opts = [];
        // HBL is default and only verify implementation for now
        if (selectedJob.hbl_no) {
            opts.push({ value: "HBL", label: `HBL - ${selectedJob.hbl_no}`, disabled: false });
        }
        // MBL future scope - show but disable
        if (selectedJob.mbl_no) {
            opts.push({ value: "MBL", label: `MBL - ${selectedJob.mbl_no} (Coming Soon)`, disabled: true });
        }
        return opts;
    }, [selectedJob]);

    // Auto-select HBL when job changes
    useEffect(() => {
        if (selectedJob && selectedJob.hbl_no) {
            setSelectedType("HBL");
        } else {
            setSelectedType("");
        }
    }, [selectedJob]);

    const handleGeneratePreview = async () => {
        if (!selectedJob || !selectedType) return;
        setLoading(true);

        try {
            // 1. Fetch the HTML template
            const response = await fetch('/pdf-static/do_hbl.html');
            if (!response.ok) throw new Error("Failed to load DO template");
            let template = await response.text();

            // 2. Prepare Data Map
            // Mapping keys to match template placeholders: {{ bookings.hbl_no }}, {{ igm.cfsname }}, etc.
            
            const data = {
                'bookings.hbl_no': selectedJob.hbl_no || "-",
                'bookings.mbl_no': selectedJob.mbl_no || "-",
                'bookings.nomination_date': selectedJob.hbl_date ? new Date(selectedJob.hbl_date).toLocaleDateString() : (selectedJob.date_of_nomination ? new Date(selectedJob.date_of_nomination).toLocaleDateString() : "-"),
                'bookings.container_number': selectedJob.container_number || "-",
                'bookings.consignee': selectedJob.consignee_name || "-",
                'bookings.description': selectedJob.cargo_type || "-", 
                'bookings.delivery_type': "Full", // Static per old logic
                'bookings.no_of_packages': String(selectedJob.no_of_palette || "0"),
                'bookings.measurement': "-", // Not in Booking fields yet
                'bookings.gross_weight': String(selectedJob.gross_weight || "-"),
                'bookings.vessel_voyage': selectedJob.shipping_line_name || "-",
                'bookings.marks_nos': selectedJob.marks_and_numbers || "-",
                'bookings.validity': selectedJob.do_validity ? new Date(selectedJob.do_validity).toLocaleDateString() : "-",
                
                'igm.cfsname': selectedJob.cfs_name || "BUDGET CFS TERMINALS PRIVATE LIMITED", // fallback
                'igm.cha_name': selectedJob.cha_name || "-",
                'igm.igm_no': selectedJob.igm_no || "-",
                'igm.line_no': "252", // Static sample
                'igm.sub_line_no': "-", // Static sample
                
                'do.do_date': new Date().toLocaleDateString(),
            };

            // 3. Inject Data
            // Regex to match {{ key }} and replace
            let htmlContent = template.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (match, key) => {
                return data[key] !== undefined ? data[key] : "";
            });

            setPreviewData(htmlContent);
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate preview");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const iframe = document.getElementById('do-preview-frame');
        if (iframe) {
            iframe.contentWindow.print();
        }
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
                                setPreviewData(null);
                            }}
                             className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                            className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            disabled={!selectedJobNo}
                        >
                             {/* HBL is default options logic ensures HBL is first/selected */}
                            {!selectedType && <option value="">-- Select --</option>}
                            {typeOptions.map(opt => (
                                <option key={opt.value} value={opt.value} disabled={opt.disabled} className={opt.disabled ? "text-slate-400 italic" : ""}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleGeneratePreview}
                        disabled={!selectedJobNo || !selectedType}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                        <Search size={18} /> Generate Preview
                    </button>
                </div>
            </div>

            {/* Preview Area */}
            {previewData ? (
                 <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    <div className="flex justify-between items-center mb-4 px-4">
                        <h3 className="font-bold text-slate-700">Document Preview</h3>
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                        >
                            <Printer size={16} /> Print Document
                        </button>
                    </div>
                    
                    <div className="border border-slate-300 bg-gray-50 flex justify-center p-4">
                         <iframe 
                            id="do-preview-frame"
                            srcDoc={previewData}
                            title="DO Preview"
                            className="bg-white shadow-xl"
                            style={{ width: '794px', height: '1123px', border: 'none' }} // A4 dimensions
                        />
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
