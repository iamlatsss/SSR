import React, { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { FileText, Download, Printer, RefreshCw, Search, Lock, ShieldCheck, Eye, Save } from "lucide-react";
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

const formatPartyAddress = (name, addressesJson) => {
  if (!name) return "";
  let addressStr = "";
  if (addressesJson) {
    try {
      const addrs = typeof addressesJson === "string" ? JSON.parse(addressesJson) : addressesJson;
      if (Array.isArray(addrs) && addrs.length > 0) {
        const addr = addrs.find((a) => a.is_default) || addrs[0];
        if (addr) {
          const parts = [
            addr.address_line1 || addr.address1,
            addr.address_line2 || addr.address2,
            addr.city,
            addr.pin_code ? String(addr.pin_code) : "",
            addr.gst_state,
            addr.country,
          ].filter((p) => p && String(p).trim() !== "");
          addressStr = parts.join(", ");
        }
      }
    } catch (e) {
      console.error("Error formatting party address:", e);
    }
  }
  return addressStr ? `${name}\n${addressStr}` : name;
};

// ─── Shared micro-styles ──────────────────────────────────────────────────────
const CELL = {
  border: "1px solid #000",
  padding: "3px 5px",
  verticalAlign: "top",
  fontSize: "7.5pt",
  fontFamily: "Arial, sans-serif",
  color: "#000",
};

const LABEL = {
  display: "block",
  fontSize: "7pt",
  marginBottom: "2px",
  lineHeight: 1.2,
};

const INPUT = {
  display: "block",
  width: "100%",
  border: "none",
  borderBottom: "1px dotted #aaa",
  outline: "none",
  background: "transparent",
  fontSize: "7.5pt",
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

const STATIC_TEXT = {
  fontSize: "7pt",
  lineHeight: 1.45,
  color: "#000",
  fontFamily: "Arial, sans-serif",
};

// ─── Non-editable field helper ───────────────────────────────────────────────────
function Field({ as = "input", style, disabled, ...props }) {
  const baseStyle = {
    display: "block",
    width: "100%",
    fontSize: "7.5pt",
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

export default function HBLFinal() {
  const previewRef = useRef(null);

  // Data State
  const [mblJobs, setMblJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Selection
  const [selectedJobNo, setSelectedJobNo] = useState("");
  const [houseBLs, setHouseBLs] = useState([]);
  const [selectedHblId, setSelectedHblId] = useState("");

  // Resolved document data
  const [masterBL, setMasterBL] = useState(null);
  const [docData, setDocData] = useState(null);

  // Tabs & Lock Status
  const [activeTab, setActiveTab] = useState("generate"); // "generate" or "stored"
  const [existingBLNo, setExistingBLNo] = useState(null);

  // Search state for stored docs
  const [searchJobNo, setSearchJobNo] = useState("");
  const [searchBLNo, setSearchBLNo] = useState("");
  const [storedDocs, setStoredDocs] = useState([]);
  const [searching, setSearching] = useState(false);

  // ── Load MBL jobs list ─────────────────────────────────────
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

  // ── Fetch data on job change ───────────────────────────────
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
        // Check if HBL Final already exists for this job
        const checkRes = await api.get(`/housebl/document/check/${selectedJobNo}/Final`);
        if (checkRes.data.success && checkRes.data.exists) {
          const doc = checkRes.data.document;
          setDocData(doc.doc_data);
          setIsLocked(true);
          toast.info("Loaded existing Final HBL document for Job #" + selectedJobNo);
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

  // ── Resolve document fields ────────────────────────────────
  useEffect(() => {
    if (isLocked) return; // Prevent overwriting stored document

    if (!selectedHblId || !masterBL) { setDocData(null); setIsLocked(false); return; }
    const hbl = houseBLs.find((h) => String(h.id) === selectedHblId);
    if (!hbl) { setDocData(null); return; }

    const ad = parseJSON(hbl.additional_details);
    const containers = ad.containers || [];
    const containerNos = containers.map((c) => {
      if (c.container_no && c.seal_no) {
        return `${c.container_no} / SEAL: ${c.seal_no}`;
      }
      return c.container_no || "";
    }).filter(Boolean).join("\n") || "";

    const pol = ad.pol || masterBL.pol || "";
    const pod = ad.pod || masterBL.pod || "";
    const fpd = ad.final_pod || masterBL.final_pod || "";

    const routeParts = [pol, pod, fpd].filter(Boolean);
    const placeOfDelivery = fpd || pod || "";

    // Notify Party SAME AS CONSIGNEE logic
    const consigneeName = hbl.consignee_name || "";
    const notifyName = ad.notify || "";
    let notifyAddress = formatPartyAddress(notifyName, ad.notify_addresses);
    if (notifyName && consigneeName && notifyName.trim().toLowerCase() === consigneeName.trim().toLowerCase()) {
      notifyAddress = "SAME AS CONSIGNEE";
    }

    setDocData({
      consignor: formatPartyAddress(hbl.shipper_name, hbl.shipper_addresses),
      consignee: formatPartyAddress(hbl.consignee_name, hbl.consignee_addresses),
      mtdNo: hbl.hbl_no || "",
      shipmentRefNo: existingBLNo || "",
      notifyAddress,
      placeOfAcceptance: pol,
      dateOfAcceptance: formatDate(masterBL.etd || ad.etd),
      placeOfDelivery,
      dateOfDelivery: formatDate(masterBL.eta || ad.eta),
      modesOfTransport: ad.services || "Sea Freight",
      routeTransshipment: routeParts.join(" → "),
      containerNos,
      marksNumbers: hbl.marks_and_numbers || "",
      packagesDescription: ad.description || hbl.marks_and_numbers || "",
      grossWeight: hbl.gross_weight ? `${hbl.gross_weight} KGS` : "",
      measurement: ad.volume ? `${ad.volume} CBM` : "",
      freightAmount: hbl.freight_amount ? `${hbl.freight_amount} ${hbl.freight_currency || "USD"}` : "",
      freightPayableAt: ad.freight_status || "",
      numberOfOriginalMTD: "THREE (3)",
      placeAndDateOfIssue: `${ad.branch_code || "Mumbai"}, ${formatDate(new Date().toISOString())}`,
      otherParticulars: "",
      companyName: "SSR LOGISTIC SOLUTIONS PVT LTD",
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
        document_type: "Final",
        doc_data: docData
      });

      if (res.data.success) {
        toast.success(res.data.message || "Document saved successfully");
        const updatedDoc = { ...docData, shipmentRefNo: res.data.bl_no };
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
        document_type: "Final"
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
            document_type: "Final",
            doc_data: docData
          });

          if (res.data.success) {
            toast.success("Document stored successfully!");
            const confirmedBLNo = res.data.bl_no;
            currentDocData = { ...docData, shipmentRefNo: confirmedBLNo };
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

      const element = previewRef.current;
      const opt = {
        margin: [4, 4, 4, 4],
        filename: `HBL_Final_${currentDocData.shipmentRefNo || "draft"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
      await html2pdf().set(opt).from(element).save();
      toast.success("PDF downloaded successfully!");
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
      <html><head><title>HBL Final — ${docData?.shipmentRefNo || ""}</title>
      <style>
        body { margin: 0; padding: 16px; font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; font-size: 7.5pt; }
        @media print { body { padding: 0; } }
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
    <DashboardLayout title="HBL Final">
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
                Generate Final HBL Document
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Job Number</label>
                  <SearchableDropdown
                    options={jobOptions}
                    value={selectedJobNo}
                    onChange={(val) => { setSelectedJobNo(val); }}
                    placeholder={loading ? "Loading jobs…" : "Select Job Number"}
                    disabled={loading || isLocked}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">HBL Number</label>
                  <SearchableDropdown
                    options={hblOptions}
                    value={selectedHblId}
                    onChange={(val) => { setSelectedHblId(val); }}
                    placeholder={houseBLs.length === 0 ? "Select Job first" : "Select HBL"}
                    disabled={houseBLs.length === 0 || isLocked}
                  />
                </div>
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

            {/* Status alerts */}
            {isLocked && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Lock size={16} /> Document already exists for this Job. Loading stored version (Read-Only).
              </div>
            )}

            {/* ── Status ──────────────────────────────────────────── */}
            {fetching && (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" />
              </div>
            )}

            {!fetching && selectedJobNo && houseBLs.length === 0 && !isLocked && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Search size={16} /> No House BLs found for Job #{selectedJobNo}.
              </div>
            )}

            {/* ── Document Preview ────────────────────────────────── */}
            {docData && (
              <div className={`bg-white dark:bg-dark-card border shadow-md rounded-2xl overflow-hidden transition-all ${isLocked ? "border-amber-300 dark:border-amber-700 ring-2 ring-amber-200 dark:ring-amber-800" : "border-slate-200 dark:border-slate-700/80"}`}>
                <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {isLocked ? "🔒 Stored Document (Locked)" : "Document Preview"}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{docData.mtdNo}</span>
                </div>

                <div className="p-4 sm:p-6 overflow-x-auto">
                  <div
                    ref={previewRef}
                    style={{
                      background: "#fff",
                      padding: "24px 28px",
                      fontFamily: "Arial, sans-serif",
                      fontSize: "7.5pt",
                      color: "#000",
                      maxWidth: "860px",
                      margin: "0 auto",
                      boxSizing: "border-box",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        border: "1px solid #000",
                        tableLayout: "fixed",
                      }}
                    >
                      {/* Column grid — 11 logical columns matching the docx */}
                      <colgroup>
                        <col style={{ width: "7.5%" }}  /> {/* 0  Container */}
                        <col style={{ width: "6.5%" }}  /> {/* 1  Marks pt1 */}
                        <col style={{ width: "5%" }}    /> {/* 2  Marks pt2 */}
                        <col style={{ width: "8%" }}    /> {/* 3  */}
                        <col style={{ width: "13%" }}   /> {/* 4  */}
                        <col style={{ width: "2%" }}    /> {/* 5  */}
                        <col style={{ width: "19.5%" }} /> {/* 6  Pkg description */}
                        <col style={{ width: "7%" }}    /> {/* 7  */}
                        <col style={{ width: "3%" }}    /> {/* 8  */}
                        <col style={{ width: "10%" }}   /> {/* 9  Gross Weight */}
                        <col style={{ width: "18.5%" }} /> {/* 10 Measurement */}
                      </colgroup>

                      <tbody>

                        {/* ── ROW 1 · Title ─────────────────────────────────────────────── */}
                        <tr>
                          <td
                            colSpan={11}
                            style={{
                              ...CELL,
                              textAlign: "center",
                              fontSize: "10pt",
                              padding: "6px 5px",
                            }}
                          >
                            SSR LOGISTIC SOLUTIONS PVT LTD. Bill of Lading
                          </td>
                        </tr>

                        {/* ── ROW 2 · Consignor / Consignee  |  MTD + Company block ──────── */}
                        <tr>
                          <td colSpan={5} style={{ ...CELL, padding: "4px 5px" }}>
                            <span style={LABEL}>Consignor</span>
                            {ta("consignor", 52)}

                            <span
                              style={{
                                ...LABEL,
                                fontFamily: "Times New Roman, serif",
                                marginTop: "10px",
                                fontSize: "8pt",
                              }}
                            >
                              Consignee (or To order)
                            </span>
                            {ta("consignee", 52)}
                          </td>

                          <td colSpan={6} style={{ ...CELL, padding: "4px 6px" }}>
                            <div style={{ marginBottom: "3px" }}>
                              <span style={{ ...LABEL, fontWeight: "bold", fontSize: "8pt" }}>
                                MTD No.:
                              </span>
                              {inp("mtdNo")}
                            </div>
                            <div style={{ marginTop: "4px", marginBottom: "6px" }}>
                              <span style={{ ...LABEL, fontWeight: "bold", fontSize: "8pt" }}>
                                B/L No.:
                              </span>
                              {inp("shipmentRefNo")}
                            </div>

                            {/* SSR Logo */}
                            <div style={{ margin: "6px 0 4px 0" }}>
                              <img
                                src="/ssr_logo.webp"
                                alt="SSR Logistic Solutions Logo"
                                style={{ height: "64px", width: "auto", display: "block" }}
                              />
                            </div>

                            {/* Static company block */}
                            <div style={{ fontSize: "7.5pt", lineHeight: 1.45 }}>
                              <div style={{ fontWeight: "bold" }}>
                                SSR LOGISTIC SOLUTIONS PVT LTD
                              </div>
                              <div>OFFICE NO. 612, 6TH FLOOR, VASHI INFOTECH PARK,</div>
                              <div>SECTOR - 30 A, NEAR RAGHULEELA MALL, VASHI,</div>
                              <div>NAVI MUMBAI - 400 703</div>
                              <div>E-MAIL ID: CUSTOMERSERVICE@SSRLOGISTIC.NET</div>
                              <div>/SENTIL.KUMAR@SSRLOGISTIC.NET</div>
                              <div>MOB. NO: 9619447105</div>
                              <div>GSTIN: 27ABMCS1941A1ZI PAN: ABMCS1941A</div>
                            </div>
                          </td>
                        </tr>

                        {/* ── ROW 3 · Notify address  |  Two static legal text blocks ─────── */}
                        <tr>
                          <td colSpan={5} style={{ ...CELL, minHeight: "60px" }}>
                            <span style={LABEL}>Notify address</span>
                            {ta("notifyAddress", 50)}
                          </td>
                          <td colSpan={6} style={{ ...CELL, padding: "4px 5px" }}>
                            {/* Static legal block 1 */}
                            <p style={{ ...STATIC_TEXT, margin: "0 0 6px 0" }}>
                              Taken in charge in apparently good condition herein at the place of receipt for
                              transport &amp; delivery as mentioned above unless otherwise stated. The MTO in
                              accordance with the provision contained in the MTD undertakes to perform or to
                              procure the performance of the multimodal transport from the place at which the
                              goods are taken in charge, to the place designated for delivery &amp; assume
                              responsibility for such transport.
                            </p>
                            {/* Static legal block 2 */}
                            <p style={{ ...STATIC_TEXT, margin: 0 }}>
                              One of the MTD (S) must be surrendered, duly endorsed in exchange for the
                              goods in witness where of the original MTD all of this tenor &amp; date have been
                              signed in the number indicated below one of which being accomplished the
                              other(s) to be void.
                            </p>
                          </td>
                        </tr>

                        {/* ── ROW 4 · Place of acceptance | Date of acceptance ───────────── */}
                        <tr>
                          <td colSpan={2} style={CELL}>
                            <span style={LABEL}>Place of acceptance</span>
                            {inp("placeOfAcceptance")}
                          </td>
                          <td colSpan={3} style={CELL}>
                            <span style={LABEL}>Date of acceptance</span>
                            {inp("dateOfAcceptance")}
                          </td>
                          <td colSpan={6} style={CELL} />
                        </tr>

                        {/* ── ROW 5 · Place of delivery | Date/period | Modes | Route ──────── */}
                        <tr>
                          <td colSpan={2} style={{ ...CELL, minHeight: "52px" }}>
                            <span style={LABEL}>Place of delivery</span>
                            {inp("placeOfDelivery")}
                          </td>
                          <td colSpan={3} style={{ ...CELL, fontSize: "7pt" }}>
                            <span style={LABEL}>
                              Date or period of delivery (as expressly agreed upon by the consignor and MTO)
                            </span>
                            {inp("dateOfDelivery")}
                          </td>
                          <td colSpan={2} style={CELL}>
                            <span style={LABEL}>
                              <strong>Modes</strong> means of transport
                            </span>
                            {inp("modesOfTransport")}
                          </td>
                          <td colSpan={4} style={CELL}>
                            <span style={LABEL}>Route /place of transshipment (if any)</span>
                            {inp("routeTransshipment")}
                          </td>
                        </tr>

                        {/* ── ROW 6 · Container | Marks | Packages | Gross Weight | Measurement */}
                        <tr>
                          <td style={{ ...CELL, verticalAlign: "top" }}>
                            <span style={LABEL}>Container No(s)</span>
                            {ta("containerNos", 130)}
                          </td>
                          <td colSpan={2} style={{ ...CELL, verticalAlign: "top" }}>
                            <span style={LABEL}>Marks &amp; number</span>
                            {ta("marksNumbers", 130)}
                          </td>
                          <td colSpan={6} style={{ ...CELL, verticalAlign: "top" }}>
                            <span style={LABEL}>
                              Number of packages, Kind of packages, general description of goods
                            </span>
                            {ta("packagesDescription", 130)}
                          </td>
                          <td style={{ ...CELL, verticalAlign: "top" }}>
                            <span style={LABEL}>Gross Weight</span>
                            {ta("grossWeight", 130)}
                          </td>
                          <td style={{ ...CELL, verticalAlign: "top" }}>
                            <span style={LABEL}>Measurement</span>
                            {ta("measurement", 130)}
                          </td>
                        </tr>

                        {/* ── ROW 7 · Particulars furnished by ─────────────────────────── */}
                        <tr>
                          <td
                            colSpan={11}
                            style={{ ...CELL, fontSize: "8pt", padding: "4px 5px" }}
                          >
                            Particulars above furnished by consignee/consignor
                          </td>
                        </tr>

                        {/* ── ROW 8 · Freight | Payable | Orig MTD | Place & Date ──────────── */}
                        <tr>
                          <td colSpan={2} style={CELL}>
                            <span
                              style={{
                                ...LABEL,
                                fontFamily: "Times New Roman, serif",
                                fontSize: "8pt",
                              }}
                            >
                              Freight amount
                            </span>
                            {inp("freightAmount")}
                          </td>
                          <td colSpan={4} style={{ ...CELL, fontSize: "7pt" }}>
                            <span style={LABEL}>
                              Freight payable at by consignor / consignee (to be mentioned only if
                              expressively agreed by both the consignor/ consignee)
                            </span>
                            {inp("freightPayableAt")}
                          </td>
                          <td colSpan={2} style={CELL}>
                            <span style={LABEL}>Number of Original MTD</span>
                            {inp("numberOfOriginalMTD")}
                          </td>
                          <td colSpan={3} style={CELL}>
                            <span style={LABEL}>Place and Date of issue</span>
                            {inp("placeAndDateOfIssue")}
                          </td>
                        </tr>

                        {/* ── ROW 9 · Other particulars | Company + Signatory ──────────────── */}
                        <tr>
                          <td colSpan={8} style={{ ...CELL, verticalAlign: "top" }}>
                            <span style={LABEL}>Other particulars (if any)</span>
                            {ta("otherParticulars", 36)}
                            <div style={{ marginTop: "14px", fontSize: "7.5pt" }}>
                              Weight and measurement of container Not to be included
                            </div>
                          </td>
                          <td
                            colSpan={3}
                            style={{ ...CELL, verticalAlign: "top", padding: "6px 8px" }}
                          >
                            <div style={{ marginBottom: "4px", fontSize: "8pt" }}>
                              For&nbsp;(Company&#x2019;s name)
                            </div>
                            {inp("companyName")}
                            <div
                              style={{
                                marginTop: "38px",
                                fontSize: "8pt",
                                textAlign: "center",
                              }}
                            >
                              (Authorised Signatory)
                            </div>
                          </td>
                        </tr>

                        {/* ── ROW 10 · Empty footer ────────────────────────────────────── */}
                        <tr>
                          <td colSpan={4} style={{ ...CELL, height: "24px" }} />
                          <td colSpan={7} style={{ ...CELL, height: "24px" }} />
                        </tr>

                      </tbody>
                    </table>
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
              Search Stored Final HBL Documents
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
