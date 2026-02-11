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
  res.sendFile(path.join(__dirname, "test.html")); 
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
    <!DOCTYPE html>
<html>
<head>
<style>
body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #333333;
  background-color: #f4f4f4;
  margin: 0;
  padding: 0;
}
.container {
  max-width: 600px;
  margin: 20px auto;
  background-color: #ffffff;
  padding: 30px;
  border: 1px solid #dddddd;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.header {
  text-align: center;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
  margin-bottom: 20px;
}
.header h1 {
  color: #007bff;
  margin: 0;
  font-size: 24px;
}
.content {
  margin-bottom: 20px;
}
.quotation-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}
.quotation-table th, .quotation-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #dddddd;
}
.quotation-table tr:nth-child(even) {
  background-color: #f9f9f9;
}
.footer {
  text-align: center;
  margin-top: 30px;
  padding-top: 15px;
  border-top: 2px solid #007bff;
  color: #777777;
  font-size: 12px;
}
.signature {
  margin-top: 20px;
  font-style: italic;
}
</style>
</head>
<body>

<div class="container">
  <div class="header">
    <h1>Revised Quotation</h1>
  </div>
  <div class="content">
    <p>Dear Sir,</p>
    <p>Thank you for your inquiry. We are pleased to provide our best revised offer for your kind reference:</p>

    <h3>Quotation Details</h3>
    <table class="quotation-table">
      <tr>
        <td><strong>POL:</strong></td>
        <td>${pol || ''}</td>
      </tr>
      <tr>
        <td><strong>POD:</strong></td>
        <td>${pod || ''}</td>
      </tr>
      <tr>
        <td><strong>Container Size:</strong></td>
        <td>${containerSize || ''}</td>
      </tr>
      <tr>
        <td><strong>Rate:</strong></td>
        <td>${rate || ''}</td>
      </tr>
      <tr>
        <td><strong>Ocean Freight:</strong></td>
        <td>${Ocean_freight || ''}</td>
      </tr>
      <tr>
        <td><strong>Shipping Line Charges:</strong></td>
        <td>${Shipping_line_charges || ''}</td>
      </tr>
      <tr>
        <td><strong>DO Charges:</strong></td>
        <td>${DO_charges || ''}</td>
      </tr>
      <tr>
        <td><strong>Shipper Details:</strong></td>
        <td>${shipperDetails || ''}</td>
      </tr>
      <tr>
        <td><strong>Consignee Details:</strong></td>
        <td>${consigneeDetails || ''}</td>
      </tr>
      <tr>
        <td><strong>Terms:</strong></td>
        <td>${terms || ''}</td>
      </tr>
      <tr>
        <td><strong>Validity:</strong></td>
        <td>${validity || ''}</td>
      </tr>
    </table>

    <p style="margin-top: 25px;">We trust that the above offer is competitive and meets your requirements. We look forward to your kind confirmation for further bookings.</p>
  </div>
  <div class="signature">
    <p>Sincerely,</p>
    <p>The Team</p>
  </div>
  <div class="footer">
    <p>This is an automated email. Please do not reply.</p>
  </div>
</div>

</body>
</html>
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