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

    // Searchable Select State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

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

    // Filter jobs for dropdown
    const filteredOptions = useMemo(() => {
        // Commenting out strict status check to debug visibility
        // const allowedStatuses = ["confirmed", "completed", "in-transit"]; 
        // const validJobs = jobs.filter(j => allowedStatuses.includes(j.status));
        const validJobs = jobs; // Show all jobs for now

        if (!searchQuery) return validJobs;

        return validJobs.filter(j =>
            String(j.job_no).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (j.shipper_name || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [jobs, searchQuery]);

    const handleSelectJob = (job) => {
        setSelectedJobNo(job.job_no);
        setSearchQuery(`#${job.job_no} - ${job.shipper_name}`);
        setIsDropdownOpen(false);
        setPreviewData(null);
    };

    // Auto-fill query if just selecting programmatically or initial load match
    useEffect(() => {
        if (selectedJobNo && !searchQuery) {
            const j = jobs.find(j => String(j.job_no) === String(selectedJobNo));
            if (j) {
                setSearchQuery(`#${j.job_no} - ${j.shipper_name}`);
            }
        }
    }, [selectedJobNo, jobs]);


    // Compute options
    const typeOptions = useMemo(() => {
        if (!selectedJob) return [];
        const opts = [];
        // HBL Option (Always show if job selected, maybe indicate if no number)
        opts.push({
            value: "HBL",
            label: selectedJob.hbl_no ? `HBL - ${selectedJob.hbl_no}` : "HBL (No No.)",
            disabled: false
        });

        // MBL Option (Always show if job selected)
        opts.push({
            value: "MBL",
            label: selectedJob.mbl_no ? `MBL - ${selectedJob.mbl_no}` : "MBL (No No.)",
            disabled: false
        });

        return opts;
    }, [selectedJob]);

    // Auto-select HBL when job changes, or MBL if HBL not available but MBL is
    useEffect(() => {
        if (selectedJob) {
            if (selectedJob.hbl_no) {
                setSelectedType("HBL");
            } else if (selectedJob.mbl_no) {
                setSelectedType("MBL");
            } else {
                setSelectedType("HBL"); // Default
            }
        } else {
            setSelectedType("");
        }
    }, [selectedJob]);

    const handleGeneratePreview = async () => {
        if (!selectedJob || !selectedType) return;
        setLoading(true);

        try {
            // 1. Determine which template to use
            let templatePath = "";
            let templateKey = ""; // internal key for data mapping logic

            if (activeTab === "DO") {
                // DO always uses do_hbl.html for now (as per requirement/limitations)
                // Whether HBL or MBL is selected, the DO structure is the same currently.
                // We might want to pass different data if MBL is selected? 
                // For now, using do_hbl.html for both.
                templatePath = '/pdf-static/do_hbl.html';
                templateKey = "do_hbl";

            } else if (activeTab === "FC") {
                if (selectedType === "HBL") {
                    templatePath = '/pdf-static/fc_hbl.html';
                    templateKey = "fc_hbl";
                } else if (selectedType === "MBL") {
                    templatePath = '/pdf-static/fc_mbl.html';
                    templateKey = "fc_mbl";
                }
            }

            if (!templatePath) throw new Error("No template found for selection");

            // 2. Fetch the HTML template
            const response = await fetch(templatePath);
            if (!response.ok) throw new Error(`Failed to load template: ${templatePath}`);
            let template = await response.text();

            // 3. Prepare Data Map based on template type
            let data = {};
            const todayStr = new Date().toLocaleDateString();

            if (templateKey === 'do_hbl') {
                // Mapping for do_hbl.html
                // If MBL is selected for DO, we might want to emphasize MBL data or leave as standard DO?
                // The standard DO seems to have fields for both. 
                // Let's use the standard mapping which includes both.
                data = {
                    'bookings.hbl_no': selectedJob.hbl_no || "-",
                    'bookings.mbl_no': selectedJob.mbl_no || "-",
                    'bookings.nomination_date': selectedJob.hbl_date ? new Date(selectedJob.hbl_date).toLocaleDateString() : (selectedJob.date_of_nomination ? new Date(selectedJob.date_of_nomination).toLocaleDateString() : "-"),
                    'bookings.container_number': selectedJob.container_number || "-",
                    'bookings.consignee': selectedJob.consignee_name || "-",
                    'bookings.description': selectedJob.cargo_type || "-",
                    'bookings.delivery_type': "Full",
                    'bookings.no_of_packages': String(selectedJob.no_of_palette || "0"),
                    'bookings.measurement': "-",
                    'bookings.gross_weight': String(selectedJob.gross_weight || "-"),
                    'bookings.vessel_voyage': selectedJob.shipping_line_name || "-",
                    'bookings.marks_nos': selectedJob.marks_and_numbers || "-",
                    'bookings.validity': selectedJob.do_validity ? new Date(selectedJob.do_validity).toLocaleDateString() : "-",
                    'igm.cfsname': selectedJob.cfs_name || "BUDGET CFS TERMINALS PRIVATE LIMITED",
                    'igm.cha_name': selectedJob.cha_name || "-",
                    'igm.igm_no': selectedJob.igm_no || "-",
                    'igm.line_no': "252",
                    'igm.sub_line_no': "-",
                    'do.do_date': todayStr,
                };
            } else if (templateKey === 'fc_hbl') {
                // Mapping for fc_hbl.html
                data = {
                    'KYCList.shipper_name': selectedJob.shipper_name || "-",
                    'KYCList.shipper_address': selectedJob.shipper_address || "-",
                    'IGM.cfs_name': selectedJob.cfs_name || "-",
                    'KYCList.consignee_name': selectedJob.consignee_name || "-",
                    'KYCList.consignee_address': selectedJob.consignee_address || "-",
                    'IGM.vessel_name': selectedJob.vessel_name || "-",
                    'IGM.vessel_voyage': selectedJob.voyage || "-",
                    'BookingList.hbl_no': selectedJob.hbl_no || "-",
                    'IGM.igm_no': selectedJob.igm_no || "-",
                    'BookingList.mbl_no': selectedJob.mbl_no || "-",
                    'BookingList.eta': selectedJob.eta ? new Date(selectedJob.eta).toLocaleDateString() : "-",
                    'BookingList.mode': selectedJob.booking_type || "FCL",
                    'BookingList.container_type': selectedJob.container_type || "-",
                    'BookingList.pol': selectedJob.pol || "-",
                    'BookingList.pod': selectedJob.pod || "-",
                    'BookingList.container_count': String(selectedJob.container_count || "1"),
                    'cargo.weight': String(selectedJob.gross_weight || "-"),
                    'user.name': "System User",
                };
            } else if (templateKey === 'fc_mbl') {
                // Mapping for fc_mbl.html
                data = {
                    'mbl.shipper_name': selectedJob.shipper_name || "-",
                    'mbl.shipper_address': selectedJob.shipper_address || "-",
                    'mbl.consignee_name': selectedJob.consignee_name || "-", // Added
                    'mbl.consignee_address': selectedJob.consignee_address || "-", // Added
                    'igm.cfs_name': selectedJob.cfs_name || "-", // Added
                    'other.date': todayStr, // Added
                    'vessel.name': selectedJob.vessel_name || "-",
                    'vessel.voyage': selectedJob.voyage || "-",
                    'booking.hbl_no': selectedJob.hbl_no || "-", // Added
                    'igm.no': selectedJob.igm_no || "-",
                    'booking.mbl_no': selectedJob.mbl_no || "-",
                    'igm.date': selectedJob.igm_on ? new Date(selectedJob.igm_on).toLocaleDateString() : "-", // Added
                    'booking.bl_date': selectedJob.bl_date ? new Date(selectedJob.bl_date).toLocaleDateString() : (selectedJob.hbl_date ? new Date(selectedJob.hbl_date).toLocaleDateString() : "-"), // Added
                    'igm.line_no': "252", // Hardcoded per user image/request or map if available
                    'booking.mode': "FCL", // selectedJob.booking_type || "FCL",
                    'booking.eta': selectedJob.eta ? new Date(selectedJob.eta).toLocaleDateString() : "-",
                    'booking.container_size': selectedJob.container_size || "-", // Added
                    'booking.pol': selectedJob.pol || "-", // Added
                    'carrier.name': selectedJob.shipping_line_name || "-",
                    'booking.pod': selectedJob.pod || "-", // Added
                    'booking.no_containers': String(selectedJob.container_count || "1"), // Added
                    'booking.exchange_rate': "???", // Placeholder as per request
                    'cargo.weight': String(selectedJob.gross_weight || "-")
                };
            }

            // 4. Inject Data
            // Replace {{ key }}
            let htmlContent = template.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (match, key) => {
                return data[key] !== undefined ? data[key] : "";
            });

            // 5. Handle Loops (Quick Fix for Charges)
            // Remove the Jinja loop block for now or replace with static "No Charges" row since we don't have charge data in this view yet
            const emptyChargeRow = `<tr><td colspan="4" style="text-align:center;">No charges available</td></tr>`;

            // Regex to find the loop block: {% for ... %} ... {% endfor %}
            // This is a simple regex assumption, might need tweaking if nested or complex
            htmlContent = htmlContent.replace(/\{%\s*for\s+charge\s+in\s+charges\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g, emptyChargeRow);
            htmlContent = htmlContent.replace(/\{%\s*for\s+charge\s+in\s+line_charges\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g, emptyChargeRow);


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
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === "DO"
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                >
                    Delivery Order
                    {activeTab === "DO" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />}
                </button>
                <button
                    onClick={() => { setActiveTab("FC"); setPreviewData(null); }}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === "FC"
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
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Job</label>
                        {/* Searchable Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Type Job No or Shipper..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsDropdownOpen(true);
                                    if (e.target.value === "") setSelectedJobNo("");
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                // Delay blur to allow click on option
                                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                                className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                                <Search size={16} />
                            </div>
                        </div>

                        {/* Dropdown Options */}
                        {isDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((job) => (
                                        <div
                                            key={job.job_no}
                                            onClick={() => handleSelectJob(job)}
                                            className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-sm"
                                        >
                                            <div className="font-medium text-slate-900 dark:text-white">#{job.job_no}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{job.shipper_name}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-slate-500 text-center">No jobs found</div>
                                )}
                            </div>
                        )}
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
                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 overflow-x-auto">
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
                            style={{ width: '815px', height: activeTab === 'DO' ? '1123px' : '1000px', border: 'none' }} // A4 height for DO, adjusted for FC content
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
