import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  FileText, Download, Printer, RefreshCw, Search, Lock, ShieldCheck, Eye, Save, Plus, Trash2, ArrowLeft, History, AlertCircle
} from "lucide-react";
import { toast } from "react-toastify";
import SearchableDropdown from "../components/SearchableDropdown";

export default function HBLGenerator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const urlJobNo = searchParams.get("jobNo");
  const urlBlNo = searchParams.get("blNo");

  const [mblJobs, setMblJobs] = useState([]);
  const [selectedJobNo, setSelectedJobNo] = useState(urlJobNo || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingBlNo, setGeneratingBlNo] = useState(false);

  // Form State
  const [documentType, setDocumentType] = useState("Draft"); // 'Draft' | 'Original'
  const [blNo, setBlNo] = useState(urlBlNo || "");
  const [blDate, setBlDate] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState("");

  const [shipper, setShipper] = useState("");
  const [consignee, setConsignee] = useState("");
  const [notifyParty, setNotifyParty] = useState("");
  const [deliveryAgent, setDeliveryAgent] = useState("");

  const [preCarriage] = useState("By Sea/ By Air"); // Fixed
  const [placeOfReceipt, setPlaceOfReceipt] = useState("");
  const [vesselVoyage, setVesselVoyage] = useState("");
  const [portOfLoading, setPortOfLoading] = useState("");
  const [portOfDischarge, setPortOfDischarge] = useState("");
  const [placeOfDelivery, setPlaceOfDelivery] = useState("");
  const [finalDestination, setFinalDestination] = useState("");

  const [marksAndNumbers, setMarksAndNumbers] = useState("");
  const [containers, setContainers] = useState([
    { container_no: "", custom_seal_no: "", line_seal_no: "", seal_no: "" }
  ]);
  const [noOfPackages, setNoOfPackages] = useState("");
  const [descriptionOfGoods, setDescriptionOfGoods] = useState("");
  const [detentionClause, setDetentionClause] = useState("14 DAYS FREE TIME DETENSION AT DESTINATION");
  const [freightOption, setFreightOption] = useState("Prepaid"); // 'Prepaid' | 'Collect'
  const [grossWeight, setGrossWeight] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [measurement, setMeasurement] = useState("");

  const [exRate, setExRate] = useState("");
  const [prepaidAmount, setPrepaidAmount] = useState("FREIGHT PREPAID");
  const [payableAt, setPayableAt] = useState("Mumbai");
  const [placeOfIssue, setPlaceOfIssue] = useState("Mumbai");
  const [noOfOriginals, setNoOfOriginals] = useState("3");
  const [totalNationalCurrency, setTotalNationalCurrency] = useState("");
  const [mtdNo] = useState("MTO/DGS/120260430000005");
  const [shipmentRefNo, setShipmentRefNo] = useState("");

  // Audit Logs & Edit Requests
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showRequestEditModal, setShowRequestEditModal] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // PDF Preview State
  const [pdfUrl, setPdfUrl] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Load all jobs on mount
  useEffect(() => {
    loadMBLJobs();
  }, []);

  // Fetch job or BL details when selectedJobNo changes
  useEffect(() => {
    if (selectedJobNo) {
      loadJobDetails(selectedJobNo);
    }
  }, [selectedJobNo]);

  const loadMBLJobs = async () => {
    try {
      const res = await api.get("/masterbl/get");
      if (res.data.success) {
        setMblJobs(res.data.jobs || []);
      }
    } catch (e) {
      console.error("Error loading MasterBL jobs:", e);
    }
  };

  const loadJobDetails = async (jobNo) => {
    try {
      setLoading(true);
      const res = await api.get(`/hbl/job-init/${jobNo}`);
      if (res.data.success) {
        const job = res.data.job || {};
        const add = res.data.additionalDetails || {};
        const existing = res.data.existingHBLs || [];

        // If a specific BL was requested via URL
        let targetDoc = null;
        if (urlBlNo) {
          targetDoc = existing.find(d => d.bl_no === urlBlNo);
        } else if (existing.length > 0) {
          targetDoc = existing[0];
        }

        if (targetDoc) {
          populateFromSavedDoc(targetDoc);
        } else {
          // Pre-populate from Sea Master BL record
          populateFromJobRecord(job, add);
          // Automatically generate next unique B/L No
          handleGenerateBlNo(jobNo);
        }
      }
    } catch (e) {
      console.error("Error loading job details:", e);
      toast.error("Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const populateFromSavedDoc = (doc) => {
    const data = typeof doc.doc_data === "string" ? JSON.parse(doc.doc_data) : doc.doc_data;
    setDocumentType(doc.document_type || "Draft");
    setBlNo(doc.bl_no || "");
    setBlDate(doc.bl_date || data.blDate || "");
    setIsLocked(!!doc.is_locked);
    setLockedBy(doc.locked_by || "");
    setPdfUrl(doc.pdf_link || "");

    setShipper(data.shipper || "");
    setConsignee(data.consignee || "");
    setNotifyParty(data.notifyParty || "");
    setDeliveryAgent(data.deliveryAgent || "");

    setPlaceOfReceipt(data.placeOfReceipt || "");
    setVesselVoyage(data.vesselVoyage || "");
    setPortOfLoading(data.portOfLoading || "");
    setPortOfDischarge(data.portOfDischarge || "");
    setPlaceOfDelivery(data.placeOfDelivery || "");
    setFinalDestination(data.finalDestination || "");

    setMarksAndNumbers(data.marksAndNumbers || "");
    setContainers(data.containers && data.containers.length > 0 ? data.containers : [
      { container_no: data.containerNo || "", custom_seal_no: "", line_seal_no: "", seal_no: "" }
    ]);
    setNoOfPackages(data.noOfPackages || "");
    setDescriptionOfGoods(data.descriptionOfGoods || "");
    setDetentionClause(data.detentionClause || "14 DAYS FREE TIME DETENSION AT DESTINATION");
    setFreightOption(data.freightOption || "Prepaid");
    setGrossWeight(data.grossWeight || "");
    setNetWeight(data.netWeight || "");
    setMeasurement(data.measurement || "");

    setExRate(data.exRate || "");
    setPrepaidAmount(data.prepaidAmount || "FREIGHT PREPAID");
    setPayableAt(data.payableAt || "Mumbai");
    setPlaceOfIssue(data.placeOfIssue || "Mumbai");
    setNoOfOriginals(data.noOfOriginals || "3");
    setTotalNationalCurrency(data.totalNationalCurrency || "");
    setShipmentRefNo(data.shipmentRefNo || "");
  };

  const populateFromJobRecord = (job, add) => {
    setIsLocked(false);
    setLockedBy("");
    setDocumentType("Draft");
    setBlDate(job.hbl_date ? formatDateForInput(job.hbl_date) : "");

    // Parties formatting
    const shipperStr = job.hbl_shipper_name || job.shipper_name || "";
    const consigneeStr = job.hbl_consignee_name || job.consignee_name || "";
    const notifyStr = add.notify_party || "";
    const deliveryAgentStr = add.delivery_agent || add.destination_agent || "";

    setShipper(shipperStr);
    setConsignee(consigneeStr);
    setNotifyParty(notifyStr);
    setDeliveryAgent(deliveryAgentStr);

    setPlaceOfReceipt(job.pol || add.pol || "NHAVA SHEVA, INDIA");
    setPortOfLoading(job.pol || add.pol || "NHAVA SHEVA, INDIA");
    setVesselVoyage(`${job.shipping_line_name || add.vessel || "EVER EXCEL"} / ${add.voyage || "194E"}`);
    setPortOfDischarge(job.pod || add.pod || "COLOMBO, SRI LANKA");
    setPlaceOfDelivery(job.final_pod || add.fpd || job.pod || "COLOMBO, SRI LANKA");
    setFinalDestination(job.final_pod || add.fpd || job.pod || "COLOMBO, SRI LANKA");

    // Containers from Sea Master BL
    if (add.containers && Array.isArray(add.containers) && add.containers.length > 0) {
      setContainers(add.containers.map(c => ({
        container_no: c.container_no || c.containerNo || "",
        custom_seal_no: c.custom_seal_no || c.customSealNo || "",
        line_seal_no: c.line_seal_no || c.lineSealNo || "",
        seal_no: c.seal_no || ""
      })));
    } else if (job.container_number) {
      setContainers([{ container_no: job.container_number, custom_seal_no: "", line_seal_no: "", seal_no: "" }]);
    }

    setNoOfPackages(add.no_of_packages || `${job.container_count || "1"} X ${job.container_size || "40'GP"}`);
    setDescriptionOfGoods(add.description || job.description || "");
    setGrossWeight(job.gross_weight || add.gross_weight || "");
    setNetWeight(add.net_weight || "");
    setMeasurement(job.volume || add.volume || "");
    setShipmentRefNo(job.mbl_no || add.mbl_no || "");
    setFreightOption("Prepaid");
  };

  const handleGenerateBlNo = async (jobNo) => {
    try {
      setGeneratingBlNo(true);
      const res = await api.get(`/hbl/generate-bl-no/${jobNo || selectedJobNo}`);
      if (res.data.success) {
        setBlNo(res.data.blNo);
        toast.info(`Generated unique B/L No.: ${res.data.blNo}`);
      }
    } catch (e) {
      console.error("Error generating BL number:", e);
      toast.error("Failed to generate B/L number");
    } finally {
      setGeneratingBlNo(false);
    }
  };

  const handleContainerChange = (index, field, value) => {
    const updated = [...containers];
    updated[index][field] = value;
    setContainers(updated);
  };

  const handleAddContainer = () => {
    setContainers([...containers, { container_no: "", custom_seal_no: "", line_seal_no: "", seal_no: "" }]);
  };

  const handleRemoveContainer = (index) => {
    if (containers.length <= 1) return;
    setContainers(containers.filter((_, i) => i !== index));
  };

  const handleSaveHBL = async () => {
    if (!selectedJobNo) {
      toast.warning("Please select a Job Number");
      return;
    }
    if (!blNo || !blNo.trim()) {
      toast.warning("B/L Number is required");
      return;
    }
    if (documentType === "Original" && (!blDate || !blDate.trim())) {
      toast.error("B/L Date is mandatory when creating an Original B/L!");
      return;
    }

    const payload = {
      job_no: parseInt(selectedJobNo),
      document_type: documentType,
      bl_no: blNo.trim(),
      bl_date: blDate || "",
      doc_data: {
        shipper,
        consignee,
        notifyParty,
        deliveryAgent,
        preCarriage,
        placeOfReceipt,
        vesselVoyage,
        portOfLoading,
        portOfDischarge,
        placeOfDelivery,
        finalDestination,
        marksAndNumbers,
        containers,
        noOfPackages,
        descriptionOfGoods,
        detentionClause,
        freightOption,
        grossWeight,
        netWeight,
        measurement,
        exRate,
        prepaidAmount,
        payableAt,
        placeOfIssue,
        noOfOriginals,
        totalNationalCurrency,
        mtdNo,
        shipmentRefNo
      }
    };

    try {
      setSaving(true);
      const res = await api.post("/hbl/save", payload);
      if (res.data.success) {
        toast.success(res.data.message);
        setPdfUrl(res.data.pdfUrl || "");
        if (res.data.pdfUrl) {
          setShowPreviewModal(true);
        }
      }
    } catch (e) {
      console.error("Error saving HBL:", e);
      if (e.response?.data?.is_locked) {
        setIsLocked(true);
        toast.error(e.response?.data?.message || "This B/L is locked by Director.");
      } else {
        toast.error(e.response?.data?.message || "Failed to save HBL document.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLockBL = async () => {
    if (!blNo) return;
    if (user?.role !== "Director" && user?.role !== "Admin") {
      toast.error("Only Director or Admin can lock a B/L permanently.");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently lock B/L ${blNo}? Once locked, nobody can edit it without approval.`)) {
      return;
    }

    try {
      const docRes = await api.get(`/hbl/register?search=${blNo}`);
      const doc = docRes.data.documents?.find(d => d.bl_no === blNo);
      if (!doc) {
        toast.error("Please save the B/L first before locking.");
        return;
      }

      const res = await api.put(`/hbl/lock/${doc.id}`);
      if (res.data.success) {
        setIsLocked(true);
        setLockedBy(user.user_name || "Director");
        toast.success(res.data.message);
      }
    } catch (e) {
      console.error("Error locking B/L:", e);
      toast.error("Failed to lock B/L");
    }
  };

  const handleRequestEdit = async (e) => {
    e.preventDefault();
    if (!editReason.trim()) {
      toast.warning("Please provide a reason for editing the locked B/L");
      return;
    }

    try {
      setSubmittingRequest(true);
      const res = await api.post("/hbl/request-edit", {
        bl_no: blNo,
        job_no: selectedJobNo,
        reason: editReason.trim()
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setShowRequestEditModal(false);
        setEditReason("");
      }
    } catch (e) {
      console.error("Error requesting edit:", e);
      toast.error("Failed to submit request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleViewAuditTrail = async () => {
    if (!blNo) return;
    try {
      const res = await api.get(`/hbl/audit-logs/${blNo}`);
      if (res.data.success) {
        setAuditLogs(res.data.logs || []);
        setShowAuditModal(true);
      }
    } catch (e) {
      console.error("Error fetching audit logs:", e);
      toast.error("Failed to load audit history");
    }
  };

  const formatDateForInput = (d) => {
    if (!d) return "";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return "";
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return "";
    }
  };

  const isDirectorOrAdmin = user?.role === "Director" || user?.role === "Admin";
  const canEdit = !isLocked || isDirectorOrAdmin;

  return (
    <DashboardLayout title="HBL Document Generator">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        
        {/* Header Navigation & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              to="/hbl-register"
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Go to HBL Register"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="text-indigo-600 dark:text-indigo-400" size={22} />
                House Bill of Lading (HBL)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate, manage, and lock single-page Multimodal Transport B/L documents
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {blNo && (
              <button
                type="button"
                onClick={handleViewAuditTrail}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <History size={16} /> Audit History
              </button>
            )}

            {isLocked ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <Lock size={14} /> Locked by {lockedBy || "Director"}
                </span>
                {!isDirectorOrAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowRequestEditModal(true)}
                    className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                  >
                    Request Edit
                  </button>
                )}
              </div>
            ) : (
              isDirectorOrAdmin && (
                <button
                  type="button"
                  onClick={handleLockBL}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors"
                  title="Lock BL permanently"
                >
                  <Lock size={15} /> Lock B/L
                </button>
              )
            )}

            {pdfUrl && (
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors"
              >
                <Eye size={16} /> View PDF
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveHBL}
              disabled={saving || (!canEdit && !isDirectorOrAdmin)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow transition-all"
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? "Processing PDF..." : "Save & Generate PDF"}
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-6">
          
          {/* Row 1: Job Selection, Document Type, BL Number Generation */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-750">
            {/* 1. Job No Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Job No. <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedJobNo}
                onChange={(e) => setSelectedJobNo(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">-- Choose Job --</option>
                {mblJobs.map((j) => (
                  <option key={j.job_no} value={j.job_no}>
                    Job #{j.job_no} - {j.mbl_no || "No MBL"} ({j.hbl_consignee_name || j.consignee_name || "No Consignee"})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Document Type (Draft vs Original) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                HBL Document Type <span className="text-red-500">*</span>
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Draft">Draft (Date Optional, "DRAFT" Banner)</option>
                <option value="Original">Original (Mandatory Date)</option>
              </select>
            </div>

            {/* 3. B/L No with Auto-Generation */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  B/L Number <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleGenerateBlNo()}
                  disabled={generatingBlNo || !selectedJobNo}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1 disabled:opacity-50"
                  title="Generate new unique suffix for this job"
                >
                  <RefreshCw size={11} className={generatingBlNo ? "animate-spin" : ""} /> New Number
                </button>
              </div>
              <input
                type="text"
                value={blNo}
                onChange={(e) => setBlNo(e.target.value)}
                placeholder="e.g. LVSTS26065007A"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-card text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* 4. B/L Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                B/L Date {documentType === "Original" ? <span className="text-red-500">* (Mandatory)</span> : <span className="text-slate-400">(Optional for Draft)</span>}
              </label>
              <input
                type="date"
                value={blDate}
                onChange={(e) => setBlDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-card text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Section 1: Parties Information */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
              1. Party & Destination Agent Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  SHIPPER <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={shipper}
                  onChange={(e) => setShipper(e.target.value)}
                  placeholder="Shipper Name, Address, Contact details..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  CONSIGNEE <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={consignee}
                  onChange={(e) => setConsignee(e.target.value)}
                  placeholder="Consignee Name, Address, Tax ID, Phone..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  NOTIFY PARTY
                </label>
                <textarea
                  rows={4}
                  value={notifyParty}
                  onChange={(e) => setNotifyParty(e.target.value)}
                  placeholder="Notify Party Name, Address, Phone, Email..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  DELIVERY AGENT
                </label>
                <textarea
                  rows={4}
                  value={deliveryAgent}
                  onChange={(e) => setDeliveryAgent(e.target.value)}
                  placeholder="Destination Delivery Agent Name, Address, TEL/FAX..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-sans"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Routing & Carrier Details */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
              2. Routing, Vessel & Ports Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pre-Carriage (Fixed)</label>
                <input
                  type="text"
                  value={preCarriage}
                  disabled
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Place of Receipt</label>
                <input
                  type="text"
                  value={placeOfReceipt}
                  onChange={(e) => setPlaceOfReceipt(e.target.value)}
                  placeholder="e.g. NHAVA SHEVA, INDIA"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Ocean Vessel / Voy No.</label>
                <input
                  type="text"
                  value={vesselVoyage}
                  onChange={(e) => setVesselVoyage(e.target.value)}
                  placeholder="e.g. EVER EXCEL 194E"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Port of Loading</label>
                <input
                  type="text"
                  value={portOfLoading}
                  onChange={(e) => setPortOfLoading(e.target.value)}
                  placeholder="e.g. NHAVA SHEVA, INDIA"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Port of Discharge</label>
                <input
                  type="text"
                  value={portOfDischarge}
                  onChange={(e) => setPortOfDischarge(e.target.value)}
                  placeholder="e.g. COLOMBO, SRI LANKA"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Place of Delivery</label>
                <input
                  type="text"
                  value={placeOfDelivery}
                  onChange={(e) => setPlaceOfDelivery(e.target.value)}
                  placeholder="e.g. COLOMBO, SRI LANKA"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Final Destination</label>
                <input
                  type="text"
                  value={finalDestination}
                  onChange={(e) => setFinalDestination(e.target.value)}
                  placeholder="e.g. COLOMBO, SRI LANKA"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Shipment Reference No. (MBL)</label>
                <input
                  type="text"
                  value={shipmentRefNo}
                  onChange={(e) => setShipmentRefNo(e.target.value)}
                  placeholder="e.g. COAU6463479100"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Dynamic Containers Grid */}
          <div>
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                3. Containers & Seals Grid
              </h3>
              <button
                type="button"
                onClick={handleAddContainer}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 rounded-lg transition-colors"
              >
                <Plus size={14} /> Add Container
              </button>
            </div>

            <div className="space-y-2.5">
              {containers.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Container No. #{idx + 1}</label>
                    <input
                      type="text"
                      value={item.container_no}
                      onChange={(e) => handleContainerChange(idx, "container_no", e.target.value)}
                      placeholder="e.g. DFSU4346253"
                      className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-dark-card text-slate-800 dark:text-white font-mono"
                    />
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Custom Seal No.</label>
                    <input
                      type="text"
                      value={item.custom_seal_no}
                      onChange={(e) => handleContainerChange(idx, "custom_seal_no", e.target.value)}
                      placeholder="e.g. KLIK21298124"
                      className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-dark-card text-slate-800 dark:text-white font-mono"
                    />
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Line Seal No.</label>
                    <input
                      type="text"
                      value={item.line_seal_no}
                      onChange={(e) => handleContainerChange(idx, "line_seal_no", e.target.value)}
                      placeholder="e.g. 31925844"
                      className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-dark-card text-slate-800 dark:text-white font-mono"
                    />
                  </div>

                  {containers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveContainer(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded mt-3"
                      title="Remove Container"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Cargo Particulars, Weights & Descriptions */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
              4. Cargo Particulars, Goods Description & Weights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Marks & Numbers
                  </label>
                  <textarea
                    rows={3}
                    value={marksAndNumbers}
                    onChange={(e) => setMarksAndNumbers(e.target.value)}
                    placeholder="e.g. CARTON NOS. 001 TO 4880&#10;B R G 01 TO 04"
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white font-mono resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    No. of Packages
                  </label>
                  <input
                    type="text"
                    value={noOfPackages}
                    onChange={(e) => setNoOfPackages(e.target.value)}
                    placeholder="e.g. 4854 CARTONS / 15 PALLETS"
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Description of Goods <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={descriptionOfGoods}
                  onChange={(e) => setDescriptionOfGoods(e.target.value)}
                  placeholder="3X40'GP CONTAINER CONTAINS 4854 CARTONS...&#10;HS CODE: 84145120&#10;SB NO. 6070417 DATED 19.08.2026..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white font-sans resize-none"
                />
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Gross Weight (KGS)</label>
                    <input
                      type="text"
                      value={grossWeight}
                      onChange={(e) => setGrossWeight(e.target.value)}
                      placeholder="e.g. 32167.920"
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Net Weight (KGS)</label>
                    <input
                      type="text"
                      value={netWeight}
                      onChange={(e) => setNetWeight(e.target.value)}
                      placeholder="e.g. 30111.200"
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Measurement (CBM)</label>
                  <input
                    type="text"
                    value={measurement}
                    onChange={(e) => setMeasurement(e.target.value)}
                    placeholder="e.g. 1.658"
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Free Time Detention Notice</label>
                  <input
                    type="text"
                    value={detentionClause}
                    onChange={(e) => setDetentionClause(e.target.value)}
                    placeholder="14 DAYS FREE TIME DETENSION AT DESTINATION"
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Freight Term (Prepaid / Collect)</label>
                  <select
                    value={freightOption}
                    onChange={(e) => setFreightOption(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-card text-slate-800 dark:text-white"
                  >
                    <option value="Prepaid">FREIGHT PREPAID</option>
                    <option value="Collect">FREIGHT COLLECT</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Bottom Issue & Sign Details */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
              5. Freight Charges, Place of Issue & Original BL Count
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Place of Issue</label>
                <input
                  type="text"
                  value={placeOfIssue}
                  onChange={(e) => setPlaceOfIssue(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">No. of Original B/Ls</label>
                <input
                  type="text"
                  value={noOfOriginals}
                  onChange={(e) => setNoOfOriginals(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Exchange Rate</label>
                <input
                  type="text"
                  value={exRate}
                  onChange={(e) => setExRate(e.target.value)}
                  placeholder="e.g. 85.00"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Payable At</label>
                <input
                  type="text"
                  value={payableAt}
                  onChange={(e) => setPayableAt(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* PDF Viewer Modal */}
      {showPreviewModal && pdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <FileText className="text-indigo-600" size={22} />
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">
                    Bill of Lading PDF Preview - {blNo}
                  </h3>
                  <p className="text-xs text-slate-500">Single-page Multimodal A4 Document</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`HBL_${blNo}.pdf`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  <Download size={14} /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-200 dark:bg-slate-900 p-2">
              <iframe src={pdfUrl} className="w-full h-full rounded-lg border border-slate-300 dark:border-slate-700" title="PDF Preview" />
            </div>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <History size={18} className="text-indigo-600" />
                Audit Trail for B/L {blNo}
              </h3>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No audit logs recorded yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="pt-2 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-200">
                      <span className="uppercase text-indigo-600 dark:text-indigo-400">{log.action}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Performed by: <span className="font-semibold">{log.performed_by}</span> ({log.role})
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Edit Modal for Locked BL */}
      {showRequestEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleRequestEdit} className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle size={22} />
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                Request Edit Permission for B/L {blNo}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              This B/L has been locked permanently by Director. Please enter the reason for requesting an edit. An Admin will review and approve your request.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Edit <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Describe why this locked B/L needs modification..."
                className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRequestEditModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingRequest}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                {submittingRequest ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
