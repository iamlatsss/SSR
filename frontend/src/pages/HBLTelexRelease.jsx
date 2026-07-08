import React, { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { FileText, Download, Printer, RefreshCw, Search, Eye, Save, Lock, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import SearchableDropdown from "../components/SearchableDropdown";
import html2pdf from "html2pdf.js";

// ── Helpers ─────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
  } catch { return ""; }
};

const parseJSON = (val) => {
  if (!val) return {};
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return {}; }
};

// ── Shared styles ────────────────────────────────────────────────
const INPUT = {
  display: "block",
  width: "100%",
  border: "none",
  borderBottom: "1px dotted #aaa",
  outline: "none",
  background: "transparent",
  fontSize: "9pt",
  fontFamily: "Arial, sans-serif",
  color: "#000",
  padding: "1px 0",
  boxSizing: "border-box",
};

const TEXTAREA = {
  ...INPUT,
  borderBottom: "none",
  resize: "none",
  lineHeight: 1.4,
  overflow: "hidden",
};

// ─── Non-editable field helper ───────────────────────────────────────────────────
function Field({ as = "input", style, disabled, ...props }) {
  const baseStyle = {
    display: "block",
    width: "100%",
    fontSize: "9pt",
    fontFamily: "Arial, sans-serif",
    color: "#000",
    padding: "2px 0",
    minHeight: as === "textarea" ? "36px" : "14px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    ...style,
  };

  return (
    <div style={baseStyle}>
      {props.value || ""}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export default function HBLTelexRelease() {
  const previewRef = useRef(null);

  // Data State
  const [mblJobs, setMblJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Selection
  const [selectedJobNo, setSelectedJobNo] = useState("");
  const [houseBLs, setHouseBLs] = useState([]);
  const [selectedHblId, setSelectedHblId] = useState("");

  // Resolved document data
  const [masterBL, setMasterBL] = useState(null);
  const [docData, setDocData] = useState(null);

  // Tabs & Lock Status
  const [activeTab, setActiveTab] = useState("generate"); // "generate" or "stored"
  const [isLocked, setIsLocked] = useState(false);
  const [existingBLNo, setExistingBLNo] = useState(null);

  // Search state for stored docs
  const [searchJobNo, setSearchJobNo] = useState("");
  const [searchBLNo, setSearchBLNo] = useState("");
  const [storedDocs, setStoredDocs] = useState([]);
  const [searching, setSearching] = useState(false);

  // ── Load MBL jobs ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/masterbl/get");
        if (res.data.success) setMblJobs(res.data.jobs || []);
      } catch (err) {
        console.error("Error loading MBL jobs:", err);
        toast.error("Failed to load MBL jobs");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const jobOptions = useMemo(() =>
    mblJobs.map((j) => ({
      value: String(j.job_no),
      label: `Job #${j.job_no} — ${j.mbl_no || "No MBL"}`,
    })), [mblJobs]);

  const hblOptions = useMemo(() =>
    houseBLs.map((h) => ({
      value: String(h.id),
      label: `HBL: ${h.hbl_no || "—"} (Job ${h.job_no})`,
    })), [houseBLs]);

  // ── Fetch data ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedJobNo) {
      setHouseBLs([]); setSelectedHblId(""); setMasterBL(null); setDocData(null); setIsLocked(false);
      setExistingBLNo(null);
      return;
    }
    (async () => {
      try {
        setFetching(true);
        setIsLocked(false);
        // Check if HBL Telex Release already exists for this job
        const checkRes = await api.get(`/housebl/document/check/${selectedJobNo}/TelexRelease`);
        if (checkRes.data.success && checkRes.data.exists) {
          const doc = checkRes.data.document;
          setDocData(doc.doc_data);
          setIsLocked(true);
          toast.info("Loaded existing Telex Release document for Job #" + selectedJobNo);
          setFetching(false);
          return;
        }

        const res = await api.get(`/housebl/document-data/${selectedJobNo}`);
        if (res.data.success) {
          setMasterBL(res.data.masterBL);
          setHouseBLs(res.data.houseBLs || []);
          setExistingBLNo(res.data.existingBLNo);
          if (res.data.houseBLs?.length > 0) {
            setSelectedHblId(String(res.data.houseBLs[0].id));
          } else {
            setSelectedHblId(""); setDocData(null);
          }
        }
      } catch (err) {
        console.error("Error fetching document data:", err);
        toast.error("Failed to fetch data for Job #" + selectedJobNo);
      } finally {
        setFetching(false);
      }
    })();
  }, [selectedJobNo]);

  // ── Resolve telex release fields ───────────────────────────
  useEffect(() => {
    if (isLocked) return; // Prevent overwriting stored document

    if (!selectedHblId || !masterBL) { setDocData(null); return; }
    const hbl = houseBLs.find((h) => String(h.id) === selectedHblId);
    if (!hbl) { setDocData(null); return; }

    const ad = parseJSON(hbl.additional_details);
    const containers = ad.containers || [];
    const containerList = containers.map((c) => ({
      containerNo: c.container_no || "",
      sealNo: c.seal_no || "",
      size: c.container_size || ad.container_size || masterBL.container_size || "",
    }));

    const pol = ad.pol || masterBL.pol || "";
    const pod = ad.pod || masterBL.pod || "";
    const fpd = ad.final_pod || masterBL.final_pod || "";

    // Notify Party SAME AS CONSIGNEE logic
    const consigneeName = hbl.consignee_name || "";
    const notifyName = ad.notify || "";
    let notifyPartyVal = notifyName;
    if (notifyName && consigneeName && notifyName.trim().toLowerCase() === consigneeName.trim().toLowerCase()) {
      notifyPartyVal = "SAME AS CONSIGNEE";
    }

    setDocData({
      shipper: hbl.shipper_name || "",
      consignee: hbl.consignee_name || "",
      notifyParty: notifyPartyVal,
      hblNo: hbl.hbl_no || "",
      mblNo: hbl.mbl_no || masterBL.mbl_no || "",
      jobNo: String(hbl.job_no || ""),
      blNo: existingBLNo || "",
      pol,
      pod,
      finalDestination: fpd || pod,
      vesselVoyage: `${ad.shipping_line_name || masterBL.shipping_line_name || ""} ${ad.voyage || ""}`.trim(),
      containerList,
      containerSummary: containerList.map(c => c.containerNo).filter(Boolean).join(", "),
      grossWeight: hbl.gross_weight ? `${hbl.gross_weight} KGS` : "",
      noOfPackages: `${ad.no_of_packages || hbl.no_of_palette || ""} ${ad.package_type || "PKGS"}`,
      dateOfIssue: formatDate(new Date().toISOString()),
      branchCode: ad.branch_code || "Mumbai",
    });
  }, [selectedHblId, masterBL, houseBLs, existingBLNo, isLocked]);

  // ── Save Document ──────────────────────────────────────────
  const handleSaveDocument = async () => {
    if (!docData || !selectedJobNo) {
      toast.warning("No document to save");
      return;
    }
    try {
      setSaving(true);
      const res = await api.post("/housebl/document/save", {
        job_no: Number(selectedJobNo),
        document_type: "TelexRelease",
        doc_data: docData
      });

      if (res.data.success) {
        toast.success(res.data.message || "Document saved successfully");
        const updatedDoc = { ...docData, blNo: res.data.bl_no };
        setDocData(updatedDoc);
        setIsLocked(true);
      }
    } catch (err) {
      console.error("Error saving document:", err);
      toast.error(err.response?.data?.message || "Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  // ── Search Stored Documents ────────────────────────────────
  const handleSearchStored = async () => {
    try {
      setSearching(true);
      const params = new URLSearchParams({
        document_type: "TelexRelease"
      });
      if (searchJobNo) params.append("job_no", searchJobNo);
      if (searchBLNo) params.append("bl_no", searchBLNo);

      const res = await api.get(`/housebl/document/search?${params.toString()}`);
      if (res.data.success) {
        setStoredDocs(res.data.documents || []);
      }
    } catch (err) {
      console.error("Error searching stored documents:", err);
      toast.error("Failed to load stored documents");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (activeTab === "stored") {
      handleSearchStored();
    }
  }, [activeTab]);

  const handleViewStored = (doc) => {
    setDocData(doc.doc_data);
    setSelectedJobNo(String(doc.job_no));
    setSelectedHblId("");
    setIsLocked(true);
    setActiveTab("generate");
  };

  // ── PDF Generation with Auto-Save ─────────────────────────
  const handleDownloadPDF = async () => {
    if (!previewRef.current || !docData || !selectedJobNo) {
      toast.warning("No document to export");
      return;
    }
    try {
      setGenerating(true);
      let currentDocData = docData;

      if (!isLocked) {
        setSaving(true);
        try {
          const res = await api.post("/housebl/document/save", {
            job_no: Number(selectedJobNo),
            document_type: "TelexRelease",
            doc_data: docData
          });

          if (res.data.success) {
            toast.success("Document stored successfully!");
            const confirmedBLNo = res.data.bl_no;
            currentDocData = { ...docData, blNo: confirmedBLNo };
            setDocData(currentDocData);
            setIsLocked(true);
            // Wait a brief moment to allow React state to settle
            await new Promise((resolve) => setTimeout(resolve, 150));
          } else {
            toast.error("Failed to store document prior to download");
            setGenerating(false);
            setSaving(false);
            return;
          }
        } catch (err) {
          console.error("Error storing document prior to download:", err);
          toast.error(err.response?.data?.message || "Failed to store document prior to download");
          setGenerating(false);
          setSaving(false);
          return;
        } finally {
          setSaving(false);
        }
      }

      const opt = {
        margin: [8, 8, 8, 8],
        filename: `HBL_Telex_Release_${currentDocData.hblNo || "draft"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
      await html2pdf().set(opt).from(previewRef.current).save();
      toast.success("Telex Release PDF downloaded!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!previewRef.current) return;
    const printContents = previewRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html><head><title>Telex Release — ${docData?.hblNo || ""}</title>
      <style>
        body { margin: 0; padding: 24px; font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #000; padding: 6px 8px; vertical-align: top; font-size: 9pt; }
        th { background: #f0f0f0; text-align: left; }
        @media print { body { padding: 12px; } }
      </style></head><body>${printContents}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  const setField = (field) => (e) => {
    setDocData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const inp = (field) => (
    <Field value={docData[field] || ""} onChange={setField(field)} disabled={isLocked} />
  );

  const ta = (field, minH = 36) => (
    <Field
      as="textarea"
      rows={2}
      value={docData[field] || ""}
      onChange={setField(field)}
      disabled={isLocked}
      style={{ minHeight: minH }}
    />
  );

  return (
    <DashboardLayout title="HBL Telex Release">
      <div className="space-y-6 w-full font-poppins">

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 mb-6">
          <button
            onClick={() => setActiveTab("generate")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "generate"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Generate Document
          </button>
          <button
            onClick={() => setActiveTab("stored")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "stored"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Stored Documents
          </button>
        </div>

        {activeTab === "generate" ? (
          <>
            {/* ── Selection Panel ─────────────────────────────────── */}
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 shadow-md p-6 rounded-2xl">
              <h3 className="text-md font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <FileText size={20} className="text-indigo-500" />
                Select Job &amp; HBL
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Job Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Job Number</label>
                  <SearchableDropdown
                    options={jobOptions}
                    value={selectedJobNo}
                    onChange={(val) => setSelectedJobNo(val)}
                    placeholder={loading ? "Loading jobs…" : "Select Job Number"}
                    disabled={loading || isLocked}
                  />
                </div>
                {/* HBL Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">HBL Number</label>
                  <SearchableDropdown
                    options={hblOptions}
                    value={selectedHblId}
                    onChange={(val) => setSelectedHblId(val)}
                    placeholder={houseBLs.length === 0 ? "Select Job first" : "Select HBL"}
                    disabled={houseBLs.length === 0 || isLocked}
                  />
                </div>
                {/* Actions */}
                <div className="flex items-end gap-3 w-full md:w-auto">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={!docData || generating || saving}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-6 rounded-xl text-sm font-semibold transition-all duration-200 h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating || saving ? (
                      <><RefreshCw size={16} className="animate-spin" /> Processing…</>
                    ) : (
                      <><Download size={16} /> Download PDF</>
                    )}
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={!docData}
                    className="flex items-center justify-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer size={16} /> Print
                  </button>
                </div>
              </div>
            </div>

            {/* Lock Alert Banner */}
            {isLocked && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Lock size={16} /> Document already exists for this Job. Loading stored version (Read-Only).
              </div>
            )}

            {fetching && (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" />
              </div>
            )}

            {!fetching && selectedJobNo && houseBLs.length === 0 && !isLocked && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Search size={16} /> No House BLs found for Job #{selectedJobNo}. Please ensure HBLs are created first.
              </div>
            )}

            {/* ── Document Preview ────────────────────────────────── */}
            {docData && (
              <div className={`bg-white dark:bg-dark-card border shadow-md rounded-2xl overflow-hidden transition-all ${isLocked ? "border-amber-300 dark:border-amber-700 ring-2 ring-amber-200 dark:ring-amber-800" : "border-slate-200 dark:border-slate-700/80"}`}>
                <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {isLocked ? "🔒 Stored Document (Locked)" : "Telex Release Preview"}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{docData.hblNo}</span>
                </div>

                <div className="p-4 sm:p-6 overflow-x-auto">
                  <div
                    ref={previewRef}
                    style={{
                      background: "#fff",
                      padding: "32px 36px",
                      fontFamily: "Arial, sans-serif",
                      fontSize: "10pt",
                      color: "#000",
                      maxWidth: "860px",
                      margin: "0 auto",
                      boxSizing: "border-box",
                      lineHeight: 1.6,
                    }}
                  >
                    {/* Header */}
                    <div style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #000", paddingBottom: "12px" }}>
                      <div style={{ fontSize: "14pt", fontWeight: "bold", letterSpacing: "1px" }}>
                        SSR LOGISTIC SOLUTIONS PVT LTD
                      </div>
                      <div style={{ fontSize: "8pt", color: "#333", marginTop: "4px" }}>
                        OFFICE NO. 612, 6TH FLOOR, VASHI INFOTECH PARK, SECTOR - 30 A, VASHI, NAVI MUMBAI - 400 703
                      </div>
                      <div style={{ fontSize: "8pt", color: "#333" }}>
                        Tel: 9619447105 | Email: CUSTOMERSERVICE@SSRLOGISTIC.NET | GSTIN: 27ABMCS1941A1ZI
                      </div>
                    </div>

                    {/* Title */}
                    <div style={{ textAlign: "center", margin: "16px 0 24px", fontSize: "13pt", fontWeight: "bold", letterSpacing: "2px", textDecoration: "underline" }}>
                      TELEX RELEASE
                    </div>

                    {/* Date & Ref */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "9pt" }}>
                      <div><strong>Date:</strong> {inp("dateOfIssue")}</div>
                      <div className="flex gap-4">
                        <div><strong>Ref No (Job No):</strong> {inp("jobNo")}</div>
                        <div><strong>B/L No:</strong> {inp("blNo")}</div>
                      </div>
                    </div>

                    {/* To Whom */}
                    <div style={{ marginBottom: "20px", fontSize: "10pt" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "8px" }}>TO WHOM IT MAY CONCERN</div>
                      <p style={{ margin: "0 0 12px" }}>
                        We, SSR LOGISTIC SOLUTIONS PVT LTD, hereby confirm that the original Bill(s) of Lading
                        as detailed below have been surrendered to us at origin port and the cargo may be released
                        to the consignee/notify party without presentation of original Bill(s) of Lading.
                      </p>
                    </div>

                    {/* Shipment Details Table */}
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", marginBottom: "16px" }}>
                      <tbody>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", width: "35%", background: "#f5f5f5", fontSize: "9pt" }}>MBL Number</td>
                          <td style={{ border: "1px solid #000", padding: "4px 8px" }}>{inp("mblNo")}</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", background: "#f5f5f5", fontSize: "9pt" }}>HBL Number</td>
                          <td style={{ border: "1px solid #000", padding: "4px 8px" }}>{inp("hblNo")}</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", background: "#f5f5f5", fontSize: "9pt" }}>Shipper</td>
                          <td style={{ border: "1px solid #000", padding: "4px 8px" }}>{ta("shipper", 36)}</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", background: "#f5f5f5", fontSize: "9pt" }}>Consignee</td>
                          <td style={{ border: "1px solid #000", padding: "4px 8px" }}>{ta("consignee", 36)}</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", background: "#f5f5f5", fontSize: "9pt" }}>Notify Party</td>
                          <td style={{ border: "1px solid #000", padding: "4px 8px" }}>{ta("notifyParty", 36)}</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", background: "#f5f5f5", fontSize: "9pt" }}>Vessel / Voyage</td>
                          <td style={{ border: "1px solid #000", padding: "4px 8px" }}>{inp("vesselVoyage")}</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", background: "#f5f5f5", fontSize: "9pt" }}>Port of Loading</td>
                          <td style={{ border: "1px solid #000", padding: "4px 8px" }}>{inp("pol")}</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", background: "#f5f5f5", fontSize: "9pt" }}>Port of Discharge</td>
                          <td style={{ border: "1px solid #000", padding: "4px 8px" }}>{inp("pod")}</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", background: "#f5f5f5", fontSize: "9pt" }}>Final Destination</td>
                          <td style={{ border: "1px solid #000", padding: "4px 8px" }}>{inp("finalDestination")}</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", background: "#f5f5f5", fontSize: "9pt" }}>No. of Packages</td>
                          <td style={{ border: "1px solid #000", padding: "4px 8px" }}>{inp("noOfPackages")}</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", background: "#f5f5f5", fontSize: "9pt" }}>Gross Weight</td>
                          <td style={{ border: "1px solid #000", padding: "4px 8px" }}>{inp("grossWeight")}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Container Details */}
                    {docData.containerList?.length > 0 && (
                      <>
                        <div style={{ fontWeight: "bold", fontSize: "9pt", marginBottom: "6px" }}>Container Details:</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", marginBottom: "16px" }}>
                          <thead>
                            <tr style={{ background: "#f5f5f5" }}>
                              <th style={{ border: "1px solid #000", padding: "5px 8px", fontSize: "8pt", textAlign: "left" }}>S.No</th>
                              <th style={{ border: "1px solid #000", padding: "5px 8px", fontSize: "8pt", textAlign: "left" }}>Container No</th>
                              <th style={{ border: "1px solid #000", padding: "5px 8px", fontSize: "8pt", textAlign: "left" }}>Seal No</th>
                              <th style={{ border: "1px solid #000", padding: "5px 8px", fontSize: "8pt", textAlign: "left" }}>Size / Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {docData.containerList.map((c, i) => (
                              <tr key={i}>
                                <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8pt" }}>{i + 1}</td>
                                <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8pt", fontWeight: "600" }}>{c.containerNo}</td>
                                <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8pt" }}>{c.sealNo}</td>
                                <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8pt" }}>{c.size}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}

                    {/* Disclaimer */}
                    <p style={{ fontSize: "9pt", margin: "16px 0" }}>
                      This Telex Release is issued subject to the terms and conditions of the original Bill of Lading.
                      We assume no responsibility for any loss or damage to the cargo after the release.
                    </p>

                    {/* Signature block */}
                    <div style={{ marginTop: "36px", display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "9pt", fontWeight: "bold" }}>Place of Issue: {inp("branchCode")}</div>
                        <div style={{ fontSize: "9pt" }}>Date: {docData.dateOfIssue}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: "bold", fontSize: "9pt", marginBottom: "4px" }}>
                          For SSR LOGISTIC SOLUTIONS PVT LTD
                        </div>
                        <div style={{ marginTop: "50px", borderTop: "1px solid #000", display: "inline-block", padding: "4px 30px", fontSize: "9pt" }}>
                          Authorised Signatory
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Stored Documents Tab */
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 shadow-md p-6 rounded-2xl">
            <h3 className="text-md font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Search size={20} className="text-indigo-500" />
              Search Stored Telex Release Documents
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Job Number</label>
                <input
                  type="text"
                  value={searchJobNo}
                  onChange={(e) => setSearchJobNo(e.target.value)}
                  placeholder="Enter Job Number"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">B/L Number</label>
                <input
                  type="text"
                  value={searchBLNo}
                  onChange={(e) => setSearchBLNo(e.target.value)}
                  placeholder="Enter B/L Number"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearchStored}
                  disabled={searching}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl text-sm font-semibold transition-all duration-200 h-[38px] disabled:opacity-50"
                >
                  {searching ? (
                    <><RefreshCw size={16} className="animate-spin" /> Searching…</>
                  ) : (
                    <><Search size={16} /> Search</>
                  )}
                </button>
              </div>
            </div>

            {/* Results Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                    <th className="py-3 px-4">Job Number</th>
                    <th className="py-3 px-4">B/L Number</th>
                    <th className="py-3 px-4">Date Saved</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {storedDocs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-slate-400">
                        No stored documents found.
                      </td>
                    </tr>
                  ) : (
                    storedDocs.map((doc) => (
                      <tr key={doc.id} className="border-b border-slate-50 dark:border-slate-800/50 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3.5 px-4 font-semibold">Job #{doc.job_no}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{doc.bl_no}</td>
                        <td className="py-3.5 px-4">{new Date(doc.created_at).toLocaleDateString()}</td>
                        <td className="py-3.5 px-4 text-right flex justify-end gap-2.5">
                          <button
                            onClick={() => handleViewStored(doc)}
                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-3 py-1.5 rounded-lg transition-all"
                          >
                            <Eye size={13} /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
