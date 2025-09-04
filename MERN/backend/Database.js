import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

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

export async function getUserByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
}

export async function createUser(email, passwordHash, role = 'user') {
    const [result] = await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [email, passwordHash, role]
    );
    return result.insertId;
}

export async function updateUserProfile(email, { mobile, address, city, state, country, pincode }) {
    await pool.query(
        'UPDATE users SET mobile=?, address=?, city=?, state=?, country=?, pincode=? WHERE email=?',
        [mobile, address, city, state, country, pincode, email]
    );
}

export async function getUserProfile(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
}

// ------------------------
// KYC Table Functions
// ------------------------

export async function submitKyc(details) {
    const {
        date, branch, customer_name, customer_address, customer_type, customer_status, year_of_establishment,
        pan_number, name_of_director, aadhar_number, branch_offices,
        office_address, gst_state, gstin, remarks
    } = details;

    await pool.query(
        `INSERT INTO kyc_details 
            (date, branch, customer_name, customer_address, customer_type, customer_status, year_of_establishment,
            pan_number, name_of_director, aadhar_number, branch_offices, office_address, gst_state, gstin, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            date, branch, customer_name, customer_address, customer_type, customer_status, year_of_establishment,
            pan_number, name_of_director, aadhar_number, branch_offices, office_address, gst_state, gstin, remarks
        ]
    );
}

// List KYC Companies for dropdown, etc.
export async function getCompanies() {
    const [rows] = await pool.query('SELECT DISTINCT customer_name FROM kyc_details');
    return rows.map(row => row.customer_name);
}

// ------------------------
// Quotation Table Functions
// ------------------------

export async function submitQuotation(data) {
    const {
        email, pol, pod, containerSize,
        shipperDetails, consigneeDetails, terms, validity
    } = data;

    await pool.query(
        `INSERT INTO quotations 
            (email, pol, pod, container_size, shipper_details, consignee_details, terms, validity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [email, pol, pod, containerSize, shipperDetails, consigneeDetails, terms, validity]
    );
}

// ------------------------
// Booking Table Functions
// ------------------------

export async function addBooking(details) {
    const flds = [
        "nomination_date", "consignee_details", "shipper_details", "hbl_no", "mbl_no", "pol", "pod",
        "container_size", "job_number", "agent_details", "shipping_line", "buy_rate", "sell_rate",
        "etd", "eta", "swb", "igm_filed", "cha", "description_box"
    ];
    const vals = flds.map(f => details[f]);
    const placeholders = flds.map(() => '?').join(', ');
    await pool.query(
        `INSERT INTO booking (${flds.join(', ')}) VALUES (${placeholders})`, vals
    );
}

export async function getLastJobNumber() {
    const [rows] = await pool.query('SELECT MAX(job_number) AS lastJobNumber FROM booking');
    return rows[0].lastJobNumber || 0;
}

export async function getAllBookings() {
    const [rows] = await pool.query('SELECT * FROM booking');
    return rows;
}

export async function getBookingByJobNumber(jobNumber) {
    const [rows] = await pool.query('SELECT * FROM booking WHERE job_number = ?', [jobNumber]);
    return rows[0];
}

export async function updateBooking(jobNumber, details) {
    const flds = [
        "nomination_date", "consignee_details", "shipper_details", "hbl_no", "mbl_no", "pol", "pod",
        "container_size", "agent_details", "shipping_line", "buy_rate", "sell_rate",
        "etd", "eta", "swb", "igm_filed", "cha", "description_box"
    ];
    const vals = flds.map(f => details[f]);
    await pool.query(
        `
        UPDATE booking SET
            nomination_date=?, consignee_details=?, shipper_details=?, hbl_no=?, mbl_no=?, pol=?, pod=?,
            container_size=?, agent_details=?, shipping_line=?, buy_rate=?, sell_rate=?, etd=?, eta=?, swb=?,
            igm_filed=?, cha=?, description_box=?
        WHERE job_number=?`,
        [...vals, jobNumber]
    );
}

export async function deleteBooking(jobNumber) {
    await pool.query('DELETE FROM booking WHERE job_number = ?', [jobNumber]);
}

export async function updateBookingStatus(jobNumber, status) {
    await pool.query('UPDATE booking SET status = ? WHERE job_number = ?', [status, jobNumber]);
}

// ------------------------
// Delivery Order & Freight Certificate
// ------------------------

export async function getDeliveryOrder(jobNumber) {
    return getBookingByJobNumber(jobNumber);
}

export async function getFreightCertificate(jobNumber) {
    return getBookingByJobNumber(jobNumber);
}

