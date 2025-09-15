import express from 'express';
import { authenticateJWT } from "../AuthAPI/Auth.js"
import * as DB from "../Database.js";
import bcrypt from 'bcrypt';


const router = express.Router();
const SALT_ROUNDS = 12;

// GET all users
router.get("/users", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role != 'Admin') {
      return res.status(403).json({ success: false, message: "Only admin can access user Data" });
    }

    const result = await DB.getAllUsers();
    if (!result.ok) return res.status(500).json({ message: result.message });
    res.json({ success: true, users: result.users, roles: result.roles });

  } catch (err) {
  console.error("❌ Get all users error:", error);
  return res.status(500).json({ message: "Internal Server Error" });
}
});

// UPDATE user by user_id
router.put("/user/:user_id", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Only admin can update user data" });
    }

    const { user_id } = req.params;
    const updates = {};
    for (const key of Object.keys(req.body)) {
      if (DB.ALLOWED_UPDATE_FIELDS.has(key)) {
        if (key === "password") {
          if (req.body.password && req.body.password.trim() !== "") {
            updates.password = await bcrypt.hash(req.body.password, SALT_ROUNDS);
          }
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update." });
    }

    const result = await DB.updateUserById(user_id, updates);

    if (!result.ok) return res.status(400).json({ message: result.message });
    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error("❌ Update user error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// DELETE user by user_id
router.delete("/user/:user_id", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Only admin can delete users" });
    }

    const { user_id } = req.params;
    const result = await DB.deleteUserById(user_id);

    if (!result.ok) return res.status(404).json({ message: result.message });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("❌ Delete user error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});


export default router;

