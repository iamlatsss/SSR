import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js"
import * as DB from "../Database.js";

// POST Insert Customer
router.post("/add", async (req, res) => {
  const result = await DB.insertCustomer(pool, req.body);
  if (result.ok) {
    res.status(201).json({ message: "Customer inserted", customer_id: result.customer_id });
  } else {
    res.status(400).json({ error: result.message, details: result.error });
  }
});

// PUT Update Customer
router.put("/edit/:customer_id", async (req, res) => {
  const customer_id = req.params.customer_id;
  const result = await DB.updateCustomerById(pool, customer_id, req.body);
  if (result.ok) {
    res.json({ message: "Customer updated" });
  } else {
    res.status(400).json({ error: result.message, details: result.error });
  }
});

// GET all customers
router.get("/", async (req, res) => {
  const result = await DB.getAllConsignee(pool);
  if (result.ok) {
    res.json({ message: "Customer updated" });
  } else {
    res.status(400).json({ error: result.message, details: result.error });
  }
});

