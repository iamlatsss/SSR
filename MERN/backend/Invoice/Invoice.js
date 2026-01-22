import express from 'express';
import { knexDB } from '../Database.js';

const router = express.Router();

const CHARGES = [
    { "name": "AIR IMP. FREIGHT CHARGES" },
    { "name": "BL CHARGES" },
    { "name": "BL MANIFEST CHARGES -GST 18%" },
    { "name": "BOND FORMALITIES CHARGES GST-18%" },
    { "name": "CFS CHARGES GST -18%" },
    { "name": "CFS CHARGES IGST -18%" },
    { "name": "CFS CHRGES IGST -18%" },
    { "name": "CLEARANCE CHARGES IGST -18%" },
    { "name": "CONSOLIDATION CHARGES GST-18%" },
    { "name": "CONSOLIDATION CHARGES IGST-18%" },
    { "name": "CONT. IMBALANCING CHARGES IGST 18%" },
    { "name": "CONT. SEAL & MANDATORY USAGE CHARGES" },
    { "name": "CONT. SEAL CHARGES GST-18%" },
    { "name": "Cargo Handling Charges-18%" },
    { "name": "DETENTION CHARGES IGST 18%" },
    { "name": "DETENTION CHARGES-GST 18%" },
    { "name": "DO CHARGES GST -18%" },
    { "name": "DO CHARGES IGST -18%" },
    { "name": "DO EXTENSION" },
    { "name": "DO REVALIDATION" },
    { "name": "DOCK DESTUFFING CHARGES-IGST18%" },
    { "name": "DOCUMENTATION CHARGES" },
    { "name": "DPD REGISTRATION CHARGES- GST 18%" },
    { "name": "EX-WORK CHARGES GST -18%" },
    { "name": "EXAMINATION CHARGES GST-18%" },
    { "name": "EXP. AFS CHARGES- GST 18%" },
    { "name": "EXP. EMERGENCY SURCHARGES- GST18%" },
    { "name": "EXP. ENS CHARGES- GST 18%" },
    { "name": "EXP. FAF CHARGES- GST 18%" },
    { "name": "EXP. GRI CHARGES- GST 18%" },
    { "name": "EXP. PCS CHARGES- GST 18%" },
    { "name": "EXPORT CONST. FACILITATION & ADMIN CHARGES GST-18%" },
    { "name": "FCA CHARGES GST-18%" },
    { "name": "HAULAGE CHARGES GST-18%" },
    { "name": "HAULAGE CHARGES IGST-18%" },
    { "name": "HAZ CHARGES" },
    { "name": "IGM CHARGES GST-18%" },
    { "name": "IGM CHARGES IGST-18%" },
    { "name": "IGST SALE 18%" },
    { "name": "IGST SALE 5%" },
    { "name": "INSURANCE CHARGES GST -18%" },
    { "name": "OCEAN FREIGHT CHARGES GST -5%" },
    { "name": "OCEAN FREIGHT CHARGES IGST -5%" },
    { "name": "OFF DOCK CHARGES IGST-18%" },
    { "name": "ON CARRIAGE CHARGES" },
    { "name": "OPEN TOP HANDLING CHARGES GST-5%" },
    { "name": "Ocean Freight" },
    { "name": "PACKING CHARGES- GST 18%" },
    { "name": "PORT CONGESTION CHARGE GST 18%" },
    { "name": "PORT STORAGE GST-18%" },
    { "name": "RTO CHARGES" },
    { "name": "SALE 18 % GST" },
    { "name": "SALE 5% GST" },
    { "name": "SCANNING CHARGES GST-18%" },
    { "name": "SCANNING CHARGES IGST-18%" },
    { "name": "SHIPPING LINE CHARGES GST -18%" },
    { "name": "SHIPPING LINE CHARGES IGST -18%" },
    { "name": "STAMP DUTY -0%" },
    { "name": "SURRENDER BL CHARGES -GST18%" },
    { "name": "TERMINAL HANDLING CHARGES GST-18%" },
    { "name": "TERMINAL HANDLING CHARGES IGST" },
    { "name": "THC GST -18%" },
    { "name": "THC IGST-18%" },
    { "name": "TOLL CHARGES GST-18%" },
    { "name": "VESSEL CERTIFICATE CHARGES GST-18%" },
    { "name": "VGM CHARGES GST-18%" },
    { "name": "WEIGHTMENT CHARGES IGST-18%" }
];

// Get all charges
router.get("/charges", (req, res) => {
    res.json({ success: true, charges: CHARGES });
});

// Get invoice by JobNo
router.get("/job/:jobNo", async (req, res) => {
    try {
        const [rows] = await knexDB("Invoices").where({ job_no: req.params.jobNo });
        if (rows) {
            return res.json({ success: true, invoice: rows });
        }
        res.json({ success: false, message: "No invoice found" });
    } catch (error) {
        console.error("Error fetching invoice:", error);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

// Save Invoice
router.post("/save", async (req, res) => {
    const { invoiceNo, jobNo, invoiceDate, customer, items, totals } = req.body;

    if (!invoiceNo || !jobNo) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const payload = {
        invoice_no: invoiceNo,
        job_no: jobNo,
        invoice_date: invoiceDate,
        customer_details: JSON.stringify(customer),
        items: JSON.stringify(items),
        totals: JSON.stringify(totals)
    };

    try {
        // Upsert (Insert or Update on Duplicate Key)
        // Knex doesn't have a simple upsert for all DBs, but for MySQL:
        await knexDB.raw(
            `INSERT INTO Invoices (invoice_no, job_no, invoice_date, customer_details, items, totals) 
             VALUES (?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             job_no=VALUES(job_no), invoice_date=VALUES(invoice_date), 
             customer_details=VALUES(customer_details), items=VALUES(items), totals=VALUES(totals)`,
            [payload.invoice_no, payload.job_no, payload.invoice_date, payload.customer_details, payload.items, payload.totals]
        );

        res.json({ success: true, message: "Invoice saved successfully" });
    } catch (error) {
        console.error("Error saving invoice:", error);
        res.status(500).json({ success: false, message: "Database error: " + error.message });
    }
});

// Get all invoices
router.get("/all", async (req, res) => {
    try {
        const [rows] = await knexDB("Invoices").select('*');
        res.json({ success: true, invoices: rows });
    } catch (error) {
        console.error("Error fetching all invoices:", error);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

export default router;
