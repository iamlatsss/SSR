import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  Search, RefreshCw, Eye, Check, X, FileText, Calendar, CheckSquare, Trash2, ArrowLeft, Download, AlertTriangle, History
} from 'lucide-react';

export default function EInvoiceApproval() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Filter states
  const [jobType, setJobType] = useState('all');
  const [invoiceType, setInvoiceType] = useState('all');
  const [jobNo, setJobNo] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [clientName, setClientName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('all');
  const [postingStatus, setPostingStatus] = useState('all');

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('Data Entry Mistake');
  const [rejectRemarks, setRejectRemarks] = useState('');

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logInvoice, setLogInvoice] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [previewPdfUrl, setPreviewPdfUrl] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Validation errors modal states
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationInvoiceNo, setValidationInvoiceNo] = useState('');

  const handleShowValidationErrors = (inv) => {
    setValidationErrors(inv.validation_errors || []);
    setValidationInvoiceNo(inv.invoice_no);
    setShowValidationModal(true);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        jobType: jobType === 'all' ? '' : jobType,
        invoiceType: invoiceType === 'all' ? '' : invoiceType,
        jobNo,
        invoiceNo,
        clientName,
        fromDate,
        toDate,
        approvalStatus: approvalStatus === 'all' ? '' : approvalStatus,
        postingStatus: postingStatus === 'all' ? '' : postingStatus
      };

      const res = await api.get("/einvoice/approval/list", { params });
      if (res.data.success) {
        setInvoices(res.data.invoices || []);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error("Error loading E-Invoices for approval:", err);
      toast.error("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setJobType('all');
    setInvoiceType('all');
    setJobNo('');
    setInvoiceNo('');
    setClientName('');
    setFromDate('');
    setToDate('');
    setApprovalStatus('all');
    setPostingStatus('all');
    setInvoices([]);
    setSelectedIds([]);
    toast.info("Filters cleared. Click search to reload.");
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select only eligible for approval (Pending/Rejected and not posted/has IRN)
      const eligible = invoices
        .filter(inv => inv.approval_status !== 'Approved' && !inv.irn)
        .map(inv => inv.id);
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

  const handleApproveSingle = async (id) => {
    try {
      const res = await api.post("/einvoice/approval/approve", { ids: [id] });
      if (res.data.success && res.data.successCount > 0) {
        toast.success("Invoice approved successfully.");
        fetchInvoices();
      } else {
        const errDetails = res.data.results?.[0]?.message || "Validation failed.";
        toast.error(`Approval failed:\n${errDetails}`, { autoClose: 6000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Server error during approval.");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      toast.warning("Please select at least one invoice.");
      return;
    }

    if (!window.confirm(`Are you sure you want to approve ${selectedIds.length} invoice(s)?`)) return;

    try {
      setLoading(true);
      const res = await api.post("/einvoice/approval/approve", { ids: selectedIds });
      
      const successCount = res.data.successCount || 0;
      const failureCount = res.data.failureCount || 0;

      if (successCount > 0) {
        toast.success(`Successfully approved ${successCount} invoice(s).`);
      }
      if (failureCount > 0) {
        toast.error(`Failed to approve ${failureCount} invoice(s). Check messages.`);
      }

      fetchInvoices();
    } catch (err) {
      toast.error("Bulk approval API execution failed.");
    } finally {
      setLoading(false);
    }
  };

  const triggerRejectModal = (id) => {
    setRejectId(id);
    setRejectReason('Data Entry Mistake');
    setRejectRemarks('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    try {
      const res = await api.post("/einvoice/approval/reject", {
        id: rejectId,
        reason: rejectReason,
        remarks: rejectRemarks
      });
      if (res.data.success) {
        toast.success("Invoice rejected successfully.");
        setShowRejectModal(false);
        fetchInvoices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject invoice.");
    }
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
    <DashboardLayout title="E-Invoice Approval">
      <div className="space-y-6 w-full p-1 font-poppins">
        
        {/* FILTERS PANEL */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 shadow-md p-6 rounded-2xl transition-all duration-300">
          <h3 className="text-md font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FileText size={20} className="text-indigo-500" /> Filter Billing Context (Approval & Posting)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Job Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">Select All</option>
                <option value="MBL">MBL</option>
                <option value="HBL">HBL</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Invoice Type</label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">Select All</option>
                <option value="Invoice">INR Local</option>
                <option value="USD">USD FX</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Job No</label>
              <input
                type="text"
                value={jobNo}
                onChange={(e) => setJobNo(e.target.value)}
                placeholder="Job No"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Invoice No</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Invoice No"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Name"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Approval Status</label>
              <select
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">Select All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Posting Status</label>
              <select
                value={postingStatus}
                onChange={(e) => setPostingStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">Select All</option>
                <option value="Pending">Pending</option>
                <option value="Ready For Posting">Ready For Posting</option>
                <option value="Posted">Posted</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            <div className="flex items-end gap-3 md:col-span-2 lg:col-span-3">
              <button
                onClick={fetchInvoices}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 h-[44px]"
              >
                <Search size={16} /> Search Invoices
              </button>
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 h-[44px]"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* BULK ACTION HEADER */}
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-emerald-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-355">
              Selected: <strong className="text-indigo-600 font-extrabold">{selectedIds.length}</strong> invoice(s)
            </span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={selectedIds.length === 0 || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-md h-[40px]"
            >
              <Check size={16} /> Approve Selected
            </button>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-md overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="p-2.5 py-3 text-center w-[40px]">
                    <input
                      type="checkbox"
                      checked={invoices.length > 0 && invoices.filter(i => i.approval_status !== 'Approved').every(i => selectedIds.includes(i.id))}
                      onChange={handleSelectAll}
                      className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                    />
                  </th>
                  <th className="p-2.5 py-3">JobNo</th>
                  <th className="p-2.5 py-3">Party</th>
                  <th className="p-2.5 py-3">Job</th>
                  <th className="p-2.5 py-3">INVNo</th>
                  <th className="p-2.5 py-3">Invoice Date</th>
                  <th className="p-2.5 py-3">GSTNo</th>
                  <th className="p-2.5 py-3">Validation</th>
                  <th className="p-2.5 py-3 text-center">Approval</th>
                  <th className="p-2.5 py-3 text-center">E-Invoice</th>
                  <th className="p-2.5 py-3 text-right">Amount</th>
                  <th className="p-2.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="12" className="p-10 text-center font-bold text-slate-500">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Fetching records from database...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="p-10 text-center text-slate-500 italic">
                      No invoices found matching criteria.
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
                    const amountDisplay = isUSD 
                      ? `$ ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                      : `₹ ${totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                    
                    const eligibleForCheck = inv.approval_status !== 'Approved' && !inv.irn;

                    return (
                      <tr key={inv.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors ${selectedIds.includes(inv.id) ? 'bg-indigo-50/10 dark:bg-indigo-950/10' : ''} text-slate-700 dark:text-slate-350`}>
                        <td className="p-2.5 py-3 text-center">
                          {eligibleForCheck ? (
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
                        <td className="p-2.5 py-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">#{inv.job_no}</td>
                        <td className="p-2.5 py-3 font-semibold max-w-[135px] truncate" title={inv.client_name}>{inv.client_name}</td>
                        <td className="p-2.5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                            inv.mbl_hbl_type === 'MBL' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50' : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50'
                          }`}>
                            {inv.mbl_hbl_type}
                          </span>
                        </td>
                        <td className="p-2.5 py-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{inv.invoice_no}</td>
                        <td className="p-2.5 py-3 whitespace-nowrap">{new Date(inv.invoice_date).toLocaleDateString('en-GB')}</td>
                        <td className="p-2.5 py-3 font-mono font-bold text-slate-600 dark:text-slate-350 whitespace-nowrap">{inv.client_gstin || 'URP'}</td>
                        
                        {/* Validation Result/Errors */}
                        <td className="p-2.5 py-3">
                          {inv.validation_valid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap inline-block">
                              Valid
                            </span>
                          ) : (
                            <div className="space-y-1 text-[10.5px] text-rose-600 dark:text-rose-400 font-medium max-w-[240px]">
                              {inv.validation_errors && inv.validation_errors.length > 0 ? (
                                inv.validation_errors.map((err, i) => (
                                  <div key={i} className="flex items-start gap-1">
                                    <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0 mt-1.5"></span>
                                    <span className="leading-tight">{err}</span>
                                  </div>
                                ))
                              ) : (
                                <span>Pending Correction</span>
                              )}
                            </div>
                          )}
                          
                          {inv.rejection_reason && (
                            <div className="mt-1 flex items-start gap-1 text-[10.5px] text-amber-700 dark:text-amber-400 font-semibold max-w-[240px] leading-tight border-t border-slate-100 dark:border-slate-850 pt-1">
                              <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0 mt-1.5"></span>
                              <span>Rejection: {inv.rejection_reason}</span>
                            </div>
                          )}
                        </td>

                        {/* Approval Status Badge */}
                        <td className="p-2.5 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap inline-block border ${
                            inv.approval_status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            inv.approval_status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                            inv.approval_status === 'Pending Correction' ? 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {inv.approval_status || 'Pending'}
                          </span>
                        </td>

                        {/* E-Invoice Status Badge */}
                        <td className="p-2.5 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap inline-block border ${
                            inv.einvoice_status === 'Posted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            inv.einvoice_status === 'Failed' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {inv.einvoice_status || 'Pending'}
                          </span>
                        </td>

                        <td className="p-2.5 py-3 text-right font-bold whitespace-nowrap text-slate-900 dark:text-white">{amountDisplay}</td>
                        
                        {/* Actions */}
                        <td className="p-2.5 py-3 text-right flex justify-end gap-1.5 whitespace-nowrap">
                          <button
                            onClick={() => openPdfPreview(inv.pdf_link)}
                            title="View PDF Invoice"
                            className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 dark:text-indigo-400 rounded-lg transition-colors inline-flex items-center justify-center w-7 h-7"
                          >
                            <Eye size={14} />
                          </button>
                          
                          {eligibleForCheck && (
                            <>
                              <button
                                onClick={() => handleApproveSingle(inv.id)}
                                title="Validate & Approve"
                                className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/30 dark:text-emerald-400 rounded-lg transition-colors inline-flex items-center justify-center w-7 h-7"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => triggerRejectModal(inv.id)}
                                title="Reject Invoice"
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-900/30 dark:text-rose-400 rounded-lg transition-colors inline-flex items-center justify-center w-7 h-7"
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleViewLogs(inv)}
                            title="Audit History Logs"
                            className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:hover:bg-slate-800/30 dark:text-slate-350 rounded-lg transition-colors inline-flex items-center justify-center w-7 h-7"
                          >
                            <History size={14} />
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

      {/* REJECT DIALOG MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-4 bg-slate-50 border-b dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={14} className="text-rose-500" /> Reject E-Invoice Approval
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            
            <div className="p-5 space-y-4 text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Rejection Reason Code</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Duplicate Invoice">Duplicate Invoice</option>
                  <option value="Data Entry Mistake">Data Entry Mistake</option>
                  <option value="Order Cancelled">Order Cancelled</option>
                  <option value="Wrong GSTIN / Addresses">Wrong GSTIN / Addresses</option>
                  <option value="Tax Calculations Error">Tax Calculations Error</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Remarks / Explanation</label>
                <textarea
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  rows="3"
                  placeholder="Enter rejection details or feedback..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                ></textarea>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end gap-2 dark:bg-slate-800 dark:border-slate-700">
              <button onClick={() => setShowRejectModal(false)} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2 rounded-xl text-sm font-semibold transition-all">Cancel</button>
              <button onClick={handleRejectSubmit} className="bg-rose-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-rose-700 shadow-md">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOGS HISTORY DIALOG MODAL */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 bg-slate-50 border-b dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <History size={15} className="text-indigo-500" /> E-Invoice Logs: {logInvoice?.invoice_no}
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
                  No action log events recorded yet.
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
                        <div className="bg-white dark:bg-slate-950 p-3 rounded border dark:border-slate-800 text-xs text-slate-500 overflow-x-auto whitespace-pre">
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

      {/* VALIDATION ERRORS DETAILS DIALOG MODAL */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-4 bg-slate-50 border-b dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-orange-500 animate-bounce" /> Validation Failures: {validationInvoiceNo}
              </h3>
              <button onClick={() => setShowValidationModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            
            <div className="p-5 space-y-4 text-sm">
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                The invoice has failed the following system validation checks. Please correct these details in the job/invoice before approving.
              </p>
              
              <ul className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {validationErrors.length === 0 ? (
                  <li className="text-slate-500 italic text-center p-4">No validation failures logged.</li>
                ) : (
                  validationErrors.map((err, index) => (
                    <li key={index} className="flex gap-2.5 items-start bg-orange-50/70 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/35 p-3 rounded-xl text-orange-950 dark:text-orange-300">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-200 dark:bg-orange-900/50 text-orange-850 dark:text-orange-200 text-xs font-bold shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="font-medium">{err}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end dark:bg-slate-800 dark:border-slate-700">
              <button onClick={() => setShowValidationModal(false)} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2 rounded-xl text-sm font-semibold transition-all">Dismiss</button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
