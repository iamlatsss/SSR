import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js"
import { knexDB } from "../Database.js";

const router = express.Router();

const ALLOWED_FIELDS = [
  "date_of_nomination",
  "shipper",
  "consignee",
  "pol",
  "pod",
  "final_pod",
  "container_size",
  "container_count",
  "agent",
  "status",
  "hbl_no",
  "mbl_no",
  "eta",
  "etd",
  "shipper_invoice_no",
  "net_weight",
  "gross_weight",
  "cargo_type",
  "shipping_line_name",
  "hbl_telex_received",
  "mbl_telex_received",
  "no_of_palette",
  "marks_and_numbers",
  "manual_party_details",
  "igm_no",
  "igm_on",
  "cha",
  "cfs",
  "freight_amount",
  "freight_currency",
  "do_validity",
  "container_number"
];

// Booking Init
router.get("/init", authenticateJWT, async (req, res) => {
  try {
    const dbName = process.env.MYSQL_DATABASE || 'ssr';

    // 1. Get AUTO_INCREMENT from schema
    const [status] = await knexDB.raw(
      `SELECT AUTO_INCREMENT 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Booking'`,
      [dbName]
    );

    // 2. Get MAX(job_no) from table (Double check to ensure no collision)
    const [maxResult] = await knexDB("Booking").max("job_no as maxJobNo");

    const autoIncrementVal = status[0]?.AUTO_INCREMENT || 6000;
    const maxJobNo = maxResult.maxJobNo || 5999;

    // Use the greater of the two to be safe
    const nextJobNo = Math.max(autoIncrementVal, maxJobNo + 1);

    console.log(`[Init] DB: ${dbName}, Schema AI: ${autoIncrementVal}, MaxJob: ${maxResult.maxJobNo} -> Next: ${nextJobNo}`);

    // 3. Get Customers (id, name, type)
    const customers = await knexDB("Customers").select("customer_id", "name", "customer_type");

    res.json({ success: true, nextJobNo, customers });
  } catch (error) {
    console.error("Error initializing booking page:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Helper to get or create customer/agent
async function getOrCreateParty(name, type = 'Customer') {
  if (!name) return null;

  // 1. Try to find existing by Name
  // Assuming 'Customers' table holds shippers and consignees
  // Assuming 'Agents' table holds agents? Or all in Customers?
  // Based on error "REFERENCES Customers", shipper is in Customers.
  // We'll assume consignee is also Customer.
  // Agent might be in Customers or Agents table. 
  // Let's assume Customers for now based on typical single-party-table designs, 
  // OR check if 'Agents' table exists. 
  // Given I can't check schema easily, I'll assume Customers for shipper/consignee.

  const tableName = 'Customers'; // Default
  // Check if we need to switch table for Agent?
  // For safety, let's just handle Shipper/Consignee first which we know are Customers.

  const [existing] = await knexDB(tableName).where('name', name).select('customer_id');
  if (existing) return existing.customer_id;

  // 2. Create if not exists
  const [newId] = await knexDB(tableName).insert({ name: name /*, type: type */ }); // Add type if schema has it
  console.log(`Created new ${tableName}: ${name} (ID: ${newId})`);
  return newId;
}

// Helper to process hybrid numeric/string fields
function processHybridFields(inputBody, targetData) {
  const hybridFields = ['shipper', 'consignee', 'agent'];
  let manualDetails = {};

  // If manual_party_details passed explicitly, start with it
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
      // Check if it's a valid number (ID)
      if (val && !isNaN(val) && Number.isInteger(Number(val))) {
        targetData[field] = val; // Set FK
        // If switching to FK, ensure we remove manual entry for this field if it existed (though we are building fresh obj usually)
        delete manualDetails[field];
      } else if (val && typeof val === 'string' && val.trim() !== '') {
        // It's a string name
        targetData[field] = null; // Nullify FK
        manualDetails[field] = val.trim(); // Add to JSON
      } else {
        // Empty or null
        // If specifically set to null/empty in body, maybe clear both?
        // For now, if empty string passed, we assume clearing.
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
    // If we cleared everything manual, should we set it to NULL or empty JSON? 
    // safer to leave it if we are patching, but for full update/insert:
    targetData.manual_party_details = JSON.stringify({});
  }
}


// Insert Booking
router.post("/insert", authenticateJWT, async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ success: false, message: "Missing request body" });
  }

  const insertData = {};

  try {
    // Standard Fields
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined && !['shipper', 'consignee', 'agent', 'manual_party_details'].includes(key)) {
        insertData[key] = req.body[key];
      }
    }

    // Hybrid Fields Logic
    processHybridFields(req.body, insertData);

    if (Object.keys(insertData).length === 0) {
      return res.status(400).json({ success: false, message: "No valid booking fields provided" });
    }

    // Ensure default status
    if (!insertData.status) insertData.status = 'draft';

    const [jobNo] = await knexDB('Booking').insert(insertData);
    res.status(201).json({ success: true, message: "Booking inserted", JobNo: jobNo });

  } catch (error) {
    console.error("❌ Error inserting booking:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});


// View Booking by JobNo
router.get("/get/:JobNo", authenticateJWT, async (req, res) => {
  try {
    const booking = await knexDB('Booking')
      .leftJoin('Customers as S', 'Booking.shipper', 'S.customer_id')
      .leftJoin('Customers as C', 'Booking.consignee', 'C.customer_id')
      .leftJoin('Customers as A', 'Booking.agent', 'A.customer_id')
      .leftJoin('Customers as CHA', 'Booking.cha', 'CHA.customer_id')
      .leftJoin('Customers as CFS', 'Booking.cfs', 'CFS.customer_id')
      .select(
        'Booking.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(Booking.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(Booking.manual_party_details, '$.consignee'))) as consignee_name"),
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(Booking.manual_party_details, '$.agent'))) as agent_name"),
        'CHA.name as cha_name',
        'CFS.name as cfs_name'
      )
      .where({ 'Booking.job_no': req.params.JobNo })
      .first();

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// View All Booking 
router.get("/get", authenticateJWT, async (req, res) => {
  try {
    const bookings = await knexDB('Booking')
      .leftJoin('Customers as S', 'Booking.shipper', 'S.customer_id')
      .leftJoin('Customers as C', 'Booking.consignee', 'C.customer_id')
      .leftJoin('Customers as A', 'Booking.agent', 'A.customer_id')
      .leftJoin('Customers as CHA', 'Booking.cha', 'CHA.customer_id')
      .leftJoin('Customers as CFS', 'Booking.cfs', 'CFS.customer_id')
      .select(
        'Booking.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(Booking.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(Booking.manual_party_details, '$.consignee'))) as consignee_name"),
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(Booking.manual_party_details, '$.agent'))) as agent_name"),
        'CHA.name as cha_name',
        'CFS.name as cfs_name'
      )
      .orderBy('Booking.created_at', 'desc');

    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// Update a booking by JobNo
router.put("/update/:jobNo", authenticateJWT, async (req, res) => {
  const updateData = {};

  // Filter request body for allowed fields
  for (const key of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined && !['shipper', 'consignee', 'agent', 'manual_party_details'].includes(key)) {
      updateData[key] = req.body[key];
    }
  }

  try {
    // If we are updating hybrid fields, we need to be careful not to overwrite existing manual details if NOT provided
    // BUT usually update comes with full form data. 
    // Let's assume we construct manual_details from what's passed + what might be missing?
    // Given the complexity, let's assume the frontend sends the current state of these fields.
    // We will fetch existing manual details if we want to merge, but simpler is to re-construct if fields are present.

    // However, we can't easily merge without fetching first.
    // Optimization: If shipper/consignee/agent are NOT in req.body, don't touch them.
    // If they ARE in req.body, re-process them.

    if (req.body.shipper !== undefined || req.body.consignee !== undefined || req.body.agent !== undefined) {
      // We essentially need to rebuild the hybrid state for these 3 fields.
      // We'll fetch current first to respect existing manual details of UNTOUCHED fields?
      // Or just rely on what is passed. 
      // Strategy: Process the passed fields. If `manual_party_details` is needed, we need to fetch current first to merge?
      // NO, let's standardise: The caller should send all 3 if they rely on manual details, or we fetch.
      // Let's fetch to be safe to merge.

      const current = await knexDB('Booking').select('manual_party_details').where({ job_no: req.params.jobNo }).first();
      let currentManual = {};
      if (current && current.manual_party_details) {
        try { currentManual = typeof current.manual_party_details === 'string' ? JSON.parse(current.manual_party_details) : current.manual_party_details; } catch (e) { }
      }

      // Mock a body that includes current manual details so our helper can merge/overwrite
      const mockBody = { ...req.body, manual_party_details: currentManual };
      processHybridFields(mockBody, updateData);
    }


    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    const affectedRows = await knexDB('Booking').where({ job_no: req.params.jobNo }).update(updateData);
    if (affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    res.json({ success: true, message: "Booking updated successfully" });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
