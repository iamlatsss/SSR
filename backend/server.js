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
app.use("/static", express.static(path.join(__dirname, "static"))); 

// Serve HTML frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "quotation.html")); 
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
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // HTML email content (exact format)
    const emailBody = `
    <p>Dear Sir,</p>
    <p>Thanking you, please find our best revised offer for your kind reference,</p>

    <p><b>Quotation Details</b><br><br>

    POL: ${pol || ''}<br>
    POD: ${pod || ''}<br>
    Container Size: ${containerSize || ''}<br>
    Rate: ${rate || ''}<br>
    Ocean Freight: ${Ocean_freight || ''}<br>
    Shipping Line Charges: ${Shipping_line_charges || ''}<br>
    DO Charges: ${DO_charges || ''}<br>
    Shipper Details: ${shipperDetails || ''}<br>
    Consignee Details: ${consigneeDetails || ''}<br>
    Terms: ${terms || ''}<br>
    Validity: ${validity || ''}</p>

    <p>Hope the above is competitive and meets your requirements, awaiting your kind confirmation for further bookings,</p>
    `;

    const mailOptions = {
      from: `"SSR Logistics" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Quotation Details",
      html: emailBody  // ✅ using html ensures formatting is preserved
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));