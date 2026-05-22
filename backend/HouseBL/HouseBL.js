import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js"
import { knexDB } from "../Database.js";

const router = express.Router();

const ALLOWED_FIELDS = [
  "date_of_nomination",
  "hbl_no",
  "mbl_no",
  "shipper",
  "consignee",
  "status",
  "shipper_invoice_no",
  "net_weight",
  "gross_weight",
  "hbl_telex_received",
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

// Helper to process hybrid fields
function processHybridFields(inputBody, targetData) {
  const hybridFields = ['shipper', 'consignee'];
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
        targetData[field] = null;
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

// HouseBL Init
router.get("/init", authenticateJWT, async (req, res) => {
  try {
    const dbName = process.env.MYSQL_DATABASE || 'ssr';

    // 1. Get AUTO_INCREMENT from schema
    const [status] = await knexDB.raw(
      `SELECT AUTO_INCREMENT 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'HouseBL'`,
      [dbName]
    );

    // 2. Get MAX(job_no) from table
    const [maxResult] = await knexDB("HouseBL").max("job_no as maxJobNo");

    const autoIncrementVal = status[0]?.AUTO_INCREMENT || 9000;
    const maxJobNo = maxResult.maxJobNo || 8999;

    const nextJobNo = Math.max(autoIncrementVal, maxJobNo + 1);

    // 3. Get Customers
    const customers = await knexDB("Customers").select("customer_id", "name", "customer_type");

    // 4. Get active MasterBLs to populate MBL dropdown in HBL form
    const masterBLs = await knexDB("MasterBL").select("mbl_no", "job_no");

    res.json({ success: true, nextJobNo, customers, masterBLs });
  } catch (error) {
    console.error("Error initializing HouseBL:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Insert HouseBL Job
router.post("/insert", authenticateJWT, async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ success: false, message: "Missing request body" });
  }

  const insertData = {};

  try {
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined && !['shipper', 'consignee', 'manual_party_details'].includes(key)) {
        insertData[key] = req.body[key];
      }
    }

    processHybridFields(req.body, insertData);

    if (!insertData.status) {
      insertData.status = 'Draft';
    }

    if (insertData.freight_amount && parseFloat(insertData.freight_amount) > 0 && insertData.status === 'Draft') {
      insertData.status = 'Sell Rate Updated';
    }

    const [jobNo] = await knexDB('HouseBL').insert(insertData);
    res.status(201).json({ success: true, message: "HouseBL Job created", JobNo: jobNo });
  } catch (error) {
    console.error("Error inserting HouseBL:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Get Specific HouseBL by JobNo with MasterBL Sync
router.get("/get/:JobNo", authenticateJWT, async (req, res) => {
  try {
    const job = await knexDB('HouseBL')
      .leftJoin('Customers as S', 'HouseBL.shipper', 'S.customer_id')
      .leftJoin('Customers as C', 'HouseBL.consignee', 'C.customer_id')
      .leftJoin('MasterBL as M', 'HouseBL.mbl_no', 'M.mbl_no')
      .leftJoin('Customers as A', 'M.agent', 'A.customer_id')
      .select(
        'HouseBL.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(HouseBL.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(HouseBL.manual_party_details, '$.consignee'))) as consignee_name"),
        'M.pol as pol',
        'M.pod as pod',
        'M.final_pod as final_pod',
        'M.eta as eta',
        'M.etd as etd',
        'M.shipping_line_name as shipping_line_name',
        'M.cargo_type as cargo_type',
        'M.container_size as container_size',
        'M.container_count as container_count',
        'M.agent as agent',
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(M.manual_party_details, '$.agent'))) as agent_name")
      )
      .where({ 'HouseBL.job_no': req.params.JobNo })
      .first();

    if (!job) {
      return res.status(404).json({ success: false, message: "HouseBL not found" });
    }

    res.json({ success: true, job });
  } catch (error) {
    console.error("Error fetching HouseBL:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get All HouseBL Jobs with MasterBL Sync
router.get("/get", authenticateJWT, async (req, res) => {
  try {
    const jobs = await knexDB('HouseBL')
      .leftJoin('Customers as S', 'HouseBL.shipper', 'S.customer_id')
      .leftJoin('Customers as C', 'HouseBL.consignee', 'C.customer_id')
      .leftJoin('MasterBL as M', 'HouseBL.mbl_no', 'M.mbl_no')
      .leftJoin('Customers as A', 'M.agent', 'A.customer_id')
      .select(
        'HouseBL.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(HouseBL.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(HouseBL.manual_party_details, '$.consignee'))) as consignee_name"),
        'M.pol as pol',
        'M.pod as pod',
        'M.final_pod as final_pod',
        'M.eta as eta',
        'M.etd as etd',
        'M.shipping_line_name as shipping_line_name',
        'M.cargo_type as cargo_type',
        'M.container_size as container_size',
        'M.container_count as container_count',
        'M.agent as agent',
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(M.manual_party_details, '$.agent'))) as agent_name")
      )
      .orderBy('HouseBL.created_at', 'desc');

    res.json({ success: true, jobs });
  } catch (error) {
    console.error("Error fetching all HouseBL jobs:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Update HouseBL by JobNo
router.put("/update/:jobNo", authenticateJWT, async (req, res) => {
  const updateData = {};

  for (const key of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined && !['shipper', 'consignee', 'manual_party_details'].includes(key)) {
      updateData[key] = req.body[key];
    }
  }

  try {
    // Hybrid field handling
    if (req.body.shipper !== undefined || req.body.consignee !== undefined) {
      const current = await knexDB('HouseBL').select('manual_party_details').where({ job_no: req.params.jobNo }).first();
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
    const currentJob = await knexDB('HouseBL').where({ job_no: req.params.jobNo }).first();
    if (currentJob) {
      let finalStatus = updateData.status || currentJob.status;

      if (updateData.invoice_no) {
        finalStatus = 'Invoice Generated';
      } else if (updateData.freight_amount && parseFloat(updateData.freight_amount) > 0 && finalStatus === 'Draft') {
        finalStatus = 'Sell Rate Updated';
      }

      updateData.status = finalStatus;
    }

    const affectedRows = await knexDB('HouseBL').where({ job_no: req.params.jobNo }).update(updateData);
    if (affectedRows === 0) {
      return res.status(404).json({ success: false, message: "HouseBL job not found" });
    }

    res.json({ success: true, message: "HouseBL job updated successfully" });
  } catch (error) {
    console.error("Error updating HouseBL:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
