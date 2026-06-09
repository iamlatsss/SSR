import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadFile, getFileUrl } from '../S3/S3Service.js';
import { authenticateJWT } from "../AuthAPI/Auth.js";
import { knexDB, mapPartyToCustomer } from "../Database.js";

const router = express.Router();

// Configure Multer for memory storage (S3 upload needs buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/* ============== HELPER FUNCTIONS ============== */

const ALLOWED_FIELDS = [
  'date', 'branch', 'name', 'address', 'customer_type', 'status', 'year_of_establishment', 'pan',
  'director', 'aadhar', 'branch_office', 'office_address', 'state', 'gstin', 'gst_remarks', 'annual_turnover',
  'mto_iec_cha_validity', 'aeo_validity', 'export_commodities', 'email_export', 'email_import',
  'bank_details', 'contact_person_export', 'contact_person_import',
  'gstin_doc', 'pan_doc', 'iec_doc', 'kyc_letterhead_doc'
];

function pickAllowed(body) {
  const out = {};
  if (!body) return out;
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

function mergeAddress(existingAddressesJson, body) {
  let addrs = [];
  if (existingAddressesJson) {
    try {
      addrs = typeof existingAddressesJson === 'string' ? JSON.parse(existingAddressesJson) : existingAddressesJson;
    } catch (e) {
      addrs = [];
    }
  }
  if (!Array.isArray(addrs)) addrs = [];

  // Find the default address, or the first one, or create a new one
  let defaultAddr = addrs.find(a => a.is_default) || addrs[0];
  if (!defaultAddr) {
    defaultAddr = {
      fax: "",
      city: "",
      email: "",
      gst_no: "",
      is_sez: "No",
      status: "Enabled",
      tan_no: "",
      country: "India",
      pin_code: "",
      gst_state: "",
      telephone: "",
      is_default: true,
      address_line1: "",
      address_line2: "",
      is_head_office: "Yes"
    };
    addrs.push(defaultAddr);
  }

  // Update with body details if provided
  if (body.branch_office !== undefined) defaultAddr.city = body.branch_office;
  if (body.email_import !== undefined || body.email_export !== undefined) {
    defaultAddr.email = body.email_import || body.email_export || defaultAddr.email;
  }
  if (body.gstin !== undefined) defaultAddr.gst_no = body.gstin;
  if (body.state !== undefined) defaultAddr.gst_state = body.state;
  if (body.address !== undefined || body.office_address !== undefined) {
    defaultAddr.address_line1 = body.address || body.office_address || defaultAddr.address_line1;
  }

  return JSON.stringify(addrs);
}

function mapBodyToPartyFields(body, existingAddressesJson = null) {
  const payload = {};
  if (body.name !== undefined) payload.name = body.name;
  if (body.pan !== undefined) payload.pan_no = body.pan;
  if (body.director !== undefined) payload.director_name = body.director;
  if (body.annual_turnover !== undefined) payload.turnover = body.annual_turnover;
  if (body.year_of_establishment !== undefined) payload.incorporation_year = body.year_of_establishment;
  if (body.customer_type !== undefined) payload.entity_type = body.customer_type;
  
  if (body.email_import !== undefined || body.email_export !== undefined) {
    payload.email = body.email_import || body.email_export;
  }

  // Dynamic KYC fields
  if (body.branch !== undefined) payload.branch = body.branch;
  if (body.aadhar !== undefined) payload.aadhar = body.aadhar;
  if (body.gst_remarks !== undefined) payload.gst_remarks = body.gst_remarks;
  if (body.mto_iec_cha_validity !== undefined) payload.mto_iec_cha_validity = body.mto_iec_cha_validity;
  if (body.aeo_validity !== undefined) payload.aeo_validity = body.aeo_validity;
  if (body.export_commodities !== undefined) payload.export_commodities = body.export_commodities;
  if (body.email_export !== undefined) payload.email_export = body.email_export;
  if (body.email_import !== undefined) payload.email_import = body.email_import;
  if (body.bank_details !== undefined) payload.bank_details = body.bank_details;
  if (body.contact_person_export !== undefined) payload.contact_person_export = body.contact_person_export;
  if (body.contact_person_import !== undefined) payload.contact_person_import = body.contact_person_import;
  if (body.date !== undefined) payload.kyc_date = body.date;
  if (body.status !== undefined) payload.status = body.status;

  // File docs
  if (body.gstin_doc !== undefined) payload.gstin_doc = body.gstin_doc;
  if (body.pan_doc !== undefined) payload.pan_doc = body.pan_doc;
  if (body.iec_doc !== undefined) payload.iec_doc = body.iec_doc;
  if (body.kyc_letterhead_doc !== undefined) payload.kyc_letterhead_doc = body.kyc_letterhead_doc;

  payload.addresses = mergeAddress(existingAddressesJson, body);
  payload.category_type = 'Customer';

  return payload;
}

/* ============== API CALLS ============== */

const uploadFields = upload.fields([
  { name: 'gstin_doc', maxCount: 1 },
  { name: 'pan_doc', maxCount: 1 },
  { name: 'iec_doc', maxCount: 1 },
  { name: 'kyc_letterhead_doc', maxCount: 1 }
]);

// INSERT
router.post('/add', authenticateJWT, uploadFields, async (req, res) => {
  try {
    const data = pickAllowed(req.body);
    const payload = mapBodyToPartyFields(data);

    // 1. Insert initial party to get ID
    const [id] = await knexDB("Parties").insert(payload);

    // 2. Upload files to S3 if present
    const fileUpdates = {};

    if (req.files) {
      const uploadPromises = [];
      const keys = Object.keys(req.files);

      for (const key of keys) {
        if (req.files[key].length > 0) {
          const file = req.files[key][0];
          const extension = path.extname(file.originalname);
          const s3Key = `${file.fieldname}${extension}`; // e.g. gstin_doc.pdf

          fileUpdates[file.fieldname] = s3Key;

          uploadPromises.push(
            uploadFile({
              fileBuffer: file.buffer,
              key: s3Key,
              directory: `parties/${id}`, // Unique directory for party
              contentType: file.mimetype
            })
          );
        }
      }

      await Promise.all(uploadPromises);
    }

    if (Object.keys(fileUpdates).length > 0) {
      await knexDB("Parties").where({ id }).update(fileUpdates);
    }

    const party = await knexDB("Parties").where({ id }).first();
    res.status(201).json(mapPartyToCustomer(party));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create party customer' });
  }
});

// UPDATE by ID
router.put('/update/:id', authenticateJWT, uploadFields, async (req, res) => {
  try {
    const id = req.params.id;
    const data = pickAllowed(req.body);

    if (!data.date) {
      data.date = new Date().toISOString().slice(0, 10);
    }

    const existingParty = await knexDB("Parties").where({ id }).first();
    if (!existingParty) {
      return res.status(404).json({ message: 'Party customer not found' });
    }

    const payload = mapBodyToPartyFields(data, existingParty.addresses);

    // 2. Upload files to S3 if present
    if (req.files) {
      const uploadPromises = [];
      const keys = Object.keys(req.files);

      for (const key of keys) {
        if (req.files[key].length > 0) {
          const file = req.files[key][0];
          const extension = path.extname(file.originalname);
          const s3Key = `${file.fieldname}${extension}`; // e.g. gstin_doc.pdf

          payload[file.fieldname] = s3Key;

          uploadPromises.push(
            uploadFile({
              fileBuffer: file.buffer,
              key: s3Key,
              directory: `parties/${id}`,
              contentType: file.mimetype
            })
          );
        }
      }

      await Promise.all(uploadPromises);
    }

    await knexDB("Parties").where({ id }).update(payload);

    const party = await knexDB("Parties").where({ id }).first();
    res.json(mapPartyToCustomer(party));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update party customer' });
  }
});

// DELETE by ID
router.delete('/delete/:id', authenticateJWT, async (req, res) => {
  try {
    const id = req.params.id;

    const affected = await knexDB("Parties")
      .where({ id })
      .del();

    if (!affected) {
      return res.status(404).json({ message: 'Party customer not found' });
    }

    res.json({ message: 'Party customer deleted' });
  } catch (err) {
    console.error(err);
    if (err.errno === 1451) {
      return res.status(409).json({ message: 'Cannot delete customer because they are linked to existing bookings or other records.' });
    }
    res.status(500).json({ message: 'Failed to delete customer' });
  }
});

// GET all customers
router.get('/', authenticateJWT, async (req, res) => {
  try {
    // Only return parties that are category_type Customer for the KYC list
    const parties = await knexDB("Parties")
      .where({ category_type: 'Customer' })
      .orderBy('id', 'desc');

    // Generate signed URLs for each customer's files
    const customersWithUrls = await Promise.all(parties.map(async (party) => {
      const docFields = ['gstin_doc', 'pan_doc', 'iec_doc', 'kyc_letterhead_doc'];
      const customer = mapPartyToCustomer(party);

      for (const field of docFields) {
        const filename = customer[field];
        if (filename) {
          try {
            const { url } = await getFileUrl({
              key: filename,
              directory: `parties/${party.id}`
            });
            customer[`${field}_url`] = url;
          } catch (e) {
            console.error(`Failed to sign url for ${field} party ${party.id}`, e);
            customer[`${field}_url`] = null;
          }
        }
      }
      return customer;
    }));

    res.json(customersWithUrls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch customer records' });
  }
});

export default router;
