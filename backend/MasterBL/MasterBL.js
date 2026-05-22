import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js"
import { knexDB } from "../Database.js";

const router = express.Router();

const ALLOWED_FIELDS = [
  "date_of_nomination",
  "mbl_no",
  "shipper",
  "consignee",
  "pol",
  "pod",
  "final_pod",
  "container_size",
  "container_count",
  "agent",
  "status",
  "eta",
  "etd",
  "shipper_invoice_no",
  "net_weight",
  "gross_weight",
  "cargo_type",
  "shipping_line_name",
  "mbl_telex_received",
  "no_of_palette",
  "marks_and_numbers",
  "manual_party_details",
  "freight_amount",
  "freight_currency",
  "invoice_no",
  "invoice_date",
  "invoice_items",
  "invoice_totals",
  "invoice_customer",
  "additional_details"
];

// Helper to process hybrid numeric/string fields
function processHybridFields(inputBody, targetData) {
  const hybridFields = ['shipper', 'consignee', 'agent'];
  let manualDetails = {};

  if (inputBody.manual_party_details) {
    try {
      manualDetails = typeof inputBody.manual_party_details === 'string'
        ? JSON.parse(inputBody.manual_party_details)
        : inputBody.manual_party_details;
    } catch (e) {
      console.warn("Invalid manual_party_details format", e);
    }
  }

  hybridFields.forEach(field => {
    const val = inputBody[field];
    if (val !== undefined) {
      if (val && !isNaN(val) && Number.isInteger(Number(val))) {
        targetData[field] = val; // FK
        delete manualDetails[field];
      } else if (val && typeof val === 'string' && val.trim() !== '') {
        targetData[field] = null; // Null FK
        manualDetails[field] = val.trim();
      } else {
        if (val === '') {
          targetData[field] = null;
          delete manualDetails[field];
        }
      }
    }
  });

  if (Object.keys(manualDetails).length > 0) {
    targetData.manual_party_details = JSON.stringify(manualDetails);
  } else {
    targetData.manual_party_details = JSON.stringify({});
  }
}

// MasterBL Init
router.get("/init", authenticateJWT, async (req, res) => {
  try {
    const dbName = process.env.MYSQL_DATABASE || 'ssr';

    // 1. Get AUTO_INCREMENT from schema
    const [status] = await knexDB.raw(
      `SELECT AUTO_INCREMENT 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'MasterBL'`,
      [dbName]
    );

    // 2. Get MAX(job_no) from table
    const [maxResult] = await knexDB("MasterBL").max("job_no as maxJobNo");

    const autoIncrementVal = status[0]?.AUTO_INCREMENT || 8000;
    const maxJobNo = maxResult.maxJobNo || 7999;

    const nextJobNo = Math.max(autoIncrementVal, maxJobNo + 1);

    // 3. Get Customers
    const customers = await knexDB("Customers").select("customer_id", "name", "customer_type");

    res.json({ success: true, nextJobNo, customers });
  } catch (error) {
    console.error("Error initializing MasterBL:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Insert MasterBL Job
router.post("/insert", authenticateJWT, async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ success: false, message: "Missing request body" });
  }

  const insertData = {};

  try {
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined && !['shipper', 'consignee', 'agent', 'manual_party_details'].includes(key)) {
        insertData[key] = req.body[key];
      }
    }

    processHybridFields(req.body, insertData);

    // Automatic status logic: Draft by default, Sell Rate Updated if freight_amount is provided
    if (!insertData.status) {
      insertData.status = 'Draft';
    }

    if (insertData.freight_amount && parseFloat(insertData.freight_amount) > 0 && insertData.status === 'Draft') {
      insertData.status = 'Sell Rate Updated';
    }

    const [jobNo] = await knexDB('MasterBL').insert(insertData);
    res.status(201).json({ success: true, message: "MasterBL Job created", JobNo: jobNo });
  } catch (error) {
    console.error("Error inserting MasterBL:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Get Specific MasterBL by MBL number (used by HouseBL auto-fill)
router.get("/get-by-mbl/:mblNo", authenticateJWT, async (req, res) => {
  try {
    const job = await knexDB('MasterBL')
      .leftJoin('Customers as S', 'MasterBL.shipper', 'S.customer_id')
      .leftJoin('Customers as C', 'MasterBL.consignee', 'C.customer_id')
      .leftJoin('Customers as A', 'MasterBL.agent', 'A.customer_id')
      .select(
        'MasterBL.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name"),
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.agent'))) as agent_name")
      )
      .where({ 'MasterBL.mbl_no': req.params.mblNo })
      .first();

    if (!job) {
      return res.status(404).json({ success: false, message: "MasterBL not found" });
    }

    res.json({ success: true, job });
  } catch (error) {
    console.error("Error fetching MasterBL by MBL:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get Specific MasterBL by JobNo
router.get("/get/:JobNo", authenticateJWT, async (req, res) => {
  try {
    const job = await knexDB('MasterBL')
      .leftJoin('Customers as S', 'MasterBL.shipper', 'S.customer_id')
      .leftJoin('Customers as C', 'MasterBL.consignee', 'C.customer_id')
      .leftJoin('Customers as A', 'MasterBL.agent', 'A.customer_id')
      .select(
        'MasterBL.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name"),
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.agent'))) as agent_name")
      )
      .where({ 'MasterBL.job_no': req.params.JobNo })
      .first();

    if (!job) {
      return res.status(404).json({ success: false, message: "MasterBL not found" });
    }

    res.json({ success: true, job });
  } catch (error) {
    console.error("Error fetching MasterBL:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get All MasterBL Jobs
router.get("/get", authenticateJWT, async (req, res) => {
  try {
    const jobs = await knexDB('MasterBL')
      .leftJoin('Customers as S', 'MasterBL.shipper', 'S.customer_id')
      .leftJoin('Customers as C', 'MasterBL.consignee', 'C.customer_id')
      .leftJoin('Customers as A', 'MasterBL.agent', 'A.customer_id')
      .select(
        'MasterBL.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name"),
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.agent'))) as agent_name")
      )
      .orderBy('MasterBL.created_at', 'desc');

    res.json({ success: true, jobs });
  } catch (error) {
    console.error("Error fetching all MasterBL jobs:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Update MasterBL by JobNo
router.put("/update/:jobNo", authenticateJWT, async (req, res) => {
  const updateData = {};

  for (const key of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined && !['shipper', 'consignee', 'agent', 'manual_party_details'].includes(key)) {
      updateData[key] = req.body[key];
    }
  }

  try {
    // Hybrid field handling
    if (req.body.shipper !== undefined || req.body.consignee !== undefined || req.body.agent !== undefined) {
      const current = await knexDB('MasterBL').select('manual_party_details').where({ job_no: req.params.jobNo }).first();
      let currentManual = {};
      if (current && current.manual_party_details) {
        try {
          currentManual = typeof current.manual_party_details === 'string'
            ? JSON.parse(current.manual_party_details)
            : current.manual_party_details;
        } catch (e) {}
      }
      const mockBody = { ...req.body, manual_party_details: currentManual };
      processHybridFields(mockBody, updateData);
    }

    // Status state machine based on recent activity
    const currentJob = await knexDB('MasterBL').where({ job_no: req.params.jobNo }).first();
    if (currentJob) {
      let finalStatus = updateData.status || currentJob.status;

      // Rule 1: Invoice generated
      if (updateData.invoice_no) {
        finalStatus = 'Invoice Generated';
      }
      // Rule 2: Sell rate updated (only if we're in Draft)
      else if (updateData.freight_amount && parseFloat(updateData.freight_amount) > 0 && finalStatus === 'Draft') {
        finalStatus = 'Sell Rate Updated';
      }

      updateData.status = finalStatus;
    }

    const affectedRows = await knexDB('MasterBL').where({ job_no: req.params.jobNo }).update(updateData);
    if (affectedRows === 0) {
      return res.status(404).json({ success: false, message: "MasterBL job not found" });
    }

    res.json({ success: true, message: "MasterBL job updated successfully" });
  } catch (error) {
    console.error("Error updating MasterBL:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
