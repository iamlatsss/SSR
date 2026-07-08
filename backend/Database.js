import mysql from 'mysql2';
import knex from 'knex';
import './config.js';
import { STANDARD_CHARGES } from './StandardCharges.js';
import { STANDARD_PARTIES } from './StandardParties.js';


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
      "ADD COLUMN charges JSON",
      "ADD COLUMN transit_time VARCHAR(255)"
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
    (client_name, phone_number, email, pol, pod, container_size_type, remarks, pdf_link, address, commodity, incoterms, terms, charges, transit_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    data.charges ? JSON.stringify(data.charges) : null,
    data.transit_time || null
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
  try {
    const dbName = process.env.MYSQL_DATABASE || 'ssr';
    
    // Check if 'id' column exists in HouseBL table
    const [hasIdCol] = await knexDB.raw(
      `SELECT COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'HouseBL' AND COLUMN_NAME = 'id'`,
      [dbName]
    );

    if (hasIdCol.length === 0) {
      console.log("Migrating HouseBL table: dropping and recreating with new id-based primary key and editable job_no");
      await pool.query("DROP TABLE IF EXISTS HouseBL");
    }

    const query = `
      CREATE TABLE IF NOT EXISTS HouseBL (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_no INT NOT NULL,
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
      )
    `;
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

(async function initInvoicesTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS Invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_no VARCHAR(100) UNIQUE,
      job_no INT NOT NULL,
      mbl_hbl_type VARCHAR(10),
      mbl_hbl_no VARCHAR(100),
      client_id INT,
      client_name VARCHAR(255),
      client_address TEXT,
      client_gstin VARCHAR(100),
      client_state VARCHAR(100),
      print_type VARCHAR(50) DEFAULT 'Invoice',
      invoice_date DATE,
      items JSON,
      totals JSON,
      pdf_link VARCHAR(1000),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) AUTO_INCREMENT = 9300
  `;
  try {
    await pool.query(query);
    console.log("Invoices table initialized");
    
    // Dynamically alter existing Invoices table to ensure all new columns exist
    const dbName = process.env.MYSQL_DATABASE || 'ssr';
    const columnsToAdd = [
      { name: 'mbl_hbl_type', type: 'VARCHAR(10)' },
      { name: 'mbl_hbl_no', type: 'VARCHAR(100)' },
      { name: 'client_id', type: 'INT' },
      { name: 'client_name', type: 'VARCHAR(255)' },
      { name: 'client_address', type: 'TEXT' },
      { name: 'client_gstin', type: 'VARCHAR(100)' },
      { name: 'client_state', type: 'VARCHAR(100)' },
      { name: 'print_type', type: "VARCHAR(50) DEFAULT 'Invoice'" },
      { name: 'pdf_link', type: 'VARCHAR(1000)' },
      { name: 'approval_status', type: "VARCHAR(20) DEFAULT 'Pending'" },
      { name: 'einvoice_status', type: "VARCHAR(30) DEFAULT 'Pending'" },
      { name: 'rejection_reason', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'rejection_remarks', type: 'TEXT DEFAULT NULL' },
      { name: 'irn', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'ack_no', type: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'ack_date', type: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'signed_qr_code', type: 'LONGTEXT DEFAULT NULL' },
      { name: 'signed_invoice', type: 'LONGTEXT DEFAULT NULL' },
      { name: 'einvoice_response', type: 'JSON DEFAULT NULL' },
      { name: 'einvoice_logs', type: 'JSON DEFAULT NULL' }
    ];
    for (const col of columnsToAdd) {
      try {
        await pool.query(`ALTER TABLE Invoices ADD COLUMN ${col.name} ${col.type}`);
      } catch (e) {
        // Column already exists, safe to ignore
      }
    }
    
    // Safely drop the incorrect FK constraint referencing Bookings/Booking table 
    // since job_no is a polymorphic relation across Booking, MasterBL, and HouseBL.
    try {
      await pool.query("ALTER TABLE Invoices DROP FOREIGN KEY FK_Invoices_Booking");
      console.log("Successfully dropped FK_Invoices_Booking constraint from Invoices table");
    } catch (e) {
      // Ignore if constraint does not exist
    }
  } catch (err) {
    console.error("Error creating/updating Invoices table:", err);
  }
})();

(async function initEInvoiceAuditLogsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS EInvoiceAuditLogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_id INT NOT NULL,
      invoice_no VARCHAR(100) NOT NULL,
      action VARCHAR(50) NOT NULL,
      user_id INT,
      user_name VARCHAR(255),
      user_email VARCHAR(255),
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  try {
    await pool.query(query);
    console.log("EInvoiceAuditLogs table initialized");
  } catch (err) {
    console.error("Error creating EInvoiceAuditLogs table:", err);
  }
})();

(async function initChargesTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS Charges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      gst BOOLEAN DEFAULT FALSE,
      igst BOOLEAN DEFAULT FALSE,
      percentage DECIMAL(5, 2) DEFAULT 0,
      gst_charge_type VARCHAR(50) DEFAULT 'Taxable',
      short_name VARCHAR(100) DEFAULT '',
      charge_type VARCHAR(50) DEFAULT 'Taxable',
      income_type VARCHAR(50) DEFAULT 'Both',
      tax_type VARCHAR(100) DEFAULT 'Standard GST',
      unit VARCHAR(50) DEFAULT '--- None ---',
      currency VARCHAR(50) DEFAULT 'INR',
      rcm VARCHAR(10) DEFAULT 'No',
      tds_applicable VARCHAR(10) DEFAULT 'No',
      reimbursement_applicable VARCHAR(10) DEFAULT 'No',
      status VARCHAR(50) DEFAULT 'Enabled',
      sac VARCHAR(50) DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  try {
    await pool.query(query);
    console.log("Charges table initialized in MySQL");
    
    // Seed/Upsert charges from STANDARD_CHARGES
    console.log("Upserting standard charges...");
    for (const item of STANDARD_CHARGES) {
      const payload = {
        name: item.name,
        gst: item.gst ? 1 : 0,
        igst: item.igst ? 1 : 0,
        percentage: item.percentage || 0,
        gst_charge_type: item.gst_charge_type || 'Taxable',
        short_name: item.short_name || item.name,
        charge_type: item.charge_type || 'Taxable',
        income_type: item.income_type || 'Both',
        tax_type: item.tax_type || 'Standard GST',
        unit: item.unit || '--- None ---',
        currency: item.currency || 'INR',
        rcm: item.rcm || 'No',
        tds_applicable: item.tds_applicable || 'No',
        reimbursement_applicable: item.reimbursement_applicable || 'No',
        status: item.status || 'Enabled',
        sac: item.sac || ''
      };

      const existing = await knexDB("Charges").where({ name: item.name }).first();
      if (existing) {
        await knexDB("Charges").where({ id: existing.id }).update(payload);
      } else {
        await knexDB("Charges").insert(payload);
      }
    }
    console.log("Charges table seeding/upserting completed successfully.");
  } catch (e) {
    console.error("Error creating/populating Charges table:", e);
  }
})();

(async function initPartiesTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS Parties (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_type VARCHAR(50) DEFAULT '',
      party_type VARCHAR(50) DEFAULT '',
      name VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) NOT NULL,
      pan_no VARCHAR(20) DEFAULT '',
      cin_no VARCHAR(50) DEFAULT '',
      entity_type VARCHAR(100) DEFAULT '',
      web_url VARCHAR(255) DEFAULT '',
      director_name VARCHAR(255) DEFAULT '',
      turnover VARCHAR(100) DEFAULT '',
      group_companies VARCHAR(255) DEFAULT '',
      business_type VARCHAR(100) DEFAULT '',
      incorporation_year VARCHAR(50) DEFAULT '',
      gst_reg_type VARCHAR(100) DEFAULT '',
      referred_by VARCHAR(255) DEFAULT '',
      fac VARCHAR(10) DEFAULT '',
      iata_code VARCHAR(50) DEFAULT '',
      is_iata_agent VARCHAR(10) DEFAULT '',
      is_airline VARCHAR(10) DEFAULT '',
      is_msme VARCHAR(10) DEFAULT '',
      msme_type VARCHAR(50) DEFAULT '',
      msme_no VARCHAR(50) DEFAULT '',
      tds_rate VARCHAR(50) DEFAULT '',
      rcm VARCHAR(10) DEFAULT '',
      usd_party VARCHAR(10) DEFAULT '',
      os_active VARCHAR(10) DEFAULT '',
      commodity TEXT,
      special_instruction TEXT,
      info_by_sales TEXT,
      hod_feedback TEXT,
      no_of_employees VARCHAR(50) DEFAULT '',
      marketing VARCHAR(100) DEFAULT '',
      party_status VARCHAR(50) DEFAULT 'Draft',
      status VARCHAR(20) DEFAULT 'Enabled',
      addresses JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  try {
    await pool.query(query);
    console.log("Parties table initialized in MySQL");
    
    // Seed/Upsert parties from STANDARD_PARTIES
    console.log("Upserting standard parties...");
    for (const item of STANDARD_PARTIES) {
      const addresses = [];
      if (item.gst_no) {
        addresses.push({
          email: item.email || '',
          telephone: '',
          fax: '',
          tan_no: '',
          gst_no: item.gst_no,
          address_line1: 'Default Address',
          address_line2: '',
          city: '',
          pin_code: '',
          country: 'India',
          gst_state: '',
          is_head_office: 'Yes',
          is_sez: 'No',
          status: 'Enabled',
          is_default: true
        });
      }

      const payload = {
        name: item.name,
        email: item.email || '',
        pan_no: item.pan_no || '',
        marketing: item.marketing || '',
        party_status: item.party_status || 'Draft',
        status: item.status || 'Enabled',
        addresses: JSON.stringify(addresses),
        created_at: item.created_at || knexDB.fn.now()
      };

      const existing = await knexDB("Parties").where({ name: item.name }).first();
      if (existing) {
        // Check if existing addresses have real data (not just "Default Address")
        let existingAddresses = [];
        try {
          existingAddresses = typeof existing.addresses === 'string'
            ? JSON.parse(existing.addresses)
            : (existing.addresses || []);
        } catch (e) { /* ignore parse errors */ }

        const hasRealAddress = existingAddresses.some(a =>
          a.address_line1 && a.address_line1 !== 'Default Address'
        );

        // Preserve existing extra fields but update basic info
        const updatePayload = {
          email: payload.email,
          pan_no: payload.pan_no,
          marketing: payload.marketing,
          party_status: payload.party_status,
          status: payload.status,
        };

        // Only overwrite addresses if existing ones don't have real data
        if (!hasRealAddress) {
          updatePayload.addresses = payload.addresses;
        }

        await knexDB("Parties").where({ id: existing.id }).update(updatePayload);
      } else {
        await knexDB("Parties").insert(payload);
      }
    }
    console.log("Parties table seeding/upserting completed successfully.");

    // Dynamic schema update for KYC Document uploads & details in Parties table
    const docColumns = [
      "ADD COLUMN gstin_doc VARCHAR(255)",
      "ADD COLUMN pan_doc VARCHAR(255)",
      "ADD COLUMN iec_doc VARCHAR(255)",
      "ADD COLUMN kyc_letterhead_doc VARCHAR(255)",
      "ADD COLUMN branch VARCHAR(255)",
      "ADD COLUMN aadhar VARCHAR(50)",
      "ADD COLUMN gst_remarks TEXT",
      "ADD COLUMN mto_iec_cha_validity VARCHAR(255)",
      "ADD COLUMN aeo_validity VARCHAR(255)",
      "ADD COLUMN export_commodities TEXT",
      "ADD COLUMN email_export VARCHAR(255)",
      "ADD COLUMN email_import VARCHAR(255)",
      "ADD COLUMN bank_details TEXT",
      "ADD COLUMN contact_person_export VARCHAR(255)",
      "ADD COLUMN contact_person_import VARCHAR(255)",
      "ADD COLUMN kyc_date VARCHAR(50)",
      "ADD COLUMN legal_name VARCHAR(255) DEFAULT ''",
      "ADD COLUMN gst_no VARCHAR(50) DEFAULT ''"
    ];
    for (const col of docColumns) {
      try {
        await pool.query(`ALTER TABLE Parties ${col}`);
      } catch (e) {
        // Column already exists, safe to ignore
      }
    }
    console.log("Parties table document & KYC columns verified/added.");

    // One-time reference mapping migration by matching names
    try {
      const hasCustomers = await knexDB.schema.hasTable("Customers");
      if (hasCustomers) {
        console.log("Running legacy KYC reference migration...");
        const legacyCustomers = await knexDB("Customers").select("customer_id", "name");
        
        for (const cust of legacyCustomers) {
          const party = await knexDB("Parties").where({ name: cust.name }).first();
          if (party) {
            console.log(`Mapping legacy customer ID ${cust.customer_id} to Party ID ${party.id} for "${cust.name}"`);
            await knexDB("Booking").where({ shipper: cust.customer_id }).update({ shipper: party.id });
            await knexDB("Booking").where({ consignee: cust.customer_id }).update({ consignee: party.id });
            await knexDB("Booking").where({ agent: cust.customer_id }).update({ agent: party.id });
            await knexDB("Booking").where({ cha: cust.customer_id }).update({ cha: party.id });
            await knexDB("Booking").where({ cfs: cust.customer_id }).update({ cfs: party.id });
            
            await knexDB("MasterBL").where({ shipper: cust.customer_id }).update({ shipper: party.id });
            await knexDB("MasterBL").where({ consignee: cust.customer_id }).update({ consignee: party.id });
            await knexDB("MasterBL").where({ agent: cust.customer_id }).update({ agent: party.id });
            
            await knexDB("HouseBL").where({ shipper: cust.customer_id }).update({ shipper: party.id });
            await knexDB("HouseBL").where({ consignee: cust.customer_id }).update({ consignee: party.id });
            
            await knexDB("ProformaInvoices").where({ client_id: cust.customer_id }).update({ client_id: party.id });
            await knexDB("Invoices").where({ client_id: cust.customer_id }).update({ client_id: party.id });
          }
        }
        console.log("Legacy KYC reference migration completed.");
      } else {
        console.log("Legacy Customers table does not exist. Skipping migration.");
      }
    } catch (migErr) {
      console.error("Error running legacy KYC reference migration:", migErr);
    }
  } catch (e) {
    console.error("Error creating/populating Parties table:", e);
  }
})();

(async function initHBLDocumentsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS HBLDocuments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      job_no INT NOT NULL,
      document_type VARCHAR(50) NOT NULL,
      bl_no VARCHAR(50) UNIQUE NOT NULL,
      doc_data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_job_doc (job_no, document_type)
    )
  `;
  try {
    await pool.query(query);
    console.log("HBLDocuments table initialized in MySQL");
  } catch (err) {
    console.error("Error creating HBLDocuments table:", err);
  }
})();

export function mapPartyToCustomer(party) {
  if (!party) return null;

  let defaultAddress = {
    address_line1: '',
    address_line2: '',
    city: '',
    pin_code: '',
    gst_state: '',
    country: 'India',
    gst_no: '',
    email: '',
    telephone: '',
    tan_no: '',
    contact_person: ''
  };

  let parsedAddresses = [];
  if (party.addresses) {
    try {
      const addrs = typeof party.addresses === 'string' ? JSON.parse(party.addresses) : party.addresses;
      if (Array.isArray(addrs)) {
        parsedAddresses = addrs;
        if (addrs.length > 0) {
          const found = addrs.find(a => a.is_default) || addrs[0];
          if (found) {
            defaultAddress = { ...defaultAddress, ...found };
          }
        }
      }
    } catch (e) {
      console.error("Error parsing addresses for party mapping:", e);
    }
  }

  const addressParts = [
    defaultAddress.address_line1,
    defaultAddress.address_line2,
    defaultAddress.city,
    defaultAddress.pin_code,
    defaultAddress.gst_state,
    defaultAddress.country
  ].filter(part => part && String(part).trim() !== '');

  const addressStr = addressParts.join(', ');

  return {
    customer_id: party.id,
    date: party.kyc_date || party.created_at,
    branch: party.branch || 'Navi Mumbai',
    name: party.name,
    address: addressStr,
    office_address: addressStr,
    branch_office: defaultAddress.city || '',
    customer_type: party.entity_type || party.category_type || 'Customer',
    status: party.status || 'Enabled',
    year_of_establishment: party.incorporation_year || '',
    pan: party.pan_no || '',
    director: party.director_name || '',
    aadhar: party.aadhar || '',
    state: defaultAddress.gst_state || '',
    gstin: defaultAddress.gst_no || '',
    gst_remarks: party.gst_remarks || '',
    annual_turnover: party.turnover || '',
    mto_iec_cha_validity: party.mto_iec_cha_validity || '',
    aeo_validity: party.aeo_validity || '',
    export_commodities: party.export_commodities || '',
    email_export: party.email_export || party.email || defaultAddress.email || '',
    email_import: party.email_import || party.email || defaultAddress.email || '',
    bank_details: party.bank_details || '',
    contact_person_export: party.contact_person_export || defaultAddress.contact_person || '',
    contact_person_import: party.contact_person_import || defaultAddress.contact_person || '',
    gstin_doc: party.gstin_doc || null,
    pan_doc: party.pan_doc || null,
    iec_doc: party.iec_doc || null,
    kyc_letterhead_doc: party.kyc_letterhead_doc || null,
    created_at: party.created_at,
    addresses: parsedAddresses
  };
}

// #endregion

(async function seedCFSParties() {
  try {
    const STANDARD_CFS = [
      "All Cargo Logistics CFS",
      "AMEYA CFS",
      "APOLLO CFS",
      "Ashte Logistics Private Limited",
      "BUDGET CFS TERMINALS PRIVATE LIMITED",
      "CWC DISTRI PARK",
      "Cwc Logistics Park",
      "DRT",
      "Efc Logistics India P Ltd",
      "GATEWAY DISTRIPARK",
      "GDL",
      "GLOBICON CFS",
      "HIND CFS",
      "Icd Faridabad Actl",
      "Icd Piyala, Faridabad",
      "INDEV CFS",
      "INNSA EGPSD",
      "JWC LOGISTICS PARK PVT LTD",
      "Jwr Logistics Pvt Ltd",
      "Landmark Cfs",
      "NAVKAR",
      "NINE",
      "PUNJAB CONWARE",
      "SANCO",
      "Saurashtra Cfs",
      "SEA BIRD",
      "SPEEDY MALIMODEL CFS"
    ];

    for (const cfsName of STANDARD_CFS) {
      const existing = await knexDB("Parties").where({ name: cfsName }).first();
      if (!existing) {
        const payload = {
          name: cfsName,
          category_type: 'CFS',
          email: '',
          status: 'Enabled',
          party_status: 'Draft',
          addresses: JSON.stringify([])
        };
        await knexDB("Parties").insert(payload);
      } else {
        if (!existing.category_type || existing.category_type === '--- None ---' || existing.category_type === '') {
          await knexDB("Parties").where({ id: existing.id }).update({ category_type: 'CFS' });
        }
      }
    }
    console.log("CFS standard parties seeded successfully.");
  } catch (err) {
    console.error("Error seeding CFS standard parties:", err);
  }
})();


