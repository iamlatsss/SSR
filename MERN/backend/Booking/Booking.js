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
  "marks_and_numbers"
];

// Booking Init
router.get("/init", authenticateJWT, async (req, res) => {
  try {
    // 1. Get Next JobNo
    const [result] = await knexDB("Booking").max("job_no as maxJobNo");
    const nextJobNo = (result.maxJobNo || 6000) + 1;

    // 2. Get Customers (id, name only)
    const customers = await knexDB("Customers").select("customer_id", "name");

    res.json({ success: true, nextJobNo, customers });
  } catch (error) {
    console.error("Error initializing booking page:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Insert Booking
router.post("/insert", authenticateJWT, async (req, res) => {
  const insertData = {};

  // Filter request body for allowed fields
  for (const key of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined) {
      insertData[key] = req.body[key];
    }
  }

  if (Object.keys(insertData).length === 0) {
    return res.status(400).json({ success: false, message: "No valid booking fields provided" });
  }

  // Ensure default status
  if (!insertData.status) insertData.status = 'draft';

  try {
    const [jobNo] = await knexDB('Booking').insert(insertData);
    res.status(201).json({ success: true, message: "Booking inserted", JobNo: jobNo });
  } catch (error) {
    console.error("❌ Error inserting booking:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// View Booking by JobNo
router.get("/get/:JobNo", authenticateJWT, async (req, res) => {
  try {
    const booking = await knexDB('Booking')
      .leftJoin('Customers as S', 'Booking.shipper', 'S.customer_id')
      .leftJoin('Customers as C', 'Booking.consignee', 'C.customer_id')
      .leftJoin('Customers as A', 'Booking.agent', 'A.customer_id')
      .select(
        'Booking.*',
        'S.name as shipper_name',
        'C.name as consignee_name',
        'A.name as agent_name'
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
      .select(
        'Booking.*',
        'S.name as shipper_name',
        'C.name as consignee_name',
        'A.name as agent_name'
      );

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
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ success: false, message: "No valid fields to update" });
  }

  try {
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
