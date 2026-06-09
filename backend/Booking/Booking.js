import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js"
import { knexDB, mapPartyToCustomer } from "../Database.js";

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
  "container_number",
  "invoice_no",
  "invoice_date",
  "invoice_items",
  "invoice_totals",
  "invoice_customer"
];

// Booking Init
router.get("/init", authenticateJWT, async (req, res) => {
  try {
    // Cache mechanism to prevent DB overload from frontend loops
    if (global.bookingInitCache && (Date.now() - global.bookingInitCache.timestamp < 5000)) {
      return res.json(global.bookingInitCache.data);
    }

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

    // 3. Get Customers (id, name, type)
    const parties = await knexDB("Parties").select("*");
    const customers = parties.map(mapPartyToCustomer);

    const responseData = { success: true, nextJobNo, customers };

    // Update Cache
    global.bookingInitCache = {
      timestamp: Date.now(),
      data: responseData
    };

    res.json(responseData);
  } catch (error) {
    console.error("Error initializing booking page:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// Helper to get or create customer/agent in Parties
async function getOrCreateParty(name, type = 'Customer') {
  if (!name) return null;

  const [existing] = await knexDB('Parties').where('name', name).select('id');
  if (existing) return existing.id;

  // 2. Create if not exists
  const [newId] = await knexDB('Parties').insert({
    name: name,
    email: '',
    category_type: type,
    addresses: JSON.stringify([])
  });
  console.log(`Created new Party: ${name} (ID: ${newId})`);
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


// View Booking by JobNo (Polymorphic)
router.get("/get/:JobNo", authenticateJWT, async (req, res) => {
  const jobNo = parseInt(req.params.JobNo, 10);
  try {
    if (jobNo >= 9000) {
      // HouseBL
      const booking = await knexDB('HouseBL')
        .leftJoin('Parties as S', 'HouseBL.shipper', 'S.id')
        .leftJoin('Parties as C', 'HouseBL.consignee', 'C.id')
        .leftJoin('MasterBL as M', 'HouseBL.mbl_no', 'M.mbl_no')
        .leftJoin('Parties as A', 'M.agent', 'A.id')
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
        .where({ 'HouseBL.job_no': jobNo })
        .first();

      if (!booking) {
        return res.status(404).json({ success: false, message: "HouseBL not found" });
      }
      booking.job_type = 'HouseBL';
      return res.json({ success: true, booking });
    } else if (jobNo >= 8000) {
      // MasterBL
      const booking = await knexDB('MasterBL')
        .leftJoin('Parties as S', 'MasterBL.shipper', 'S.id')
        .leftJoin('Parties as C', 'MasterBL.consignee', 'C.id')
        .leftJoin('Parties as A', 'MasterBL.agent', 'A.id')
        .select(
          'MasterBL.*',
          knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
          knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name"),
          knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.agent'))) as agent_name")
        )
        .where({ 'MasterBL.job_no': jobNo })
        .first();

      if (!booking) {
        return res.status(404).json({ success: false, message: "MasterBL not found" });
      }
      booking.job_type = 'MasterBL';
      return res.json({ success: true, booking });
    } else {
      // Standard Booking
      const booking = await knexDB('Booking')
        .leftJoin('Parties as S', 'Booking.shipper', 'S.id')
        .leftJoin('Parties as C', 'Booking.consignee', 'C.id')
        .leftJoin('Parties as A', 'Booking.agent', 'A.id')
        .leftJoin('Parties as CHA', 'Booking.cha', 'CHA.id')
        .leftJoin('Parties as CFS', 'Booking.cfs', 'CFS.id')
        .select(
          'Booking.*',
          knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(Booking.manual_party_details, '$.shipper'))) as shipper_name"),
          knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(Booking.manual_party_details, '$.consignee'))) as consignee_name"),
          knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(Booking.manual_party_details, '$.agent'))) as agent_name"),
          'CHA.name as cha_name',
          'CFS.name as cfs_name'
        )
        .where({ 'Booking.job_no': jobNo })
        .first();

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }
      booking.job_type = 'Booking';
      return res.json({ success: true, booking });
    }
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// View All Booking (Unified)
router.get("/get", authenticateJWT, async (req, res) => {
  try {
    // 1. Get standard bookings
    const bookings = await knexDB('Booking')
      .leftJoin('Parties as S', 'Booking.shipper', 'S.id')
      .leftJoin('Parties as C', 'Booking.consignee', 'C.id')
      .leftJoin('Parties as A', 'Booking.agent', 'A.id')
      .leftJoin('Parties as CHA', 'Booking.cha', 'CHA.id')
      .leftJoin('Parties as CFS', 'Booking.cfs', 'CFS.id')
      .select(
        'Booking.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(Booking.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(Booking.manual_party_details, '$.consignee'))) as consignee_name"),
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(Booking.manual_party_details, '$.agent'))) as agent_name"),
        'CHA.name as cha_name',
        'CFS.name as cfs_name'
      );
    bookings.forEach(b => { b.job_type = 'Booking'; });

    // 2. Get MasterBLs
    const masterBLs = await knexDB('MasterBL')
      .leftJoin('Parties as S', 'MasterBL.shipper', 'S.id')
      .leftJoin('Parties as C', 'MasterBL.consignee', 'C.id')
      .leftJoin('Parties as A', 'MasterBL.agent', 'A.id')
      .select(
        'MasterBL.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name"),
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.agent'))) as agent_name")
      );
    masterBLs.forEach(m => {
      m.job_type = 'MasterBL';
      m.cha_name = null;
      m.cfs_name = null;
    });

    // 3. Get HouseBLs
    const houseBLs = await knexDB('HouseBL')
      .leftJoin('Parties as S', 'HouseBL.shipper', 'S.id')
      .leftJoin('Parties as C', 'HouseBL.consignee', 'C.id')
      .leftJoin('MasterBL as M', 'HouseBL.mbl_no', 'M.mbl_no')
      .leftJoin('Parties as A', 'M.agent', 'A.id')
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
      );
    houseBLs.forEach(h => {
      h.job_type = 'HouseBL';
      h.cha_name = null;
      h.cfs_name = null;
    });

    const allJobs = [...bookings, ...masterBLs, ...houseBLs];
    allJobs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    res.json({ success: true, bookings: allJobs });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// Update a booking by JobNo (Polymorphic)
router.put("/update/:jobNo", authenticateJWT, async (req, res) => {
  const jobNo = parseInt(req.params.jobNo, 10);
  
  if (jobNo >= 9000) {
    // Route to HouseBL update
    const updateData = {};
    const HOUSEBL_ALLOWED = [
      "date_of_nomination", "hbl_no", "mbl_no", "shipper", "consignee", "status",
      "shipper_invoice_no", "net_weight", "gross_weight", "hbl_telex_received",
      "no_of_palette", "marks_and_numbers", "manual_party_details",
      "freight_amount", "freight_currency", "invoice_no", "invoice_date",
      "invoice_items", "invoice_totals", "invoice_customer"
    ];

    for (const key of HOUSEBL_ALLOWED) {
      if (req.body[key] !== undefined && !['shipper', 'consignee', 'manual_party_details'].includes(key)) {
        updateData[key] = req.body[key];
      }
    }

    try {
      if (req.body.shipper !== undefined || req.body.consignee !== undefined) {
        const current = await knexDB('HouseBL').select('manual_party_details').where({ job_no: jobNo }).first();
        let currentManual = {};
        if (current && current.manual_party_details) {
          try {
            currentManual = typeof current.manual_party_details === 'string'
              ? JSON.parse(current.manual_party_details)
              : current.manual_party_details;
          } catch (e) {}
        }
        const mockBody = { ...req.body, manual_party_details: currentManual };
        
        const hybridFields = ['shipper', 'consignee'];
        hybridFields.forEach(field => {
          const val = mockBody[field];
          if (val !== undefined) {
            if (val && !isNaN(val) && Number.isInteger(Number(val))) {
              updateData[field] = val;
              delete currentManual[field];
            } else if (val && typeof val === 'string' && val.trim() !== '') {
              updateData[field] = null;
              currentManual[field] = val.trim();
            } else if (val === '') {
              updateData[field] = null;
              delete currentManual[field];
            }
          }
        });
        updateData.manual_party_details = JSON.stringify(currentManual);
      }

      const currentJob = await knexDB('HouseBL').where({ job_no: jobNo }).first();
      if (currentJob) {
        let finalStatus = updateData.status || currentJob.status;
        if (updateData.invoice_no) {
          finalStatus = 'Invoice Generated';
        } else if (updateData.freight_amount && parseFloat(updateData.freight_amount) > 0 && finalStatus === 'Draft') {
          finalStatus = 'Sell Rate Updated';
        }
        updateData.status = finalStatus;
      }

      const affectedRows = await knexDB('HouseBL').where({ job_no: jobNo }).update(updateData);
      if (affectedRows === 0) {
        return res.status(404).json({ success: false, message: "HouseBL job not found" });
      }
      return res.json({ success: true, message: "HouseBL updated successfully" });
    } catch (err) {
      console.error("Error updating HouseBL via booking API:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
    
  } else if (jobNo >= 8000) {
    // Route to MasterBL update
    const updateData = {};
    const MASTERBL_ALLOWED = [
      "date_of_nomination", "mbl_no", "shipper", "consignee", "pol", "pod", "final_pod",
      "container_size", "container_count", "agent", "status", "eta", "etd",
      "shipper_invoice_no", "net_weight", "gross_weight", "cargo_type", "shipping_line_name",
      "mbl_telex_received", "no_of_palette", "marks_and_numbers", "manual_party_details",
      "freight_amount", "freight_currency", "invoice_no", "invoice_date",
      "invoice_items", "invoice_totals", "invoice_customer"
    ];

    for (const key of MASTERBL_ALLOWED) {
      if (req.body[key] !== undefined && !['shipper', 'consignee', 'agent', 'manual_party_details'].includes(key)) {
        updateData[key] = req.body[key];
      }
    }

    try {
      if (req.body.shipper !== undefined || req.body.consignee !== undefined || req.body.agent !== undefined) {
        const current = await knexDB('MasterBL').select('manual_party_details').where({ job_no: jobNo }).first();
        let currentManual = {};
        if (current && current.manual_party_details) {
          try {
            currentManual = typeof current.manual_party_details === 'string'
              ? JSON.parse(current.manual_party_details)
              : current.manual_party_details;
          } catch (e) {}
        }
        const mockBody = { ...req.body, manual_party_details: currentManual };
        
        const hybridFields = ['shipper', 'consignee', 'agent'];
        hybridFields.forEach(field => {
          const val = mockBody[field];
          if (val !== undefined) {
            if (val && !isNaN(val) && Number.isInteger(Number(val))) {
              updateData[field] = val;
              delete currentManual[field];
            } else if (val && typeof val === 'string' && val.trim() !== '') {
              updateData[field] = null;
              currentManual[field] = val.trim();
            } else if (val === '') {
              updateData[field] = null;
              delete currentManual[field];
            }
          }
        });
        updateData.manual_party_details = JSON.stringify(currentManual);
      }

      const currentJob = await knexDB('MasterBL').where({ job_no: jobNo }).first();
      if (currentJob) {
        let finalStatus = updateData.status || currentJob.status;
        if (updateData.invoice_no) {
          finalStatus = 'Invoice Generated';
        } else if (updateData.freight_amount && parseFloat(updateData.freight_amount) > 0 && finalStatus === 'Draft') {
          finalStatus = 'Sell Rate Updated';
        }
        updateData.status = finalStatus;
      }

      const affectedRows = await knexDB('MasterBL').where({ job_no: jobNo }).update(updateData);
      if (affectedRows === 0) {
        return res.status(404).json({ success: false, message: "MasterBL job not found" });
      }
      return res.json({ success: true, message: "MasterBL updated successfully" });
    } catch (err) {
      console.error("Error updating MasterBL via booking API:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
    
  } else {
    // Standard Booking update
    const updateData = {};

    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined && !['shipper', 'consignee', 'agent', 'manual_party_details'].includes(key)) {
        updateData[key] = req.body[key];
      }
    }

    try {
      if (req.body.shipper !== undefined || req.body.consignee !== undefined || req.body.agent !== undefined) {
        const current = await knexDB('Booking').select('manual_party_details').where({ job_no: jobNo }).first();
        let currentManual = {};
        if (current && current.manual_party_details) {
          try { currentManual = typeof current.manual_party_details === 'string' ? JSON.parse(current.manual_party_details) : current.manual_party_details; } catch (e) { }
        }

        const mockBody = { ...req.body, manual_party_details: currentManual };
        processHybridFields(mockBody, updateData);
      }

      const currentJob = await knexDB('Booking').where({ job_no: jobNo }).first();
      if (currentJob) {
        let finalStatus = updateData.status || currentJob.status;
        if (updateData.invoice_no) {
          finalStatus = 'Invoice Generated';
        } else if (updateData.freight_amount && parseFloat(updateData.freight_amount) > 0 && finalStatus === 'draft') {
          finalStatus = 'Sell Rate Updated';
        }
        updateData.status = finalStatus;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: "No valid fields to update" });
      }

      const affectedRows = await knexDB('Booking').where({ job_no: jobNo }).update(updateData);
      if (affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }
      res.json({ success: true, message: "Booking updated successfully" });
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
});

export default router;
