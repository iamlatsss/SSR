import express from 'express';
import { authenticateJWT, hasPermission } from "../AuthAPI/Auth.js";
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
  "status",
  "created_by",
  "assigned_to",
  "updated_by",
  "updated_at"
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
      const cleanLabel = field.replace(/_/g, ' ').toUpperCase();
      return { allowed: false, message: `Cannot close job: Field '${cleanLabel}' is missing/empty.` };
    }
  }

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

// Get list of active employees for assignment dropdowns
router.get("/employees", authenticateJWT, async (req, res) => {
  try {
    const users = await knexDB("Users")
      .select("user_id", "user_name", "email", "role")
      .where("is_active", true)
      .orderBy("user_name", "asc");
    res.json({ success: true, employees: users });
  } catch (error) {
    console.error("Error fetching employees list:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

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

// Get user-specific or all booking updates
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const isSysAdmin = hasPermission(req.user.role, 'canViewAllBookings');
    const userId = req.user.user_id;

    let query = knexDB("BookingUpdates")
      .leftJoin("MasterBL", "BookingUpdates.job_no", "MasterBL.job_no")
      .leftJoin("Users as creator", "BookingUpdates.created_by", "creator.user_id")
      .leftJoin("Users as assignee", "BookingUpdates.assigned_to", "assignee.user_id")
      .leftJoin("Users as modifier", "BookingUpdates.updated_by", "modifier.user_id")
      .select(
        "BookingUpdates.*",
        "MasterBL.invoice_totals as mbl_invoice_totals",
        "creator.user_name as created_by_name",
        "assignee.user_name as assigned_to_name",
        "modifier.user_name as updated_by_name"
      );

    if (!isSysAdmin) {
      query = query.where(function() {
        this.where("BookingUpdates.created_by", userId)
            .orWhere("BookingUpdates.assigned_to", userId);
      });
    }

    const rows = await query.orderBy("BookingUpdates.id", "asc");

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
      const cleaned = { ...row, invoice_amount: invAmt };
      delete cleaned.mbl_invoice_totals;
      return cleaned;
    });

    res.json({ success: true, data: processed });
  } catch (error) {
    console.error("Error fetching user booking updates:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Insert single user booking update
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const isSysAdmin = hasPermission(req.user.role, 'canViewAllBookings');
    const userId = req.user.user_id;

    const insertData = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) {
        insertData[key] = req.body[key];
      }
    }

    // Set tracking fields
    insertData.created_by = userId;
    insertData.updated_by = userId;
    insertData.updated_at = knexDB.fn.now();

    if (!isSysAdmin) {
      insertData.assigned_to = userId; // Default assignment to self
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
    console.error("Error inserting user booking update:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Update single user booking update
router.put("/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const isSysAdmin = hasPermission(req.user.role, 'canViewAllBookings');
    const userId = req.user.user_id;

    const current = await knexDB("BookingUpdates").where({ id }).first();
    if (!current) {
      return res.status(404).json({ success: false, message: "Booking update row not found." });
    }

    // Validate ownership/assignment
    if (!isSysAdmin && current.created_by !== userId && current.assigned_to !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden: You can only update bookings assigned to or created by you." });
    }

    const updateData = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    // Non-admins cannot alter created_by or assigned_to details
    if (!isSysAdmin) {
      delete updateData.assigned_to;
      delete updateData.created_by;
    }

    updateData.updated_by = userId;
    updateData.updated_at = knexDB.fn.now();

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
    console.error("Error updating user booking update:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Delete single booking update
router.delete("/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const isSysAdmin = hasPermission(req.user.role, 'canViewAllBookings');
    const userId = req.user.user_id;

    const current = await knexDB("BookingUpdates").where({ id }).first();
    if (!current) {
      return res.status(404).json({ success: false, message: "Booking update row not found." });
    }

    // Non-admins can only delete bookings they created
    if (!isSysAdmin && current.created_by !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden: You can only delete bookings created by you." });
    }

    await knexDB("BookingUpdates").where({ id }).del();
    res.json({ success: true, message: "Booking update deleted" });
  } catch (error) {
    console.error("Error deleting user booking update:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Bulk Insert/Update with ownership tracking
router.post("/bulk", authenticateJWT, async (req, res) => {
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ success: false, message: "Invalid or empty rows array." });
  }

  try {
    const isSysAdmin = hasPermission(req.user.role, 'canViewAllBookings');
    const userId = req.user.user_id;
    const results = [];

    for (const row of rows) {
      const rowData = {};
      for (const key of ALLOWED_FIELDS) {
        if (row[key] !== undefined) {
          rowData[key] = row[key];
        }
      }

      if (row.id) {
        const current = await knexDB("BookingUpdates").where({ id: row.id }).first();
        if (!current) continue;

        if (!isSysAdmin && current.created_by !== userId && current.assigned_to !== userId) {
          continue;
        }

        if (!isSysAdmin) {
          delete rowData.assigned_to;
          delete rowData.created_by;
        }

        if (rowData.job_no) {
          const existing = await knexDB("BookingUpdates")
            .where({ job_no: rowData.job_no })
            .andWhereNot({ id: row.id })
            .first();
          if (existing) continue;
        }

        rowData.updated_by = userId;
        rowData.updated_at = knexDB.fn.now();

        await knexDB("BookingUpdates").where({ id: row.id }).update(rowData);
        results.push({ id: row.id, ...rowData });
      } else {
        if (rowData.job_no) {
          const existing = await knexDB("BookingUpdates").where({ job_no: rowData.job_no }).first();
          if (existing) {
            if (!isSysAdmin && existing.created_by !== userId && existing.assigned_to !== userId) {
              continue;
            }
            if (!isSysAdmin) {
              delete rowData.assigned_to;
              delete rowData.created_by;
            }
            rowData.updated_by = userId;
            rowData.updated_at = knexDB.fn.now();

            await knexDB("BookingUpdates").where({ id: existing.id }).update(rowData);
            results.push({ id: existing.id, ...rowData });
            continue;
          }
        }

        rowData.created_by = userId;
        rowData.updated_by = userId;
        rowData.updated_at = knexDB.fn.now();
        if (!isSysAdmin) {
          rowData.assigned_to = userId;
        }

        const [newId] = await knexDB("BookingUpdates").insert(rowData);
        results.push({ id: newId, ...rowData });
      }
    }

    res.json({ success: true, message: "Bulk save completed successfully", data: results });
  } catch (error) {
    console.error("Error doing bulk user booking updates:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
});

// Bulk Delete with ownership validation
router.post("/delete-multiple", authenticateJWT, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: "Invalid or missing ids array." });
  }

  try {
    const isSysAdmin = hasPermission(req.user.role, 'canViewAllBookings');
    const userId = req.user.user_id;

    if (!isSysAdmin) {
      const countResult = await knexDB("BookingUpdates")
        .whereIn("id", ids)
        .andWhere("created_by", userId)
        .count({ count: "*" });

      const matchCount = countResult[0].count;
      if (matchCount !== ids.length) {
        return res.status(403).json({ success: false, message: "Forbidden: You can only delete records that you created." });
      }
    }

    await knexDB("BookingUpdates").whereIn("id", ids).del();
    res.json({ success: true, message: `${ids.length} records deleted successfully.` });
  } catch (error) {
    console.error("Error doing bulk delete:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Delete all booking updates endpoint for users/admin
router.delete("/delete-all", authenticateJWT, async (req, res) => {
  try {
    await knexDB("BookingUpdates").del();
    res.json({ success: true, message: "All booking updates deleted successfully." });
  } catch (error) {
    console.error("Error deleting all user booking updates:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
