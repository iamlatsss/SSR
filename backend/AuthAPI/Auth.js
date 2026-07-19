import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as DB from "../Database.js";

const tokenExpirePeriod = 7 * 24 * 60 * 60; // Time in seconds 
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
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
      if (err) {
        console.error("JWT verification failed:", err.message);
        return res.status(403).json({ message: "Forbidden: Invalid or expired token" });
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

export async function generateJWT(user_data, rememberMe = false) {
  const expiresIn = rememberMe ? 30 * 24 * 60 * 60 : tokenExpirePeriod;
  return jwt.sign(user_data, process.env.JWT_SECRET, { expiresIn });
}

// Post call to Log out
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });
  res.json({ message: 'Logged out' });
});

// Post call to Login
router.post("/login", async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user_data = await DB.getUserByEmail(email);
    if (!user_data.ok && user_data.message === "User not found") {
      return res.status(401).json({ message: "Invalid email or password" }); // Generic error
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
        // Lock account for 10 minutes
        const lockUntil = new Date(Date.now() + 10 * 60000);
        updates.account_locked_until = lockUntil;
      }
      
      await DB.updateUserById(user.user_id, updates);
      return res.status(401).json({ message: "Invalid email or password" }); // Generic error
    }

    if (!user_data.ok && user_data.message === "User is not active") {
      return res.status(401).json({ message: "Account inactive. Contact support." });
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
    
    const token = await generateJWT(response_data, rememberMe);
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : tokenExpirePeriod * 1000;

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: maxAge
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

// Post call to create new user
router.post('/addUser', async (req, res) => {
  try {
    const { user_name, email, password } = req.body;
    let role = req.body.role;

    if (!role || !USER_ROLES.has(role.toLowerCase())) {
      role = 'Viewer';
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Hash the plain password before saving
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);  

    const result = await DB.createUser(user_name, email, passwordHash, role);

    if (!result.ok) {
      // Possible duplicate email or DB error
      return res.status(400).json({ message: result.message || 'Failed to create user' });
    }

    // Success response with userId
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