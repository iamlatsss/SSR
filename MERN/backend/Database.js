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


// #region 🧑‍💼 USERS ─────────────────────────────────────────────

export const ALLOWED_UPDATE_FIELDS = new Set(["role", "is_active", "password", "email", "user_name"]);

export async function getUserByEmail(email) {
  const query = 'SELECT user_name, user_id, password, email, role, is_active FROM Users WHERE email = ?';

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
  const query = 'INSERT INTO Users (user_name, email, password, role) VALUES (?, ?, ?, ?)';
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
  const usersQuery = 'SELECT user_name, user_id, email, role, is_active, created_at FROM Users';
  const roleQuery = `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'role';`;

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
  const query = `UPDATE Users SET ${fields.join(", ")} WHERE user_id = ?`;

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
  const query = 'DELETE FROM Users WHERE user_id = ?';
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

// #endregion


// #region 📖 BOOKING ─────────────────────────────────────────────

const ALLOWED_BOOKING_FIELDS = new Set([
  "NominationDate", "Consignee", "Shipper", "HBL", "MBL", "POL", "POD",
  "ContainerSize", "Agent", "ShippingLine", "BuyRate", "SellRate", "ETD",
  "ETA", "SWB", "IGMFiled", "CHA", "Description", "Status"
]);

// Insert Booking
export async function insertBooking(bookingData) {
  const fields = [];
  const values = [];
  const placeholders = [];

  for (const key in bookingData) {
    if (ALLOWED_BOOKING_FIELDS.has(key)) {
      fields.push(key);
      values.push(bookingData[key]);
      placeholders.push("?");
    }
  }

  if (fields.length === 0) {
    return { ok: false, message: "No insertable fields provided" };
  }

  const query = `INSERT INTO Booking (${fields.join(',')}) VALUES (${placeholders.join(',')})`;

  try {
    const [result] = await pool.query(query, values);
    return { ok: true, JobNo: result.insertId };
  } catch (error) {
    console.error("❌ Error inserting booking:", error);
    return { ok: false, message: "Database error", error: error.message };
  }
}

// Get booking by JobNo
export async function getBookingById(jobNo) {
  const query = "SELECT * FROM Booking WHERE JobNo = ?";
  try {
    const [rows] = await pool.query(query, [jobNo]);
    if (rows.length === 0) {
      return { ok: false, message: "Booking not found" };
    }
    return { ok: true, booking: rows[0] };
  } catch (error) {
    console.error("Error fetching booking:", error);
    return { ok: false, message: "Database error", error: error.message };
  }
}

// Get all bookings
export async function getAllBookings() {
  const query = "SELECT * FROM Booking";
  try {
    const [rows] = await pool.query(query, []);
    if (rows.length === 0) {
      return { ok: false, message: "Bookings not found" };
    }
    return { ok: true, bookings: rows[0] };
  } catch (error) {
    console.error("Error fetching booking:", error);
    return { ok: false, message: "Database error", error: error.message };
  }
}

// Update Booking by JobNo
export async function updateBookingById(jobNo, updates) {
  const fields = [];
  const values = [];

  for (const key in updates) {
    if (ALLOWED_BOOKING_FIELDS.has(key)) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    return { ok: false, message: "No valid fields to update" };
  }

  values.push(jobNo);
  const query = `UPDATE Booking SET ${fields.join(", ")} WHERE JobNo = ?`;

  try {
    const [result] = await pool.query(query, values);
    if (result.affectedRows === 0) {
      return { ok: false, message: "Booking not found" };
    }
    return { ok: true };
  } catch (error) {
    console.error("Error updating booking:", error);
    return { ok: false, message: "Database error", error: error.message };
  }
}

// #endregion


// #region CUSTOMER ─────────────────────────────────────────────

const ALLOWED_CUSTOMER_FIELDS = new Set([
  "date", "branch", "name", "address", "customer_type", "status", "year_of_establishment", "pan",
  "director", "aadhar", "branch_office", "office_address", "state", "gstin", "remarks", "created_at"
]);

// Function to insert Customer KYC
export async function insertCustomer(pool, customerData) {
  const fields = [];
  const values = [];
  const placeholders = [];

  for (const key in customerData) {
    if (ALLOWED_CUSTOMER_FIELDS.has(key)) {
      fields.push(key);
      values.push(customerData[key]);
      placeholders.push("?");
    }
  }

  if (fields.length === 0) {
    return { ok: false, message: "No valid fields to insert" };
  }

  const query = `INSERT INTO customer (${fields.join(",")}) VALUES (${placeholders.join(",")})`;

  try {
    const [result] = await pool.query(query, values);
    return { ok: true, customer_id: result.insertId };
  } catch (error) {
    console.error("Insert customer error:", error);
    return { ok: false, message: "Database error", error: error.message };
  }
}

// Update Customer KYC
export async function updateCustomerById(pool, customer_id, updates) {
  const fields = [];
  const values = [];

  for (const key in updates) {
    if (ALLOWED_CUSTOMER_FIELDS.has(key)) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    return { ok: false, message: "No valid fields to update" };
  }

  values.push(customer_id);
  const query = `UPDATE customer SET ${fields.join(", ")} WHERE customer_id = ?`;

  try {
    const [result] = await pool.query(query, values);
    if (result.affectedRows === 0) {
      return { ok: false, message: "Customer not found" };
    }
    return { ok: true };
  } catch (error) {
    console.error("Update customer error:", error);
    return { ok: false, message: "Database error", error: error.message };
  }
}




// #endregion



// const t = await getAllUsers()
// console.log(t)

