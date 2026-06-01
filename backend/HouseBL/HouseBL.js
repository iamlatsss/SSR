import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js"
import { knexDB } from "../Database.js";

const router = express.Router();

const ALLOWED_FIELDS = [
  "job_no",
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

// Helper to sanitize dates
function sanitizeDates(targetData) {
  const dateFields = ["date_of_nomination", "invoice_date"];
  dateFields.forEach(f => {
    if (targetData[f] === "") {
      targetData[f] = null;
    }
  });
}

// HouseBL Init
router.get("/init", authenticateJWT, async (req, res) => {
  try {
    // 1. Get Customers
    const customers = await knexDB("Customers").select("customer_id", "name", "address", "office_address", "branch_office", "gstin", "customer_type");

    // 2. Get active MasterBLs to populate MBL dropdown in HBL form
    const masterBLs = await knexDB("MasterBL").select("mbl_no", "job_no");

    res.json({ success: true, nextJobNo: null, customers, masterBLs });
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
    sanitizeDates(insertData);

    if (!insertData.status) {
      insertData.status = 'Draft';
    }

    if (insertData.freight_amount && parseFloat(insertData.freight_amount) > 0 && insertData.status === 'Draft') {
      insertData.status = 'Sell Rate Updated';
    }

    const [hblId] = await knexDB('HouseBL').insert(insertData);
    res.status(201).json({ success: true, message: "HouseBL Job created", id: hblId });
  } catch (error) {
    console.error("Error inserting HouseBL:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Get Specific HouseBL by ID with MasterBL Sync
router.get("/get/:id", authenticateJWT, async (req, res) => {
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
      .where({ 'HouseBL.id': req.params.id })
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

// Update HouseBL by ID
router.put("/update/:id", authenticateJWT, async (req, res) => {
  const updateData = {};

  for (const key of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined && !['shipper', 'consignee', 'manual_party_details'].includes(key)) {
      updateData[key] = req.body[key];
    }
  }

  try {
    // Hybrid field handling
    if (req.body.shipper !== undefined || req.body.consignee !== undefined) {
      const current = await knexDB('HouseBL').select('manual_party_details').where({ id: req.params.id }).first();
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

    sanitizeDates(updateData);

    // Status state machine based on recent activity
    const currentJob = await knexDB('HouseBL').where({ id: req.params.id }).first();
    if (currentJob) {
      let finalStatus = updateData.status || currentJob.status;

      if (updateData.invoice_no) {
        finalStatus = 'Invoice Generated';
      } else if (updateData.freight_amount && parseFloat(updateData.freight_amount) > 0 && finalStatus === 'Draft') {
        finalStatus = 'Sell Rate Updated';
      }

      updateData.status = finalStatus;
    }

    const affectedRows = await knexDB('HouseBL').where({ id: req.params.id }).update(updateData);
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
