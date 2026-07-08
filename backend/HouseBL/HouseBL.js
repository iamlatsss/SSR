import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js"
import { knexDB, mapPartyToCustomer } from "../Database.js";
import { syncBLToInvoices } from "../Invoice/InvoiceSyncHelper.js";

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
    const parties = await knexDB("Parties").select("*");
    const customers = parties.map(mapPartyToCustomer);

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

    // Auto-sync sell_rates to linked Proforma & Tax Invoices
    try {
      const updatedJob = await knexDB('HouseBL').where({ id: req.params.id }).first();
      if (updatedJob && updatedJob.additional_details) {
        let addDetails = {};
        try {
          addDetails = typeof updatedJob.additional_details === 'string'
            ? JSON.parse(updatedJob.additional_details)
            : updatedJob.additional_details;
        } catch (e) {}
        await syncBLToInvoices(updatedJob.job_no, 'HBL', updatedJob.hbl_no, addDetails);
      }
    } catch (syncErr) {
      console.error("[HouseBL] Invoice sync error (non-blocking):", syncErr.message);
    }

    res.json({ success: true, message: "HouseBL job updated successfully" });
  } catch (error) {
    console.error("Error updating HouseBL:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get combined MasterBL + HouseBL data for document generation (HBL Confirmation / Final / Telex)
router.get("/document-data/:jobNo", authenticateJWT, async (req, res) => {
  try {
    const jobNo = req.params.jobNo;

    // 1. Fetch the MasterBL record with party name resolution
    const masterBL = await knexDB('MasterBL')
      .leftJoin('Parties as S', 'MasterBL.shipper', 'S.id')
      .leftJoin('Parties as C', 'MasterBL.consignee', 'C.id')
      .leftJoin('Parties as A', 'MasterBL.agent', 'A.id')
      .select(
        'MasterBL.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name"),
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.agent'))) as agent_name"),
        'S.addresses as shipper_addresses',
        'C.addresses as consignee_addresses'
      )
      .where({ 'MasterBL.job_no': jobNo })
      .first();

    if (!masterBL) {
      return res.status(404).json({ success: false, message: "MasterBL not found for this Job Number" });
    }

    // 2. Fetch all linked HouseBLs with party name resolution
    const houseBLs = await knexDB('HouseBL')
      .leftJoin('Parties as S', 'HouseBL.shipper', 'S.id')
      .leftJoin('Parties as C', 'HouseBL.consignee', 'C.id')
      .select(
        'HouseBL.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(HouseBL.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(HouseBL.manual_party_details, '$.consignee'))) as consignee_name"),
        'S.addresses as shipper_addresses',
        'C.addresses as consignee_addresses'
      )
      .where({ 'HouseBL.mbl_no': masterBL.mbl_no })
      .orWhere({ 'HouseBL.job_no': jobNo });

    // 3. Get or predict the BL number for this job
    const existingDoc = await knexDB('HBLDocuments')
      .where({ job_no: jobNo })
      .select('bl_no')
      .first();

    let resolvedBLNo = null;
    if (existingDoc) {
      resolvedBLNo = existingDoc.bl_no;
    } else {
      // Predict/pre-calculate the next sequential B/L number
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = `TTDVS${yy}${mm}`;

      const lastDoc = await knexDB('HBLDocuments')
        .where('bl_no', 'like', `${prefix}%`)
        .orderBy('bl_no', 'desc')
        .select('bl_no')
        .first();

      let seq = 1001;
      if (lastDoc && lastDoc.bl_no) {
        const lastSeqStr = lastDoc.bl_no.slice(-4);
        const lastSeq = parseInt(lastSeqStr, 10);
        if (!isNaN(lastSeq)) {
          seq = lastSeq + 1;
        }
      }
      resolvedBLNo = `${prefix}${String(seq).padStart(4, '0')}`;
    }

    res.json({
      success: true,
      masterBL,
      houseBLs,
      existingBLNo: resolvedBLNo
    });
  } catch (error) {
    console.error("Error fetching document data:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Save (or create) an HBL Document (Confirmation / Final / Telex Release)
router.post("/document/save", authenticateJWT, async (req, res) => {
  const { job_no, document_type, doc_data } = req.body;
  if (!job_no || !document_type || !doc_data) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    // Check if document of this type already exists for this job to prevent duplicates
    const existing = await knexDB('HBLDocuments')
      .where({ job_no, document_type })
      .first();

    if (existing) {
      if (typeof existing.doc_data === 'string') {
        try { existing.doc_data = JSON.parse(existing.doc_data); } catch (e) {}
      }
      return res.status(200).json({
        success: true,
        message: "Document already exists for this Job.",
        document: existing,
        bl_no: existing.bl_no,
        alreadyExists: true
      });
    }

    // Atomic transaction to generate next B/L number and save
    const result = await knexDB.transaction(async (trx) => {
      // 1. Check if a B/L number has already been generated for this job in any other document
      const existingJobDoc = await trx('HBLDocuments')
        .where({ job_no })
        .select('bl_no')
        .first();

      let blNo;
      if (existingJobDoc) {
        blNo = existingJobDoc.bl_no;
      } else {
        // Generate new B/L number: TTDVSYYMMXXXX
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `TTDVS${yy}${mm}`;

        // Get the highest sequence number for this year and month
        const lastDoc = await trx('HBLDocuments')
          .where('bl_no', 'like', `${prefix}%`)
          .orderBy('bl_no', 'desc')
          .first();

        let seq = 1001; // sequence starts at 1001
        if (lastDoc && lastDoc.bl_no) {
          const lastSeqStr = lastDoc.bl_no.slice(-4);
          const lastSeq = parseInt(lastSeqStr, 10);
          if (!isNaN(lastSeq)) {
            seq = lastSeq + 1;
          }
        }
        blNo = `${prefix}${String(seq).padStart(4, '0')}`;
      }

      // 2. Save the document
      const docPayload = {
        job_no,
        document_type,
        bl_no: blNo,
        doc_data: typeof doc_data === 'string' ? doc_data : JSON.stringify(doc_data)
      };

      const [insertId] = await trx('HBLDocuments').insert(docPayload);
      
      return { id: insertId, bl_no: blNo };
    });

    res.status(201).json({
      success: true,
      message: "Document saved successfully",
      id: result.id,
      bl_no: result.bl_no
    });
  } catch (error) {
    console.error("Error saving HBL document:", error);
    res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
});

// Check if document exists for a Job Number
router.get("/document/check/:jobNo/:docType", authenticateJWT, async (req, res) => {
  const { jobNo, docType } = req.params;
  try {
    const document = await knexDB('HBLDocuments')
      .where({ job_no: jobNo, document_type: docType })
      .first();

    if (document) {
      if (typeof document.doc_data === 'string') {
        try { document.doc_data = JSON.parse(document.doc_data); } catch (e) {}
      }
      return res.json({ success: true, exists: true, document });
    }
    res.json({ success: true, exists: false });
  } catch (error) {
    console.error("Error checking HBL document status:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Search HBL documents
router.get("/document/search", authenticateJWT, async (req, res) => {
  const { job_no, bl_no, document_type } = req.query;
  try {
    let query = knexDB('HBLDocuments');

    if (document_type) {
      query = query.where({ document_type });
    }
    if (job_no) {
      query = query.where({ job_no });
    }
    if (bl_no) {
      query = query.where('bl_no', 'like', `%${bl_no}%`);
    }

    const documents = await query.orderBy('created_at', 'desc');
    
    // Parse doc_data JSON
    documents.forEach(doc => {
      if (typeof doc.doc_data === 'string') {
        try {
          doc.doc_data = JSON.parse(doc.doc_data);
        } catch (e) {}
      }
    });

    res.json({ success: true, documents });
  } catch (error) {
    console.error("Error searching HBL documents:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
