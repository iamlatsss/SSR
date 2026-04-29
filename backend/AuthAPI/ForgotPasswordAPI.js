import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import emailService from '../Mail/EmailService.js';
import * as db from '../Database.js';

const router = express.Router();

// Rate limiting
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many password reset attempts, please try again later.' },
});

// Step 1: Request password reset link
router.post('/request-reset', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user_data = await db.getUserByEmail(email);
    if (!user_data.ok) {
      // Don't reveal if user exists or not for security
      return res.json({ 
        success: true, 
        message: 'If this email exists, you will receive a reset link shortly.' 
      });
    }

    const user = user_data.data;

    // Generate a secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before saving to database
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expiration (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60000);

    // Save hash and expiration to DB
    await db.updateUserByEmail(email, {
      reset_token: tokenHash,
      reset_token_expires: expiresAt
    });

    // Send email with the RAW token (not the hash)
    await emailService.sendPasswordResetEmail(email, resetToken);

    res.json({
      success: true,
      message: 'If this email exists, you will receive a reset link shortly.'
    });

  } catch (error) {
    console.error('Request reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Step 2: Reset password using the token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Hash the incoming token to match with DB
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with this token and check expiration
    const user_data = await db.getUserByToken(tokenHash);
    
    if (!user_data.ok) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = user_data.data;

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear token
    await db.updateUserByEmail(user.email, {
      password: hashedPassword,
      reset_token: null,
      reset_token_expires: null,
      failed_login_attempts: 0, // Reset failed attempts
      account_locked_until: null // Unlock account
    });

    res.json({
      success: true,
      message: 'Password reset successful. You can now login.',
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;