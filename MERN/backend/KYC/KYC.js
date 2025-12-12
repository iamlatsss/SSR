import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js";
import { knexDB } from "../Database.js";

const router = express.Router();

import multer from 'multer';
import path from 'path';
import { uploadFile } from '../S3/S3Service.js';

// Configure Multer for memory storage (S3 upload needs buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/* ============== HELPER FUNCTION ============== */

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

/* ============== API CALLS ============== */

// INSERT
const uploadFields = upload.fields([
  { name: 'gstin_doc', maxCount: 1 },
  { name: 'pan_doc', maxCount: 1 },
  { name: 'iec_doc', maxCount: 1 },
  { name: 'kyc_letterhead_doc', maxCount: 1 }
]);

router.post('/add', authenticateJWT, uploadFields, async (req, res) => {
  try {
    const data = pickAllowed(req.body);

    // 1. Insert initial data to get customer_id
    const [id] = await knexDB("Customers").insert(data);

    // 2. Upload files to S3 if present
    if (req.files) {
      const uploadPromises = [];
      const keys = Object.keys(req.files);

      for (const key of keys) {
        if (req.files[key].length > 0) {
          const file = req.files[key][0];
          const extension = path.extname(file.originalname);
          const s3Key = `${file.fieldname}${extension}`; // e.g. gstin_doc.pdf

          uploadPromises.push(
            uploadFile({
              fileBuffer: file.buffer,
              key: s3Key,
              directory: `customers/${id}`, // Unique directory for customer
              contentType: file.mimetype
            })
          );
        }
      }

      await Promise.all(uploadPromises);
    }

    const customer = await knexDB("Customers").where({ customer_id: id }).first();
    res.status(201).json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create customer' });
  }
});

// UPDATE by ID
router.put('/update/:id', authenticateJWT, uploadFields, async (req, res) => {
  try {
    const id = req.params.id;

    const data = pickAllowed(req.body);

    // if date is not sent, keep or set today's date as required
    if (!data.date) {
      data.date = new Date().toISOString().slice(0, 10);
    }

    const affected = await knexDB("Customers")
      .where({ customer_id: id })
      .update(data);

    if (!affected) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = await knexDB("Customers")
      .where({ customer_id: id })
      .first();

    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update customer' });
  }
});

// DELETE by ID
router.delete('/delete/:id', authenticateJWT, async (req, res) => {
  try {
    const id = req.params.id;

    const affected = await knexDB("Customers")
      .where({ customer_id: id })
      .del();

    if (!affected) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete customer' });
  }
});

// GET all customers
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const customers = await knexDB("Customers")
      .orderBy('customer_id', 'desc');

    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

export default router;
