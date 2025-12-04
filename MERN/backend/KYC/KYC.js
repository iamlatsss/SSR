import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js";
import { knexDB } from "../Database.js";

const router = express.Router();

/* ============== HELPER FUNCTION ============== */

const ALLOWED_FIELDS = [
  'name',
  'contactPerson',
  'email',
  'phone',
  'address',
  'city',
  'state',
  'pincode',
  'gstin',
  'pan',
  'bankName',
  'accountNo',
  'ifsc',
  'remarks',
  'status',
  'date',
  'branch',
  'year_of_establishment',
  'director',
  'aadhar',
  'branch_office',
  'office_address',
];

function pickAllowed(body) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

/* ============== API CALLS ============== */

// INSERT
router.post('/add', authenticateJWT, async (req, res) => {
  try {
    const data = pickAllowed(req.body);

    const [id] = await knexDB("Customers").insert(data);
    const customer = await knexDB("Customers").where({ customer_id: id }).first();
    res.status(201).json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create customer' });
  }
});

// UPDATE by ID
router.put('/update/:id', authenticateJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const data = pickAllowed(req.body);

    const affected = await knexDB("Customers")
      .where({ customer_id: id })
      .update(data);

    if (!affected) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = await knexDB("Customers").where({ customer_id: id }).first();
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
