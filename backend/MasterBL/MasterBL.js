import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js"
import { knexDB, mapPartyToCustomer } from "../Database.js";
import { syncBLToInvoices } from "../Invoice/InvoiceSyncHelper.js";

const router = express.Router();

const ALLOWED_FIELDS = [
  "job_no",
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
  "additional_details",
  "hbl_no",
  "hbl_date",
  "hbl_shipper",
  "hbl_consignee",
  "hbl_agent"
];

// Helper to process hybrid numeric/string fields
function processHybridFields(inputBody, targetData) {
  const hybridFields = ['shipper', 'consignee', 'agent', 'hbl_shipper', 'hbl_consignee', 'hbl_agent'];
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

// Helper to sanitize dates
function sanitizeDates(targetData) {
  const dateFields = ["date_of_nomination", "eta", "etd", "invoice_date", "hbl_date"];
  dateFields.forEach(f => {
    if (targetData[f] === "") {
      targetData[f] = null;
    }
  });
}

// MasterBL Init
router.get("/init", authenticateJWT, async (req, res) => {
  try {
    // 1. Get MAX(job_no) from BookingUpdates
    const rowsBu = await knexDB("BookingUpdates").select("job_no");
    // 2. Get MAX(job_no) from MasterBL
    const rowsMbl = await knexDB("MasterBL").select("job_no");

    const allJobNos = [
      ...rowsBu.map(r => parseInt(r.job_no, 10)),
      ...rowsMbl.map(r => parseInt(r.job_no, 10))
    ].filter(n => !isNaN(n));

    const maxJob = allJobNos.length > 0 ? Math.max(...allJobNos) : 5530;
    const startJob = Math.max(maxJob, 5530);
    const nextJobNo = startJob + 1;

    // 3. Get Customers
    const parties = await knexDB("Parties").select("*");
    const customers = parties.map(mapPartyToCustomer);

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
      if (req.body[key] !== undefined && !['shipper', 'consignee', 'agent', 'hbl_shipper', 'hbl_consignee', 'hbl_agent', 'manual_party_details'].includes(key)) {
        insertData[key] = req.body[key];
      }
    }

    processHybridFields(req.body, insertData);
    sanitizeDates(insertData);

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

// Helper to format addresses from JSON
const formatAddress = (addressesJson) => {
  if (!addressesJson) return "";
  try {
    const addrs = typeof addressesJson === 'string' ? JSON.parse(addressesJson) : addressesJson;
    if (Array.isArray(addrs) && addrs.length > 0) {
      const addr = addrs.find(a => a.is_default) || addrs[0];
      return [addr.address_line1, addr.address_line2, addr.city, addr.pin_code, addr.state, addr.country].filter(Boolean).join(", ");
    }
  } catch (e) {}
  return "";
};

// Helper to build simulated HBL array
function buildSimulatedHbls(job) {
  const hbls = [];
  if (job && job.hbl_no) {
    let addDetails = {};
    if (job.additional_details) {
      try {
        addDetails = typeof job.additional_details === 'string'
          ? JSON.parse(job.additional_details)
          : job.additional_details;
      } catch (e) {}
    }
    hbls.push({
      id: job.job_no,
      job_no: job.job_no,
      hbl_no: job.hbl_no,
      mbl_no: job.mbl_no,
      date_of_nomination: job.hbl_date || job.date_of_nomination,
      shipper: job.hbl_shipper,
      consignee: job.hbl_consignee,
      shipper_name: job.hbl_shipper_name,
      consignee_name: job.hbl_consignee_name,
      shipper_address: job.hbl_shipper_address,
      consignee_address: job.hbl_consignee_address,
      status: addDetails.hbl_status || job.status,
      net_weight: job.net_weight,
      gross_weight: job.gross_weight,
      no_of_palette: job.no_of_palette,
      marks_and_numbers: job.marks_and_numbers,
      freight_amount: addDetails.hbl_freight_amount || job.freight_amount || "",
      freight_currency: addDetails.hbl_freight_currency || job.freight_currency || "USD",
      manual_party_details: JSON.stringify({
        shipper: job.hbl_shipper_name,
        consignee: job.hbl_consignee_name,
      }),
      additional_details: JSON.stringify({
        ...addDetails,
        notify: addDetails.hbl_notify || "",
        carrier: addDetails.hbl_carrier || "",
        transporter: addDetails.hbl_transporter || "",
        cha_name: addDetails.hbl_cha_name || "",
      })
    });
  }
  return hbls;
}

// Get Specific MasterBL by MBL number (used by HouseBL auto-fill)
router.get("/get-by-mbl/:mblNo", authenticateJWT, async (req, res) => {
  try {
    const job = await knexDB('MasterBL')
      .leftJoin('Parties as S', 'MasterBL.shipper', 'S.id')
      .leftJoin('Parties as C', 'MasterBL.consignee', 'C.id')
      .leftJoin('Parties as A', 'MasterBL.agent', 'A.id')
      .leftJoin('Parties as HS', 'MasterBL.hbl_shipper', 'HS.id')
      .leftJoin('Parties as HC', 'MasterBL.hbl_consignee', 'HC.id')
      .leftJoin('Parties as HA', 'MasterBL.hbl_agent', 'HA.id')
      .select(
        'MasterBL.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name"),
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.agent'))) as agent_name"),
        knexDB.raw("COALESCE(HS.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_shipper'))) as hbl_shipper_name"),
        knexDB.raw("COALESCE(HC.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_consignee'))) as hbl_consignee_name"),
        knexDB.raw("COALESCE(HA.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_agent'))) as hbl_agent_name"),
        'S.addresses as shipper_addresses',
        'C.addresses as consignee_addresses',
        'HS.addresses as hbl_shipper_addresses',
        'HC.addresses as hbl_consignee_addresses'
      )
      .where({ 'MasterBL.mbl_no': req.params.mblNo })
      .first();

    if (!job) {
      return res.status(404).json({ success: false, message: "MasterBL not found" });
    }

    job.shipper_address = formatAddress(job.shipper_addresses);
    job.consignee_address = formatAddress(job.consignee_addresses);
    job.hbl_shipper_address = formatAddress(job.hbl_shipper_addresses);
    job.hbl_consignee_address = formatAddress(job.hbl_consignee_addresses);

    job.hbls = buildSimulatedHbls(job);

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
      .leftJoin('Parties as S', 'MasterBL.shipper', 'S.id')
      .leftJoin('Parties as C', 'MasterBL.consignee', 'C.id')
      .leftJoin('Parties as A', 'MasterBL.agent', 'A.id')
      .leftJoin('Parties as HS', 'MasterBL.hbl_shipper', 'HS.id')
      .leftJoin('Parties as HC', 'MasterBL.hbl_consignee', 'HC.id')
      .leftJoin('Parties as HA', 'MasterBL.hbl_agent', 'HA.id')
      .select(
        'MasterBL.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name"),
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.agent'))) as agent_name"),
        knexDB.raw("COALESCE(HS.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_shipper'))) as hbl_shipper_name"),
        knexDB.raw("COALESCE(HC.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_consignee'))) as hbl_consignee_name"),
        knexDB.raw("COALESCE(HA.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_agent'))) as hbl_agent_name"),
        'S.addresses as shipper_addresses',
        'C.addresses as consignee_addresses',
        'HS.addresses as hbl_shipper_addresses',
        'HC.addresses as hbl_consignee_addresses'
      )
      .where({ 'MasterBL.job_no': req.params.JobNo })
      .first();

    if (!job) {
      return res.status(404).json({ success: false, message: "MasterBL not found" });
    }

    job.shipper_address = formatAddress(job.shipper_addresses);
    job.consignee_address = formatAddress(job.consignee_addresses);
    job.hbl_shipper_address = formatAddress(job.hbl_shipper_addresses);
    job.hbl_consignee_address = formatAddress(job.hbl_consignee_addresses);

    job.hbls = buildSimulatedHbls(job);

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
      .leftJoin('Parties as S', 'MasterBL.shipper', 'S.id')
      .leftJoin('Parties as C', 'MasterBL.consignee', 'C.id')
      .leftJoin('Parties as A', 'MasterBL.agent', 'A.id')
      .leftJoin('Parties as HS', 'MasterBL.hbl_shipper', 'HS.id')
      .leftJoin('Parties as HC', 'MasterBL.hbl_consignee', 'HC.id')
      .leftJoin('Parties as HA', 'MasterBL.hbl_agent', 'HA.id')
      .select(
        'MasterBL.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name"),
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.agent'))) as agent_name"),
        knexDB.raw("COALESCE(HS.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_shipper'))) as hbl_shipper_name"),
        knexDB.raw("COALESCE(HC.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_consignee'))) as hbl_consignee_name"),
        knexDB.raw("COALESCE(HA.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_agent'))) as hbl_agent_name"),
        'S.addresses as shipper_addresses',
        'C.addresses as consignee_addresses',
        'HS.addresses as hbl_shipper_addresses',
        'HC.addresses as hbl_consignee_addresses'
      )
      .orderBy('MasterBL.created_at', 'desc');

    const jobsWithHbls = jobs.map(job => {
      job.shipper_address = formatAddress(job.shipper_addresses);
      job.consignee_address = formatAddress(job.consignee_addresses);
      job.hbl_shipper_address = formatAddress(job.hbl_shipper_addresses);
      job.hbl_consignee_address = formatAddress(job.hbl_consignee_addresses);

      return {
        ...job,
        hbls: buildSimulatedHbls(job)
      };
    });

    res.json({ success: true, jobs: jobsWithHbls });
  } catch (error) {
    console.error("Error fetching all MasterBL jobs:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Update MasterBL by JobNo
router.put("/update/:jobNo", authenticateJWT, async (req, res) => {
  const updateData = {};

  for (const key of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined && !['shipper', 'consignee', 'agent', 'hbl_shipper', 'hbl_consignee', 'hbl_agent', 'manual_party_details'].includes(key)) {
      updateData[key] = req.body[key];
    }
  }

  try {
    // Hybrid field handling
    if (req.body.shipper !== undefined || req.body.consignee !== undefined || req.body.agent !== undefined ||
        req.body.hbl_shipper !== undefined || req.body.hbl_consignee !== undefined || req.body.hbl_agent !== undefined) {
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

    sanitizeDates(updateData);

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

    // Auto-sync sell_rates to linked Proforma & Tax Invoices
    try {
      const updatedJob = await knexDB('MasterBL').where({ job_no: req.params.jobNo }).first();
      if (updatedJob && updatedJob.additional_details) {
        let addDetails = {};
        try {
          addDetails = typeof updatedJob.additional_details === 'string'
            ? JSON.parse(updatedJob.additional_details)
            : updatedJob.additional_details;
        } catch (e) {}
        await syncBLToInvoices(updatedJob.job_no, 'MBL', updatedJob.mbl_no, addDetails);
      }
    } catch (syncErr) {
      console.error("[MasterBL] Invoice sync error (non-blocking):", syncErr.message);
    }

    res.json({ success: true, message: "MasterBL job updated successfully" });
  } catch (error) {
    console.error("Error updating MasterBL:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ── HBL Documents Routes (merged from HouseBL.js) ──────────────────────────

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

// Get combined MasterBL data for document generation (HBL Confirmation / Final / Telex)
router.get("/document-data/:jobNo", authenticateJWT, async (req, res) => {
  try {
    const jobNo = req.params.jobNo;

    // 1. Fetch the MasterBL record with party name resolution
    const masterBL = await knexDB('MasterBL')
      .leftJoin('Parties as S', 'MasterBL.shipper', 'S.id')
      .leftJoin('Parties as C', 'MasterBL.consignee', 'C.id')
      .leftJoin('Parties as A', 'MasterBL.agent', 'A.id')
      .leftJoin('Parties as HS', 'MasterBL.hbl_shipper', 'HS.id')
      .leftJoin('Parties as HC', 'MasterBL.hbl_consignee', 'HC.id')
      .leftJoin('Parties as HA', 'MasterBL.hbl_agent', 'HA.id')
      .select(
        'MasterBL.*',
        knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
        knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name"),
        knexDB.raw("COALESCE(A.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.agent'))) as agent_name"),
        knexDB.raw("COALESCE(HS.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_shipper'))) as hbl_shipper_name"),
        knexDB.raw("COALESCE(HC.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_consignee'))) as hbl_consignee_name"),
        knexDB.raw("COALESCE(HA.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_agent'))) as hbl_agent_name"),
        'S.addresses as shipper_addresses',
        'C.addresses as consignee_addresses',
        'HS.addresses as hbl_shipper_addresses',
        'HC.addresses as hbl_consignee_addresses'
      )
      .where({ 'MasterBL.job_no': jobNo })
      .first();

    if (!masterBL) {
      return res.status(404).json({ success: false, message: "MasterBL not found for this Job Number" });
    }

    masterBL.shipper_address = formatAddress(masterBL.shipper_addresses);
    masterBL.consignee_address = formatAddress(masterBL.consignee_addresses);
    masterBL.hbl_shipper_address = formatAddress(masterBL.hbl_shipper_addresses);
    masterBL.hbl_consignee_address = formatAddress(masterBL.hbl_consignee_addresses);

    // 2. Simulated HBL list (only contains 1 HBL if hbl_no is present)
    const houseBLs = buildSimulatedHbls(masterBL);

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

// GET lookup details from BookingUpdates using MBL number
router.get("/lookup-mbl/:mbl_no", authenticateJWT, async (req, res) => {
  const { mbl_no } = req.params;
  try {
    const booking = await knexDB("BookingUpdates")
      .where({ mbl: mbl_no })
      .first();

    if (!booking) {
      return res.json({ success: false, message: "No matching booking updates entry found." });
    }

    res.json({ success: true, booking });
  } catch (error) {
    console.error("Error looking up MBL number:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE all MasterBL records
router.delete("/delete-all", authenticateJWT, async (req, res) => {
  try {
    await knexDB("MasterBL").del();
    res.json({ success: true, message: "All MasterBL jobs deleted successfully." });
  } catch (error) {
    console.error("Error deleting all MasterBL jobs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
