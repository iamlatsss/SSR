import express from 'express';
import { knexDB } from '../Database.js';
import { authenticateJWT } from '../AuthAPI/Auth.js';
import {
  approveInvoice,
  rejectInvoice,
  postInvoiceToPortal,
  cancelInvoiceIRN,
  logEInvoiceAction,
  validateInvoiceDetails
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
      .whereIn('job_no', knexDB('MasterBL').select('job_no'))
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
    const invoicesWithValidation = await Promise.all(invoices.map(async (inv) => {
      const validation = await validateInvoiceDetails(inv);
      return {
        ...inv,
        validation_valid: validation.valid,
        validation_errors: validation.errors
      };
    }));
    res.json({ success: true, invoices: invoicesWithValidation });
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

// 4. Fetch approved invoices ready for posting, with support for advanced filtering
router.get("/posting/list", authenticateJWT, async (req, res) => {
  try {
    const {
      invoiceNo,
      jobNo,
      clientName,
      gstin,
      branch,
      fromDate,
      toDate,
      postingStatus,
      search
    } = req.query;

    let query = knexDB("Invoices")
      .select("Invoices.*")
      .whereIn('Invoices.job_no', knexDB('MasterBL').select('job_no'))
      .where({ "Invoices.approval_status": 'Approved' })
      .whereNot("Invoices.einvoice_status", 'Cancelled')
      .orderBy('Invoices.created_at', 'desc');

    if (search) {
      query = query.where(function() {
        this.where('Invoices.invoice_no', 'like', `%${search}%`)
            .orWhere('Invoices.client_name', 'like', `%${search}%`)
            .orWhere('Invoices.job_no', 'like', `%${search}%`);
      });
    }

    if (invoiceNo) {
      query = query.where('Invoices.invoice_no', 'like', `%${invoiceNo}%`);
    }
    if (jobNo) {
      query = query.where('Invoices.job_no', 'like', `%${jobNo}%`);
    }
    if (clientName) {
      query = query.where('Invoices.client_name', 'like', `%${clientName}%`);
    }
    if (gstin) {
      query = query.where('Invoices.client_gstin', 'like', `%${gstin}%`);
    }
    if (fromDate) {
      query = query.where('Invoices.invoice_date', '>=', fromDate);
    }
    if (toDate) {
      query = query.where('Invoices.invoice_date', '<=', toDate);
    }

    // Posting Status Filter
    if (postingStatus && postingStatus !== 'all' && postingStatus !== 'Select All') {
      if (postingStatus === 'Ready For Posting') {
        query = query.whereNull('Invoices.irn').whereNot('Invoices.einvoice_status', 'Failed');
      } else if (postingStatus === 'Failed') {
        query = query.where({ 'Invoices.einvoice_status': 'Failed' });
      } else if (postingStatus === 'Posted') {
        query = query.whereNotNull('Invoices.irn').where({ 'Invoices.einvoice_status': 'Posted' });
      } else {
        query = query.where({ 'Invoices.einvoice_status': postingStatus });
      }
    } else if (!search && !invoiceNo && !jobNo && !clientName && !gstin && !branch && !fromDate && !toDate) {
      // Default constraint: only ready for posting / non-posted
      query = query.whereNull('Invoices.irn');
    }

    const invoices = await query;
    res.json({ success: true, invoices });
  } catch (error) {
    console.error("Error fetching E-Invoice posting list:", error);
    res.status(500).json({ success: false, message: "Database query error: " + error.message });
  }
});

// 5. Fetch single invoice details
router.get("/posting/:id", authenticateJWT, async (req, res) => {
  try {
    const invoice = await knexDB("Invoices")
      .select("Invoices.*")
      .where({ "Invoices.id": req.params.id })
      .first();

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }
    res.json({ success: true, invoice });
  } catch (error) {
    console.error("Error fetching invoice details:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Validate invoice details (Dry Run check)
router.post("/posting/validate", authenticateJWT, async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: "Invoice ID is required." });
  }

  try {
    const invoice = await knexDB("Invoices").where({ id }).first();
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    const validation = await validateInvoiceDetails(invoice, true);
    res.json({
      success: validation.valid,
      valid: validation.valid,
      errors: validation.errors
    });
  } catch (error) {
    console.error("Error validating invoice details:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Post approved invoice(s)
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

// 8. Retry posting failed invoice
router.post("/posting/retry", authenticateJWT, async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: "Invoice ID is required." });
  }

  try {
    const invoice = await knexDB("Invoices").where({ id }).first();
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    if (invoice.einvoice_status !== 'Failed' && invoice.einvoice_status !== 'Ready For Posting') {
      return res.status(400).json({ success: false, message: "Only failed or ready invoices can be retried." });
    }

    const resData = await postInvoiceToPortal(id, req.user);
    res.json({
      success: true,
      message: "Retry posted successfully!",
      irn: resData.irn,
      ackNo: resData.ackNo,
      ackDate: resData.ackDate
    });
  } catch (err) {
    console.error("Error retrying invoice post:", err);
    res.status(550).json({ success: false, message: err.message });
  }
});

// 9. Bulk Post invoices with independent execution reports
router.post("/posting/bulk-post", authenticateJWT, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "Invalid or empty invoice IDs list." });
  }

  let totalSelected = ids.length;
  let successful = 0;
  let failed = 0;
  let skipped = 0;
  const results = [];

  for (const id of ids) {
    try {
      const invoice = await knexDB("Invoices").where({ id }).first();
      if (!invoice) {
        skipped++;
        results.push({ id, success: false, status: 'Skipped', message: "Invoice not found." });
        continue;
      }

      if (invoice.irn) {
        skipped++;
        results.push({ id, success: false, status: 'Skipped', message: "Invoice already posted / has IRN." });
        continue;
      }

      if (invoice.approval_status !== 'Approved') {
        skipped++;
        results.push({ id, success: false, status: 'Skipped', message: "Invoice is not approved." });
        continue;
      }

      const resData = await postInvoiceToPortal(id, req.user);
      results.push({
        id,
        success: true,
        status: 'Posted',
        irn: resData.irn,
        ackNo: resData.ackNo,
        ackDate: resData.ackDate,
        message: "Posted successfully."
      });
      successful++;
    } catch (err) {
      results.push({ id, success: false, status: 'Failed', message: err.message });
      failed++;
    }
  }

  res.json({
    success: true,
    totalSelected,
    successful,
    failed,
    skipped,
    results
  });
});

// 10. Get GSP JSON Payload response
router.get("/posting/response/:id", authenticateJWT, async (req, res) => {
  try {
    const invoice = await knexDB("Invoices").where({ id: req.params.id }).first();
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }
    res.json({ success: true, response: invoice.einvoice_response });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 11. Get IRN Details
router.get("/posting/irn/:id", authenticateJWT, async (req, res) => {
  try {
    const invoice = await knexDB("Invoices").where({ id: req.params.id }).first();
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }
    res.json({
      success: true,
      irn: invoice.irn,
      ackNo: invoice.ack_no,
      ackDate: invoice.ack_date,
      signedQrCode: invoice.signed_qr_code,
      signedInvoice: invoice.signed_invoice
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 12. Cancel active IRN
router.post("/posting/cancel-irn", authenticateJWT, async (req, res) => {
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

// 13. Audit logs for timeline
router.get("/posting/logs/:id", authenticateJWT, async (req, res) => {
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

// 14. Export records
router.get("/posting/export", authenticateJWT, async (req, res) => {
  try {
    const { ids } = req.query;
    let query = knexDB("Invoices")
      .select(
        "Invoices.invoice_no",
        "Invoices.job_no",
        "Invoices.invoice_date",
        "Invoices.client_name",
        "Invoices.client_gstin",
        "Invoices.approval_status",
        "Invoices.einvoice_status",
        "Invoices.irn",
        "Invoices.ack_no",
        "Invoices.ack_date"
      );

    if (ids) {
      const idList = String(ids).split(',').map(Number);
      query = query.whereIn('Invoices.id', idList);
    } else {
      query = query.where({ "Invoices.approval_status": 'Approved' }).whereNull('Invoices.irn');
    }

    const data = await query;
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error exporting invoices:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
