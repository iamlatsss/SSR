import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  Search, RefreshCw, Eye, Check, X, FileText, Download, Play, AlertTriangle,
  History, QrCode, FileJson, Ban, CheckSquare, Info, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function EInvoicePosting() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Advanced Filter states
  const [invoiceNo, setInvoiceNo] = useState('');
  const [jobNo, setJobNo] = useState('');
  const [clientName, setClientName] = useState('');
  const [gstin, setGstin] = useState('');
  const [branch, setBranch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [postingStatus, setPostingStatus] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelReasonCode, setCancelReasonCode] = useState('2'); // 2 = Data Entry Mistake, 1 = Duplicate, 3 = Order Cancelled, 4 = Others
  const [cancelRemarks, setCancelRemarks] = useState('');

  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseInvoice, setResponseInvoice] = useState(null);

  const [showIrnModal, setShowIrnModal] = useState(false);
  const [irnDetails, setIrnDetails] = useState(null);

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logInvoice, setLogInvoice] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [previewPdfUrl, setPreviewPdfUrl] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [showBulkResultModal, setShowBulkResultModal] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        invoiceNo: invoiceNo.trim(),
        jobNo: jobNo.trim(),
        clientName: clientName.trim(),
        gstin: gstin.trim(),
        branch: branch.trim(),
        fromDate,
        toDate,
        postingStatus: postingStatus === 'all' ? '' : postingStatus
      };

      const res = await api.get("/einvoice/posting/list", { params });
      if (res.data.success) {
        setInvoices(res.data.invoices || []);
        setSelectedIds([]);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error("Error loading approved E-Invoices for posting:", err);
      toast.error("Failed to load approved invoices.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInvoiceNo('');
    setJobNo('');
    setClientName('');
    setGstin('');
    setBranch('');
    setFromDate('');
    setToDate('');
    setPostingStatus('all');
    setInvoices([]);
    setSelectedIds([]);
    setCurrentPage(1);
    toast.info("Filters cleared.");
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all ready/failed for posting (no IRN generated yet)
      const eligible = currentItems.filter(inv => !inv.irn).map(inv => inv.id);
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

  const handleValidateSingle = async (id) => {
    try {
      setLoading(true);
      const res = await api.post("/einvoice/posting/validate", { id });
      if (res.data.success) {
        toast.success("Validation passed successfully! Ready for GSP posting.");
      } else {
        const errorList = res.data.errors || [];
        toast.error(`Validation checks failed:\n${errorList.join('\n')}`, { autoClose: 7000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Server error during dry-run validation.");
    } finally {
      setLoading(false);
    }
  };

  const handlePostSingle = async (id) => {
    try {
      setLoading(true);
      const res = await api.post("/einvoice/posting/post", { ids: [id] });
      if (res.data.success && res.data.successCount > 0) {
        const item = res.data.results[0];
        toast.success(`Posted successfully! IRN generated.`);
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

  const handleRetrySingle = async (id) => {
    try {
      setLoading(true);
      const res = await api.post("/einvoice/posting/retry", { id });
      if (res.data.success) {
        toast.success("Retry posted successfully! IRN generated.");
        fetchInvoices();
      } else {
        toast.error(res.data.message || "Retry failed.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Server error during retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPost = async () => {
    if (selectedIds.length === 0) {
      toast.warning("Please select at least one invoice.");
      return;
    }

    if (!window.confirm(`Are you sure you want to bulk-post ${selectedIds.length} invoice(s)?`)) return;

    try {
      setLoading(true);
      const res = await api.post("/einvoice/posting/bulk-post", { ids: selectedIds });
      if (res.data.success) {
        setBulkResult({
          total: res.data.totalSelected || 0,
          successful: res.data.successful || 0,
          failed: res.data.failed || 0,
          skipped: res.data.skipped || 0,
          details: res.data.results || []
        });
        setShowBulkResultModal(true);
        fetchInvoices();
      }
    } catch (err) {
      toast.error("Bulk posting execution failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const params = {
        ids: selectedIds.join(',')
      };
      const res = await api.get("/einvoice/posting/export", { params });
      if (res.data.success && res.data.data) {
        const csvRows = [];
        const headers = ["Invoice No", "Job No", "Invoice Date", "Client Name", "GSTIN", "Approval Status", "Posting Status", "IRN No", "Ack No", "Ack Date", "Branch"];
        csvRows.push(headers.join(','));
        
        for (const row of res.data.data) {
          const values = [
            `"${row.invoice_no || ''}"`,
            `"${row.job_no || ''}"`,
            `"${row.invoice_date ? new Date(row.invoice_date).toLocaleDateString('en-GB') : ''}"`,
            `"${row.client_name ? row.client_name.replace(/"/g, '""') : ''}"`,
            `"${row.client_gstin || ''}"`,
            `"${row.approval_status || ''}"`,
            `"${row.einvoice_status || ''}"`,
            `"${row.irn || ''}"`,
            `"${row.ack_no || ''}"`,
            `"${row.ack_date || ''}"`,
            `"${row.branch || ''}"`
          ];
          csvRows.push(values.join(','));
        }
        
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `einvoices_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV export downloaded successfully.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to export invoices");
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
      const res = await api.post("/einvoice/posting/cancel-irn", {
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

  const handleViewIrnDetails = async (id) => {
    try {
      setLoading(true);
      const res = await api.get(`/einvoice/posting/irn/${id}`);
      if (res.data.success) {
        setIrnDetails(res.data);
        setShowIrnModal(true);
      }
    } catch (err) {
      toast.error("Failed to load IRN details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQr = (inv) => {
    if (!inv.signed_qr_code) {
      toast.warning("No signed QR code available.");
      return;
    }
    const blob = new Blob([inv.signed_qr_code], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `QRCode_${inv.invoice_no.replace(/\//g, '_')}.txt`;
    link.click();
    toast.success("QR Code token downloaded.");
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
      const res = await api.get(`/einvoice/posting/logs/${inv.id}`);
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

  // Local Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = invoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(invoices.length / itemsPerPage);

  return (
    <DashboardLayout title="E-Invoice Posting">
      <div className="space-y-6 w-full p-1 font-poppins">
        
        {/* FILTERS PANEL */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 shadow-md p-6 rounded-2xl transition-all duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-550 dark:text-slate-400">Invoice No</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Invoice No"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-550 dark:text-slate-400">Job No</label>
              <input
                type="text"
                value={jobNo}
                onChange={(e) => setJobNo(e.target.value)}
                placeholder="Job No"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-550 dark:text-slate-400">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Name"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-550 dark:text-slate-400">Client GSTIN</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="GSTIN"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-550 dark:text-slate-400">Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="Branch Code"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-550 dark:text-slate-400">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-550 dark:text-slate-400">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-550 dark:text-slate-400">Posting Status</label>
              <select
                value={postingStatus}
                onChange={(e) => setPostingStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Ready For Posting">Ready For Posting</option>
                <option value="Posted">Posted</option>
                <option value="Failed">Failed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-end gap-3 md:col-span-2 lg:col-span-4 mt-2">
              <button
                onClick={fetchInvoices}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 h-[44px] shadow-sm"
              >
                <Search size={16} /> Search Records
              </button>
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-850 dark:text-slate-200 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 h-[44px]"
              >
                Reset Filters
              </button>
              <button
                onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-white py-2.5 px-4 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 transition-all duration-200 h-[44px]"
              >
                <Download size={16} /> Export CSV
              </button>
            </div>

          </div>
        </div>

        {/* BULK ACTION HEADER */}
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-indigo-600" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
              Selected: <strong className="text-indigo-600 font-extrabold">{selectedIds.length}</strong> invoice(s)
            </span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleBulkPost}
              disabled={selectedIds.length === 0 || loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              <Play size={14} /> Bulk Post Selected
            </button>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-md overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto text-[11px]">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[9px] tracking-wider border-b border-slate-200/60 dark:border-slate-700/50">
                  <th className="px-3 py-3 text-center w-[40px]">
                    <input
                      type="checkbox"
                      checked={currentItems.length > 0 && currentItems.filter(i => !i.irn).every(i => selectedIds.includes(i.id))}
                      onChange={handleSelectAll}
                      className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                    />
                  </th>
                  <th className="px-3 py-3 font-poppins">Invoice No</th>
                  <th className="px-3 py-3 font-poppins">Job No</th>
                  <th className="px-3 py-3 font-poppins">Invoice Date</th>
                  <th className="px-3 py-3 font-poppins">Client Name</th>
                  <th className="px-3 py-3 font-poppins">GSTIN</th>
                  <th className="px-3 py-3 font-poppins text-right">Amount</th>
                  <th className="px-3 py-3 font-poppins">Branch</th>
                  <th className="px-3 py-3 font-poppins text-center">Approval Status</th>
                  <th className="px-3 py-3 font-poppins text-center">Posting Status</th>
                  <th className="px-3 py-3 font-poppins">IRN No</th>
                  <th className="px-3 py-3 font-poppins">Ack No</th>
                  <th className="px-3 py-3 font-poppins">Ack Date</th>
                  <th className="px-3 py-3 font-poppins text-right w-[180px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {loading ? (
                  <tr>
                    <td colSpan="14" className="p-10 text-center font-bold text-slate-500">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading E-Invoice records...
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="14" className="p-10 text-center text-slate-500 italic">
                      No invoices found matching current search.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((inv) => {
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
                    const isFailed = inv.einvoice_status === 'Failed';

                    return (
                      <tr key={inv.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors ${selectedIds.includes(inv.id) ? 'bg-indigo-50/10 dark:bg-indigo-950/10' : ''}`}>
                        <td className="px-3 py-2.5 text-center">
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

                        <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">#{inv.invoice_no}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-650 dark:text-slate-300">#{inv.job_no}</td>
                        <td className="px-3 py-2.5">{new Date(inv.invoice_date).toLocaleDateString('en-GB')}</td>
                        <td className="px-3 py-2.5 font-semibold max-w-[140px] truncate" title={inv.client_name}>{inv.client_name}</td>
                        <td className="px-3 py-2.5 font-mono">{inv.client_gstin || 'URP'}</td>
                        <td className="px-3 py-2.5 text-right font-extrabold text-slate-850 dark:text-slate-200">{amountStr}</td>
                        <td className="px-3 py-2.5">{inv.branch || 'Mumbai'}</td>
                        
                        {/* Approval Status */}
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 font-semibold text-[10px]">
                            {inv.approval_status || 'Approved'}
                          </span>
                        </td>

                        {/* Posting Status */}
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            inv.einvoice_status === 'Posted' ? 'bg-emerald-50 text-emerald-800 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400' :
                            inv.einvoice_status === 'Failed' ? 'bg-rose-50 text-rose-800 border-rose-250 dark:bg-rose-950/20 dark:text-rose-400' :
                            inv.einvoice_status === 'Cancelled' ? 'bg-slate-100 text-slate-800 border-slate-250 dark:bg-slate-800 dark:text-slate-400' :
                            'bg-blue-50 text-blue-800 border-blue-250 dark:bg-blue-950/20 dark:text-blue-400'
                          }`}>
                            {inv.einvoice_status || 'Ready For Posting'}
                          </span>
                        </td>

                        <td className="px-3 py-2.5 max-w-[100px] truncate font-mono text-slate-500" title={inv.irn}>{inv.irn || '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-500">{inv.ack_no || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500">
                          {inv.ack_date ? new Date(inv.ack_date).toLocaleDateString('en-GB') : '—'}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2.5 text-right flex justify-end gap-1.5 align-middle">
                          {!hasIrn && !isFailed && (
                            <>
                              <button
                                onClick={() => handleValidateSingle(inv.id)}
                                title="Dry Run Validation"
                                className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-900/30 dark:text-amber-450 rounded transition-all"
                              >
                                <CheckSquare size={13} />
                              </button>
                              <button
                                onClick={() => handlePostSingle(inv.id)}
                                title="Post E-Invoice"
                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-all shadow-sm"
                              >
                                <Play size={13} />
                              </button>
                            </>
                          )}
                          {isFailed && (
                            <button
                              onClick={() => handleRetrySingle(inv.id)}
                              title="Retry Posting"
                              className="p-1 bg-amber-600 hover:bg-amber-700 text-white rounded transition-all shadow-sm"
                            >
                              <RefreshCw size={13} className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {hasIrn && (
                            <>
                              <button
                                onClick={() => handleViewIrnDetails(inv.id)}
                                title="View IRN Details"
                                className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-655 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 dark:text-indigo-400 rounded transition-all"
                              >
                                <Info size={13} />
                              </button>
                              <button
                                onClick={() => triggerCancelModal(inv.id)}
                                title="Cancel E-Invoice IRN"
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-655 dark:bg-rose-950/30 dark:hover:bg-rose-900/30 dark:text-rose-400 rounded transition-all"
                              >
                                <Ban size={13} />
                              </button>
                              <button
                                onClick={() => handleDownloadQr(inv)}
                                title="Download QR Code"
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-white rounded transition-all"
                              >
                                <QrCode size={13} />
                              </button>
                              <button
                                onClick={() => handleDownloadSigned(inv)}
                                title="Download Signed Invoice"
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-white rounded transition-all"
                              >
                                <FileText size={13} />
                              </button>
                            </>
                          )}
                          
                          {/* Common logs and pdf actions */}
                          <button
                            onClick={() => handleViewResponse(inv)}
                            title="View GSP Response JSON"
                            className="p-1 bg-slate-50 hover:bg-slate-150 text-slate-600 dark:bg-slate-850 dark:text-slate-350 rounded transition-all"
                          >
                            <FileJson size={13} />
                          </button>
                          <button
                            onClick={() => handleViewLogs(inv)}
                            title="Audit Logs"
                            className="p-1 bg-slate-50 hover:bg-slate-150 text-slate-600 dark:bg-slate-850 dark:text-slate-350 rounded transition-all"
                          >
                            <History size={13} />
                          </button>
                          <button
                            onClick={() => openPdfPreview(inv.pdf_link)}
                            title="View PDF"
                            className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-655 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 dark:text-indigo-400 rounded transition-all"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* LOCAL PAGINATION FOOTER */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 gap-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Showing <strong className="text-slate-700 dark:text-slate-200">{indexOfFirstItem + 1}</strong> to{" "}
                <strong className="text-slate-700 dark:text-slate-200">{Math.min(indexOfLastItem, invoices.length)}</strong> of{" "}
                <strong className="text-slate-700 dark:text-slate-200">{invoices.length}</strong> records
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-150 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }).map((_, pIdx) => {
                  const p = pIdx + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                        currentPage === p
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-slate-150 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-150 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
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

            <div className="flex-1 overflow-y-auto p-4 bg-slate-900 text-teal-400 font-mono text-xs leading-relaxed whitespace-pre overflow-x-auto select-all">
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
                          <span>Action: <strong className="text-indigo-655 uppercase">{log.action}</strong></span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-350 font-poppins">
                          User: <strong className="text-slate-900 dark:text-white">{log.user_name} ({log.user_email})</strong>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded border dark:border-slate-850 text-xs text-slate-500 overflow-x-auto whitespace-pre">
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
              <a href={previewPdfUrl} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-semibold transition-all text-xs">
                <Download size={16} /> Download PDF
              </a>
              <button onClick={() => setShowPreviewModal(false)} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2 rounded-xl font-semibold transition-all text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW IRN DETAILS MODAL */}
      {showIrnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 bg-slate-50 border-b dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Info size={14} className="text-indigo-500" /> Government IRP Portal IRN Details
              </h3>
              <button onClick={() => setShowIrnModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Invoice Registration Number (IRN)</span>
                <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border dark:border-slate-850 font-mono text-indigo-600 font-bold select-all break-all">
                  {irnDetails?.irn}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Acknowledgement Number</span>
                  <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border dark:border-slate-850 font-mono font-bold">
                    {irnDetails?.ackNo}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Acknowledgement Date</span>
                  <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border dark:border-slate-850 font-mono">
                    {irnDetails?.ackDate ? new Date(irnDetails.ackDate).toLocaleString('en-GB') : '—'}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Signed QR Code String</span>
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border dark:border-slate-850 font-mono text-slate-500 max-h-[80px] overflow-y-auto break-all select-all">
                  {irnDetails?.signedQrCode}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Signed Invoice Payload</span>
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border dark:border-slate-850 font-mono text-slate-500 max-h-[100px] overflow-y-auto break-all select-all">
                  {irnDetails?.signedInvoice}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end dark:bg-slate-800 dark:border-slate-700">
              <button onClick={() => setShowIrnModal(false)} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2 rounded-xl text-sm font-semibold transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* BULK RESULTS REPORT DIALOG */}
      {showBulkResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl w-full max-w-xl h-[75vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-slate-50 border-b dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare size={14} className="text-indigo-500" /> Bulk Posting Complete Execution Report
              </h3>
              <button onClick={() => setShowBulkResultModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border-b dark:border-slate-800 flex justify-around text-center text-xs">
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Total Selected</span>
                <strong className="text-lg text-slate-800 dark:text-white font-extrabold">{bulkResult?.total}</strong>
              </div>
              <div>
                <span className="text-emerald-500 block font-semibold uppercase text-[10px]">Successful</span>
                <strong className="text-lg text-emerald-600 font-extrabold">{bulkResult?.successful}</strong>
              </div>
              <div>
                <span className="text-rose-500 block font-semibold uppercase text-[10px]">Failed</span>
                <strong className="text-lg text-rose-600 font-extrabold">{bulkResult?.failed}</strong>
              </div>
              <div>
                <span className="text-amber-500 block font-semibold uppercase text-[10px]">Skipped</span>
                <strong className="text-lg text-amber-600 font-extrabold">{bulkResult?.skipped}</strong>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse table-auto text-xs">
                <thead>
                  <tr className="text-slate-450 uppercase text-[9px] border-b pb-2">
                    <th className="py-2">Invoice ID</th>
                    <th className="py-2 text-center">Status</th>
                    <th className="py-2">Execution Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {bulkResult?.details?.map((res, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="py-2.5 font-bold">#{res.id}</td>
                      <td className="py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          res.status === 'Posted' ? 'bg-emerald-50 text-emerald-800' :
                          res.status === 'Failed' ? 'bg-rose-50 text-rose-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 break-words max-w-[250px]">{res.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end dark:bg-slate-800 dark:border-slate-700">
              <button onClick={() => setShowBulkResultModal(false)} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2 rounded-xl text-sm font-semibold transition-all">Close Report</button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
