import mysql from 'mysql2';
import knex from 'knex';
import './config.js';

// Create a MySQL pool for connection reuse
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'ssr',
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
}).promise();

export const knexDB = knex({
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'ssr',
    enableKeepAlive: true,
  },
  pool: { min: 0, max: 10 },
});


// #region 🧑‍💼 USERS ─────────────────────────────────────────────

(async function initUsersTable() {
  try {
    const newColumns = [
      "ADD COLUMN failed_login_attempts INT DEFAULT 0",
      "ADD COLUMN last_login_timestamp DATETIME",
      "ADD COLUMN account_locked_until DATETIME",
      "ADD COLUMN reset_token VARCHAR(255)",
      "ADD COLUMN reset_token_expires DATETIME"
    ];
    for (const col of newColumns) {
      try {
        await pool.query(`ALTER TABLE Users ${col}`);
      } catch (e) {
        // Ignored if column already exists
      }
    }
    // Add unique constraint to email if not exists
    try {
      await pool.query(`ALTER TABLE Users ADD UNIQUE (email)`);
    } catch (e) {
      // Ignored if constraint already exists
    }
    
    // Migrate new_user to Viewer and modify ENUM
    try {
      await pool.query(`UPDATE Users SET role = 'Viewer' WHERE role = 'new_user'`);
      await pool.query(`ALTER TABLE Users MODIFY COLUMN role ENUM('Admin', 'Accounts', 'Custom', 'Sales', 'Viewer') DEFAULT 'Viewer'`);
    } catch (e) {
      console.log("Ignored or failed updating ENUM role:", e.message);
    }
    
    console.log("Users table initialized with security fields and updated roles");
  } catch (err) {
    console.error("Error updating Users table:", err);
  }
})();

export const ALLOWED_UPDATE_FIELDS = new Set(["role", "is_active", "password", "email", "user_name", "failed_login_attempts", "last_login_timestamp", "account_locked_until", "reset_token", "reset_token_expires"]);

export async function getUserByEmail(email) {
  try {
    const rows = await knexDB('Users')
      .select('user_name', 'user_id', 'password', 'email', 'role', 'is_active', 'failed_login_attempts', 'account_locked_until', 'last_login_timestamp')
      .where({ email });

    if (rows.length === 0) {
      return { ok: false, message: 'User not found' };
    }

    if (!rows[0].is_active) {
      return { ok: false, message: 'User is not active' };
    }

    return { ok: true, data: rows[0] };
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return { ok: false, message: 'Database error' };
  }
}

export async function getUserByToken(token) {
  try {
    const rows = await knexDB('Users')
      .select('user_name', 'user_id', 'email')
      .where({ reset_token: token })
      .andWhere('reset_token_expires', '>', knexDB.fn.now());

    if (rows.length === 0) {
      return { ok: false, message: 'Invalid or expired token' };
    }
    return { ok: true, data: rows[0] };
  } catch (error) {
    console.error('Error fetching user by token:', error);
    return { ok: false, message: 'Database error' };
  }
}

export async function createUser(user_name, email, passwordHash, role = 'Viewer') {
  try {
    const [insertId] = await knexDB('Users').insert({
      user_name,
      email,
      password: passwordHash,
      role
    });

    if (!insertId) {
      return { ok: false, message: 'Failed to create user' };
    }

    return { ok: true, data: { userId: insertId } };

  } catch (error) {
    console.error('Error creating user:', error);

    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return { ok: false, message: 'User with this email already exists' };
    }

    return { ok: false, message: 'Database error', error };
  }
}

export async function getAllUsers() {
  const roleQuery = `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'role';`;

  try {
    const usersRows = await knexDB('Users').select('user_name', 'user_id', 'email', 'role', 'is_active', 'created_at');
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
  const updateData = {};
  for (const key in updates) {
    if (ALLOWED_UPDATE_FIELDS.has(key)) {
      updateData[key] = updates[key];
    }
  }

  if (Object.keys(updateData).length === 0) return { ok: false, message: "No update fields provided" };

  try {
    const affectedRows = await knexDB('Users')
      .where({ user_id })
      .update(updateData);

    if (affectedRows === 0) {
      return { ok: false, message: "User not found" };
    }
    return { ok: true };
  } catch (error) {
    console.error("Error updating user:", error);
    return { ok: false, message: "Database error" };
  }
}

export async function updateUserByEmail(email, updates) {
  const updateData = {};
  for (const key in updates) {
    if (ALLOWED_UPDATE_FIELDS.has(key)) {
      updateData[key] = updates[key];
    }
  }

  if (Object.keys(updateData).length === 0) return { ok: false, message: "No update fields provided" };

  try {
    const affectedRows = await knexDB('Users')
      .where({ email })
      .update(updateData);

    if (affectedRows === 0) {
      return { ok: false, message: "User not found" };
    }
    return { ok: true };
  } catch (error) {
    console.error("Error updating user:", error);
    return { ok: false, message: "Database error" };
  }
}

export async function deleteUserById(user_id) {
  try {
    const affectedRows = await knexDB('Users')
      .where({ user_id })
      .del();

    if (affectedRows === 0) {
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
  "job_no",
  "date_of_nomination",
  "shipper",
  "consignee",
  "pol",
  "pod",
  "final_pod",
  "container_size",
  "container_count",
  "agent",
  "status",
  "hbl_no",
  "mbl_no",
  "eta",
  "etd",
  "shipper_invoice_no",
  "net_weight",
  "gross_weight",
  "cargo_type",
  "shipping_line_name",
  "hbl_telex_received",
  "mbl_telex_received",
  "no_of_palette",
  "marks_and_numbers",
  "igm_no",
  "igm_on",
  "cha",
  "cfs",
  "freight_amount",
  "freight_currency",
  "do_validity",
  "container_number"
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
  const query = "SELECT * FROM Booking WHERE job_no = ?";
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
    return { ok: true, bookings: rows };
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
  const query = `UPDATE Booking SET ${fields.join(", ")} WHERE job_no = ?`;

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






// const t = await getAllCustomer()
// console.log(t)

// #region 📄 QUOTATIONS ─────────────────────────────────────────────

(async function initQuotationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS Quotations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_name VARCHAR(255),
      phone_number VARCHAR(50),
      email VARCHAR(255),
      pol VARCHAR(255),
      pod VARCHAR(255),
      container_size_type VARCHAR(255),
      remarks TEXT,
      pdf_link VARCHAR(1000),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  try {
    await pool.query(query);
    // Add remarks column if it doesn't exist
    try {
      await pool.query("ALTER TABLE Quotations ADD COLUMN remarks TEXT");
    } catch (e) {
      // Ignored if column already exists
    }
    // Add new dynamic fields
    const newColumns = [
      "ADD COLUMN address TEXT",
      "ADD COLUMN commodity VARCHAR(255)",
      "ADD COLUMN incoterms VARCHAR(255)",
      "ADD COLUMN terms TEXT",
      "ADD COLUMN charges JSON"
    ];
    for (const col of newColumns) {
      try {
        await pool.query(`ALTER TABLE Quotations ${col}`);
      } catch (e) {}
    }
    console.log("Quotations table initialized");
  } catch (err) {
    console.error("Error creating Quotations table:", err);
  }
})();

export async function saveQuotation(data) {
  const query = `
    INSERT INTO Quotations 
    (client_name, phone_number, email, pol, pod, container_size_type, remarks, pdf_link, address, commodity, incoterms, terms, charges)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    data.client_name || null,
    data.phone_number || null,
    data.email || null,
    data.pol || null,
    data.pod || null,
    data.container_size_type || null,
    data.remarks || null,
    data.pdf_link || null,
    data.address || null,
    data.commodity || null,
    data.incoterms || null,
    data.terms || null,
    data.charges ? JSON.stringify(data.charges) : null
  ];

  try {
    const [result] = await pool.query(query, values);
    return { ok: true, insertId: result.insertId };
  } catch (error) {
    console.error("Error saving quotation:", error);
    return { ok: false, message: "Database error", error: error.message };
  }
}

export async function getAllSentQuotations() {
  const query = "SELECT * FROM Quotations ORDER BY created_at DESC";
  try {
    const [rows] = await pool.query(query);
    return { ok: true, data: rows };
  } catch (error) {
    console.error("Error fetching sent quotations:", error);
    return { ok: false, message: "Database error", error: error.message };
  }
}

export async function deleteQuotationsByIds(ids) {
  if (!ids || ids.length === 0) return { ok: true, affected: 0 };
  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM Quotations WHERE id IN (${placeholders})`;
  try {
    const [result] = await pool.query(query, ids);
    return { ok: true, affected: result.affectedRows };
  } catch (error) {
    console.error("Error deleting quotations:", error);
    return { ok: false, message: "Database error", error: error.message };
  }
}

// #endregion






// #region 📦 MASTER BL & HOUSE BL ─────────────────────────────────────────────

(async function initMasterBLTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS MasterBL (
      job_no INT AUTO_INCREMENT PRIMARY KEY,
      mbl_no VARCHAR(100) UNIQUE NOT NULL,
      date_of_nomination DATE,
      shipper INT,
      consignee INT,
      pol VARCHAR(255),
      pod VARCHAR(255),
      final_pod VARCHAR(255),
      container_size VARCHAR(100),
      container_count INT,
      agent INT,
      status VARCHAR(50) DEFAULT 'Draft',
      eta DATE,
      etd DATE,
      shipper_invoice_no VARCHAR(100),
      net_weight DECIMAL(10, 2),
      gross_weight DECIMAL(10, 2),
      cargo_type VARCHAR(100),
      shipping_line_name VARCHAR(255),
      mbl_telex_received VARCHAR(10) DEFAULT 'No',
      no_of_palette INT,
      marks_and_numbers TEXT,
      freight_amount DECIMAL(10, 2),
      freight_currency VARCHAR(10) DEFAULT 'USD',
      manual_party_details JSON,
      invoice_no VARCHAR(100),
      invoice_date DATE,
      invoice_items JSON,
      invoice_totals JSON,
      invoice_customer JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) AUTO_INCREMENT = 8000
  `;
  try {
    await pool.query(query);
    console.log("MasterBL table initialized");
    try {
      await pool.query("ALTER TABLE MasterBL ADD COLUMN additional_details JSON");
    } catch (e) {
      // Column already exists, safe to ignore
    }
  } catch (err) {
    console.error("Error creating MasterBL table:", err);
  }
})();

(async function initHouseBLTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS HouseBL (
      job_no INT AUTO_INCREMENT PRIMARY KEY,
      hbl_no VARCHAR(100) UNIQUE NOT NULL,
      mbl_no VARCHAR(100),
      date_of_nomination DATE,
      shipper INT,
      consignee INT,
      status VARCHAR(50) DEFAULT 'Draft',
      shipper_invoice_no VARCHAR(100),
      net_weight DECIMAL(10, 2),
      gross_weight DECIMAL(10, 2),
      hbl_telex_received VARCHAR(10) DEFAULT 'No',
      no_of_palette INT,
      marks_and_numbers TEXT,
      freight_amount DECIMAL(10, 2),
      freight_currency VARCHAR(10) DEFAULT 'USD',
      manual_party_details JSON,
      invoice_no VARCHAR(100),
      invoice_date DATE,
      invoice_items JSON,
      invoice_totals JSON,
      invoice_customer JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) AUTO_INCREMENT = 9000
  `;
  try {
    await pool.query(query);
    console.log("HouseBL table initialized");
    try {
      await pool.query("ALTER TABLE HouseBL ADD COLUMN additional_details JSON");
    } catch (e) {
      // Column already exists, safe to ignore
    }
  } catch (err) {
    console.error("Error creating HouseBL table:", err);
  }
})();

(async function initProformaInvoicesTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS ProformaInvoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      proforma_no VARCHAR(100) UNIQUE,
      job_no INT NOT NULL,
      mbl_hbl_type VARCHAR(10) NOT NULL,
      mbl_hbl_no VARCHAR(100) NOT NULL,
      client_id INT,
      client_name VARCHAR(255),
      client_address TEXT,
      client_gstin VARCHAR(100),
      client_state VARCHAR(100),
      print_type VARCHAR(50) DEFAULT 'Invoice',
      proforma_date DATE,
      items JSON,
      totals JSON,
      pdf_link VARCHAR(1000),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) AUTO_INCREMENT = 5300
  `;
  try {
    await pool.query(query);
    console.log("ProformaInvoices table initialized");
  } catch (err) {
    console.error("Error creating ProformaInvoices table:", err);
  }
})();

// #endregion

