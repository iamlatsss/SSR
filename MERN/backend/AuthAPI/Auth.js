import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as DB from "../Database.js";

const tokenExpirePeriod = 7 * 24 * 60 * 60; // Time in seconds 
const SALT_ROUNDS = 12;
const USER_ROLES = new Set(['admin', 'accounts', 'custom', 'sales', 'viewer', 'new_user']);

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

export async function generateJWT(user_data) {
  return jwt.sign(user_data, process.env.JWT_SECRET, { expiresIn: tokenExpirePeriod });
}

// Post call to Log out
router.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false, // true if HTTPS in production
    sameSite: 'lax',
  });
  res.json({ message: 'Logged out' });
});

// Post call to Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user_data = await DB.getUserByEmail(email);
    if (!user_data.ok && user_data.message === "User not found") {
      return res.status(401).json({ message: "Invalid username" });
    }
    
    const isMatch = await bcrypt.compare(password, user_data.data.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }
    
    if (!user_data.ok && user_data.message === "User is not active") {
      return res.status(401).json({ message: "Account inactive. Contact support." });
    }
    
    const response_data = {
      user_id: user_data.data.user_id,
      email: user_data.data.email,
      role: user_data.data.role
    };

    const token = await generateJWT(response_data);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
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

// Post call to create new user
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    let role = req.body.role;

    if (!USER_ROLES.has(role)) {
      role = 'new_user';
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Hash the plain password before saving
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);  

    const result = await DB.createUser(email, passwordHash, role);

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
  res.json({
    id: req.user.user_id,
    email: req.user.email,
    role: req.user.role
  });
});


export default router;