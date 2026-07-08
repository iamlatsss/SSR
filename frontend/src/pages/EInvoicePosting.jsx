import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  Search, RefreshCw, Eye, Check, X, FileText, Download, Play, AlertTriangle, History, QrCode, FileJson, Ban
} from 'lucide-react';

export default function EInvoicePosting() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelReasonCode, setCancelReasonCode] = useState('2'); // 2 = Data Entry Mistake, 1 = Duplicate, 3 = Order Cancelled, 4 = Others
  const [cancelRemarks, setCancelRemarks] = useState('');

  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseInvoice, setResponseInvoice] = useState(null);

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logInvoice, setLogInvoice] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [previewPdfUrl, setPreviewPdfUrl] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get("/einvoice/posting/list", {
        params: { search: searchQuery }
      });
      if (res.data.success) {
        setInvoices(res.data.invoices || []);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error("Error loading approved E-Invoices for posting:", err);
      toast.error("Failed to load approved invoices.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all ready for posting (no IRN generated yet)
      const eligible = invoices.filter(inv => !inv.irn).map(inv => inv.id);
      setSelectedIds(eligible);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handlePostSingle = async (id) => {
    try {
      setLoading(true);
      const res = await api.post("/einvoice/posting/post", { ids: [id] });
      if (res.data.success && res.data.successCount > 0) {
        const item = res.data.results[0];
        toast.success(`Posted successfully! IRN: ${item.irn.substring(0, 16)}...`);
        fetchInvoices();
      } else {
        const errDetails = res.data.results?.[0]?.message || "Posting failed.";
        toast.error(`Posting failed: ${errDetails}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Server error during posting.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPost = async () => {
    if (selectedIds.length === 0) {
      toast.warning("Please select at least one invoice.");
      return;
    }

    if (!window.confirm(`Are you sure you want to post ${selectedIds.length} invoice(s) to GSP?`)) return;

    try {
      setLoading(true);
      const res = await api.post("/einvoice/posting/post", { ids: selectedIds });
      
      const successCount = res.data.successCount || 0;
      const failureCount = res.data.failureCount || 0;

      if (successCount > 0) {
        toast.success(`Successfully posted ${successCount} invoice(s).`);
      }
      if (failureCount > 0) {
        toast.error(`Failed to post ${failureCount} invoice(s). Check response logs.`);
      }

      fetchInvoices();
    } catch (err) {
      toast.error("Bulk posting API execution failed.");
    } finally {
      setLoading(false);
    }
  };

  const triggerCancelModal = (id) => {
    setCancelId(id);
    setCancelReasonCode('2');
    setCancelRemarks('');
    setShowCancelModal(true);
  };

  const handleCancelSubmit = async () => {
    try {
      setLoading(true);
      const res = await api.post("/einvoice/posting/cancel", {
        id: cancelId,
        reasonCode: cancelReasonCode,
        remarks: cancelRemarks
      });
      if (res.data.success) {
        toast.success("E-Invoice IRN cancelled successfully.");
        setShowCancelModal(false);
        fetchInvoices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel IRN.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewResponse = (inv) => {
    setResponseInvoice(inv);
    setShowResponseModal(true);
  };

  const handleDownloadQr = (inv) => {
    if (!inv.signed_qr_code) {
      toast.warning("No signed QR code available.");
      return;
    }

    // In a real implementation, you would download/draw QR. Here we save/display text.
    const blob = new Blob([inv.signed_qr_code], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `QRCode_${inv.invoice_no.replace(/\//g, '_')}.txt`;
    link.click();
    toast.success("QR Code raw content downloaded.");
  };

  const handleDownloadSigned = (inv) => {
    if (!inv.signed_invoice) {
      toast.warning("No signed invoice payload available.");
      return;
    }

    const blob = new Blob([inv.signed_invoice], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SignedInvoice_${inv.invoice_no.replace(/\//g, '_')}.txt`;
    link.click();
    toast.success("Signed Invoice payload downloaded.");
  };

  const handleViewLogs = async (inv) => {
    setLogInvoice(inv);
    setAuditLogs([]);
    setShowLogsModal(true);
    try {
      setLogsLoading(true);
      const res = await api.get(`/einvoice/audit-logs/${inv.id}`);
      if (res.data.success) {
        setAuditLogs(res.data.logs || []);
      }
    } catch (err) {
      toast.error("Failed to load logs.");
    } finally {
      setLogsLoading(false);
    }
  };

  const openPdfPreview = (pdfUrl) => {
    setPreviewPdfUrl(pdfUrl);
    setShowPreviewModal(true);
  };

  return (
    <DashboardLayout title="E-Invoice Posting">
      <div className="space-y-6 w-full p-1 font-poppins">
        
        {/* ACTION BAR / SEARCH */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 shadow-md p-6 rounded-2xl flex flex-wrap gap-4 justify-between items-center transition-all duration-300">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 w-full max-w-md h-[44px]">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice no, job no, or party name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-0 outline-none text-slate-900 dark:text-white text-sm w-full focus:ring-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={fetchInvoices} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 h-[44px] shadow-md">
              <RefreshCw size={16} /> Refresh List
            </button>
            <button
              onClick={handleBulkPost}
              disabled={selectedIds.length === 0 || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all duration-200 h-[44px] shadow-md"
            >
              <Play size={16} /> Bulk Post Invoices ({selectedIds.length})
            </button>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-md overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">
                  <th className="p-4 text-center w-[50px]">
                    <input
                      type="checkbox"
                      checked={invoices.length > 0 && invoices.filter(i => !i.irn).every(i => selectedIds.includes(i.id))}
                      onChange={handleSelectAll}
                      className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                    />
                  </th>
                  <th className="p-4">INVNo</th>
                  <th className="p-4">JobNo</th>
                  <th className="p-4">Party</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">GSTNo</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-10 text-center font-bold text-slate-500">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Posting / Querying records...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-10 text-center text-slate-500 italic">
                      No approved invoices ready for posting found.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    let totalVal = 0;
                    try {
                      const parsedTotals = typeof inv.totals === 'string' ? JSON.parse(inv.totals) : (inv.totals || {});
                      totalVal = parseFloat(parsedTotals.grandTotal || parsedTotals.inrTotal || 0);
                    } catch(e){}

                    const isUSD = inv.print_type === 'USD';
                    const amountStr = isUSD 
                      ? `$ ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                      : `₹ ${totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

                    const hasIrn = !!inv.irn;

                    return (
                      <tr key={inv.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors ${selectedIds.includes(inv.id) ? 'bg-indigo-50/10 dark:bg-indigo-950/10' : ''}`}>
                        <td className="p-4 text-center">
                          {!hasIrn ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(inv.id)}
                              onChange={() => handleSelectRow(inv.id)}
                              className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                            />
                          ) : (
                            <span className="text-slate-350 dark:text-slate-600">-</span>
                          )}
                        </td>

                        <td className="p-4 font-bold text-slate-900 dark:text-white">#{inv.invoice_no}</td>
                        <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">#{inv.job_no}</td>
                        <td className="p-4 font-semibold max-w-[180px] truncate" title={inv.client_name}>{inv.client_name}</td>
                        <td className="p-4">{new Date(inv.invoice_date).toLocaleDateString('en-GB')}</td>
                        <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-350">{inv.client_gstin || 'URP'}</td>

                        {/* Status Badge */}
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            inv.einvoice_status === 'Posted' ? 'bg-emerald-100 text-emerald-800' :
                            inv.einvoice_status === 'Failed' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {inv.einvoice_status || 'Pending'}
                          </span>
                        </td>

                        <td className="p-4 text-right font-bold text-slate-800 dark:text-slate-200">{amountStr}</td>

                        {/* Unified Actions Column */}
                        <td className="p-4 text-right flex justify-end gap-2">
                          {!hasIrn ? (
                            <button
                              onClick={() => handlePostSingle(inv.id)}
                              title="Post IRN"
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-md inline-flex items-center justify-center"
                            >
                              <Play size={16} />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => triggerCancelModal(inv.id)}
                                title="Cancel E-Invoice IRN"
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-900/30 dark:text-rose-400 rounded-lg transition-colors inline-flex items-center justify-center"
                              >
                                <Ban size={16} />
                              </button>
                              <button
                                onClick={() => handleViewResponse(inv)}
                                title="View GSP Response JSON"
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 dark:text-indigo-400 rounded-lg transition-colors inline-flex items-center justify-center"
                              >
                                <FileJson size={16} />
                              </button>
                              <button
                                onClick={() => handleDownloadQr(inv)}
                                title="Download QR Code Token"
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:hover:bg-slate-800/30 dark:text-slate-350 rounded-lg transition-colors inline-flex items-center justify-center"
                              >
                                <QrCode size={16} />
                              </button>
                              <button
                                onClick={() => handleDownloadSigned(inv)}
                                title="Download Signed Invoice Token"
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:hover:bg-slate-800/30 dark:text-slate-350 rounded-lg transition-colors inline-flex items-center justify-center"
                              >
                                <FileText size={16} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleViewLogs(inv)}
                            title="Audit Timeline Logs"
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:hover:bg-slate-800/30 dark:text-slate-350 rounded-lg transition-colors inline-flex items-center justify-center"
                          >
                            <History size={16} />
                          </button>
                          <button
                            onClick={() => openPdfPreview(inv.pdf_link)}
                            title="View PDF Invoice"
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 dark:text-indigo-400 rounded-lg transition-colors inline-flex items-center justify-center"
                          >
                            <Eye size={16} />
                          </button>
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

      {/* CANCEL IRN MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-4 bg-slate-50 border-b dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={14} className="text-rose-500" /> Cancel E-Invoice IRN
              </h3>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            
            <div className="p-5 space-y-4 text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Cancellation Reason Code</label>
                <select
                  value={cancelReasonCode}
                  onChange={(e) => setCancelReasonCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="1">1 - Duplicate Invoice</option>
                  <option value="2">2 - Data Entry Mistake</option>
                  <option value="3">3 - Order Cancelled</option>
                  <option value="4">4 - Others</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Remarks / Reasons</label>
                <textarea
                  value={cancelRemarks}
                  onChange={(e) => setCancelRemarks(e.target.value)}
                  rows="3"
                  placeholder="Enter detailed reason for portal cancellation..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                ></textarea>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end gap-2 dark:bg-slate-800 dark:border-slate-700">
              <button onClick={() => setShowCancelModal(false)} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2 rounded-xl text-sm font-semibold transition-all">Close</button>
              <button onClick={handleCancelSubmit} className="bg-rose-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-rose-700 shadow-md">Confirm Cancellation</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW GSP RESPONSE DIALOG */}
      {showResponseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 h-[70vh] flex flex-col">
            <div className="flex justify-between items-center p-4 bg-slate-50 border-b dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileJson size={14} className="text-indigo-500" /> GSP Portal Payload Response
              </h3>
              <button onClick={() => setShowResponseModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-900 text-teal-400 font-mono text-xs leading-relaxed whitespace-pre rounded-none overflow-x-auto select-all">
              {responseInvoice?.einvoice_response 
                ? JSON.stringify(JSON.parse(responseInvoice.einvoice_response), null, 2) 
                : "{}"}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end dark:bg-slate-800 dark:border-slate-700">
              <button onClick={() => setShowResponseModal(false)} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2 rounded-xl text-sm font-semibold transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOGS HISTORY DIALOG */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 bg-slate-50 border-b dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <History size={15} className="text-indigo-500" /> Action Logs Timeline: {logInvoice?.invoice_no}
              </h3>
              <button onClick={() => setShowLogsModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {logsLoading ? (
                <div className="text-center p-10 text-slate-400 font-bold">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-500" />
                  Loading logs from database...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center p-10 text-slate-400 italic">
                  No action logs recorded.
                </div>
              ) : (
                <div className="space-y-4 font-mono">
                  {auditLogs.map((log) => {
                    let detailsObj = null;
                    try {
                      detailsObj = JSON.parse(log.details);
                    } catch(e) {}

                    return (
                      <div key={log.id} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-sm space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Action: <strong className="text-indigo-600 uppercase">{log.action}</strong></span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-350 font-poppins">
                          User: <strong className="text-slate-900 dark:text-white">{log.user_name} ({log.user_email})</strong>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded border dark:border-slate-800 text-xs text-slate-500 overflow-x-auto whitespace-pre">
                          {detailsObj ? JSON.stringify(detailsObj, null, 2) : log.details}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end dark:bg-slate-800 dark:border-slate-700">
              <button onClick={() => setShowLogsModal(false)} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2 rounded-xl text-sm font-semibold transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* PDF INTERACTIVE PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white font-poppins">
                  Interactive Tax Invoice PDF Preview
                </h3>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-1.5 text-slate-500 hover:text-red-500 rounded-lg"><X size={18} /></button>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-slate-900 p-2">
              {previewPdfUrl ? (
                <iframe src={previewPdfUrl} title="PDF Preview" className="w-full h-full border-0 rounded-xl" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 italic">
                  No PDF Preview file URL located.
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <a href={previewPdfUrl} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-semibold transition-all">
                <Download size={16} /> Download PDF
              </a>
              <button onClick={() => setShowPreviewModal(false)} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2 rounded-xl font-semibold transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
