import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import handlebars from "handlebars";

dotenv.config();
const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/send-quotation", async (req, res) => {
  try {
    // --- Read template file ---
    const templatePath = path.resolve("Mail", "quotation_email.html");
    const templateSource = fs.readFileSync(templatePath, "utf8");

    // --- Compile with Handlebars ---
    const template = handlebars.compile(templateSource);
    const emailBody = template(req.body);

    const mailOptions = {
      from: `"SSR Logistics" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Quotation Details",
      html: emailBody,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Send quotation failed:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

export default router;
