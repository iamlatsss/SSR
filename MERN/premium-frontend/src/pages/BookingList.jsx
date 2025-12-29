import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import {
  Search, Filter, Plus, Edit2, Eye, Truck, CheckCircle, FileText, XCircle, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "react-toastify";

export default function BookingPage() {
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [jobNo, setJobNo] = useState(""); // Used for displaying next job no in "New Booking" button
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchJobNo, setSearchJobNo] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default to 10 items

  // Load jobs from API
  useEffect(() => {
    loadJobs();
  }, []);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      // Fetch All Jobs
      const res = await api.get("/booking/get");
      if (res.data.success) {
        setJobs(res.data.bookings || []);
      }

      // Fetch Next Job No for button display
      const resInit = await api.get("/booking/init");
      if (resInit.data.success) {
        setJobNo(resInit.data.nextJobNo);
      }

    } catch (error) {
      console.error("Error loading jobs:", error);
      toast.error("Failed to load bookings");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditJob = (jobNo) => {
    navigate(`/booking-form?jobNo=${jobNo}`);
  };

  const handleCreateJob = () => {
    navigate('/booking-form');
  };

  // Change status inline and persist
  const handleStatusChange = async (jobNo, newStatus) => {
    // Optimistic update
    const previousJobs = [...jobs];
    const updatedJobs = jobs.map((job) =>
      (job.job_no || job.jobNo) == jobNo ? { ...job, status: newStatus } : job
    );
    setJobs(updatedJobs);

    try {
      await api.put(`/booking/update/${jobNo}`, { status: newStatus });
      toast.success(`Job #${jobNo} status updated`);
    } catch (error) {
      console.error("Status update failed:", error);
      toast.error("Failed to update status");
      setJobs(previousJobs); // Revert
    }
  };

  const handleViewJob = (job) => {
    setSelectedJob(job);
    setShowViewModal(true);
  };

  const handleView = () => {
    if (!searchJobNo) return;

    // Local search first
    const found = jobs.find(j => j.jobNo == searchJobNo || j.job_no == searchJobNo);
    if (found) {
      handleViewJob(found);
      setSearchJobNo("");
    } else {
      // If not in current list (maybe pagination later?), try fetch
      // For now just toast
      toast.warning(`Job #${searchJobNo} not found in list`);
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedJob(null);
  };

  const filteredJobs = jobs.filter((job) => {
    // Handle snake_case vs camelCase if API returns snake_case
    // The view_file output of API shows snake_case in select, but helpers might map it? 
    // Wait, BookingList code used camelCase (job.jobNo). 
    // The API `router.get("/get")` returns `job_no`. 
    // We should probably normalize or handle likely mismatch.
    // Let's assume for now we use what API sends.
    // Prioritize name (string), fallback to ID (number) but convert to string safety
    const jNo = job.jobNo || job.job_no || "";
    const sName = (job.shipper_name || job.shipper || "").toString();
    const cName = (job.consignee_name || job.consignee || "").toString();

    const matchesSearch =
      (sName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      jNo.toString().includes(searchTerm);
    const matchesStatus =
      filterStatus === "all" || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  /* ================= STATUS COLORS ================= */
  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20";
      case "in-transit":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "completed":
        return "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20";
      case "cancelled":
        return "text-red-600 bg-red-50 dark:bg-red-900/20";
      default:
        return "text-slate-600 bg-slate-50 dark:bg-slate-800/50";
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Bookings">
        <div className="flex justify-center h-96 items-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Bookings">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">{jobs.length}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Jobs</div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {jobs.filter((j) => j.status === "confirmed").length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Confirmed</div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
            <Truck size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {jobs.filter((j) => ["in-transit", "completed"].includes(j.status)).length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">In Progress</div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {jobs.filter((j) => j.status === "draft").length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Drafts</div>
          </div>
        </div>
      </div>

      {/* Filters & Quick Search */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-poppins text-sm"
            />
          </div>
          <div className="relative w-full md:w-48">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={18} className="text-slate-400" />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-poppins text-sm appearance-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="in-transit">In Transit</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Job No"
              value={searchJobNo}
              onChange={(e) => setSearchJobNo(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-dark-card text-sm w-28"
            />
            <button
              onClick={handleView}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
            >
              View
            </button>
          </div>
        </div>
        <button
          onClick={handleCreateJob}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm hover:shadow-md whitespace-nowrap"
        >
          <Plus size={18} /> New Booking (#{jobNo})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                <th className="p-4">Job No</th>
                <th className="p-4">Date</th>
                <th className="p-4">Shipper</th>
                <th className="p-4">Route</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {currentJobs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    {searchTerm ? "No jobs match your search." : "No jobs found."}
                  </td>
                </tr>
              ) : (
                currentJobs.map((job) => (
                  <tr key={job.job_no || job.jobNo} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">#{job.job_no || job.jobNo}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">{job.date_of_nomination?.split('T')[0] || job.dateOfNomination}</td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">{job.shipper_name || job.shipper || "—"}</div>
                      <div className="text-xs text-slate-500">{job.container_count || job.containerCount} × {job.container_size || job.containerSize}</div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                      {job.pol} → {job.pod}
                    </td>
                    <td className="p-4">
                      <select
                        value={job.status || "draft"}
                        onChange={(e) => handleStatusChange(job.job_no || job.jobNo, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer ${getStatusColor(job.status || 'draft')}`}
                      >
                        <option value="draft">Draft</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in-transit">In Transit</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleViewJob(job)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEditJob(job.job_no || job.jobNo)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
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
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex gap-1">
                {(() => {
                  const pages = [];
                  let startPage = Math.max(1, currentPage - 2);
                  let endPage = Math.min(totalPages, startPage + 4); // Show up to 5 pages

                  // Adjust startPage if endPage is too close to totalPages
                  if (endPage - startPage + 1 < Math.min(5, totalPages)) {
                    startPage = Math.max(1, endPage - Math.min(5, totalPages) + 1);
                  }

                  for (let p = startPage; p <= endPage; p++) {
                    pages.push(p);
                  }
                  return pages.map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                        ? "bg-indigo-600 text-white"
                        : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      {pageNum}
                    </button>
                  ));
                })()}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={handleCloseViewModal}>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-4xl w-full p-6 animate-in fade-in zoom-in duration-200 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  Job <span className="font-mono text-indigo-600 dark:text-indigo-400">#{selectedJob.job_no || selectedJob.jobNo}</span>
                  <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(selectedJob.status).replace('text-', 'text-opacity-100 text-').split(' ')[1] === 'bg-slate-50' ? 'bg-slate-200 text-slate-700' : getStatusColor(selectedJob.status)}`}>
                    {selectedJob.status.toUpperCase()}
                  </span>
                </h3>
                <div className="text-slate-500 text-sm mt-1">
                  Nominated on {selectedJob.date_of_nomination?.split('T')[0] || selectedJob.dateOfNomination || '-'}
                </div>
              </div>
              <button onClick={handleCloseViewModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
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
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.shipper_name || selectedJob.shipper || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Consignee:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.consignee_name || selectedJob.consignee || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Agent:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.agent_name || selectedJob.agent || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">CHA:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.cha_name || selectedJob.cha || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">CFS:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.cfs_name || selectedJob.cfs || "—"}</span>
                  </div>
                </div>
              </div>

              {/* SECTION: SHIPMENT */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Shipment Details</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Route:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      {selectedJob.pol} <span className="text-slate-400">→</span> {selectedJob.pod}
                      {selectedJob.final_pod && <><span className="text-slate-400"> → </span> {selectedJob.final_pod}</>}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">HBL No:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.hbl_no || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">MBL No:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.mbl_no || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Vessel:</span>
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

              {/* SECTION: CARGO */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Cargo Information</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Type / Size:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      {selectedJob.cargo_type || "—"} ({selectedJob.container_count} x {selectedJob.container_size})
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Container No:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.container_number || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Weight (G/N):</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      {selectedJob.gross_weight || "-"} / {selectedJob.net_weight || "-"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Packages:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.no_of_palette || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Marks & Nos:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200 truncate" title={selectedJob.marks_and_numbers}>{selectedJob.marks_and_numbers || "—"}</span>
                  </div>
                </div>
              </div>

              {/* SECTION: OTHER / DOCS */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Status & Docs</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">IGM Info:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      No: {selectedJob.igm_no || "-"} (Date: {selectedJob.igm_on ? selectedJob.igm_on.split('T')[0] : "-"})
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Invoice:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{selectedJob.shipper_invoice_no || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Telex Status:</span>
                    <div className="col-span-2 flex gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${selectedJob.hbl_telex_received ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>HBL: {selectedJob.hbl_telex_received ? "Yes" : "No"}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${selectedJob.mbl_telex_received ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>MBL: {selectedJob.mbl_telex_received ? "Yes" : "No"}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Freight:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      {selectedJob.freight_amount ? `${selectedJob.freight_amount} ${selectedJob.freight_currency || ''}` : "—"}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  handleCloseViewModal();
                  handleEditJob(selectedJob.job_no || selectedJob.jobNo);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors font-medium text-sm"
              >
                <Edit2 size={16} /> Edit Job
              </button>
              <button
                onClick={handleCloseViewModal}
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
};


