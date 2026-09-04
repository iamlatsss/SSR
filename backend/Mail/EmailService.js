import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const rawUser = process.env.EMAIL_USER || process.env.SMTP_USER || '';
const rawPass = process.env.EMAIL_PASS || process.env.SMTP_PASS || '';

const emailUser = rawUser.trim();
// Remove spaces from 16-character Gmail App Password
const emailPass = rawPass.replace(/\s+/g, '').trim();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

export const sendPasswordResetEmail = async (toEmail, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  console.log('\n=========================================');
  console.log('PASSWORD RESET LINK GENERATED:');
  console.log(resetLink);
  console.log('=========================================\n');

  if (!emailUser || !emailPass) {
    console.warn('⚠️ SMTP credentials not found in .env. Skipping email dispatch.');
    console.warn('⚠️ Please click the link above to test the password reset flow locally.');
    return { success: true };
  }

  const mailOptions = {
    from: `"SSR ERP System" <${emailUser}>`,
    to: toEmail,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b;">Password Reset</h2>
        <p style="color: #475569; font-size: 16px;">You requested a password reset for your SSR account.</p>
        <p style="color: #475569; font-size: 16px;">Click the button below to reset your password. This link will expire in 15 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 14px; margin-top: 20px;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent: %s', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

export const sendOTPEmail = async (toEmail, otpCode) => {
  console.log('\n=========================================');
  console.log(`LOGIN OTP CODE GENERATED FOR [${toEmail}]: ${otpCode}`);
  console.log('=========================================\n');

  if (!emailUser || !emailPass) {
    console.warn('⚠️ SMTP credentials not found in .env. Skipping email dispatch.');
    console.warn(`⚠️ Please use OTP code: ${otpCode} for local verification.`);
    return { success: true };
  }

  const mailOptions = {
    from: `"SSR ERP System" <${emailUser}>`,
    to: toEmail,
    subject: 'Your One-Time Password (OTP) - SSR ERP Login',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #141638; margin: 0;">SSR LOGISTIC SOLUTIONS</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Enterprise Resource Planning Portal</p>
        </div>
        <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <p style="color: #475569; font-size: 14px; margin-top: 0;">Your One-Time Password (OTP) for login verification is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #141638; padding: 12px 0;">
            ${otpCode}
          </div>
          <p style="color: #ef4444; font-size: 12px; margin-bottom: 0;">⚠️ This code is valid for 10 minutes only. Do not share this OTP with anyone.</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">If you did not request this login code, please contact your ERP system administrator immediately.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent: %s', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendPasswordResetEmail,
  sendOTPEmail
};

