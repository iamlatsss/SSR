import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js"
import * as DB from "../Database.js";

const router = express.Router();

// Insert Booking
router.post("/insert", authenticateJWT, async (req, res) => {
  const response = await DB.insertBooking(req.body);
  if (response.ok) {
    res.status(201).json({ success: true, message: "Booking inserted", JobNo: response.JobNo });
  } else {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// View Booking by JobNo
router.get("/get/:JobNo", authenticateJWT, async (req, res) => {
  const response = await DB.getBookingById(req.params.JobNo);
  if (response.ok) {
    res.json({success: true, booking:response.booking});
  } else {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// View All Booking 
router.get("/get", authenticateJWT, async (req, res) => {
  const response = await DB.getAllBookings();
  if (response.ok) {
    res.json({success: true, bookings:response.bookings});
  } else {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Update a booking by JobNo
router.put("/update/:jobNo", async (req, res) => {
  const jobNo = req.params.jobNo;
  const updates = req.body;

  const result = await DB.updateBookingById(jobNo, updates);

  if (result.ok) {
    res.json({ success: true, message: "Booking updated successfully" });
  } else {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
