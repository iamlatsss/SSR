import express from 'express';
import { authenticateJWT } from '../AuthAPI/Auth.js';
import { knexDB } from '../Database.js';

const router = express.Router();

// 1. Create a new edit request
router.post('/create', authenticateJWT, async (req, res) => {
  const { job_no, mbl_no, hbl_no, reason } = req.body;
  const user = req.user; // populated by authenticateJWT

  if (!job_no) {
    return res.status(400).json({ success: false, message: "Job Number is required." });
  }

  try {
    // Check if there is already a Pending request for this job to prevent duplicates
    const existing = await knexDB('JobEditRequests')
      .where({ job_no, status: 'Pending' })
      .first();

    if (existing) {
      return res.status(400).json({ success: false, message: "There is already a pending edit request for this job." });
    }

    const [newId] = await knexDB('JobEditRequests').insert({
      job_no,
      mbl_no: mbl_no || '',
      hbl_no: hbl_no || '',
      requested_by: user.user_name || user.email,
      requested_by_id: user.user_id,
      reason: reason || '',
      status: 'Pending'
    });

    res.json({ success: true, message: "Edit request submitted successfully.", requestId: newId });
  } catch (error) {
    console.error("Error creating edit request:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 2. Get pending edit requests (for Director/Admin dashboard & notifications)
router.get('/pending', authenticateJWT, async (req, res) => {
  // Only Admin or Director should be able to view pending requests
  if (req.user.role !== 'Admin' && req.user.role !== 'Director') {
    return res.status(403).json({ success: false, message: "Unauthorized access." });
  }

  try {
    const requests = await knexDB('JobEditRequests')
      .where({ status: 'Pending' })
      .orderBy('created_at', 'desc');

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 3. Update edit request status (Approve / Reject)
router.put('/:id/status', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Approved' or 'Rejected'
  const user = req.user;

  if (user.role !== 'Admin' && user.role !== 'Director') {
    return res.status(403).json({ success: false, message: "Only Director or Admin can approve/reject requests." });
  }

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status value." });
  }

  try {
    const request = await knexDB('JobEditRequests').where({ id }).first();
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    await knexDB('JobEditRequests')
      .where({ id })
      .update({
        status,
        approved_by: user.user_name || user.email,
        approval_date: new Date()
      });

    res.json({ success: true, message: `Request has been ${status.toLowerCase()} successfully.` });
  } catch (error) {
    console.error("Error updating request status:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 4. Check if there is an active approved or pending request for a specific job
router.get('/active/:jobNo', authenticateJWT, async (req, res) => {
  const { jobNo } = req.params;

  try {
    const activeRequest = await knexDB('JobEditRequests')
      .where({ job_no: jobNo, status: 'Approved' })
      .first();

    const pendingRequest = await knexDB('JobEditRequests')
      .where({ job_no: jobNo, status: 'Pending' })
      .first();

    res.json({
      success: true,
      hasActiveApproval: !!activeRequest,
      hasPendingRequest: !!pendingRequest,
      status: activeRequest ? 'Approved' : (pendingRequest ? 'Pending' : 'None'),
      approvalDetails: activeRequest || null,
      pendingDetails: pendingRequest || null
    });
  } catch (error) {
    console.error("Error checking active approval status:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

export default router;
