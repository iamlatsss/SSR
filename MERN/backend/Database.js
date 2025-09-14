import mysql from 'mysql2';
import './config.js';

// Create a MySQL pool for connection reuse
export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'ssr'
}).promise();

// ------------------------
// User Table Functions
// ------------------------

export const ALLOWED_UPDATE_FIELDS = new Set(["role", "is_active", "password", "email"]);

export async function getUserByEmail(email) {
  const query = 'SELECT user_name, user_id, password, email, role, is_active FROM users WHERE email = ?';

  try {
    const [[rows]] = await pool.query(query, [email]);

    if (rows.length === 0) {
      return { ok: false, message: 'User not found' };
    }

    if (!rows.is_active) {
      return { ok: false, message: 'User is not active' };
    }

    return { ok: true, data: rows };

  } catch (error) {
    console.error('Error fetching user by email:', error);
    return { ok: false, message: 'Database error' };
  }
}

export async function createUser(user_name, email, passwordHash, role = 'Viewer') {
  const query = 'INSERT INTO users (user_name, email, password, role) VALUES (?, ?, ?, ?)';
  try {
    const [result] = await pool.query(query, [user_name, email, passwordHash, role]);

    if (!result.insertId) {
      return { ok: false, message: 'Failed to create user' };
    }

    return { ok: true, data: { userId: result.insertId } };

  } catch (error) {
    console.error('Error creating user:', error);

    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return { ok: false, message: 'User with this email already exists' };
    }

    return { ok: false, message: 'Database error', error };
  }
}

export async function getAllUsers() {
  const usersQuery = 'SELECT user_name, user_id, email, role, is_active, created_at FROM users';
  const roleQuery = `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'role';`;

  try {
    const [usersRows] = await pool.query(usersQuery);
    const [[roleRows]] = await pool.query(roleQuery);

    const roles = roleRows.COLUMN_TYPE.match(/^enum\((.*)\)$/)[1]
      .split(",")
      .map(val => val.trim().replace(/^'(.*)'$/, "$1"));

    return { ok: true, users: usersRows, roles: roles };
  } catch (error) {
    console.error('Error fetching all users:', error);
    return { ok: false, message: 'Database error' };
  }
}

export async function updateUserById(user_id, updates) {
  const fields = [];
  const values = [];

  for (const key in updates) {
    if (ALLOWED_UPDATE_FIELDS.has(key)) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }
  if (fields.length === 0) return { ok: false, message: "No update fields provided" };

  values.push(user_id);
  const query = `UPDATE users SET ${fields.join(", ")} WHERE user_id = ?`;

  try {
    const [result] = await pool.query(query, values);
    if (result.affectedRows === 0) {
      return { ok: false, message: "User not found" };
    }
    return { ok: true };
  } catch (error) {
    console.error("Error updating user:", error);
    return { ok: false, message: "Database error" };
  }
}

export async function deleteUserById(user_id) {
  const query = 'DELETE FROM users WHERE user_id = ?';
  try {
    const [result] = await pool.query(query, [user_id]);
    if (result.affectedRows === 0) {
      return { ok: false, message: "User not found" };
    }
    return { ok: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { ok: false, message: "Database error" };
  }
}




// const t = await getAllUsers()
// console.log(t)

