import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import {
  Search, Filter, Plus, Edit2, Eye, CheckCircle, FileText, ChevronLeft, ChevronRight, Save, Anchor, XCircle, Star, Files
} from "lucide-react";
import { toast } from "react-toastify";
import PartySelect from "../components/PartySelect";
import { RateGrid, ContainerGrid, VehicleGrid } from "../components/LogisticsGrids";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return "—";
  }
};

const copyToClipboard = (text, label) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied to clipboard`);
};

const CONTAINER_SIZES = [
  "20 Dry Standard", "40 Dry Standard", "40 Dry High", "45 Dry High",
  "20 Tank", "40 Tank",
  "20' Reefer Standard", "40' Reefer High",
  "20 Open Top", "40 Open Top", "40 Open Top High",
  "40 Flat Standard", "40 Flat High", "20 Flat"
];
const CARGO_TYPES = ["HAZ", "General Cargo", "Special Equipment", "Machineries", "Spare Parts"];
const INCO_TERMS_LIST = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];
const SERVICES_LIST = ["Sea Freight Import", "Sea Freight Export", "Air Freight Import", "Air Freight Export", "Customs Clearance", "Warehouse Logistics"];
const BL_TYPES = ["Original BL", "Seaway Bill", "Telex Release", "Express Release"];
const FREIGHT_STATUS_LIST = ["Prepaid", "Collect", "Third Party Pay"];
const PACKAGE_TYPES_LIST = ["Pallet", "Carton", "Box", "Crate", "Drum", "Roll", "Bag", "Loose"];

const RequiredStar = () => null; // Removed asterisk indicator completely


/* =========================================================================
   1. LIST VIEW COMPONENT (SIHouseBLList)
   ========================================================================= */
export function SIHouseBLList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const directionParam = searchParams.get("direction");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadHBLJobs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const loadHBLJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/housebl/get");
      if (res.data.success) {
        setJobs(res.data.jobs || []);
      }
    } catch (error) {
      console.error("Error loading HouseBL jobs:", error);
      toast.error("Failed to load HouseBL jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleEditJob = (id) => {
    navigate(`/si-housebl-form?id=${id}`);
  };

  const handleCreateJob = () => {
    if (directionParam) {
      navigate(`/si-housebl-form?direction=${directionParam}`);
    } else {
      navigate('/si-housebl-form');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const previousJobs = [...jobs];
    const updatedJobs = jobs.map((job) =>
      job.id == id ? { ...job, status: newStatus } : job
    );
    setJobs(updatedJobs);

    try {
      await api.put(`/housebl/update/${id}`, { status: newStatus });
      toast.success("HBL status updated");
    } catch (error) {
      console.error("Status update failed:", error);
      toast.error("Failed to update status");
      setJobs(previousJobs);
    }
  };

  const handleViewJob = (job) => {
    setSelectedJob(job);
    setShowViewModal(true);
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      (job.hbl_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.mbl_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.shipper_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.consignee_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.job_no || "").toString().includes(searchTerm);

    const matchesStatus =
      filterStatus === "all" || job.status === filterStatus;

    let matchesDirection = true;
    if (directionParam) {
      let addDetails = {};
      if (job.additional_details) {
        try {
          addDetails = typeof job.additional_details === 'string'
            ? JSON.parse(job.additional_details)
            : job.additional_details;
        } catch (e) { }
      }
      const jobService = addDetails.services || job.services || "";
      if (directionParam === "import") {
        matchesDirection = jobService.toLowerCase().includes("import");
      } else if (directionParam === "export") {
        matchesDirection = jobService.toLowerCase().includes("export");
      }
    }

    return matchesSearch && matchesStatus && matchesDirection;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

  const getPageTitle = () => {
    if (directionParam === "import") return "Sea Import HouseBL (HBL)";
    if (directionParam === "export") return "Sea Export HouseBL (HBL)";
    return "SI HouseBL (HBL)";
  };

  if (loading) {
    return (
      <DashboardLayout title={getPageTitle()}>
        <div className="flex justify-center h-96 items-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={getPageTitle()}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
            <Anchor size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">{jobs.length}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total HBL Jobs</div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {jobs.filter(j => j.status === "Sell Rate Updated").length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Rates Updated</div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {jobs.filter(j => j.status === "Invoice Generated").length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Invoices Saved</div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {jobs.filter(j => ["Closed"].includes(j.status)).length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Closed Jobs</div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by HBL, MBL, Shipper..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-poppins text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleCreateJob}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm hover:shadow-md ml-auto whitespace-nowrap"
        >
          <Plus size={18} /> New HBL Job
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold select-none whitespace-nowrap">
                <th className="p-2 border border-slate-200 dark:border-slate-700">Action</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700"></th>
                <th className="p-2 border border-slate-200 dark:border-slate-700">History</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700 text-sky-600">Job_No</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700">Job_Date</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700">Consignee</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700 text-sky-600">HBL No</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700 text-sky-600">MBL_No</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700">POL/POD Port</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700">Container_No</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700">Agent</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700">Line</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700">ETD/ETA Date</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700">Manifest</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700">CFS Name</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700">Sales</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700 text-sky-600">Status</th>
                <th className="p-2 border border-slate-200 dark:border-slate-700 text-sky-600">Date_Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {currentJobs.length === 0 ? (
                <tr>
                  <td colSpan="20" className="p-8 text-center text-slate-500">
                    {searchTerm ? "No HBL jobs match your search." : "No HBL jobs found."}
                  </td>
                </tr>
              ) : (
                currentJobs.map((job) => {
                  let addDetails = {};
                  if (job.additional_details) {
                    try {
                      addDetails = typeof job.additional_details === 'string'
                        ? JSON.parse(job.additional_details)
                        : job.additional_details;
                    } catch (e) {}
                  }

                  const containersList = addDetails.containers || [];
                  const containerNos = containersList
                    .map(c => c.container_no)
                    .filter(Boolean)
                    .join(", ") || "X";

                  const cfsVal = addDetails.cfs || "—";
                  const salesVal = addDetails.sales || "Sentil Kumar";
                  const manifestVal = addDetails.manifest_filing || "HBL";

                  // Support fallback to database fields if not inside additional_details
                  const polVal = addDetails.pol || job.pol || "—";
                  const podVal = addDetails.pod || job.pod || "—";
                  const agentVal = addDetails.agent_name || job.agent_name || "—";
                  const carrierVal = addDetails.shipping_line_name || job.shipping_line_name || "—";
                  const etdVal = addDetails.etd || job.etd;
                  const etaVal = addDetails.eta || job.eta;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-xs text-slate-800 dark:text-slate-200">
                      {/* Action */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-center">
                        <button
                          onClick={() => handleEditJob(job.id)}
                          className="p-1.5 bg-[#1d82f5] text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center mx-auto"
                          title="Edit Job"
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                      
                      {/* Star */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-center">
                        <button
                          className="text-[#1d82f5] hover:text-blue-700 p-1 rounded flex items-center justify-center mx-auto"
                          title="Favorite/Nominated"
                        >
                          <Star size={15} />
                        </button>
                      </td>

                      {/* History */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-center">
                        <button
                          onClick={() => handleViewJob(job)}
                          className="p-1.5 bg-[#5bc0de] text-white rounded hover:bg-cyan-600 transition-colors flex items-center justify-center mx-auto"
                          title="View Details"
                        >
                          <Eye size={13} />
                        </button>
                      </td>

                      {/* Job No */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 font-mono font-medium text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span>{job.job_no}</span>
                          <button
                            onClick={() => copyToClipboard(job.job_no.toString(), "Job Number")}
                            className="text-[#1d82f5] hover:text-blue-700 transition-colors"
                            title="Copy Job Number"
                          >
                            <Files size={12} className="inline w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Job Date */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        {formatDate(job.date_of_nomination)}
                      </td>

                      {/* Consignee */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 font-medium">
                        {job.consignee_name || "—"}
                      </td>

                      {/* HBL No */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>{job.hbl_no || "—"}</span>
                          {job.hbl_no && (
                            <button
                              onClick={() => copyToClipboard(job.hbl_no, "HBL Number")}
                              className="text-[#1d82f5] hover:text-blue-700 transition-colors"
                              title="Copy HBL Number"
                            >
                              <Files size={12} className="inline w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* MBL No */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>{job.mbl_no || "—"}</span>
                          {job.mbl_no && (
                            <button
                              onClick={() => copyToClipboard(job.mbl_no, "MBL Number")}
                              className="text-[#1d82f5] hover:text-blue-700 transition-colors"
                              title="Copy MBL Number"
                            >
                              <Files size={12} className="inline w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* POL/POD Port */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-[11px] leading-tight">
                        <div className="font-semibold text-sky-600 dark:text-sky-400">
                          {polVal ? polVal.split(',')[0] : "—"}
                        </div>
                        <div className="font-semibold text-red-500 dark:text-red-400 uppercase mt-0.5">
                          {podVal ? podVal.split(',')[0] : "—"}
                        </div>
                      </td>

                      {/* Container No */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 font-mono">
                        {containerNos}
                      </td>

                      {/* Agent */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-[11px] leading-tight">
                        {agentVal}
                      </td>

                      {/* Line */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-[11px] leading-tight">
                        {carrierVal}
                      </td>

                      {/* ETD/ETA Date */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-red-600 dark:text-red-400 font-semibold whitespace-nowrap text-center">
                        <div>{etdVal ? formatDate(etdVal) : "—"}</div>
                        {etaVal && <div className="mt-0.5 text-red-500/80">{formatDate(etaVal)}</div>}
                      </td>

                      {/* Manifest */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 font-semibold">
                        {manifestVal}
                      </td>

                      {/* CFS Name */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-[11px] leading-tight">
                        {cfsVal}
                      </td>

                      {/* Sales */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 font-medium">
                        {salesVal.split(" ")[0]}
                      </td>

                      {/* Status */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-center">
                        <span className="inline-block bg-[#5c4084] text-white text-[9px] font-bold px-2.5 py-1 rounded uppercase select-none tracking-wider whitespace-nowrap shadow-sm">
                          {(job.status || "DRAFT").toUpperCase().replace(/\s+/g, "_")}
                        </span>
                      </td>

                      {/* Date Added */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        {formatDate(job.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredJobs.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/20">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span>Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="ml-2">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredJobs.length)} of {filteredJobs.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex gap-1 text-sm font-medium">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg transition-colors ${currentPage === p ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={() => setShowViewModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-4xl w-full p-6 animate-in fade-in zoom-in duration-200 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  HBL Job <span className="font-mono text-indigo-600 dark:text-indigo-400">#{selectedJob.job_no}</span>
                </h3>
                <div className="text-slate-500 text-sm mt-1">
                  Nominated on {selectedJob.date_of_nomination?.split('T')[0] || "—"}
                </div>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <XCircle size={28} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              {/* SECTION: PARTIES */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Parties Involved</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Shipper:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.shipper_name || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Consignee:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.consignee_name || "—"}</span>
                  </div>
                </div>
              </div>

              {/* SECTION: ROUTING */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Shipment Routing & Shipping Line </h4>
                <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Route:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {selectedJob.pol} <span className="text-slate-400">→</span> {selectedJob.pod}
                        {selectedJob.final_pod && <><span className="text-slate-400"> → </span> {selectedJob.final_pod}</>}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Parent MBL No:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-mono font-medium">{selectedJob.mbl_no || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Shipping Line / Vessel:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{selectedJob.shipping_line_name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ETA / ETD:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {selectedJob.eta ? selectedJob.eta.split('T')[0] : "-"} / {selectedJob.etd ? selectedJob.etd.split('T')[0] : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: CARGO */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Cargo & House Info</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">HBL No:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200 font-mono">{selectedJob.hbl_no}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Container Size:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      {selectedJob.container_count} x {selectedJob.container_size}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Weights (G/N):</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      Gross: {selectedJob.gross_weight || "-"} kg / Net: {selectedJob.net_weight || "-"} kg
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Packages:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.no_of_palette || "—"} pal</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Marks & Nos:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{selectedJob.marks_and_numbers || "—"}</span>
                  </div>
                </div>
              </div>

              {/* SECTION: FINANCE & TELEX */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Telex & Financials</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">HBL Telex Status:</span>
                    <span className={`col-span-2 font-medium text-sm px-2.5 py-0.5 rounded-full w-fit ${selectedJob.hbl_telex_received === "Yes" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {selectedJob.hbl_telex_received === "Yes" ? "Received" : "No"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Shipper Inv No:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.shipper_invoice_no || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Freight Sell Rate:</span>
                    <span className="col-span-2 font-bold text-slate-800 dark:text-white">
                      {selectedJob.freight_amount ? `${selectedJob.freight_amount} ${selectedJob.freight_currency || "USD"}` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditJob(selectedJob.id);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors font-medium text-sm"
              >
                <Edit2 size={16} /> Edit Job
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export function SIHouseBLForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get("id");

  const [customers, setCustomers] = useState([]);
  const [masterBLs, setMasterBLs] = useState([]);
  const [chargeOptions, setChargeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Main");

  // Form State containing both main columns and HBL-specific JSON details
  const [form, setForm] = useState({
    id: null,
    job_no: "",
    hbl_no: "",
    mbl_no: "",
    date_of_nomination: new Date().toISOString().slice(0, 10),
    shipper: "",
    consignee: "",
    status: "Draft",
    shipper_invoice_no: "",
    net_weight: "",
    gross_weight: "",
    hbl_telex_received: "No",
    no_of_palette: "",
    marks_and_numbers: "",
    freight_amount: "",
    freight_currency: "USD",

    // Sync details (now fully editable)
    pol: "",
    pod: "",
    final_pod: "",
    eta: "",
    etd: "",
    voyage: "",
    services: searchParams.get("direction") === "import" ? "Sea Freight Import" : (searchParams.get("direction") === "export" ? "Sea Freight Export" : ""),
    agent: "",
    agent_name: "",
    mbl_date: "",
    shipment_type: "",
    inco_terms: "",
    shipping_line_name: "",
    por: "",
    cfs: "",
    item_no: "",
    sub_no: "",
    igm_no: "",
    igm_date: "",
    carrier: "",
    line: "",
    container_size: "",
    container_count: "",
    cargo_type: "",
    branch_code: "Mumbai",
    execution_branch: "Mumbai",
    gst_state_from: "Maharashtra",

    // HBL-specific Main
    client: "",
    sales: "Sentil Kumar",
    cs: "Sentil Kumar",
    freight_status: "",
    bl_type: "",
    reference_no: "",
    boe_no: "",
    manifest_filing: "",
    cfs_filing: "",

    // HBL-specific Party
    notify: "",
    transporter: "",
    cha_name: "",
    do_date: "",
    delivery_date: "",

    // HBL-specific Packages
    no_of_packages: "",
    package_type: "Carton",
    no_of_pallets: "",
    volume: "",

    // Description Tab
    description: "",

    // Grids & Arrays
    containers: [],
    buy_rates: [],
    sell_rates: [],
    vehicles: [],
  });

  useEffect(() => {
    initForm();
  }, [idParam]);

  const initForm = async () => {
    try {
      setLoading(true);
      try {
        const chargesRes = await api.get("/invoice/charges");
        if (chargesRes.data.success) {
          setChargeOptions(chargesRes.data.charges || []);
        }
      } catch (err) {
        console.error("Error loading charges:", err);
      }
      const initRes = await api.get("/housebl/init");
      if (initRes.data.success) {
        setCustomers(initRes.data.customers || []);
        setMasterBLs(initRes.data.masterBLs || []);
      }

      if (idParam) {
        const res = await api.get(`/housebl/get/${idParam}`);
        if (res.data.success) {
          const b = res.data.job;

          let manualDetails = {};
          if (b.manual_party_details) {
            try {
              manualDetails = typeof b.manual_party_details === 'string'
                ? JSON.parse(b.manual_party_details)
                : b.manual_party_details;
            } catch (e) { }
          }

          let addDetails = {};
          if (b.additional_details) {
            try {
              addDetails = typeof b.additional_details === 'string'
                ? JSON.parse(b.additional_details)
                : b.additional_details;
            } catch (e) { }
          }

          const hasManualShipper = !b.shipper && manualDetails.shipper;
          const hasManualConsignee = !b.consignee && manualDetails.consignee;

          setForm({
            id: b.id,
            job_no: b.job_no || "",
            hbl_no: b.hbl_no || "",
            mbl_no: b.mbl_no || "",
            date_of_nomination: b.date_of_nomination ? b.date_of_nomination.slice(0, 10) : "",
            shipper: hasManualShipper ? manualDetails.shipper : (b.shipper || ""),
            consignee: hasManualConsignee ? manualDetails.consignee : (b.consignee || ""),
            status: b.status || "Draft",
            shipper_invoice_no: b.shipper_invoice_no || "",
            net_weight: b.net_weight || "",
            gross_weight: b.gross_weight || "",
            hbl_telex_received: b.hbl_telex_received || "No",
            no_of_palette: b.no_of_palette || "",
            marks_and_numbers: b.marks_and_numbers || "",
            freight_amount: b.freight_amount || "",
            freight_currency: b.freight_currency || "USD",

            pol: addDetails.pol || b.pol || "",
            pod: addDetails.pod || b.pod || "",
            final_pod: addDetails.final_pod || b.final_pod || "",
            eta: addDetails.eta ? addDetails.eta.slice(0, 10) : (b.eta ? b.eta.slice(0, 10) : ""),
            etd: addDetails.etd ? addDetails.etd.slice(0, 10) : (b.etd ? b.etd.slice(0, 10) : ""),
            voyage: addDetails.voyage || "",
            services: addDetails.services || "",
            agent: addDetails.agent || b.agent || "",
            agent_name: addDetails.agent_name || b.agent_name || "",
            mbl_date: addDetails.mbl_date ? addDetails.mbl_date.slice(0, 10) : "",
            shipment_type: addDetails.shipment_type || "",
            inco_terms: addDetails.inco_terms || "",
            shipping_line_name: addDetails.shipping_line_name || b.shipping_line_name || "",
            por: addDetails.por || "",
            cfs: addDetails.cfs || "",
            item_no: addDetails.item_no || "",
            sub_no: addDetails.sub_no || "",
            igm_no: addDetails.igm_no || "",
            igm_date: addDetails.igm_date ? addDetails.igm_date.slice(0, 10) : "",
            carrier: addDetails.carrier || "",
            line: addDetails.line || "",
            container_size: addDetails.container_size || b.container_size || "",
            container_count: addDetails.container_count || b.container_count || "",
            cargo_type: addDetails.cargo_type || b.cargo_type || "",
            branch_code: addDetails.branch_code || "Mumbai",
            execution_branch: addDetails.execution_branch || "Mumbai",
            gst_state_from: addDetails.gst_state_from || "Maharashtra",

            client: addDetails.client || "",
            sales: addDetails.sales || "Sentil Kumar",
            cs: addDetails.cs || "Sentil Kumar",
            freight_status: addDetails.freight_status || "",
            bl_type: addDetails.bl_type || "",
            reference_no: addDetails.reference_no || "",
            boe_no: addDetails.boe_no || "",
            manifest_filing: addDetails.manifest_filing || "",
            cfs_filing: addDetails.cfs_filing || "",

            notify: addDetails.notify || "",
            transporter: addDetails.transporter || "",
            cha_name: addDetails.cha_name || "",
            do_date: addDetails.do_date ? addDetails.do_date.slice(0, 10) : "",
            delivery_date: addDetails.delivery_date ? addDetails.delivery_date.slice(0, 10) : "",

            no_of_packages: addDetails.no_of_packages || "",
            package_type: addDetails.package_type || "Carton",
            no_of_pallets: addDetails.no_of_pallets || b.no_of_palette || "",
            volume: addDetails.volume || "",

            description: addDetails.description || b.marks_and_numbers || "",

            containers: addDetails.containers || [],
            buy_rates: addDetails.buy_rates || [],
            sell_rates: addDetails.sell_rates || [],
            vehicles: addDetails.vehicles || [],
          });
        }
      }
    } catch (error) {
      console.error("Error loading Form details:", error);
      toast.error("Failed to load HouseBL form details");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleMblSelection = async (mblNo) => {
    setForm(prev => ({ ...prev, mbl_no: mblNo }));
    if (!mblNo || mblNo.trim() === "") {
      setForm(prev => ({
        ...prev,
        job_no: "",
        pol: "", pod: "", final_pod: "", eta: "", etd: "",
        shipping_line_name: "", cargo_type: "", container_size: "", container_count: "",
        agent: "", agent_name: "", enquiry_no: "", mbl_date: "", services: "",
        shipment_type: "", inco_terms: "", voyage: "", por: "",
        cfs: "", item_no: "", sub_no: "", igm_no: "", igm_date: "",
        carrier: "", line: ""
      }));
      return;
    }

    try {
      const res = await api.get(`/masterbl/get-by-mbl/${mblNo}`);
      if (res.data.success) {
        const m = res.data.job;
        let mAddDetails = {};
        if (m.additional_details) {
          try {
            mAddDetails = typeof m.additional_details === 'string'
              ? JSON.parse(m.additional_details)
              : m.additional_details;
          } catch (e) { }
        }

        setForm(prev => ({
          ...prev,
          job_no: m.job_no, // Inherit Job Number from selected MBL
          pol: m.pol || "",
          pod: m.pod || "",
          final_pod: m.final_pod || "",
          eta: m.eta ? m.eta.slice(0, 10) : "",
          etd: m.etd ? m.etd.slice(0, 10) : "",
          shipping_line_name: m.shipping_line_name || "",
          cargo_type: m.cargo_type || "",
          container_size: m.container_size || "",
          container_count: m.container_count || "",
          agent: m.agent || "",
          agent_name: m.agent_name || "",

          enquiry_no: mAddDetails.enquiry_no || "",
          mbl_date: mAddDetails.mbl_date ? mAddDetails.mbl_date.slice(0, 10) : "",
          services: mAddDetails.services || "",
          shipment_type: mAddDetails.shipment_type || "",
          inco_terms: mAddDetails.inco_terms || "",
          voyage: mAddDetails.voyage || "",
          por: mAddDetails.por || "",
          cfs: mAddDetails.cfs || "",
          item_no: mAddDetails.item_no || "",
          sub_no: mAddDetails.sub_no || "",
          igm_no: mAddDetails.igm_no || "",
          igm_date: mAddDetails.igm_date ? mAddDetails.igm_date.slice(0, 10) : "",
          manifest_filing: mAddDetails.manifest_filing || "",
          cfs_filing: mAddDetails.cfs_filing || "",
          carrier: mAddDetails.carrier || "",
          line: mAddDetails.line || "",
          containers: (prev.containers && prev.containers.length > 0) ? prev.containers : (mAddDetails.containers || []),
          description: prev.description ? prev.description : (mAddDetails.description || m.marks_and_numbers || "")
        }));

        toast.info(`Synced and populated details from MasterBL: ${mblNo}`);
      }
    } catch (error) {
      console.error("Error syncing with MBL:", error);
      toast.error("Failed to load details for MBL: " + mblNo);
    }
  };

  const handleSave = async () => {
    if (!form.hbl_no || form.hbl_no.trim() === "") {
      toast.error("House Bill of Lading (HBL) number is required");
      return;
    }
    if (!form.mbl_no || form.mbl_no.trim() === "") {
      toast.error("Please select a parent MBL number");
      return;
    }

    try {
      const firstSellRate = form.sell_rates?.find(r => r.amount && parseFloat(r.amount) > 0);
      const calculatedFreightAmount = form.sell_rates?.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0) || 0;
      const freightCurrency = firstSellRate?.currency || "USD";

      let finalStatus = form.status;
      if (calculatedFreightAmount > 0 && finalStatus === "Draft") {
        finalStatus = "Sell Rate Updated";
      }

      const additionalDetailsObj = {
        pol: form.pol,
        pod: form.pod,
        final_pod: form.final_pod,
        eta: form.eta,
        etd: form.etd,
        voyage: form.voyage,
        services: form.services,
        agent: form.agent,
        agent_name: form.agent_name,
        mbl_date: form.mbl_date,
        shipment_type: form.shipment_type,
        inco_terms: form.inco_terms,
        shipping_line_name: form.shipping_line_name,
        por: form.por,
        cfs: form.cfs,
        item_no: form.item_no,
        sub_no: form.sub_no,
        igm_no: form.igm_no,
        igm_date: form.igm_date,
        carrier: form.carrier,
        line: form.line,
        container_size: form.container_size,
        container_count: form.container_count,
        cargo_type: form.cargo_type,
        branch_code: form.branch_code,
        execution_branch: form.execution_branch,
        gst_state_from: form.gst_state_from,

        enquiry_no: form.enquiry_no,
        client: form.client,
        sales: form.sales,
        cs: form.cs,
        freight_status: form.freight_status,
        bl_type: form.bl_type,
        reference_no: form.reference_no,
        boe_no: form.boe_no,
        manifest_filing: form.manifest_filing,
        cfs_filing: form.cfs_filing,
        notify: form.notify,
        transporter: form.transporter,
        cha_name: form.cha_name,
        do_date: form.do_date,
        delivery_date: form.delivery_date,

        no_of_packages: form.no_of_packages,
        package_type: form.package_type,
        no_of_pallets: form.no_of_pallets || form.no_of_palette,
        volume: form.volume,

        inv_container_type: form.container_size,
        inv_no_of_units: form.container_count,
        inv_csize: form.container_size,
        containers: form.containers,

        description: form.description,

        buy_rates: form.buy_rates,
        sell_rates: form.sell_rates,
        vehicles: form.vehicles,
      };

      const payload = {
        ...form,
        no_of_palette: form.no_of_pallets || form.no_of_palette,
        status: finalStatus,
        freight_amount: calculatedFreightAmount,
        freight_currency: freightCurrency,
        additional_details: JSON.stringify(additionalDetailsObj),
      };

      if (idParam) {
        await api.put(`/housebl/update/${idParam}`, payload);
        toast.success("SI HouseBL job updated successfully");
      } else {
        await api.post("/housebl/insert", payload);
        toast.success("SI HouseBL job created successfully");
      }
      navigate("/si-housebl");
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error.response?.data?.message || "Failed to save HouseBL");
    }
  };

  const tabs = [
    "Main", "Party", "Packages", "Container", "Description", "BuyRates", "SellRates", "Vehicle"
  ];
  const labelStyle = "block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1 select-none";
  const inputStyle = "w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all";

  if (loading) {
    return (
      <DashboardLayout title="HouseBL Form">
        <div className="flex justify-center h-96 items-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={idParam ? "Edit SI HouseBL" : "New SI HouseBL"}>
      {/* Title Header */}
      <div className="flex items-center justify-between pb-2 mb-4 border-b border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Edit2 size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold select-none">
            {idParam ? "Edit Sea House BL Job" : "New Sea House BL Job"}
            {form.job_no && (
              <span className="font-mono text-xs text-slate-400 ml-2">(Job #{form.job_no})</span>
            )}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/si-housebl')}
          className="px-3 py-1 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 text-xs transition-colors font-medium"
        >
          Back to List
        </button>
      </div>

      <div className="space-y-0">
        {/* Classical Folder Tabstrip */}
        <div className="flex border-b border-slate-200 dark:border-slate-700/80 w-full overflow-x-auto whitespace-nowrap scrollbar-none gap-1 -mb-[1px] relative z-10">
          {tabs.map(tb => {
            const isActive = activeTab === tb;
            return (
              <button
                key={tb}
                type="button"
                onClick={() => setActiveTab(tb)}
                className={`px-4 py-1.5 text-xs font-semibold tracking-wide transition-all rounded-t border-t border-l border-r ${
                  isActive
                    ? 'bg-white dark:bg-dark-card border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-white border-b-white dark:border-b-dark-card'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-b-slate-200 dark:border-b-slate-700/80'
                }`}
              >
                {tb}
              </button>
            );
          })}
        </div>

        {/* Dynamic Full-Width Form Panel */}
        <div className="bg-white dark:bg-dark-card p-6 border border-slate-200 dark:border-slate-700/80 rounded-b rounded-r shadow-sm">

          {/* TAB 1: MAIN */}
          {activeTab === "Main" && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Main Shipment Route & Invoicing Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className={labelStyle}>HBL No</label>
                  <input type="text" name="hbl_no" value={form.hbl_no} onChange={handleInputChange} placeholder="Enter HBL No" className={inputStyle + " font-mono font-semibold"} />
                </div>
                <div>
                  <label className={labelStyle}>MBL_No</label>
                  <select name="mbl_no" value={form.mbl_no} onChange={(e) => handleMblSelection(e.target.value)} className={inputStyle + " font-mono font-semibold"}>
                    <option value="">Select Parent MBL No</option>
                    {masterBLs.map(mbl => <option key={mbl.mbl_no} value={mbl.mbl_no}>{mbl.mbl_no}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>HBL Date</label>
                  <input type="date" name="date_of_nomination" value={form.date_of_nomination} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Enquiry No</label>
                  <input type="text" name="enquiry_no" value={form.enquiry_no} onChange={handleInputChange} placeholder="Enquiry No" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>MBL Date</label>
                  <input type="date" name="mbl_date" value={form.mbl_date} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Services</label>
                  <select name="services" value={form.services} onChange={handleInputChange} className={inputStyle}>
                    <option value="">Select Service</option>
                    {SERVICES_LIST.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Shipment Type</label>
                  <input type="text" name="shipment_type" value={form.shipment_type} onChange={handleInputChange} placeholder="e.g. FCL / LCL" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>INCO Terms</label>
                  <select name="inco_terms" value={form.inco_terms} onChange={handleInputChange} className={inputStyle}>
                    <option value="">Select INCO Term</option>
                    {INCO_TERMS_LIST.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <PartySelect
                    label="Client"
                    name="client"
                    value={form.client}
                    onChange={handleInputChange}
                    customers={customers}
                    isHybrid={true}
                    placeholder="Search client..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Sales</label>
                  <input type="text" name="sales" value={form.sales} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>CS</label>
                  <input type="text" name="cs" value={form.cs} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Freight Status</label>
                  <select name="freight_status" value={form.freight_status} onChange={handleInputChange} className={inputStyle}>
                    <option value="">Select Freight Status</option>
                    {FREIGHT_STATUS_LIST.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>BL Type</label>
                  <select name="bl_type" value={form.bl_type} onChange={handleInputChange} className={inputStyle}>
                    <option value="">Select BL Type</option>
                    {BL_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Vessel</label>
                  <input type="text" name="shipping_line_name" value={form.shipping_line_name} onChange={handleInputChange} placeholder="Vessel Name" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Voyage</label>
                  <input type="text" name="voyage" value={form.voyage} onChange={handleInputChange} placeholder="Voyage No" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>P.O.R.</label>
                  <input type="text" name="por" value={form.por} onChange={handleInputChange} placeholder="Place of Receipt" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>P.O.L.</label>
                  <input type="text" name="pol" value={form.pol} onChange={handleInputChange} placeholder="Port of Loading" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>P.O.D.</label>
                  <input type="text" name="pod" value={form.pod} onChange={handleInputChange} placeholder="Port of Discharge" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>F.P.D</label>
                  <input type="text" name="final_pod" value={form.final_pod} onChange={handleInputChange} placeholder="Final Destination" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>C.F.S.</label>
                  <input type="text" name="cfs" value={form.cfs} onChange={handleInputChange} placeholder="CFS Name" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Item No.</label>
                  <input type="text" name="item_no" value={form.item_no} onChange={handleInputChange} placeholder="Item No" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>SUB No.</label>
                  <input type="text" name="sub_no" value={form.sub_no} onChange={handleInputChange} placeholder="SUB No" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>IGM No.</label>
                  <input type="text" name="igm_no" value={form.igm_no} onChange={handleInputChange} placeholder="IGM No" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>IGM Date</label>
                  <input type="date" name="igm_date" value={form.igm_date} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>ETA Date</label>
                  <input type="date" name="eta" value={form.eta} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>ETD Date</label>
                  <input type="date" name="etd" value={form.etd} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Reference No.</label>
                  <input type="text" name="reference_no" value={form.reference_no} onChange={handleInputChange} placeholder="Ref No" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>BOE No</label>
                  <input type="text" name="boe_no" value={form.boe_no} onChange={handleInputChange} placeholder="BOE No" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Manifest Filing</label>
                  <input type="text" name="manifest_filing" value={form.manifest_filing} onChange={handleInputChange} placeholder="Manifest Filing" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>CFS Filing</label>
                  <input type="text" name="cfs_filing" value={form.cfs_filing} onChange={handleInputChange} placeholder="CFS Filing" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Branch Code</label>
                  <input type="text" name="branch_code" value={form.branch_code} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Execution Branch</label>
                  <input type="text" name="execution_branch" value={form.execution_branch} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>GST State From</label>
                  <input type="text" name="gst_state_from" value={form.gst_state_from} onChange={handleInputChange} className={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARTY */}
          {activeTab === "Party" && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Client, Agents, Transporters & Carriers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <PartySelect
                    label="Shipper Party"
                    name="shipper"
                    value={form.shipper}
                    onChange={handleInputChange}
                    customers={customers}
                    isHybrid={true}
                    placeholder="Search Shipper..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>

                <div>
                  <PartySelect
                    label="Consignee Party"
                    name="consignee"
                    value={form.consignee}
                    onChange={handleInputChange}
                    customers={customers}
                    isHybrid={true}
                    placeholder="Search Consignee..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>

                <div>
                  <PartySelect
                    label="Overseas Agent"
                    name="agent"
                    value={form.agent}
                    onChange={handleInputChange}
                    customers={customers}
                    isHybrid={true}
                    placeholder="Search Agent..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>

                <div>
                  <PartySelect
                    label="Notify Party"
                    name="notify"
                    value={form.notify}
                    onChange={handleInputChange}
                    customers={customers}
                    isHybrid={false}
                    placeholder="Search Notify Party..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>

                <div>
                  <PartySelect
                    label="Shipping Line / Carrier"
                    name="carrier"
                    value={form.carrier}
                    onChange={handleInputChange}
                    customers={customers}
                    isHybrid={false}
                    placeholder="Search Carrier..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Line Code</label>
                  <input type="text" name="line" value={form.line} onChange={handleInputChange} placeholder="Line Code" className={inputStyle} />
                </div>

                <div>
                  <PartySelect
                    label="Transporter Name"
                    name="transporter"
                    value={form.transporter}
                    onChange={handleInputChange}
                    customers={customers}
                    isHybrid={false}
                    placeholder="Search Transporter..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>

                <div>
                  <PartySelect
                    label="CHA Name"
                    name="cha_name"
                    value={form.cha_name}
                    onChange={handleInputChange}
                    customers={customers}
                    isHybrid={false}
                    placeholder="Search CHA..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Delivery Order (DO) Date</label>
                  <input type="date" name="do_date" value={form.do_date} onChange={handleInputChange} className={inputStyle} />
                </div>

                <div>
                  <label className={labelStyle}>Delivery Date</label>
                  <input type="date" name="delivery_date" value={form.delivery_date} onChange={handleInputChange} className={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PACKAGES */}
          {activeTab === "Packages" && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Weight, Packages & Dimensions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className={labelStyle}>No Of Packages</label>
                  <input type="number" name="no_of_packages" value={form.no_of_packages} onChange={handleInputChange} placeholder="e.g. 50" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Package Type</label>
                  <select name="package_type" value={form.package_type} onChange={handleInputChange} className={inputStyle}>
                    {PACKAGE_TYPES_LIST.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>No Of Pallets</label>
                  <input type="number" name="no_of_pallets" value={form.no_of_pallets} onChange={handleInputChange} placeholder="e.g. 10" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Gross Weight (kg)</label>
                  <input type="number" name="gross_weight" value={form.gross_weight} onChange={handleInputChange} placeholder="Gross Weight in kg" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Net Weight (kg)</label>
                  <input type="number" name="net_weight" value={form.net_weight} onChange={handleInputChange} placeholder="Net Weight in kg" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Volume (CBM)</label>
                  <input type="number" name="volume" value={form.volume} onChange={handleInputChange} placeholder="Volume in Cubic Meters" className={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Container */}
          {activeTab === "Container" && (
            <div className="space-y-8">
              {/* Inventory details */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Inventory Overview (Synced from MBL)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelStyle}>Container Size Type (CSize)</label>
                    <input type="text" name="container_size" value={form.container_size} onChange={handleInputChange} placeholder="Container Size Type" className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>No Of Units (Count)</label>
                    <input type="number" name="container_count" value={form.container_count} onChange={handleInputChange} placeholder="Number of Units" className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Inventory Cargo Type</label>
                    <input type="text" name="cargo_type" value={form.cargo_type} onChange={handleInputChange} placeholder="Inventory Cargo Type" className={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Containers list */}
              <div className="pt-4">
                <ContainerGrid
                  rows={form.containers}
                  onChange={(updated) => setForm(prev => ({ ...prev, containers: updated }))}
                  onAddRow={(newRow) => setForm(prev => ({ ...prev, containers: [...prev.containers, newRow] }))}
                  onDeleteRow={(idx) => setForm(prev => ({
                    ...prev,
                    containers: prev.containers.filter((_, i) => i !== idx)
                  }))}
                />
              </div>
            </div>
          )}

          {/* TAB 5: DESCRIPTION */}
          {activeTab === "Description" && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Cargo Description / Marks & Numbers</h3>
              <div>
                <label className={labelStyle}>Detailed Cargo Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  rows={10}
                  placeholder="Enter details of shipping cargo, marks, labels, specific handling requirements..."
                  className={inputStyle + " resize-none font-mono text-sm leading-relaxed p-4"}
                />
              </div>
            </div>
          )}

          {/* TAB 6: BUYRATES */}
          {activeTab === "BuyRates" && (
            <div className="space-y-6">
              <RateGrid
                rows={form.buy_rates}
                customers={customers}
                isBuy={true}
                chargeOptions={chargeOptions}
                onChange={(updated) => setForm(prev => ({ ...prev, buy_rates: updated }))}
                onAddRow={(newRow) => setForm(prev => ({ ...prev, buy_rates: [...prev.buy_rates, newRow] }))}
                onDeleteRow={(idx) => setForm(prev => ({
                  ...prev,
                  buy_rates: prev.buy_rates.filter((_, i) => i !== idx)
                }))}
              />
            </div>
          )}

          {/* TAB 7: SELLRATES */}
          {activeTab === "SellRates" && (
            <div className="space-y-6">
              <RateGrid
                rows={form.sell_rates}
                customers={customers}
                isBuy={false}
                consignee={form.consignee}
                chargeOptions={chargeOptions}
                onChange={(updated) => setForm(prev => ({ ...prev, sell_rates: updated }))}
                onAddRow={(newRow) => setForm(prev => ({ ...prev, sell_rates: [...prev.sell_rates, newRow] }))}
                onDeleteRow={(idx) => setForm(prev => ({
                  ...prev,
                  sell_rates: prev.sell_rates.filter((_, i) => i !== idx)
                }))}
              />
            </div>
          )}

          {/* TAB 8: VEHICLE */}
          {activeTab === "Vehicle" && (
            <div className="space-y-6">
              <VehicleGrid
                rows={form.vehicles}
                onChange={(updated) => setForm(prev => ({ ...prev, vehicles: updated }))}
                onAddRow={(newRow) => setForm(prev => ({ ...prev, vehicles: [...prev.vehicles, newRow] }))}
                onDeleteRow={(idx) => setForm(prev => ({
                  ...prev,
                  vehicles: prev.vehicles.filter((_, i) => i !== idx)
                }))}
              />
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="pt-6 mt-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/si-housebl')}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
            >
              <Save size={16} /> Save HBL Job
            </button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
