import nodemailer from "nodemailer";

export const sendQuotation = async (req, res) => {
  const { email, pol, pod, containerSize, rate } = req.body;

  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

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
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
