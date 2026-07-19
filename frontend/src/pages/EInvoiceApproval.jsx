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
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionRemarks, setRejectionRemarks] = useState('');

  const handleShowValidationErrors = (inv) => {
    setValidationErrors(inv.validation_errors || []);
    setValidationInvoiceNo(inv.invoice_no);
    setRejectionReason(inv.rejection_reason || '');
    setRejectionRemarks(inv.rejection_remarks || '');
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
            <table className="w-full text-left border-collapse table-auto text-[12px]">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/60 dark:border-slate-700/50">
                  <th className="px-3 py-2.5 text-center w-[35px]">
                    <input
                      type="checkbox"
                      checked={invoices.length > 0 && invoices.filter(i => i.approval_status !== 'Approved').every(i => selectedIds.includes(i.id))}
                      onChange={handleSelectAll}
                      className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-poppins">JobNo</th>
                  <th className="px-3 py-2.5 font-poppins">Party</th>
                  <th className="px-3 py-2.5 font-poppins">Job</th>
                  <th className="px-3 py-2.5 font-poppins">INVNo</th>
                  <th className="px-3 py-2.5 font-poppins">Invoice Date</th>
                  <th className="px-3 py-2.5 font-poppins">GSTNo</th>
                  <th className="px-3 py-2.5 font-poppins">Remarks</th>
                  <th className="px-3 py-2.5 text-center font-poppins">Approval</th>
                  <th className="px-3 py-2.5 text-center font-poppins">E-Invoice</th>
                  <th className="px-3 py-2.5 text-right font-poppins">Amount</th>
                  <th className="px-3 py-2.5 text-right font-poppins">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {loading ? (
                  <tr>
                    <td colSpan="12" className="p-8 text-center font-bold text-slate-500">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Fetching records...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="p-8 text-center text-slate-500 italic">
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
                      <tr 
                        key={inv.id} 
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors duration-150 ${selectedIds.includes(inv.id) ? 'bg-indigo-50/10 dark:bg-indigo-950/10' : ''} text-slate-700 dark:text-slate-355 h-[50px]`}
                      >
                        <td className="px-3 py-2 text-center align-middle">
                          {eligibleForCheck ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(inv.id)}
                              onChange={() => handleSelectRow(inv.id)}
                              className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                            />
                          ) : (
                            <span className="text-slate-350 dark:text-slate-655">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 align-middle whitespace-nowrap">
                          #{inv.job_no}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200 max-w-[120px] truncate align-middle" title={inv.client_name}>
                          {inv.client_name}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-slate-100/70 text-slate-700 border-slate-200/50 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/50 whitespace-nowrap">
                            {inv.mbl_hbl_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200 align-middle whitespace-nowrap">
                          {inv.invoice_no}
                        </td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400 align-middle whitespace-nowrap">
                          {new Date(inv.invoice_date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 align-middle whitespace-nowrap">
                          {inv.client_gstin || 'URP'}
                        </td>
                        
                        {/* Remarks (Compact popover trigger badge) */}
                        <td className="px-3 py-2 align-middle">
                          {(!inv.validation_valid && inv.validation_errors && inv.validation_errors.length > 0) || inv.rejection_reason ? (
                            <button
                              onClick={() => handleShowValidationErrors(inv)}
                              title="Click to view details"
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-200 flex items-center gap-1 hover:shadow-sm active:scale-95 ${
                                inv.rejection_reason
                                  ? 'bg-rose-50/60 hover:bg-rose-100/80 text-rose-700 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30'
                                  : 'bg-amber-50/60 hover:bg-amber-100/80 text-amber-700 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                              }`}
                            >
                              <AlertTriangle size={11} className="shrink-0" />
                              {inv.rejection_reason ? 'Rejected Details' : `${inv.validation_errors.length} issue(s)`}
                            </button>
                          ) : (
                            <span className="text-slate-350 dark:text-slate-655 font-mono">—</span>
                          )}
                        </td>

                        {/* Approval Badge */}
                        <td className="px-3 py-2 text-center align-middle">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap inline-flex items-center gap-1 ${
                            inv.approval_status === 'Approved' ? 'bg-emerald-50/60 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30' :
                            inv.approval_status === 'Rejected' ? 'bg-rose-50/60 text-rose-700 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30' : 
                            inv.approval_status === 'Pending Correction' ? 'bg-amber-50/60 text-amber-700 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' : 
                            'bg-blue-50/60 text-blue-700 border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              inv.approval_status === 'Approved' ? 'bg-emerald-500' :
                              inv.approval_status === 'Rejected' ? 'bg-rose-500' :
                              inv.approval_status === 'Pending Correction' ? 'bg-amber-500' : 'bg-blue-500'
                            }`}></span>
                            {inv.approval_status || 'Pending'}
                          </span>
                        </td>

                        {/* E-Invoice Badge */}
                        <td className="px-3 py-2 text-center align-middle">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap inline-flex items-center gap-1 ${
                            inv.einvoice_status === 'Posted' ? 'bg-emerald-50/60 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-455 dark:border-emerald-900/30' :
                            inv.einvoice_status === 'Failed' ? 'bg-rose-50/60 text-rose-700 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' :
                            'bg-blue-50/60 text-blue-700 border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              inv.einvoice_status === 'Posted' ? 'bg-emerald-500' :
                              inv.einvoice_status === 'Failed' ? 'bg-rose-500' : 'bg-blue-500'
                            }`}></span>
                            {inv.einvoice_status || 'Pending'}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap align-middle">
                          {amountDisplay}
                        </td>
                        
                        {/* Actions */}
                        <td className="px-3 py-2 text-right align-middle">
                          <div className="flex items-center justify-end gap-2.5">
                            {/* Secondary Actions (View PDF & History logs) */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openPdfPreview(inv.pdf_link)}
                                title="View PDF Invoice"
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 dark:bg-slate-850/40 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg transition-all duration-200 inline-flex items-center justify-center w-8 h-8 border border-slate-200/40 dark:border-slate-700/50"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => handleViewLogs(inv)}
                                title="Audit History Logs"
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 dark:bg-slate-850/40 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg transition-all duration-200 inline-flex items-center justify-center w-8 h-8 border border-slate-200/40 dark:border-slate-700/50"
                              >
                                <History size={13} />
                              </button>
                            </div>

                            {/* Divider line if primary actions are available */}
                            {eligibleForCheck && <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>}

                            {/* Primary Actions (Approve) */}
                            {eligibleForCheck && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleApproveSingle(inv.id)}
                                  title="Validate & Approve"
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-605 hover:text-white dark:bg-emerald-950/20 dark:hover:bg-emerald-650 dark:text-emerald-400 dark:hover:text-white rounded-lg transition-all duration-200 inline-flex items-center justify-center w-8 h-8 border border-emerald-200/50 dark:border-emerald-900/30"
                                >
                                  <Check size={13} />
                                </button>
                              </div>
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

      {/* VALIDATION & REJECTION DETAILS DIALOG MODAL */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-4 bg-slate-50 border-b dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-poppins">
                <AlertTriangle size={15} className="text-rose-500" /> Invoice Remarks & Issues: {validationInvoiceNo}
              </h3>
              <button onClick={() => setShowValidationModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            
            <div className="p-5 space-y-4 text-sm max-h-[60vh] overflow-y-auto">
              {rejectionReason && rejectionRemarks !== 'Failed automated validation checks before approval.' && (
                <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100/70 dark:border-rose-900/30 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5 font-poppins">
                    Rejection Details
                  </h4>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{rejectionReason}</div>
                  {rejectionRemarks && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-1 font-mono">{rejectionRemarks}</div>
                  )}
                </div>
              )}

              {validationErrors.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5 font-poppins">
                    Validation Failures ({validationErrors.length})
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    The invoice failed the following system checks. Please correct these details before attempting to approve:
                  </p>
                  <ul className="space-y-2">
                    {validationErrors.map((err, index) => (
                      <li key={index} className="flex gap-2.5 items-start bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/60 dark:border-amber-900/20 p-3 rounded-xl text-slate-800 dark:text-slate-300">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-bold shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="font-medium text-xs leading-tight">{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                !rejectionReason && (
                  <p className="text-slate-500 italic text-center p-4">No issues or remarks logged.</p>
                )
              )}
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
