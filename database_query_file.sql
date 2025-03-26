-- Create the database if it does not exist
CREATE DATABASE IF NOT EXISTS SSR;

-- Use the database
USE SSR;

-- Create `user` table
CREATE TABLE IF NOT EXISTS user (
    userID INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    mobile_no BIGINT UNIQUE NOT NULL,
    pass_word VARCHAR(100) NOT NULL
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
    cha VARCHAR(255) NOT NULL
);

INSERT INTO booking (
    nomination_date, consignee_details, shipper_details, hbl_no, mbl_no, pol, pod, 
    container_size, job_number, agent_details, shipping_line, buy_rate, sell_rate, etd, eta, 
    swb, igm_filed, cha
) VALUES 
(
    '2025-03-15', 'ABC Logistics', 'XYZ Exports', 'HBL12345', 'MBL98765', 
    'Chennai', 'New York', '40FT', '001', 'Global Shipping Agency', 'Maersk Line', 
    1200.50, 1500.75, '2025-03-20', '2025-04-05', 'Yes', 'No', 'Customs Agent A'
);

INSERT INTO booking (
    nomination_date, consignee_details, shipper_details, hbl_no, mbl_no, pol, pod, 
    container_size, job_number, agent_details, shipping_line, buy_rate, sell_rate, etd, eta, 
    swb, igm_filed, cha
) VALUES 
(
    '2025-04-10', 'DEF Logistics', 'LMN Traders', 'HBL67890', 'MBL54321', 
    'Mumbai', 'London', '20FT', '002', 'Ocean Freight Solutions', 'CMA CGM', 
    1350.75, 1600.90, '2025-04-15', '2025-04-30', 'No', 'Yes', 'Customs Broker B'
);

INSERT INTO booking (
    nomination_date, consignee_details, shipper_details, hbl_no, mbl_no, pol, pod, 
    container_size, job_number, agent_details, shipping_line, buy_rate, sell_rate, etd, eta, 
    swb, igm_filed, cha
) VALUES 
(
    '2025-05-05', 'XYZ Logistics', 'ABC Exporters', 'HBL98765', 'MBL67890', 
    'Chennai', 'New York', '40FT', '003', 'Global Freight Services', 'Maersk Line', 
    1800.50, 2100.75, '2025-05-10', '2025-05-25', 'Yes', 'No', 'Customs Broker C'
);



select*From booking