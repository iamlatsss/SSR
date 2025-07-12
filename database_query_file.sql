-- Create the database if it does not exist
CREATE DATABASE IF NOT EXISTS SSR;

-- Use the database
USE SSR;

-- Create `user` table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create `kycdetails` table
CREATE TABLE IF NOT EXISTS kycdetails (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    cust_name VARCHAR(100) NOT NULL,
    type_of_customer VARCHAR(100) NOT NULL,
    status_of_customer VARCHAR(100) NOT NULL,
    year_of_establishment YEAR NOT NULL,
    pan_number VARCHAR(100) NOT NULL UNIQUE,
    aadhar_number BIGINT NOT NULL UNIQUE,
    kyc_date DATE NOT NULL
) AUTO_INCREMENT = 1001;

-- Create `customer_address` table
CREATE TABLE IF NOT EXISTS customer_address (
    customer_id INT PRIMARY KEY,
    state VARCHAR(100) NOT NULL,
    pincode BIGINT NOT NULL,
    mobile_no BIGINT NOT NULL,
    website_link VARCHAR(100),
    FOREIGN KEY (customer_id) REFERENCES kycdetails(customer_id)
);

-- Create `director_or_partner_details` table
CREATE TABLE IF NOT EXISTS director_or_partner_details (
    customer_id INT PRIMARY KEY,
    director_partner_name VARCHAR(100) NOT NULL,
    director_partner_address VARCHAR(500) NOT NULL,
    director_partner_email VARCHAR(100) NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES kycdetails(customer_id)
);

-- Create `branch_details` table
CREATE TABLE IF NOT EXISTS branch_details (
    customer_id INT PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    branch_offices VARCHAR(100) NOT NULL,
    branch_address VARCHAR(500) NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES kycdetails(customer_id)
);

-- Create `gstin_details` table
CREATE TABLE IF NOT EXISTS gstin_details (
    customer_id INT PRIMARY KEY,
    office_billing_address VARCHAR(500) NOT NULL,
    office_billing_state VARCHAR(100) NOT NULL,
    gstin BIGINT NOT NULL UNIQUE,
    remarks VARCHAR(500) NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES kycdetails(customer_id)
);


-- CREATE TABLE companies (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL UNIQUE
-- );


CREATE DATABASE DB;
USE DB;

CREATE TABLE booking (

    job_number INT AUTO_INCREMENT PRIMARY KEY,  -- New ID column as primary key
    nomination_date DATE NOT NULL,
    consignee_details VARCHAR(255) NOT NULL,
    shipper_details VARCHAR(255) NOT NULL,
    hbl_no VARCHAR(50) NOT NULL,
    mbl_no VARCHAR(50) NOT NULL,
    pol VARCHAR(100) NOT NULL,
    pod VARCHAR(100) NOT NULL,
    container_size VARCHAR(10) NOT NULL,
    agent_details VARCHAR(255) NOT NULL,
    shipping_line VARCHAR(255) NOT NULL,
    buy_rate DECIMAL(10,2) NOT NULL,
    sell_rate DECIMAL(10,2) NOT NULL,
    etd DATE NOT NULL,
    eta DATE NOT NULL,
    swb VARCHAR(10) NOT NULL,
    igm_filed VARCHAR(10) NOT NULL,
    cha VARCHAR(255) NOT NULL,

);

-- Set the starting value of AUTO_INCREMENT to 1001
ALTER TABLE booking AUTO_INCREMENT = 1001;


ALTER TABLE booking ADD COLUMN description_box TEXT;

INSERT INTO booking (
    nomination_date, consignee_details, shipper_details, hbl_no, mbl_no, pol, pod, 
    container_size, agent_details, shipping_line, buy_rate, sell_rate, etd, eta, 
    swb, igm_filed, cha, description_box
) VALUES 
(
    '2025-03-15', 'ABC Logistics', 'XYZ Exports', 'HBL12345', 'MBL98765', 
    'Chennai', 'New York', '40FT', 'Global Shipping Agency', 'Maersk Line', 
    1200.50, 1500.75, '2025-03-20', '2025-04-05', 'Yes', 'No', 'Customs Agent A',
    'Urgent shipment for high-value cargo.'
),
(
    '2025-04-10', 'DEF Logistics', 'LMN Traders', 'HBL67890', 'MBL54321', 
    'Mumbai', 'London', '20FT', 'Ocean Freight Solutions', 'CMA CGM', 
    1350.75, 1600.90, '2025-04-15', '2025-04-30', 'No', 'Yes', 'Customs Broker B',
    'Special handling required for fragile goods.'
),
(
    '2025-05-05', 'XYZ Logistics', 'ABC Exporters', 'HBL98765', 'MBL67890', 
    'Chennai', 'New York', '40FT', 'Global Freight Services', 'Maersk Line', 
    1800.50, 2100.75, '2025-05-10', '2025-05-25', 'Yes', 'No', 'Customs Broker C',
    'Temperature-controlled shipment required.'
);


SELECT job_number, description_box FROM booking;


ALTER TABLE booking ADD COLUMN status VARCHAR(50) DEFAULT 'Pending';

-- View the records
SELECT * FROM booking;


-- Step 1: Create the database
CREATE DATABASE IF NOT EXISTS ssr_db;

-- Step 2: Use the database
USE ssr_db;

-- Step 3: Create the users table (improved version)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update your users table to include more profile fields:
ALTER TABLE users
ADD COLUMN mobile VARCHAR(20),
ADD COLUMN address TEXT,
ADD COLUMN city VARCHAR(100),
ADD COLUMN state VARCHAR(100),
ADD COLUMN country VARCHAR(100),
ADD COLUMN pincode VARCHAR(10);

CREATE TABLE booking (
    job_number INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nomination_date DATE NOT NULL,
    consignee_details VARCHAR(255) NOT NULL,
    shipper_details VARCHAR(255) NOT NULL,
    hbl_no VARCHAR(50) NOT NULL,
    mbl_no VARCHAR(50) NOT NULL,
    pol VARCHAR(100) NOT NULL,
    pod VARCHAR(100) NOT NULL,
    container_size VARCHAR(10) NOT NULL,
    agent_details VARCHAR(255) NOT NULL,
    shipping_line VARCHAR(255) NOT NULL,
    buy_rate DECIMAL(10,2) NOT NULL,
    sell_rate DECIMAL(10,2) NOT NULL,
    etd DATE NOT NULL,
    eta DATE NOT NULL,
    swb VARCHAR(10) NOT NULL,
    igm_filed VARCHAR(10) NOT NULL,
    cha VARCHAR(255) NOT NULL,
    description_box TEXT
) AUTO_INCREMENT=1001;



