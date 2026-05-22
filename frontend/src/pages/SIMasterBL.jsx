import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import {
  Search, Filter, Plus, Edit2, Eye, CheckCircle, FileText, ChevronLeft, ChevronRight, Save, Anchor, XCircle
} from "lucide-react";
import { toast } from "react-toastify";
import PortSelect from "../components/PortSelect";
import PartySelect from "../components/PartySelect";
import { RateGrid, ContainerGrid, VehicleGrid } from "../components/LogisticsGrids";

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

const RequiredStar = () => (
  <span className="text-red-500 font-bold mr-0.5 select-none">*</span>
);


/* =========================================================================
   1. LIST VIEW COMPONENT (SIMasterBLList)
   ========================================================================= */
export function SIMasterBLList() {
  const navigate = useNavigate();
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
    navigate('/si-masterbl-form');
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

    return matchesSearch && matchesStatus;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

  const getStatusColor = (status) => {
    switch (status) {
      case "Draft":
        return "text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
      case "Sell Rate Updated":
        return "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30";
      case "Invoice Generated":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30";
      case "Ready to Close":
        return "text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/30";
      case "Closed":
        return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30";
      default:
        return "text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="SI MasterBL">
        <div className="flex justify-center h-96 items-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="SI MasterBL (MBL)">
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
          onClick={handleCreateJob}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm hover:shadow-md ml-auto whitespace-nowrap"
        >
          <Plus size={18} /> New MBL Job (#{nextJobNo})
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                <th className="p-4">Job No</th>
                <th className="p-4">MBL Number</th>
                <th className="p-4">Nomination Date</th>
                <th className="p-4">Shipper</th>
                <th className="p-4">Route</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {currentJobs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    {searchTerm ? "No MBL jobs match your search." : "No MBL jobs found."}
                  </td>
                </tr>
              ) : (
                currentJobs.map((job) => (
                  <tr key={job.job_no} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">#{job.job_no}</td>
                    <td className="p-4 font-medium text-slate-800 dark:text-slate-200 text-sm">{job.mbl_no}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                      {job.date_of_nomination ? job.date_of_nomination.split('T')[0] : "—"}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">{job.shipper_name || "—"}</div>
                      <div className="text-xs text-slate-500">{job.container_count} × {job.container_size}</div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                      {job.pol ? job.pol.split(',')[0] : "—"} → {job.pod ? job.pod.split(',')[0] : "—"}
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
                        onClick={() => handleEditJob(job.job_no)}
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
   2. FORM VIEW COMPONENT (SIMasterBLForm) - Multi-tab Redesign
   ========================================================================= */
export function SIMasterBLForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobNoParam = searchParams.get("jobNo");

  const [jobNo, setJobNo] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Main");

  // Form State containing both main columns and additional JSON fields
  const [form, setForm] = useState({
    // Standard MBL columns
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

    // Main Tab extra fields
    enquiry_no: "",
    mbl_date: "",
    services: "",
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

    // Party Tab extra fields
    carrier: "",
    line: "",
    notify: "",
    transporter: "",
    cha_name: "",
    do_date: "",
    delivery_date: "",

    // Packages Tab extra fields
    no_of_packages: "",
    package_type: "Carton",
    no_of_pallets: "",
    volume: "",

    // Inventory + Container Tab extra fields
    inv_container_type: "",
    inv_no_of_units: "",
    inv_csize: "",
    containers: [],

    // Description Tab
    description: "",

    // Rates & Vehicles arrays
    buy_rates: [],
    sell_rates: [],
    vehicles: [],
  });

  useEffect(() => {
    initForm();
  }, [jobNoParam]);

  const initForm = async () => {
    try {
      setLoading(true);
      const initRes = await api.get("/masterbl/init");
      if (initRes.data.success) {
        setCustomers(initRes.data.customers || []);
        if (!jobNoParam) {
          setJobNo(initRes.data.nextJobNo);
        }
      }

      if (jobNoParam) {
        setJobNo(jobNoParam);
        const res = await api.get(`/masterbl/get/${jobNoParam}`);
        if (res.data.success) {
          const b = res.data.job;

          // Parse manual parties
          let manualDetails = {};
          if (b.manual_party_details) {
            try {
              manualDetails = typeof b.manual_party_details === 'string'
                ? JSON.parse(b.manual_party_details)
                : b.manual_party_details;
            } catch (e) { }
          }

          // Parse additional details
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

          setForm({
            mbl_no: b.mbl_no || "",
            date_of_nomination: b.date_of_nomination ? b.date_of_nomination.slice(0, 10) : "",
            shipper: hasManualShipper ? manualDetails.shipper : (b.shipper || ""),
            consignee: hasManualConsignee ? manualDetails.consignee : (b.consignee || ""),
            agent: hasManualAgent ? manualDetails.agent : (b.agent || ""),
            pol: b.pol || "",
            pod: b.pod || "",
            final_pod: b.final_pod || "",
            container_size: b.container_size || "",
            container_count: b.container_count || 1,
            status: b.status || "Draft",
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

            // Extra Main fields
            enquiry_no: addDetails.enquiry_no || "",
            mbl_date: addDetails.mbl_date ? addDetails.mbl_date.slice(0, 10) : "",
            services: addDetails.services || "",
            shipment_type: addDetails.shipment_type || "",
            inco_terms: addDetails.inco_terms || "",
            sales: "Sentil Kumar",
            cs: "Sentil Kumar",
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
            branch_code: "Mumbai",
            execution_branch: "Mumbai",
            gst_state_from: "Maharashtra",

            // Extra Party fields
            carrier: addDetails.carrier || "",
            line: addDetails.line || "",
            notify: addDetails.notify || "",
            transporter: addDetails.transporter || "",
            cha_name: addDetails.cha_name || "",
            do_date: addDetails.do_date ? addDetails.do_date.slice(0, 10) : "",
            delivery_date: addDetails.delivery_date ? addDetails.delivery_date.slice(0, 10) : "",

            // Packages fields
            no_of_packages: addDetails.no_of_packages || "",
            package_type: addDetails.package_type || "Carton",
            no_of_pallets: addDetails.no_of_pallets || "",
            volume: addDetails.volume || "",

            // Inventory + Container
            inv_container_type: addDetails.inv_container_type || "",
            inv_no_of_units: addDetails.inv_no_of_units || "",
            inv_csize: addDetails.inv_csize || "",
            containers: addDetails.containers || [],

            // Description
            description: addDetails.description || b.marks_and_numbers || "",

            // Grids
            buy_rates: addDetails.buy_rates || [],
            sell_rates: addDetails.sell_rates || [],
            vehicles: addDetails.vehicles || [],
          });
        }
      }
    } catch (error) {
      console.error("Error loading Form data:", error);
      toast.error("Failed to load MasterBL form details");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.mbl_no || form.mbl_no.trim() === "") {
      toast.error("Master Bill of Lading (MBL) number is required");
      return;
    }

    try {
      // Re-calculate totals and freight values
      const firstSellRate = form.sell_rates?.find(r => r.amount && parseFloat(r.amount) > 0);
      const calculatedFreightAmount = form.sell_rates?.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0) || 0;
      const freightCurrency = firstSellRate?.currency || "USD";

      let finalStatus = form.status;
      if (calculatedFreightAmount > 0 && finalStatus === "Draft") {
        finalStatus = "Sell Rate Updated";
      }

      // Structure additional details for the JSON storage
      const additionalDetailsObj = {
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
        do_date: form.do_date,
        delivery_date: form.delivery_date,

        no_of_packages: form.no_of_packages,
        package_type: form.package_type,
        no_of_pallets: form.no_of_pallets,
        volume: form.volume,

        inv_container_type: form.inv_container_type,
        inv_no_of_units: form.inv_no_of_units,
        inv_csize: form.inv_csize,
        containers: form.containers,

        description: form.description,

        buy_rates: form.buy_rates,
        sell_rates: form.sell_rates,
        vehicles: form.vehicles,
      };

      const payload = {
        ...form,
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
      toast.error(error.response?.data?.message || "Failed to save MasterBL");
    }
  };

  const tabs = [
    "Main", "Party", "Packages", "Container", "Description", "BuyRates", "SellRates", "Vehicle"
  ];  const labelStyle = "block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1 select-none";
  const inputStyle = "w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all";
  const disabledInputStyle = "w-full px-2 py-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed select-none transition-all";

  return (
    <DashboardLayout title={jobNoParam ? "Edit SI MasterBL" : "New SI MasterBL"}>
      {/* Title Header exactly like the screenshot */}
      <div className="flex items-center justify-between pb-2 mb-4 border-b border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Edit2 size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold select-none">
            {jobNoParam ? "Edit Sea Master BL Job" : "New Sea Master BL Job"}
            <span className="font-mono text-xs text-slate-400 ml-2">(Job #{jobNo})</span>
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

        {/* Dynamic Full-Width Form Panel with integrated bottom/side roundings */}
        <div className="bg-white dark:bg-dark-card p-6 border border-slate-200 dark:border-slate-700/80 rounded-b rounded-r shadow-sm">
          {/* TAB 1: MAIN */}
          {activeTab === "Main" && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Main Shipment Route & Invoicing Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className={labelStyle}><RequiredStar />MBL_No</label>
                  <input type="text" name="mbl_no" value={form.mbl_no} onChange={handleInputChange} placeholder="Enter MBL No" className={inputStyle + " font-mono font-bold"} />
                </div>
                <div>
                  <label className={labelStyle}>Job Date</label>
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
                  <label className={labelStyle}><RequiredStar />Shipment Type</label>
                  <select name="shipment_type" value={form.shipment_type} onChange={handleInputChange} className={inputStyle}>
                    <option value="">Select Type</option>
                    <option value="FCL">FCL</option>
                    <option value="LCL">LCL</option>
                    <option value="Air">Air</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle}><RequiredStar />INCO Terms</label>
                  <select name="inco_terms" value={form.inco_terms} onChange={handleInputChange} className={inputStyle}>
                    <option value="">Select INCO Term</option>
                    {INCO_TERMS_LIST.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <PartySelect
                    label="Client"
                    name="shipper"
                    value={form.shipper}
                    onChange={handleInputChange}
                    customers={customers}
                    isHybrid={true}
                    required={true}
                    RequiredStar={RequiredStar}
                    placeholder="Search client..."
                    labelClassName={labelStyle}
                    inputClassName={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}><RequiredStar />Sales</label>
                  <input type="text" name="sales" value={form.sales} disabled placeholder="Sales Rep" className={disabledInputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>CS</label>
                  <input type="text" name="cs" value={form.cs} disabled placeholder="CS Exec" className={disabledInputStyle} />
                </div>
                <div>
                  <label className={labelStyle}><RequiredStar />Freight Status</label>
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
                  <input type="text" name="shipping_line_name" value={form.shipping_line_name} onChange={handleInputChange} placeholder="Vessel name / Line" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Voyage</label>
                  <input type="text" name="voyage" value={form.voyage} onChange={handleInputChange} placeholder="Voyage" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>P.O.R.</label>
                  <input type="text" name="por" value={form.por} onChange={handleInputChange} placeholder="POR" className={inputStyle} />
                </div>
                <div>
                  <PortSelect label="P.O.L." name="pol" value={form.pol} onChange={handleInputChange} placeholder="Select POL Port" labelClassName={labelStyle} inputClassName={inputStyle} />
                </div>
                <div>
                  <PortSelect label="P.O.D." name="pod" value={form.pod} onChange={handleInputChange} placeholder="Select POD Port" labelClassName={labelStyle} inputClassName={inputStyle} />
                </div>
                <div>
                  <PortSelect label="F.P.D" name="final_pod" value={form.final_pod} onChange={handleInputChange} placeholder="Select FPD Port" labelClassName={labelStyle} inputClassName={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>C.F.S.</label>
                  <input type="text" name="cfs" value={form.cfs} onChange={handleInputChange} placeholder="CFS Details" className={inputStyle} />
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
                  <label className={labelStyle}><RequiredStar />Branch Code</label>
                  <input type="text" name="branch_code" value={form.branch_code} disabled placeholder="Branch Code" className={disabledInputStyle} />
                </div>
                <div>
                  <label className={labelStyle}><RequiredStar />Execution Branch</label>
                  <input type="text" name="execution_branch" value={form.execution_branch} disabled placeholder="Execution Branch" className={disabledInputStyle} />
                </div>
                <div>
                  <label className={labelStyle}><RequiredStar />GST State From</label>
                  <input type="text" name="gst_state_from" value={form.gst_state_from} disabled placeholder="GST State From" className={disabledInputStyle} />
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
                    placeholder="Search Overseas Agent..."
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
                  <input type="text" name="line" value={form.line} onChange={handleInputChange} placeholder="Line code" className={inputStyle} />
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
                  <input type="number" name="no_of_palette" value={form.no_of_palette} onChange={handleInputChange} placeholder="e.g. 10" className={inputStyle} />
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
                <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Inventory Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelStyle}>Container Size Type (CSize)</label>
                    <select name="container_size" value={form.container_size} onChange={handleInputChange} className={inputStyle}>
                      <option value="">Select Size</option>
                      {CONTAINER_SIZES.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>No Of Units (Count)</label>
                    <input type="number" name="container_count" value={form.container_count} onChange={handleInputChange} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Inventory Cargo Type</label>
                    <select name="cargo_type" value={form.cargo_type} onChange={handleInputChange} className={inputStyle}>
                      <option value="">Select Cargo Type</option>
                      {CARGO_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
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
              <Save size={16} /> Save MBL Job
            </button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
