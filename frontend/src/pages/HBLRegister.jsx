import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  FileText, Search, Plus, Filter, Lock, Unlock, Eye, Edit2, Download, History, ShieldCheck, RefreshCw, AlertCircle
} from "lucide-react";
import { toast } from "react-toastify";

export default function HBLRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDocType, setFilterDocType] = useState("all");
  const [filterLock, setFilterLock] = useState("all");

  // Audit Logs Modal
  const [selectedBlNo, setSelectedBlNo] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // PDF Preview Modal
  const [previewPdfUrl, setPreviewPdfUrl] = useState("");
  const [previewBlNo, setPreviewBlNo] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    loadRegister();
  }, [searchTerm, filterDocType, filterLock]);

  const loadRegister = async () => {
    try {
      setLoading(true);
      const res = await api.get("/hbl/register", {
        params: {
          search: searchTerm,
          document_type: filterDocType,
          is_locked: filterLock
        }
      });
      if (res.data.success) {
        setDocuments(res.data.documents || []);
      }
    } catch (e) {
      console.error("Error loading HBL register:", e);
      toast.error("Failed to load HBL register");
    } finally {
      setLoading(false);
    }
  };

  const handleLockBL = async (id, blNo) => {
    if (user?.role !== "Director" && user?.role !== "Admin") {
      toast.error("Only Director or Admin can lock a B/L permanently.");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently lock B/L ${blNo}? Once locked, nobody can edit it without admin approval.`)) {
      return;
    }

    try {
      const res = await api.put(`/hbl/lock/${id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        loadRegister();
      }
    } catch (e) {
      console.error("Error locking B/L:", e);
      toast.error("Failed to lock B/L");
    }
  };

  const handleViewAudit = async (blNo) => {
    setSelectedBlNo(blNo);
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

  const handleViewPDF = (doc) => {
    if (!doc.pdf_link) {
      toast.warning("PDF link not available for this record. Opening editor to generate...");
      navigate(`/hbl-generator?jobNo=${doc.job_no}&blNo=${doc.bl_no}`);
      return;
    }
    setPreviewPdfUrl(doc.pdf_link);
    setPreviewBlNo(doc.bl_no);
    setShowPreviewModal(true);
  };

  const isDirectorOrAdmin = user?.role === "Director" || user?.role === "Admin";

  return (
    <DashboardLayout title="HBL Documents Register">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-dark-card p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
              HBL Documents Register
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Permanent searchable repository of all Draft & Original House Bills of Lading
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadRegister}
              className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh Register"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <Link
              to="/hbl-generator"
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus size={16} /> Create New B/L
            </Link>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-dark-card p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by B/L No, Job No, Shipper..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Filter Document Type */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Type:</span>
              <select
                value={filterDocType}
                onChange={(e) => setFilterDocType(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none"
              >
                <option value="all">All Types</option>
                <option value="Draft">Draft</option>
                <option value="Original">Original</option>
              </select>
            </div>

            {/* Filter Lock Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Lock:</span>
              <select
                value={filterLock}
                onChange={(e) => setFilterLock(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="1">Locked Only</option>
                <option value="0">Unlocked Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Register Table */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  <th className="p-3.5">Job No</th>
                  <th className="p-3.5">B/L Number</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">B/L Date</th>
                  <th className="p-3.5">Shipper</th>
                  <th className="p-3.5">Consignee</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400">
                      Loading HBL Register...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400">
                      No HBL documents found matching your search.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const data = typeof doc.doc_data === "string" ? JSON.parse(doc.doc_data) : doc.doc_data || {};
                    const isDraft = doc.document_type === "Draft";

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          #{doc.job_no}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {doc.bl_no}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isDraft
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            }`}
                          >
                            {doc.document_type}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold">
                          {doc.bl_date || data.blDate || <span className="text-slate-400 italic">Not set</span>}
                        </td>
                        <td className="p-3.5 max-w-[180px] truncate" title={data.shipper}>
                          {data.shipper || "—"}
                        </td>
                        <td className="p-3.5 max-w-[180px] truncate" title={data.consignee}>
                          {data.consignee || "—"}
                        </td>
                        <td className="p-3.5 text-center">
                          {doc.is_locked ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                              title={`Locked by ${doc.locked_by || "Director"}`}
                            >
                              <Lock size={11} /> Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <Unlock size={11} /> Editable
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleViewPDF(doc)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                              title="View Generated PDF"
                            >
                              <Eye size={16} />
                            </button>

                            <Link
                              to={`/hbl-generator?jobNo=${doc.job_no}&blNo=${doc.bl_no}`}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                              title="Edit B/L Document"
                            >
                              <Edit2 size={16} />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleViewAudit(doc.bl_no)}
                              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                              title="View Audit Trail"
                            >
                              <History size={16} />
                            </button>

                            {!doc.is_locked && isDirectorOrAdmin && (
                              <button
                                type="button"
                                onClick={() => handleLockBL(doc.id, doc.bl_no)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors"
                                title="Lock B/L Permanently"
                              >
                                <Lock size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* PDF Preview Modal */}
      {showPreviewModal && previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <FileText className="text-indigo-600" size={22} />
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">
                    Bill of Lading PDF - {previewBlNo}
                  </h3>
                  <p className="text-xs text-slate-500">Single-Page Multimodal A4 Document</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`HBL_${previewBlNo}.pdf`}
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
              <iframe src={previewPdfUrl} className="w-full h-full rounded-lg border border-slate-300 dark:border-slate-700" title="PDF Preview" />
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
                Audit Trail for B/L {selectedBlNo}
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
    </DashboardLayout>
  );
}
