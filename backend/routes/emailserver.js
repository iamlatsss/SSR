import express from "express";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());

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
    // Create transporter (using Gmail as example, can also use SMTP/Zoho/Outlook)
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // App password (not plain password)
      }
    });

    // Email content
    let mailOptions = {
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
    res.status(500).json({ success: false, error: "Email failed to send" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
