import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as DB from "../Database.js";
import emailService from "../Mail/EmailService.js";

const tokenExpirePeriod = 24 * 60 * 60; // 24 hours in seconds for strict enterprise session security
const SALT_ROUNDS = 12;
const USER_ROLES = new Set(['director', 'admin', 'accounts', 'custom', 'sales', 'viewer']);

const router = express.Router();

export async function authenticateJWT(req, res, next) {
  try {
    let token;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      token = req.cookies?.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: Please log in to access this resource" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
      if (err) {
        console.error("JWT verification failed:", err.message);
        return res.status(403).json({ message: "Forbidden: Session expired or invalid token. Please log in again." });
      }

      req.user = {
        user_name: decodedUser.user_name,
        user_id: decodedUser.user_id,
        email: decodedUser.email,
        role: decodedUser.role
      };

      next();
    });
  } catch (error) {
    console.error("❌ JWT Authentication Error:", error);
    return res.status(500).json({ message: "Internal Server Error during authentication" });
  }
}

export const ROLE_PERMISSIONS = {
  director: {
    canManageUsers: true,
    canAccessIGM: false,
    canAccessKYC: false,
    canViewAllBookings: true,
    canEditAllBookings: true,
    canDeleteAllBookings: true,
  },
  admin: {
    canManageUsers: true,
    canAccessIGM: true,
    canAccessKYC: true,
    canViewAllBookings: true,
    canEditAllBookings: true,
    canDeleteAllBookings: true,
  },
  custom: {
    canManageUsers: false,
    canAccessIGM: false,
    canAccessKYC: false,
    canViewAllBookings: false,
    canEditAllBookings: false,
    canDeleteAllBookings: false,
  },
  accounts: {
    canManageUsers: false,
    canAccessIGM: false,
    canAccessKYC: false,
    canViewAllBookings: false,
    canEditAllBookings: false,
    canDeleteAllBookings: false,
  },
  sales: {
    canManageUsers: false,
    canAccessIGM: false,
    canAccessKYC: false,
    canViewAllBookings: false,
    canEditAllBookings: false,
    canDeleteAllBookings: false,
  },
  viewer: {
    canManageUsers: false,
    canAccessIGM: false,
    canAccessKYC: false,
    canViewAllBookings: false,
    canEditAllBookings: false,
    canDeleteAllBookings: false,
  }
};

export function hasPermission(role, permissionName) {
  const normalizedRole = role?.toLowerCase() || 'viewer';
  const permissions = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS['viewer'];
  return !!permissions[permissionName];
}

export function checkPermission(permissionName) {
  return (req, res, next) => {
    if (hasPermission(req.user?.role, permissionName)) {
      next();
    } else {
      res.status(403).json({ success: false, message: `Forbidden: Missing permission ${permissionName}` });
    }
  };
}

export function requireAdmin(req, res, next) {
  if (req.user && req.user.role && req.user.role.toLowerCase() === 'admin') {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Admin access required" });
  }
}

export async function generateJWT(user_data) {
  return jwt.sign(user_data, process.env.JWT_SECRET, { expiresIn: tokenExpirePeriod });
}

// Post call to Log out
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });
  res.json({ message: 'Logged out successfully' });
});

// Post call to Login with Password & 30-day Expiry check
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user_data = await DB.getUserByEmail(email);
    if (!user_data.ok && user_data.message === "User not found") {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = user_data.data;

    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      return res.status(403).json({ message: "Account temporarily locked due to multiple failed login attempts. Please try again later." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const updates = { failed_login_attempts: failedAttempts };
      
      if (failedAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 10 * 60000);
        updates.account_locked_until = lockUntil;
      }
      
      await DB.updateUserById(user.user_id, updates);
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user_data.ok && user_data.message === "User is not active") {
      return res.status(401).json({ message: "Account inactive. Contact administrator." });
    }

    // Check 60-Day Password Expiration
    if (user.password_changed_at) {
      const passwordChangedTime = new Date(user.password_changed_at).getTime();
      const ageInDays = (Date.now() - passwordChangedTime) / (1000 * 60 * 60 * 24);
      if (ageInDays > 60) {
        return res.status(403).json({
          passwordExpired: true,
          email: user.email,
          message: "Password Security: Your password is valid for 60 days only. After 60 days you must validate your old password using an otp which will be sent to your registered mail id. You can then login with your old password."
        });
      }
    }

    // Reset failed attempts and update last login
    await DB.updateUserById(user.user_id, {
      failed_login_attempts: 0,
      account_locked_until: null,
      last_login_timestamp: new Date()
    });

    const response_data = {
      user_name: user.user_name,
      user_id: user.user_id,
      email: user.email,
      role: user.role
    };
    
    const token = await generateJWT(response_data);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: tokenExpirePeriod * 1000
    });

    res.status(200).json({
      message: "Login successful",
      user_data: response_data,
      jwt_token: token
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint: Send OTP to User's Registered Email
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required to receive OTP." });
    }

    const user_data = await DB.getUserByEmail(email);
    if (!user_data.ok) {
      return res.status(404).json({ message: "No registered user found with this email address." });
    }

    const user = user_data.data;

    // Generate secure 6-digit numeric OTP
    const otpCode = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
    const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    const otpExpires = new Date(Date.now() + 10 * 60000); // 10 minutes expiry

    await DB.updateUserByEmail(user.email, {
      otp_code: otpHash,
      otp_expires: otpExpires
    });

    await emailService.sendOTPEmail(user.email, otpCode);

    return res.status(200).json({
      success: true,
      message: "A 6-digit verification OTP has been sent to your registered email address."
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
});

// Endpoint: Verify OTP & Authenticate User (re-validates password for 60 days)
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const user_data = await DB.getUserByEmail(email);
    if (!user_data.ok) {
      return res.status(401).json({ message: "Invalid email or credentials." });
    }

    const user = user_data.data;

    if (!user.otp_code || !user.otp_expires) {
      return res.status(400).json({ message: "No OTP request found. Please request a new OTP." });
    }

    if (new Date(user.otp_expires) < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
    }

    const otpHash = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
    if (otpHash !== user.otp_code) {
      return res.status(400).json({ message: "Invalid OTP. Please check the code sent to your email." });
    }

    // OTP is valid - re-validate password for next 60 days, clear OTP fields and log user in
    await DB.updateUserByEmail(user.email, {
      otp_code: null,
      otp_expires: null,
      password_changed_at: new Date(), // Re-validates password for another 60 days
      failed_login_attempts: 0,
      account_locked_until: null,
      last_login_timestamp: new Date()
    });

    const response_data = {
      user_name: user.user_name,
      user_id: user.user_id,
      email: user.email,
      role: user.role
    };

    const token = await generateJWT(response_data);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: tokenExpirePeriod * 1000
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. Logging in...",
      user_data: response_data,
      jwt_token: token
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ message: "Internal server error during OTP verification." });
  }
});

// Post call to create new user
router.post('/addUser', async (req, res) => {
  try {
    const { user_name, email, password, is_active } = req.body;
    let role = req.body.role;

    if (!role || !USER_ROLES.has(role.toLowerCase())) {
      role = 'Viewer';
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Hash the plain password before saving with 12 salt rounds
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);  

    const result = await DB.createUser(
      user_name,
      email,
      passwordHash,
      role,
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    );

    if (!result.ok) {
      return res.status(400).json({ message: result.message || 'Failed to create user' });
    }

    return res.status(201).json({
      message: 'User created successfully',
      userId: result.data.userId
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get call to authenticate the user
router.get('/me', authenticateJWT, (req, res) => {
  res.json(req.user);
});

export default router;