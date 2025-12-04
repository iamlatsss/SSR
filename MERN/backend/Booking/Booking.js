import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js"
import * as DB from "../Database.js";
import { knexDB } from "../Database.js";

const router = express.Router();

// Insert Booking
router.post("/insert", authenticateJWT, async (req, res) => {
  const allowedFields = [
    "NominationDate", "Consignee", "Shipper", "HBL", "MBL", "POL", "POD",
    "ContainerSize", "Agent", "ShippingLine", "BuyRate", "SellRate", "ETD",
    "ETA", "SWB", "IGMFiled", "CHA", "Description", "Status"
  ];
  const bookingData = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      bookingData[key] = req.body[key];
    }
  }
  if (Object.keys(bookingData).length === 0) {
    return res.status(400).json({ success: false, message: "No insertable fields provided" });
  }
  try {
    const [JobNo] = await knexDB('Booking').insert(bookingData);
    res.status(201).json({ success: true, message: "Booking inserted", JobNo });
  } catch (error) {
    console.error("❌ Error inserting booking:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// View Booking by JobNo
router.get("/get/:JobNo", authenticateJWT, async (req, res) => {
  try {
    const booking = await knexDB('Booking').where({ JobNo: req.params.JobNo }).first();
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
    const bookings = await knexDB('Booking').select();
    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: "Bookings not found" });
    }
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// Update a booking by JobNo
router.put("/update/:jobNo", authenticateJWT, async (req, res) => {
  const allowedFields = [
    "NominationDate", "Consignee", "Shipper", "HBL", "MBL", "POL", "POD", "ContainerSize",
    "Agent", "ShippingLine", "BuyRate", "SellRate", "ETD", "ETA", "SWB", "IGMFiled",
    "CHA", "Description", "Status"
  ];
  const updates = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: "No valid fields to update" });
  }
  try {
    const affectedRows = await knexDB('Booking').where({ JobNo: req.params.jobNo }).update(updates);
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
