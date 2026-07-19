import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  Search, Filter, Plus, Edit2, Eye, CheckCircle, FileText, ChevronLeft, ChevronRight, Save, Anchor, XCircle, Star, Files, Trash2
} from "lucide-react";
import { toast } from "react-toastify";
import PortSelect from "../components/PortSelect";
import PartySelect from "../components/PartySelect";
import { RateGrid, ContainerGrid, VehicleGrid } from "../components/LogisticsGrids";
import SearchableSelect from "../components/SearchableSelect";

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
const FREIGHT_STATUS_LIST = ["Credit", "Immediate", "Against DO", "Against BL"];
const PACKAGE_TYPES_LIST = ["Pallet", "Carton", "Box", "Crate", "Drum", "Roll", "Bag", "Loose"];

const RequiredStar = () => null; // Removed asterisk indicator completely


/* =========================================================================
   1. LIST VIEW COMPONENT (SIMasterBLList)
   ========================================================================= */
export function SIMasterBLList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const directionParam = searchParams.get("direction");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [nextJobNo, setNextJobNo] = useState(8000);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadMBLJobs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const loadMBLJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/masterbl/get");
      if (res.data.success) {
        setJobs(res.data.jobs || []);
      }

      const resInit = await api.get("/masterbl/init");
      if (resInit.data.success) {
        setNextJobNo(resInit.data.nextJobNo);
      }
    } catch (error) {
      console.error("Error loading MasterBL jobs:", error);
      toast.error("Failed to load MasterBL jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleEditJob = (jobNo) => {
    navigate(`/si-masterbl-form?jobNo=${jobNo}`);
  };

  const handleCreateJob = () => {
    if (directionParam) {
      navigate(`/si-masterbl-form?direction=${directionParam}`);
    } else {
      navigate('/si-masterbl-form');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete ALL MasterBL entries? This action is permanent and cannot be undone.")) return;
    try {
      setLoading(true);
      const res = await api.delete("/masterbl/delete-all");
      if (res.data.success) {
        toast.success("All MasterBL jobs deleted successfully");
        setJobs([]);
      }
    } catch (error) {
      console.error("Error deleting all MasterBL jobs:", error);
      toast.error("Failed to delete all MasterBL jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (jobNo, newStatus) => {
    const previousJobs = [...jobs];
    const updatedJobs = jobs.map((job) =>
      job.job_no == jobNo ? { ...job, status: newStatus } : job
    );
    setJobs(updatedJobs);

    try {
      await api.put(`/masterbl/update/${jobNo}`, { status: newStatus });
      toast.success(`MBL Job #${jobNo} status updated`);
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
      (job.mbl_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.shipper_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.consignee_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_no.toString().includes(searchTerm);

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
      const jobService = addDetails.services || "";
      if (directionParam === "import") {
        matchesDirection = jobService.toLowerCase().includes("import");
      } else if (directionParam === "export") {
        matchesDirection = jobService.toLowerCase().includes("export");
      }
    }

    return matchesSearch && matchesStatus && matchesDirection;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

  const getPageTitle = () => {
    if (directionParam === "import") return "Sea Import MasterBL (MBL)";
    if (directionParam === "export") return "Sea Export MasterBL (MBL)";
    return "SI MasterBL (MBL)";
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
            <Anchor size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">{jobs.length}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total MBL Jobs</div>
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

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by MBL, Shipper..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-poppins text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleDeleteAll}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm hover:shadow-md ml-auto whitespace-nowrap"
        >
          <Trash2 size={18} /> Delete All Jobs
        </button>
        <button
          onClick={handleCreateJob}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm hover:shadow-md ml-2 whitespace-nowrap"
        >
          <Plus size={18} /> New MBL Job (#{nextJobNo})
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold select-none whitespace-nowrap">
                <th className="p-2 border border-slate-200 dark:border-slate-700">Action</th>
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
                    {searchTerm ? "No MBL jobs match your search." : "No MBL jobs found."}
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
                    } catch (e) { }
                  }

                  const containersList = addDetails.containers || [];
                  const containerNos = containersList
                    .map(c => c.container_no)
                    .filter(Boolean)
                    .join(", ") || "X";

                  const cfsVal = addDetails.cfs || "—";
                  const salesVal = addDetails.sales || "Sentil Kumar";
                  const manifestVal = addDetails.manifest_filing || "MBL";

                  return (
                    <tr
                      key={job.job_no}
                      className={`transition-colors text-xs text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800
                        ${['approved', 'posted', 'closed'].includes(String(job.status || '').toLowerCase())
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/60 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }
                      `}
                    >
                      {/* Action */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-center">
                        <button
                          onClick={() => handleEditJob(job.job_no)}
                          className="p-1.5 bg-[#1d82f5] text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center mx-auto"
                          title="Edit Job"
                        >
                          <Edit2 size={13} />
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
                        {job.hbls && job.hbls.length > 0 ? (
                          job.hbls.map(h => h.hbl_no).join(", ")
                        ) : (
                          "—"
                        )}
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
                          {job.pol ? job.pol.split(',')[0] : "—"}
                        </div>
                        <div className="font-semibold text-red-500 dark:text-red-400 uppercase mt-0.5">
                          {job.pod ? job.pod.split(',')[0] : "—"}
                        </div>
                      </td>

                      {/* Container No */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 font-mono">
                        {containerNos}
                      </td>

                      {/* Agent */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-[11px] leading-tight">
                        {job.agent_name || "—"}
                      </td>

                      {/* Line */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-[11px] leading-tight">
                        {job.shipping_line_name || "—"}
                      </td>

                      {/* ETD/ETA Date */}
                      <td className="p-2 border border-slate-100 dark:border-slate-800 text-red-600 dark:text-red-400 font-semibold whitespace-nowrap text-center">
                        <div>{job.etd ? formatDate(job.etd) : "—"}</div>
                        {job.eta && <div className="mt-0.5 text-red-500/80">{formatDate(job.eta)}</div>}
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
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase select-none tracking-wider whitespace-nowrap border shadow-sm
                          ${['approved', 'posted', 'closed'].includes(String(job.status || '').toLowerCase())
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
                            : String(job.status || '').toLowerCase() === 'cancelled'
                            ? 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300'
                            : 'bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
                          }
                        `}>
                          {(job.status || "DRAFT").toUpperCase().replace(/\s+/g, " ")}
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

      {showViewModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={() => setShowViewModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-4xl w-full p-6 animate-in fade-in zoom-in duration-200 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  MBL Job <span className="font-mono text-indigo-600 dark:text-indigo-400">#{selectedJob.job_no}</span>
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
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Agent:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.agent_name || "—"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Shipment Routing</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Route:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      {selectedJob.pol} <span className="text-slate-400">→</span> {selectedJob.pod}
                      {selectedJob.final_pod && <><span className="text-slate-400"> → </span> {selectedJob.final_pod}</>}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">MBL No:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200 font-mono">{selectedJob.mbl_no || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Shipping Line:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.shipping_line_name || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">ETA / ETD:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      {selectedJob.eta ? selectedJob.eta.split('T')[0] : "-"} / {selectedJob.etd ? selectedJob.etd.split('T')[0] : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Cargo & Container</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Cargo Type:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.cargo_type || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Containers:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      {selectedJob.container_count} x {selectedJob.container_size}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Weights:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      Gross: {selectedJob.gross_weight || "-"} kg / Net: {selectedJob.net_weight || "-"} kg
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Financials</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Freight Sell Rate:</span>
                    <span className="col-span-2 font-bold text-slate-800 dark:text-white">
                      {selectedJob.freight_amount ? `${selectedJob.freight_amount} ${selectedJob.freight_currency || "USD"}` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION: LINKED HOUSE BLS (HBLS) */}
              {selectedJob.hbls && selectedJob.hbls.length > 0 && (
                <div className="col-span-1 md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-6 mt-4">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Linked House BLs (HBLs)</h4>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                          <th className="p-3">HBL No</th>
                          <th className="p-3">Shipper</th>
                          <th className="p-3">Consignee</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Freight Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedJob.hbls.map(h => (
                          <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                            <td className="p-3 font-mono font-medium text-indigo-600 dark:text-indigo-400">{h.hbl_no}</td>
                            <td className="p-3">{h.shipper_name || "—"}</td>
                            <td className="p-3">{h.consignee_name || "—"}</td>
                            <td className="p-3">
                              <span className="inline-block bg-[#5c4084] text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                {h.status || "DRAFT"}
                              </span>
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {h.freight_amount ? `${h.freight_amount} ${h.freight_currency || "USD"}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditJob(selectedJob.job_no);
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

/* =========================================================================
   2. FORM VIEW COMPONENT (SIMasterBLForm)
   ========================================================================= */
export function SIMasterBLForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobNoParam = searchParams.get("jobNo");

  const [jobNo, setJobNo] = useState(null);
  const initialDataLoaded = React.useRef(false);
  const loadedContainersInfo = React.useRef({ count: null, size: null });
  const [customers, setCustomers] = useState([]);
   const { user } = useAuth();
  const [chargeOptions, setChargeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Main");
  const [saveError, setSaveError] = useState(null);
  
  const [hasActiveApproval, setHasActiveApproval] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [packageTypes, setPackageTypes] = useState(PACKAGE_TYPES_LIST);
  const [cfsOptions, setCfsOptions] = useState([]);
  const [valErrors, setValErrors] = useState({});
  const [validationModalErrors, setValidationModalErrors] = useState(null);
  const [employees, setEmployees] = useState([]);

  // Form State containing both main columns and additional JSON fields
  const [form, setForm] = useState({
    client: "",
    mbl_no: "",
    date_of_nomination: new Date().toISOString().slice(0, 10),
    shipper: "",
    consignee: "",
    agent: "",
    pol: "",
    pod: "",
    final_pod: "",
    container_size: "",
    container_count: 1,
    status: "Draft",
    eta: "",
    etd: "",
    shipper_invoice_no: "",
    net_weight: "",
    gross_weight: "",
    cargo_type: "",
    shipping_line_name: "",
    mbl_telex_received: "No",
    no_of_palette: "",
    marks_and_numbers: "",
    freight_amount: "",
    freight_currency: "USD",

    hbl_no: "",
    hbl_date: "",
    hbl_shipper: "",
    hbl_consignee: "",
    hbl_agent: "",
    hbl_notify: "",
    hbl_carrier: "",
    hbl_transporter: "",
    hbl_cha_name: "",

    enquiry_no: "",
    mbl_date: "",
    services: searchParams.get("direction") === "import" ? "Sea Freight Import" : (searchParams.get("direction") === "export" ? "Sea Freight Export" : ""),
    shipment_type: "",
    inco_terms: "",
    sales: "Sentil Kumar",
    cs: "Sentil Kumar",
    freight_status: "",
    bl_type: "",
    voyage: "",
    por: "",
    cfs: "",
    item_no: "",
    sub_no: "",
    igm_no: "",
    igm_date: "",
    reference_no: "",
    boe_no: "",
    manifest_filing: "",
    cfs_filing: "",
    branch_code: "Mumbai",
    execution_branch: "Mumbai",
    gst_state_from: "Maharashtra",

    carrier: "",
    line: "",
    notify: "",
    transporter: "",
    cha_name: "",
    do_date: "",
    delivery_date: "",

    no_of_packages: "",
    package_type: "Carton",
    no_of_pallets: "",
    volume: "",

    inv_container_type: "",
    inv_no_of_units: "",
    inv_csize: "",
    containers: [],
    description: "",
    remarks: "",

    buy_rates: [],
    sell_rates: [],
    vehicles: [],
    hbls: [], // linked HBLs array
  });

  const cloneJobNoParam = searchParams.get("cloneJobNo");

  useEffect(() => {
    initForm();
  }, [jobNoParam, cloneJobNoParam]);

  useEffect(() => {
    if (loading || !initialDataLoaded.current) return;
    if (form.container_count === loadedContainersInfo.current.count) return;
    const count = parseInt(form.container_count) || 0;
    if (count >= 0) {
      setForm(prev => {
        const currentContainers = prev.containers || [];
        if (currentContainers.length === count) return prev;
        
        let newContainers = [...currentContainers];
        if (currentContainers.length < count) {
          const diff = count - currentContainers.length;
          for (let i = 0; i < diff; i++) {
            newContainers.push({
              container_no: "",
              container_type: prev.container_size || "40 HC",
              seal_no: "",
              no_of_packages: "",
              package_type: "Pallet",
              gross_weight: ""
            });
          }
        } else {
          newContainers = newContainers.slice(0, count);
        }
        return { ...prev, containers: newContainers };
      });
    }
  }, [form.container_count, loading]);

  useEffect(() => {
    if (loading || !initialDataLoaded.current) return;
    if (form.container_size === loadedContainersInfo.current.size) return;
    setForm(prev => {
      if (!prev.container_size) return prev;
      const updated = (prev.containers || []).map(c => ({
        ...c,
        container_type: prev.container_size
      }));
      const changed = updated.some((c, idx) => c.container_type !== prev.containers[idx]?.container_type);
      if (!changed) return prev;
      return { ...prev, containers: updated };
    });
  }, [form.container_size, loading]);

  const initForm = async () => {
    initialDataLoaded.current = false;
    loadedContainersInfo.current = { count: null, size: null };
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
      try {
        const pkgRes = await api.get("/package-types");
        if (pkgRes.data.success) {
          setPackageTypes(pkgRes.data.packageTypes || []);
        }
      } catch (err) {
        console.error("Error loading package types:", err);
      }
      try {
        const cfsRes = await api.get("/cfs");
        if (cfsRes.data.success) {
          setCfsOptions((cfsRes.data.parties || []).map(p => p.name));
        }
      } catch (err) {
        console.error("Error loading CFS list:", err);
      }
      try {
        const empRes = await api.get("/user-booking-updates/employees");
        if (empRes.data.success) {
          setEmployees(empRes.data.employees || []);
        }
      } catch (err) {
        console.error("Error loading employees:", err);
      }
      const initRes = await api.get("/masterbl/init");
      let nextJobNumber = 8000;
      if (initRes.data.success) {
        setCustomers(initRes.data.customers || []);
        nextJobNumber = initRes.data.nextJobNo;
        if (!jobNoParam) {
          setJobNo(nextJobNumber);
        }
      }

      const activeJobId = jobNoParam || cloneJobNoParam;
      if (activeJobId) {
        if (jobNoParam) {
          setJobNo(jobNoParam);
          try {
            const activeAppRes = await api.get(`/masterbl/edit-requests/active/${jobNoParam}`);
            if (activeAppRes.data.success) {
              setHasActiveApproval(activeAppRes.data.hasActiveApproval);
            }
          } catch (activeAppErr) {
            console.error("Error loading active edit requests status:", activeAppErr);
          }
        } else {
          setJobNo(nextJobNumber);
        }
        const res = await api.get(`/masterbl/get/${activeJobId}`);
        if (res.data.success) {
          const b = res.data.job;
          loadedContainersInfo.current = {
            count: b.container_count || 1,
            size: b.container_size || ""
          };

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
          const hasManualAgent = !b.agent && manualDetails.agent;
          const hasManualHblShipper = !b.hbl_shipper && manualDetails.hbl_shipper;
          const hasManualHblConsignee = !b.hbl_consignee && manualDetails.hbl_consignee;
          const hasManualHblAgent = !b.hbl_agent && manualDetails.hbl_agent;

          setForm({
            mbl_no: cloneJobNoParam ? "" : (b.mbl_no || ""),
            date_of_nomination: b.date_of_nomination ? b.date_of_nomination.slice(0, 10) : "",
            shipper: hasManualShipper ? manualDetails.shipper : (b.shipper || ""),
            consignee: hasManualConsignee ? manualDetails.consignee : (b.consignee || ""),
            agent: hasManualAgent ? manualDetails.agent : (b.agent || ""),
            hbl_no: b.hbl_no || "",
            hbl_date: b.hbl_date ? b.hbl_date.slice(0, 10) : "",
            hbl_shipper: hasManualHblShipper ? manualDetails.hbl_shipper : (b.hbl_shipper || ""),
            hbl_consignee: hasManualHblConsignee ? manualDetails.hbl_consignee : (b.hbl_consignee || ""),
            hbl_agent: hasManualHblAgent ? manualDetails.hbl_agent : (b.hbl_agent || ""),
            hbl_notify: addDetails.hbl_notify || "",
            hbl_carrier: addDetails.hbl_carrier || "",
            hbl_transporter: addDetails.hbl_transporter || "",
            hbl_cha_name: addDetails.hbl_cha_name || "",
            pol: b.pol || "",
            pod: b.pod || "",
            final_pod: b.final_pod || "",
            container_size: b.container_size || "",
            container_count: b.container_count || 1,
            status: cloneJobNoParam ? "Draft" : (b.status || "Draft"),
            eta: b.eta ? b.eta.slice(0, 10) : "",
            etd: b.etd ? b.etd.slice(0, 10) : "",
            shipper_invoice_no: b.shipper_invoice_no || "",
            net_weight: b.net_weight || "",
            gross_weight: b.gross_weight || "",
            cargo_type: b.cargo_type || "",
            shipping_line_name: b.shipping_line_name || "",
            mbl_telex_received: b.mbl_telex_received || "No",
            no_of_palette: b.no_of_palette || "",
            marks_and_numbers: b.marks_and_numbers || "",
            freight_amount: b.freight_amount || "",
            freight_currency: b.freight_currency || "USD",

            client: addDetails.client || "",
            enquiry_no: addDetails.enquiry_no || "",
            mbl_date: addDetails.mbl_date ? addDetails.mbl_date.slice(0, 10) : "",
            services: addDetails.services || "",
            shipment_type: addDetails.shipment_type || "",
            inco_terms: addDetails.inco_terms || "",
            sales: addDetails.sales !== undefined ? addDetails.sales : (jobNoParam ? "" : "Sentil Kumar"),
            cs: addDetails.cs !== undefined ? addDetails.cs : (jobNoParam ? "" : "Sentil Kumar"),
            freight_status: addDetails.freight_status || "",
            bl_type: addDetails.bl_type || "",
            voyage: addDetails.voyage || "",
            por: addDetails.por || "",
            cfs: addDetails.cfs || "",
            item_no: addDetails.item_no || "",
            sub_no: addDetails.sub_no || "",
            igm_no: addDetails.igm_no || "",
            igm_date: addDetails.igm_date ? addDetails.igm_date.slice(0, 10) : "",
            reference_no: addDetails.reference_no || "",
            boe_no: addDetails.boe_no || "",
            manifest_filing: addDetails.manifest_filing || "",
            cfs_filing: addDetails.cfs_filing || "",
            branch_code: addDetails.branch_code !== undefined ? addDetails.branch_code : (jobNoParam ? "" : "Mumbai"),
            execution_branch: addDetails.execution_branch !== undefined ? addDetails.execution_branch : (jobNoParam ? "" : "Mumbai"),
            gst_state_from: addDetails.gst_state_from !== undefined ? addDetails.gst_state_from : (jobNoParam ? "" : "Maharashtra"),

            carrier: addDetails.carrier || "",
            line: addDetails.line || "",
            notify: addDetails.notify || "",
            transporter: addDetails.transporter || "",
            cha_name: addDetails.cha_name || "",
            do_date: addDetails.do_date ? addDetails.do_date.slice(0, 10) : "",
            delivery_date: addDetails.delivery_date ? addDetails.delivery_date.slice(0, 10) : "",

            no_of_packages: addDetails.no_of_packages || "",
            package_type: addDetails.package_type || "Carton",
            no_of_pallets: addDetails.no_of_pallets || "",
            volume: addDetails.volume || "",

            inv_container_type: addDetails.inv_container_type || "",
            inv_no_of_units: addDetails.inv_no_of_units || "",
            inv_csize: addDetails.inv_csize || "",
            containers: addDetails.containers || [],
            description: addDetails.description || b.marks_and_numbers || "",
            remarks: addDetails.remarks || "",

            buy_rates: addDetails.buy_rates || [],
            sell_rates: addDetails.sell_rates || [],
            vehicles: addDetails.vehicles || [],
            hbls: b.hbls || [],
          });
        }
      }
      initialDataLoaded.current = true;
    } catch (error) {
      console.error("Error loading Form data:", error);
      toast.error("Failed to load MasterBL form details");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEditPermission = async () => {
    if (!requestReason.trim()) {
      toast.warning("Please enter a reason for requesting edit permission.");
      return;
    }
    setSubmittingRequest(true);
    try {
      const res = await api.post("/masterbl/edit-requests/create", {
        job_no: form.job_no || jobNo,
        mbl_no: form.mbl_no,
        hbl_no: form.hbl_no,
        reason: requestReason
      });
      if (res.data.success) {
        toast.success("Edit request submitted successfully to Directors/Admins.");
        setShowRequestModal(false);
        setRequestReason("");
      } else {
        toast.error(res.data.message || "Failed to submit request.");
      }
    } catch (err) {
      console.error("Error submitting edit request:", err);
      toast.error(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (valErrors[name]) {
      setValErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleMBLNoBlur = async () => {
    if (jobNoParam) return; // Do not auto-fill booking details in Edit mode
    const mblNo = form.mbl_no?.trim();
    if (!mblNo) return;

    try {
      const res = await api.get(`/masterbl/lookup-mbl/${encodeURIComponent(mblNo)}`);
      if (res.data.success && res.data.booking) {
        const booking = res.data.booking;
        toast.info("Found matching booking update. Autofilling details...");
        
        if (booking.job_no) {
          setJobNo(booking.job_no);
        }

        setForm(prev => ({
          ...prev,
          hbl_no: booking.hbl || prev.hbl_no,
          date_of_nomination: booking.date_of_nomination ? booking.date_of_nomination.slice(0, 10) : prev.date_of_nomination,
          pol: booking.pol || prev.pol,
          pod: booking.pod || prev.pod,
          container_size: booking.container_size || prev.container_size,
          eta: booking.eta ? booking.eta.slice(0, 10) : prev.eta,
          etd: booking.etd ? booking.etd.slice(0, 10) : prev.etd,
          remarks: booking.remarks || prev.remarks,
          cfs: booking.cfs || prev.cfs,
          shipping_line_name: booking.shipping_line || prev.shipping_line_name,
        }));
      }
    } catch (error) {
      console.error("Error looking up MBL number:", error);
    }
  };

  const getInputClass = (fieldName) => {
    const isError = valErrors[fieldName];
    const base = "w-full px-2 py-1 bg-white dark:bg-slate-900 rounded text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none transition-all";
    if (isError) {
      return `${base} border-2 border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500`;
    }
    return `${base} border border-slate-300 dark:border-slate-700/80 focus:ring-1 focus:ring-slate-400 focus:border-slate-400`;
  };

  const handleSave = async () => {
    const errors = {};
    const messages = [];
    if (!form.services || form.services === "" || form.services === "Select Service") {
      errors.services = true;
      messages.push("Services is required");
    }
    if (!form.shipment_type || form.shipment_type.trim() === "" || form.shipment_type === "Select Shipment Type") {
      errors.shipment_type = true;
      messages.push("Shipment Type is required");
    }
    if (!form.mbl_no || form.mbl_no.trim() === "") {
      errors.mbl_no = true;
      messages.push("MBL No. is required");
    }
    if (!form.mbl_date || form.mbl_date === "") {
      errors.mbl_date = true;
      messages.push("MBL Date is required");
    }
    if (!form.inco_terms || form.inco_terms === "" || form.inco_terms === "Select Inco Term") {
      errors.inco_terms = true;
      messages.push("INCO Terms is required");
    }
    if (!form.client || form.client === "") {
      errors.client = true;
      messages.push("Client is required");
    }
    if (!form.sales || form.sales === "" || form.sales === "Select Sales") {
      errors.sales = true;
      messages.push("Sales is required");
    }
    if (!form.bl_type || form.bl_type === "" || form.bl_type === "Select BL Type") {
      errors.bl_type = true;
      messages.push("BL Type is required");
    }

    const buyRatesErrors = [];
    const buyRatesRowErrors = [];
    (form.buy_rates || []).forEach((row, idx) => {
      const rowNum = idx + 1;
      const missing = [];
      const rowErr = {};
      if (!row.drcr || row.drcr.trim() === "") { missing.push("DRCR"); rowErr.drcr = true; }
      if (!row.party || String(row.party).trim() === "") { missing.push("Vendor"); rowErr.party = true; }
      if (!row.address || String(row.address).trim() === "") { missing.push("Address"); rowErr.address = true; }
      if (!row.charge || String(row.charge).trim() === "") { missing.push("Charge"); rowErr.charge = true; }
      if (!row.hsn_sac || String(row.hsn_sac).trim() === "") { missing.push("HSN/SAC"); rowErr.hsn_sac = true; }
      if (!row.gst || String(row.gst).trim() === "") { missing.push("GST"); rowErr.gst = true; }
      if (!row.unit || String(row.unit).trim() === "" || row.unit === "--- None ---") { missing.push("Unit"); rowErr.unit = true; }
      if (!row.quantity || String(row.quantity).trim() === "" || parseFloat(row.quantity) === 0) { missing.push("Qty"); rowErr.quantity = true; }
      if (!row.rate || String(row.rate).trim() === "" || parseFloat(row.rate) === 0) { missing.push("Rate"); rowErr.rate = true; }
      if (!row.currency || String(row.currency).trim() === "") { missing.push("Cur."); rowErr.currency = true; }
      if (!row.ex_rate || String(row.ex_rate).trim() === "" || parseFloat(row.ex_rate) === 0) { missing.push("Ex Rate"); rowErr.ex_rate = true; }

      if (missing.length > 0) {
        buyRatesErrors.push(`Buy Rate - Row ${rowNum}: ${missing.join(", ")} are required.`);
        buyRatesRowErrors[idx] = rowErr;
      }
    });

    const sellRatesErrors = [];
    const sellRatesRowErrors = [];
    (form.sell_rates || []).forEach((row, idx) => {
      const rowNum = idx + 1;
      const missing = [];
      const rowErr = {};
      if (!row.drcr || row.drcr.trim() === "") { missing.push("DRCR"); rowErr.drcr = true; }
      if (!row.party || String(row.party).trim() === "") { missing.push("Client"); rowErr.party = true; }
      if (!row.address || String(row.address).trim() === "") { missing.push("Address"); rowErr.address = true; }
      if (!row.charge || String(row.charge).trim() === "") { missing.push("Charge"); rowErr.charge = true; }
      if (!row.hsn_sac || String(row.hsn_sac).trim() === "") { missing.push("HSN/SAC"); rowErr.hsn_sac = true; }
      if (!row.gst || String(row.gst).trim() === "") { missing.push("GST"); rowErr.gst = true; }
      if (!row.unit || String(row.unit).trim() === "" || row.unit === "--- None ---") { missing.push("Unit"); rowErr.unit = true; }
      if (!row.quantity || String(row.quantity).trim() === "" || parseFloat(row.quantity) === 0) { missing.push("Qty"); rowErr.quantity = true; }
      if (!row.rate || String(row.rate).trim() === "" || parseFloat(row.rate) === 0) { missing.push("Rate"); rowErr.rate = true; }
      if (!row.currency || String(row.currency).trim() === "") { missing.push("Cur."); rowErr.currency = true; }
      if (!row.ex_rate || String(row.ex_rate).trim() === "" || parseFloat(row.ex_rate) === 0) { missing.push("Ex Rate"); rowErr.ex_rate = true; }

      if (missing.length > 0) {
        sellRatesErrors.push(`Sell Rate - Row ${rowNum}: ${missing.join(", ")} are required.`);
        sellRatesRowErrors[idx] = rowErr;
      }
    });

    if (buyRatesErrors.length > 0 || sellRatesErrors.length > 0 || messages.length > 0) {
      errors.buy_rates = buyRatesRowErrors;
      errors.sell_rates = sellRatesRowErrors;
      setValErrors(errors);
      setValidationModalErrors([...messages, ...buyRatesErrors, ...sellRatesErrors]);
      toast.error("Please fill all mandatory fields.");
      return;
    }

    setValErrors({});
    setValidationModalErrors(null);

    try {
      const firstSellRate = form.sell_rates?.find(r => r.amount && parseFloat(r.amount) > 0);
      const calculatedFreightAmount = form.sell_rates?.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0) || 0;
      const freightCurrency = firstSellRate?.currency || "USD";

      let finalStatus = form.status;
      if (calculatedFreightAmount > 0 && finalStatus === "Draft") {
        finalStatus = "Sell Rate Updated";
      }

      const additionalDetailsObj = {
        client: form.client,
        enquiry_no: form.enquiry_no,
        mbl_date: form.mbl_date,
        services: form.services,
        shipment_type: form.shipment_type,
        inco_terms: form.inco_terms,
        sales: form.sales,
        cs: form.cs,
        freight_status: form.freight_status,
        bl_type: form.bl_type,
        voyage: form.voyage,
        por: form.por,
        cfs: form.cfs,
        item_no: form.item_no,
        sub_no: form.sub_no,
        igm_no: form.igm_no,
        igm_date: form.igm_date,
        reference_no: form.reference_no,
        boe_no: form.boe_no,
        manifest_filing: form.manifest_filing,
        cfs_filing: form.cfs_filing,
        branch_code: form.branch_code,
        execution_branch: form.execution_branch,
        gst_state_from: form.gst_state_from,

        carrier: form.carrier,
        line: form.line,
        notify: form.notify,
        transporter: form.transporter,
        cha_name: form.cha_name,
        hbl_notify: form.hbl_notify,
        hbl_carrier: form.hbl_carrier,
        hbl_transporter: form.hbl_transporter,
        hbl_cha_name: form.hbl_cha_name,
        do_date: form.do_date,
        delivery_date: form.delivery_date,

        no_of_packages: form.no_of_packages,
        package_type: form.package_type,
        no_of_pallets: form.no_of_pallets || form.no_of_palette,
        volume: form.volume,

        inv_container_type: form.inv_container_type || form.container_size,
        inv_no_of_units: form.inv_no_of_units || form.container_count,
        inv_csize: form.inv_csize || form.container_size,
        containers: form.containers,

        description: form.description,
        remarks: form.remarks,

        buy_rates: form.buy_rates,
        sell_rates: form.sell_rates,
        vehicles: form.vehicles,
      };

      const payload = {
        ...form,
        job_no: jobNo,
        no_of_palette: form.no_of_pallets || form.no_of_palette,
        status: finalStatus,
        freight_amount: calculatedFreightAmount,
        freight_currency: freightCurrency,
        additional_details: JSON.stringify(additionalDetailsObj),
      };

      if (jobNoParam) {
        await api.put(`/masterbl/update/${jobNoParam}`, payload);
        toast.success("SI MasterBL job updated successfully");
      } else {
        await api.post("/masterbl/insert", payload);
        toast.success("SI MasterBL job created successfully");
      }
      navigate("/si-masterbl");
    } catch (error) {
      console.error("Save error:", error);
      const errMsg = error.response?.data?.message || error.message || "Failed to save MasterBL";
      setSaveError(errMsg);
      toast.error(errMsg);
    }
  };

  const tabs = ["Main", "Party", "Packages", "Container", "BuyRates", "SellRates"];

  const labelStyle = "block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1 select-none";
  const inputStyle = "w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all";

  if (loading) {
    return (
      <DashboardLayout title="MasterBL Form">
        <div className="flex justify-center h-96 items-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  const isRatesLocked = (form.status === "Invoice Generated" || form.status === "Invoice Finalized");

  return (
    <DashboardLayout title={jobNoParam ? "Edit SI MasterBL" : "New SI MasterBL"}>
      {/* Title Header */}
      <div className="flex items-center justify-between pb-2 mb-4 border-b border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Edit2 size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold select-none flex items-center">
            <span>{jobNoParam ? "Edit Sea Master BL Job" : "New Sea Master BL Job"}</span>
            <span className="ml-3 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold border border-indigo-150/40 font-mono">Job #{jobNo}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/si-masterbl')}
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
                className={`px-4 py-1.5 text-xs font-semibold tracking-wide transition-all rounded-t border-t border-l border-r ${isActive
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
                  <label className={labelStyle}>MBL No. <span className="text-red-500 font-bold">*</span></label>
                  <input type="text" name="mbl_no" value={form.mbl_no} onChange={handleInputChange} onBlur={handleMBLNoBlur} placeholder="Enter MBL No" className={getInputClass('mbl_no') + " font-mono font-semibold"} />
                </div>
                <div>
                  <label className={labelStyle}>MBL Date <span className="text-red-500 font-bold">*</span></label>
                  <input type="date" name="mbl_date" value={form.mbl_date} onChange={handleInputChange} className={getInputClass('mbl_date')} />
                </div>
                <div>
                  <label className={labelStyle}>HBL No.</label>
                  <input type="text" name="hbl_no" value={form.hbl_no} onChange={handleInputChange} placeholder="Enter HBL No" className={inputStyle + " font-mono font-semibold"} />
                </div>
                <div>
                  <label className={labelStyle}>HBL Date</label>
                  <input type="date" name="hbl_date" value={form.hbl_date} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Job Date</label>
                  <input type="date" name="date_of_nomination" value={form.date_of_nomination} onChange={handleInputChange} className={inputStyle} />
                </div>

                <div>
                  <label className={labelStyle}>Services <span className="text-red-500 font-bold">*</span></label>
                  <select name="services" value={form.services} onChange={handleInputChange} className={getInputClass('services')}>
                    <option value="">Select Service</option>
                    {SERVICES_LIST.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Shipment Type <span className="text-red-500 font-bold">*</span></label>
                  <select name="shipment_type" value={form.shipment_type} onChange={handleInputChange} className={getInputClass('shipment_type')}>
                    <option value="">Select Shipment Type</option>
                    <option value="FCL">FCL</option>
                    <option value="LCL">LCL</option>
                    <option value="CHA">CHA</option>
                    <option value="Bulk">Bulk</option>
                    <option value="Air">Air</option>
                    <option value="WH Operation">WH Operation</option>
                    <option value="Transportation">Transportation</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>INCO Terms <span className="text-red-500 font-bold">*</span></label>
                  <select name="inco_terms" value={form.inco_terms} onChange={handleInputChange} className={getInputClass('inco_terms')}>
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
                    inputClassName={getInputClass('client')}
                    required={true}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Sales <span className="text-red-500 font-bold">*</span></label>
                  <select name="sales" value={form.sales} onChange={handleInputChange} className={getInputClass('sales')}>
                    <option value="">Select Sales Person</option>
                    {employees.map(emp => (
                      <option key={emp.user_id} value={emp.user_name}>
                        {emp.user_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>CS</label>
                  <select name="cs" value={form.cs} onChange={handleInputChange} className={inputStyle}>
                    <option value="">Select CS Person</option>
                    {employees.map(emp => (
                      <option key={emp.user_id} value={emp.user_name}>
                        {emp.user_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Payment Terms</label>
                  <select name="freight_status" value={form.freight_status} onChange={handleInputChange} className={inputStyle}>
                    <option value="">Select Payment Terms</option>
                    {FREIGHT_STATUS_LIST.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>BL Type <span className="text-red-500 font-bold">*</span></label>
                  <select name="bl_type" value={form.bl_type} onChange={handleInputChange} className={getInputClass('bl_type')}>
                    <option value="">Select BL Type</option>
                    {BL_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelStyle}>Vessel / Voyage</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      name="shipping_line_name" 
                      value={form.shipping_line_name} 
                      onChange={handleInputChange} 
                      placeholder="Vessel Name" 
                      className={`${inputStyle} flex-1 min-w-0`} 
                    />
                    <span className="text-slate-400 font-bold dark:text-slate-500">/</span>
                    <input 
                      type="text" 
                      name="voyage" 
                      value={form.voyage} 
                      onChange={handleInputChange} 
                      placeholder="Voyage No" 
                      className={`${inputStyle} flex-1 min-w-0`} 
                    />
                  </div>
                </div>
                <div>
                  <PortSelect
                    label="P.O.R."
                    name="por"
                    value={form.por}
                    onChange={handleInputChange}
                    placeholder="Search Place of Receipt..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>
                <div>

                  <PortSelect
                    label="P.O.L. Port"
                    name="pol"
                    value={form.pol}
                    onChange={handleInputChange}
                    placeholder="Search Port of Loading..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>
                <div>

                  <PortSelect
                    label="P.O.D. Port"
                    name="pod"
                    value={form.pod}
                    onChange={handleInputChange}
                    placeholder="Search Port of Discharge..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>
                <div>

                  <PortSelect
                    label="F.P.D Port"
                    name="final_pod"
                    value={form.final_pod}
                    onChange={handleInputChange}
                    placeholder="Search Final Destination..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="C.F.S."
                    name="cfs"
                    value={form.cfs}
                    onChange={handleInputChange}
                    options={cfsOptions}
                    placeholder="Search CFS..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
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
            <div className="space-y-8">
              {/* MBL Details Section */}
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">MBL Details</h3>
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
                </div>
              </div>

              {/* HBL Details Section */}
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">HBL Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <PartySelect
                      label="HBL Shipper Party"
                      name="hbl_shipper"
                      value={form.hbl_shipper}
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
                      label="HBL Consignee Party"
                      name="hbl_consignee"
                      value={form.hbl_consignee}
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
                      label="HBL Overseas Agent"
                      name="hbl_agent"
                      value={form.hbl_agent}
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
                      label="HBL Notify Party"
                      name="hbl_notify"
                      value={form.hbl_notify}
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
                      label="HBL Shipping Line / Carrier"
                      name="hbl_carrier"
                      value={form.hbl_carrier}
                      onChange={handleInputChange}
                      customers={customers}
                      isHybrid={false}
                      placeholder="Search Carrier..."
                      labelClassName={labelStyle}
                      inputClassName={inputStyle}
                    />
                  </div>
                  <div>
                    <PartySelect
                      label="HBL Transporter Name"
                      name="hbl_transporter"
                      value={form.hbl_transporter}
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
                      label="HBL CHA Name"
                      name="hbl_cha_name"
                      value={form.hbl_cha_name}
                      onChange={handleInputChange}
                      customers={customers}
                      isHybrid={false}
                      placeholder="Search CHA..."
                      labelClassName={labelStyle}
                      inputClassName={inputStyle}
                    />
                  </div>
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
                  <SearchableSelect
                    label="Package Type"
                    name="package_type"
                    value={form.package_type}
                    onChange={handleInputChange}
                    options={packageTypes}
                    placeholder="Search package type..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
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

              {/* Cargo Description, Marks & Remarks */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Cargo Description, Marks & Remarks</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelStyle}>Marks Nos</label>
                    <textarea
                      name="marks_and_numbers"
                      value={form.marks_and_numbers}
                      onChange={handleInputChange}
                      rows={6}
                      placeholder="Marks & Numbers"
                      className={inputStyle + " resize-none font-mono text-xs leading-relaxed p-2.5"}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Description</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleInputChange}
                      rows={6}
                      placeholder="Description"
                      className={inputStyle + " resize-none font-mono text-xs leading-relaxed p-2.5"}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Remarks</label>
                    <textarea
                      name="remarks"
                      value={form.remarks}
                      onChange={handleInputChange}
                      rows={6}
                      placeholder="Remarks"
                      className={inputStyle + " resize-none font-mono text-xs leading-relaxed p-2.5"}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Container */}
          {activeTab === "Container" && (
            <div className="space-y-8">
              {/* Inventory details */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Inventory Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelStyle}>Container Size Type (CSize)</label>
                    <select name="container_size" value={form.container_size} onChange={handleInputChange} className={inputStyle}>
                      <option value="">Select Size Type</option>
                      {CONTAINER_SIZES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>No Of Units (Count)</label>
                    <input type="number" name="container_count" value={form.container_count} onChange={handleInputChange} placeholder="Number of Units" className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Inventory Cargo Type</label>
                    <select name="cargo_type" value={form.cargo_type} onChange={handleInputChange} className={inputStyle}>
                      <option value="">Select Cargo Type</option>
                      {CARGO_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
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

          {/* TAB 6: BUYRATES */}
          {activeTab === "BuyRates" && (
            <div className="space-y-6">
              {isRatesLocked && (
                <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
                  hasActiveApproval 
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 animate-in slide-in-from-top-2 duration-300" 
                    : "bg-amber-50/50 dark:bg-amber-950/10 border-amber-250/60 dark:border-amber-900 text-amber-800 dark:text-amber-400 animate-in slide-in-from-top-2 duration-300"
                }`}>
                  <div className="text-xs leading-normal">
                    <span className="font-bold flex items-center gap-1.5">
                      🔒 Rate Edit Lock Status:
                    </span>{" "}
                    {hasActiveApproval 
                      ? "Permission approved. You can edit Buy/Sell rates and regenerate invoices/documents." 
                      : "Tax invoice has been generated. Rate tables are locked. Request permission to unlock."}
                  </div>
                  {!hasActiveApproval && (
                    <button
                      type="button"
                      onClick={() => setShowRequestModal(true)}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all transform hover:-translate-y-0.5"
                    >
                      Request Edit Permission
                    </button>
                  )}
                </div>
              )}
              <RateGrid
                rows={form.buy_rates}
                customers={customers}
                isBuy={true}
                chargeOptions={chargeOptions}
                errors={valErrors.buy_rates || []}
                onChange={(updated) => setForm(prev => ({ ...prev, buy_rates: updated }))}
                onAddRow={(newRow) => setForm(prev => ({ ...prev, buy_rates: [...prev.buy_rates, newRow] }))}
                onDeleteRow={(idx) => setForm(prev => ({
                  ...prev,
                  buy_rates: prev.buy_rates.filter((_, i) => i !== idx)
                }))}
                isLocked={isRatesLocked}
                isEditApproved={hasActiveApproval}
              />
            </div>
          )}

          {/* TAB 7: SELLRATES */}
          {activeTab === "SellRates" && (
            <div className="space-y-6">
              {isRatesLocked && (
                <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
                  hasActiveApproval 
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 animate-in slide-in-from-top-2 duration-300" 
                    : "bg-amber-50/50 dark:bg-amber-950/10 border-amber-250/60 dark:border-amber-900 text-amber-800 dark:text-amber-400 animate-in slide-in-from-top-2 duration-300"
                }`}>
                  <div className="text-xs leading-normal">
                    <span className="font-bold flex items-center gap-1.5">
                      🔒 Rate Edit Lock Status:
                    </span>{" "}
                    {hasActiveApproval 
                      ? "Permission approved. You can edit Buy/Sell rates and regenerate invoices/documents." 
                      : "Tax invoice has been generated. Rate tables are locked. Request permission to unlock."}
                  </div>
                  {!hasActiveApproval && (
                    <button
                      type="button"
                      onClick={() => setShowRequestModal(true)}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all transform hover:-translate-y-0.5"
                    >
                      Request Edit Permission
                    </button>
                  )}
                </div>
              )}
              <RateGrid
                rows={form.sell_rates}
                customers={customers}
                isBuy={false}
                consignee={form.consignee}
                chargeOptions={chargeOptions}
                errors={valErrors.sell_rates || []}
                onChange={(updated) => setForm(prev => ({ ...prev, sell_rates: updated }))}
                onAddRow={(newRow) => setForm(prev => ({ ...prev, sell_rates: [...prev.sell_rates, newRow] }))}
                onDeleteRow={(idx) => setForm(prev => ({
                  ...prev,
                  sell_rates: prev.sell_rates.filter((_, i) => i !== idx)
                }))}
                isLocked={isRatesLocked}
                isEditApproved={hasActiveApproval}
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
              onClick={() => navigate('/si-masterbl')}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
            >
              <Save size={16} /> Save MasterBL Job
            </button>
          </div>

          {/* Save Error Overlay */}
          {saveError && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-red-100 dark:border-red-950/30 transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
                  <span className="p-2 bg-red-50 dark:bg-red-950/30 rounded-xl">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </span>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Unable to Save MasterBL Job</h3>
                </div>
                <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-950/20 rounded-xl p-4 mb-6">
                  <p className="text-sm font-mono text-red-700 dark:text-red-400 leading-relaxed whitespace-pre-wrap">
                    {saveError}
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSaveError(null)}
                    className="px-5 py-2 bg-slate-850 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Validation Error Overlay */}
          {validationModalErrors && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-red-100 dark:border-red-950/30 transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
                  <span className="p-2 bg-red-50 dark:bg-red-950/30 rounded-xl">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </span>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Validation Errors</h3>
                </div>
                <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-950/20 rounded-xl p-4 mb-6">
                  <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-400 space-y-1">
                    {validationModalErrors.map((msg, index) => (
                      <li key={index}>{msg}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setValidationModalErrors(null)}
                    className="px-5 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Request Edit Permission Modal */}
          {showRequestModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 text-slate-850 dark:text-white mb-4">
                  <span className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-650">
                    🔒
                  </span>
                  <h3 className="text-md font-bold">Request Edit Permission</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                      Reason for Edit Request
                    </label>
                    <textarea
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="Please specify why you need to edit these charges (e.g. rate correction, vendor update)..."
                      className="w-full h-24 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all resize-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestModal(false);
                      setRequestReason("");
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingRequest}
                    onClick={handleRequestEditPermission}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                  >
                    {submittingRequest ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
