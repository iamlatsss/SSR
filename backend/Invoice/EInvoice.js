import express from 'express';
import { knexDB } from '../Database.js';
import { authenticateJWT } from '../AuthAPI/Auth.js';
import {
  approveInvoice,
  rejectInvoice,
  postInvoiceToPortal,
  cancelInvoiceIRN,
  logEInvoiceAction
} from './EInvoiceService.js';

const router = express.Router();

// 1. Fetch invoices eligible for approval
router.get("/approval/list", authenticateJWT, async (req, res) => {
  try {
    const {
      jobType,
      invoiceType,
      jobNo,
      invoiceNo,
      clientName,
      branch,
      fromDate,
      toDate,
      approvalStatus,
      postingStatus
    } = req.query;

    let query = knexDB("Invoices")
      .select('*')
      .whereNot('einvoice_status', 'Cancelled') // Only display non-cancelled active invoices in approval lists
      .orderBy('created_at', 'desc');

    // Filter by Job Type (MBL or HBL)
    if (jobType && jobType !== 'Select All' && jobType !== 'all') {
      query = query.where({ mbl_hbl_type: jobType });
    }

    // Filter by Invoice Type ('Invoice' or 'USD')
    if (invoiceType && invoiceType !== 'Select All' && invoiceType !== 'all') {
      query = query.where({ print_type: invoiceType });
    }

    // Filter by Job Number
    if (jobNo) {
      query = query.where('job_no', 'like', `%${jobNo}%`);
    }

    // Filter by Invoice Number
    if (invoiceNo) {
      query = query.where('invoice_no', 'like', `%${invoiceNo}%`);
    }

    // Filter by Client Name
    if (clientName) {
      query = query.where('client_name', 'like', `%${clientName}%`);
    }

    // Date range filter
    if (fromDate) {
      query = query.where('invoice_date', '>=', fromDate);
    }
    if (toDate) {
      query = query.where('invoice_date', '<=', toDate);
    }

    // Filter by Approval Status
    if (approvalStatus && approvalStatus !== 'Select All' && approvalStatus !== 'all') {
      query = query.where({ approval_status: approvalStatus });
    }

    // Filter by Posting Status
    if (postingStatus && postingStatus !== 'Select All' && postingStatus !== 'all') {
      query = query.where({ einvoice_status: postingStatus });
    }

    const invoices = await query;
    res.json({ success: true, invoices });
  } catch (error) {
    console.error("Error fetching E-Invoice approval list:", error);
    res.status(500).json({ success: false, message: "Database query error: " + error.message });
  }
});

// 2. Approve invoice(s) - Supports bulk and individual validation
router.post("/approval/approve", authenticateJWT, async (req, res) => {
  const { ids } = req.body; // array of invoice IDs
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "Invalid or empty invoice IDs list." });
  }

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const id of ids) {
    try {
      const resData = await approveInvoice(id, req.user);
      results.push({ id, success: true, message: resData.message });
      successCount++;
    } catch (err) {
      results.push({ id, success: false, message: err.message });
      failureCount++;
    }
  }

  res.json({
    success: successCount > 0,
    results,
    successCount,
    failureCount,
    message: `Validation complete. Approved: ${successCount}, Failed: ${failureCount}`
  });
});

// 3. Reject an invoice
router.post("/approval/reject", authenticateJWT, async (req, res) => {
  const { id, reason, remarks } = req.body;
  if (!id || !reason) {
    return res.status(400).json({ success: false, message: "Invoice ID and Rejection Reason are required." });
  }

  try {
    const result = await rejectInvoice(id, reason, remarks, req.user);
    res.json(result);
  } catch (err) {
    console.error("Error rejecting E-Invoice:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Fetch approved invoices ready for posting
router.get("/posting/list", authenticateJWT, async (req, res) => {
  try {
    const { search } = req.query;

    let query = knexDB("Invoices")
      .select('*')
      .where({ approval_status: 'Approved' })
      .whereNull('irn')
      .whereNot('einvoice_status', 'Cancelled')
      .orderBy('created_at', 'desc');

    if (search) {
      query = query.where(function() {
        this.where('invoice_no', 'like', `%${search}%`)
            .orWhere('client_name', 'like', `%${search}%`)
            .orWhere('job_no', 'like', `%${search}%`);
      });
    }

    const invoices = await query;
    res.json({ success: true, invoices });
  } catch (error) {
    console.error("Error fetching E-Invoice posting list:", error);
    res.status(500).json({ success: false, message: "Database query error: " + error.message });
  }
});

// 5. Post approved invoice(s) - Supports bulk and individual GSP calls
router.post("/posting/post", authenticateJWT, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "Invalid or empty invoice IDs list." });
  }

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const id of ids) {
    try {
      const resData = await postInvoiceToPortal(id, req.user);
      results.push({ id, success: true, irn: resData.irn, ackNo: resData.ackNo, message: resData.message });
      successCount++;
    } catch (err) {
      results.push({ id, success: false, message: err.message });
      failureCount++;
    }
  }

  res.json({
    success: successCount > 0,
    results,
    successCount,
    failureCount,
    message: `Posting complete. Successfully Posted: ${successCount}, Failed: ${failureCount}`
  });
});

// 6. Cancel generated IRN
router.post("/posting/cancel", authenticateJWT, async (req, res) => {
  const { id, reasonCode, remarks } = req.body;
  if (!id || !reasonCode) {
    return res.status(400).json({ success: false, message: "Invoice ID and cancellation reason code are required." });
  }

  try {
    const result = await cancelInvoiceIRN(id, reasonCode, remarks, req.user);
    res.json(result);
  } catch (err) {
    console.error("Error cancelling E-Invoice IRN:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Get E-Invoice Audit Logs
router.get("/audit-logs/:id", authenticateJWT, async (req, res) => {
  const invoiceId = parseInt(req.params.id);
  try {
    const logs = await knexDB("EInvoiceAuditLogs")
      .where({ invoice_id: invoiceId })
      .orderBy('created_at', 'desc');

    res.json({ success: true, logs });
  } catch (error) {
    console.error("Error fetching E-Invoice audit logs:", error);
    res.status(500).json({ success: false, message: "Database query error: " + error.message });
  }
});

export default router;
