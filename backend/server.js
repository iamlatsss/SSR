import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 5000;

// Fix __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(path.join(__dirname, "static"))); // for images/css if any

// Serve HTML frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "quotation.html")); // Place your frontend HTML as backend/index.html
});

// Send quotation email
app.post("/send-quotation", async (req, res) => {
  const {
    email,
    pol,
    pod,
    containerSize,
    rate,
    Ocean_freight,
    Shipping_line_charges,
    DO_charges,
    shipperDetails,
    consigneeDetails,
    terms,
    validity
  } = req.body;

  try {
    // Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail", // can be Outlook, Zoho, etc.
      auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS  // app password for Gmail
      }
    });

    // Email content
    const mailOptions = {
      from: `"SSR Logistics" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Quotation Details",
      html: `
        <h3>Quotation Details</h3>
        <p><b>POL:</b> ${pol}</p>
        <p><b>POD:</b> ${pod}</p>
        <p><b>Container Size:</b> ${containerSize}</p>
        <p><b>Rate:</b> ${rate}</p>
        <p><b>Ocean Freight:</b> ${Ocean_freight}</p>
        <p><b>Shipping Line Charges:</b> ${Shipping_line_charges}</p>
        <p><b>DO Charges:</b> ${DO_charges}</p>
        <p><b>Shipper Details:</b> ${shipperDetails}</p>
        <p><b>Consignee Details:</b> ${consigneeDetails}</p>
        <p><b>Terms:</b> ${terms}</p>
        <p><b>Validity:</b> ${validity}</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
