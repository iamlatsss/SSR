import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js";
import { knexDB } from "../Database.js";

const router = express.Router();

const ALLOWED_FIELDS = [
  "date_of_nomination",
  "consignee",
  "job_no",
  "ref_no",
  "hbl",
  "mbl",
  "pol",
  "pod",
  "container_size",
  "teus",
  "agent",
  "shipping_line",
  "freight",
  "etd",
  "eta",
  "swb",
  "igm",
  "invoice_amount",
  "cha",
  "cfs",
  "container_no",
  "remarks",
  "status"
];

// Helper to check if a job can be closed
async function checkClosedStatusAllowed(jobNo, rowData) {
  const requiredFields = [
    "date_of_nomination",
    "consignee",
    "job_no",
    "hbl",
    "mbl",
    "pol",
    "pod",
    "container_size",
    "teus",
    "agent",
    "shipping_line",
    "freight",
    "etd",
    "eta",
    "swb",
    "igm",
    "cha",
    "cfs",
    "container_no"
  ];
  for (const field of requiredFields) {
    const val = rowData[field];
    if (val === undefined || val === null || String(val).trim() === '') {
      // Find clean readable name
      const cleanLabel = field.replace(/_/g, ' ').toUpperCase();
      return { allowed: false, message: `Cannot close job: Field '${cleanLabel}' is missing/empty.` };
    }
  }

  // Check Invoices status
  const invoices = await knexDB("Invoices").where({ job_no: jobNo });
  if (invoices.length === 0) {
    return { allowed: false, message: "Cannot close job: No tax invoices found for this job number." };
  }

  const allApprovedAndPosted = invoices.every(inv => inv.approval_status === 'Approved' && inv.einvoice_status === 'Posted');
  if (!allApprovedAndPosted) {
    return { allowed: false, message: "Cannot close job: There are invoices that are not yet Approved and Posted." };
  }

  return { allowed: true };
}

// Helper to get the absolute next global job number
async function getNextJobNo(transaction = null) {
  const db = transaction || knexDB;
  const rows = await db("BookingUpdates").select("job_no");
  const jobNos = rows
    .map(r => parseInt(r.job_no, 10))
    .filter(n => !isNaN(n));
  const maxJob = jobNos.length > 0 ? Math.max(...jobNos) : 5530;
  const startJob = Math.max(maxJob, 5530);
  return String(startJob + 1);
}

// Get the next global job number
router.get("/next-job-no", authenticateJWT, async (req, res) => {
  try {
    const nextJob = await getNextJobNo();
    res.json({ success: true, nextJobNo: nextJob });
  } catch (error) {
    console.error("Error generating next job no:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all booking updates
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const rows = await knexDB("BookingUpdates")
      .leftJoin("MasterBL", "BookingUpdates.job_no", "MasterBL.job_no")
      .select("BookingUpdates.*", "MasterBL.invoice_totals as mbl_invoice_totals")
      .orderBy("BookingUpdates.id", "asc");

    const processed = rows.map(row => {
      let invAmt = row.invoice_amount;
      if (row.mbl_invoice_totals) {
        try {
          const totals = typeof row.mbl_invoice_totals === 'string'
            ? JSON.parse(row.mbl_invoice_totals)
            : row.mbl_invoice_totals;
          if (totals && totals.grandTotal !== undefined) {
            invAmt = totals.grandTotal;
          }
        } catch (e) {
          console.error("Error parsing mbl_invoice_totals:", e);
        }
      }
      // Remove mbl_invoice_totals from output to keep it clean
      const cleaned = { ...row, invoice_amount: invAmt };
      delete cleaned.mbl_invoice_totals;
      return cleaned;
    });

    res.json({ success: true, data: processed });
  } catch (error) {
    console.error("Error fetching booking updates:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Insert single booking update
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const insertData = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) {
        insertData[key] = req.body[key];
      }
    }

    if (insertData.status === 'Closed') {
      const validation = await checkClosedStatusAllowed(insertData.job_no, insertData);
      if (!validation.allowed) {
        return res.status(400).json({ success: false, message: validation.message });
      }
    }

    const newRecord = await knexDB.transaction(async (trx) => {
      let targetJobNo = insertData.job_no;
      if (!targetJobNo) {
        targetJobNo = await getNextJobNo(trx);
      } else {
        const existing = await trx("BookingUpdates").where({ job_no: targetJobNo }).first();
        if (existing) {
          targetJobNo = await getNextJobNo(trx);
        }
      }
      insertData.job_no = targetJobNo;

      const [id] = await trx("BookingUpdates").insert(insertData);
      return trx("BookingUpdates").where({ id }).first();
    });

    res.status(201).json({ success: true, message: "Booking update created", data: newRecord });
  } catch (error) {
    console.error("Error inserting booking update:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Update single booking update
router.put("/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const current = await knexDB("BookingUpdates").where({ id }).first();
    if (!current) {
      return res.status(404).json({ success: false, message: "Booking update row not found." });
    }

    const updateData = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    if (updateData.job_no) {
      const existing = await knexDB("BookingUpdates")
        .where({ job_no: updateData.job_no })
        .andWhereNot({ id })
        .first();
      if (existing) {
        return res.status(400).json({ success: false, message: `Job No. '${updateData.job_no}' already exists on another row.` });
      }
    }

    const targetStatus = updateData.status !== undefined ? updateData.status : current.status;
    if (targetStatus === 'Closed') {
      const fullMergedData = { ...current, ...updateData };
      const validation = await checkClosedStatusAllowed(fullMergedData.job_no, fullMergedData);
      if (!validation.allowed) {
        return res.status(400).json({ success: false, message: validation.message });
      }
    }

    await knexDB("BookingUpdates").where({ id }).update(updateData);
    const updatedRecord = await knexDB("BookingUpdates").where({ id }).first();
    res.json({ success: true, message: "Booking update updated", data: updatedRecord });
  } catch (error) {
    console.error("Error updating booking update:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Delete single booking update
router.delete("/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    await knexDB("BookingUpdates").where({ id }).del();
    res.json({ success: true, message: "Booking update deleted" });
  } catch (error) {
    console.error("Error deleting booking update:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Bulk Insert/Update endpoint
router.post("/bulk", authenticateJWT, async (req, res) => {
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ success: false, message: "Invalid or empty rows array." });
  }

  try {
    const results = [];
    for (const row of rows) {
      const rowData = {};
      for (const key of ALLOWED_FIELDS) {
        if (row[key] !== undefined) {
          rowData[key] = row[key];
        }
      }

      if (row.id) {
        // Update existing row
        if (rowData.job_no) {
          const existing = await knexDB("BookingUpdates")
            .where({ job_no: rowData.job_no })
            .andWhereNot({ id: row.id })
            .first();
          if (existing) {
            // Merge or skip update to avoid duplicate job_no on another row
            continue;
          }
        }
        await knexDB("BookingUpdates").where({ id: row.id }).update(rowData);
        results.push({ id: row.id, ...rowData });
      } else {
        // Insert new row or update if job_no exists
        if (rowData.job_no) {
          const existing = await knexDB("BookingUpdates").where({ job_no: rowData.job_no }).first();
          if (existing) {
            await knexDB("BookingUpdates").where({ id: existing.id }).update(rowData);
            results.push({ id: existing.id, ...rowData });
            continue;
          }
        }
        const [newId] = await knexDB("BookingUpdates").insert(rowData);
        results.push({ id: newId, ...rowData });
      }
    }

    res.json({ success: true, message: "Bulk save completed successfully", data: results });
  } catch (error) {
    console.error("Error doing bulk booking updates:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
});

// Bulk Delete endpoint
router.post("/delete-multiple", authenticateJWT, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: "Invalid or missing ids array." });
  }

  try {
    await knexDB("BookingUpdates").whereIn("id", ids).del();
    res.json({ success: true, message: `${ids.length} records deleted successfully.` });
  } catch (error) {
    console.error("Error doing bulk delete:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

export default router;
