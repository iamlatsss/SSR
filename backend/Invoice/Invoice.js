import express from 'express';
import { knexDB } from '../Database.js';
import { authenticateJWT } from "../AuthAPI/Auth.js";
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import { uploadFile } from '../S3/S3Service.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

export const CHARGES = [
    { "name": "AIR IMP. FREIGHT CHARGES", "gst": false },
    { "name": "BL CHARGES", "gst": false },
    { "name": "BL MANIFEST CHARGES -GST 18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "BOND FORMALITIES CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "CFS CHARGES GST -18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "CFS CHARGES IGST -18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "CLEARANCE CHARGES IGST -18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "CONSOLIDATION CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "CONSOLIDATION CHARGES IGST-18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "CONT. IMBALANCING CHARGES IGST 18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "CONT. SEAL & MANDATORY USAGE CHARGES", "gst": false },
    { "name": "CONT. SEAL CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "Cargo Handling Charges-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "DETENTION CHARGES IGST 18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "DETENTION CHARGES-GST 18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "DO CHARGES GST -18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "DO CHARGES IGST -18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "DO EXTENSION", "gst": false },
    { "name": "DO REVALIDATION", "gst": false },
    { "name": "DOCK DESTUFFING CHARGES-IGST18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "DOCUMENTATION CHARGES", "gst": false },
    { "name": "DPD REGISTRATION CHARGES- GST 18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "EX-WORK CHARGES GST -18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "EXAMINATION CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "EXP. AFS CHARGES- GST 18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "EXP. EMERGENCY SURCHARGES- GST18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "EXP. ENS CHARGES- GST 18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "EXP. FAF CHARGES- GST 18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "EXP. GRI CHARGES- GST 18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "EXP. PCS CHARGES- GST 18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "EXPORT CONST. FACILITATION & ADMIN CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "FCA CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "HAULAGE CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "HAULAGE CHARGES IGST-18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "HAZ CHARGES", "gst": false },
    { "name": "IGM CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "IGM CHARGES IGST-18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "IGST SALE 18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "IGST SALE 5%", "gst": false, "igst": true, "percentage": 5 },
    { "name": "INSURANCE CHARGES GST -18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "OCEAN FREIGHT CHARGES GST -5%", "gst": true, "igst": false, "percentage": 5 },
    { "name": "OCEAN FREIGHT CHARGES IGST -5%", "gst": false, "igst": true, "percentage": 5 },
    { "name": "OFF DOCK CHARGES IGST-18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "ON CARRIAGE CHARGES", "gst": false },
    { "name": "OPEN TOP HANDLING CHARGES GST-5%", "gst": true, "igst": false, "percentage": 5 },
    { "name": "Ocean Freight", "gst": false },
    { "name": "PACKING CHARGES- GST 18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "PORT CONGESTION CHARGE GST 18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "PORT STORAGE GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "RTO CHARGES", "gst": false },
    { "name": "SALE 18 % GST", "gst": true, "igst": false, "percentage": 18 },
    { "name": "SALE 5% GST", "gst": true, "igst": false, "percentage": 5 },
    { "name": "SCANNING CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "SCANNING CHARGES IGST-18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "SHIPPING LINE CHARGES GST -18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "SHIPPING LINE CHARGES IGST -18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "STAMP DUTY -0%", "gst": false },
    { "name": "SURRENDER BL CHARGES -GST18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "TERMINAL HANDLING CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "TERMINAL HANDLING CHARGES IGST", "gst": false, "igst": true, "percentage": 18 },
    { "name": "THC GST -18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "THC IGST-18%", "gst": false, "igst": true, "percentage": 18 },
    { "name": "TOLL CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "VESSEL CERTIFICATE CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "VGM CHARGES GST-18%", "gst": true, "igst": false, "percentage": 18 },
    { "name": "WEIGHTMENT CHARGES IGST-18%", "gst": false, "igst": true, "percentage": 18 }
];

// Helper to convert numbers to Indian Rupee Words
function numberToWordsINR(num) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function numToWords(n) {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit !== 0 ? ' ' + a[digit] : '');
    }

    let n = Math.floor(num);
    const paise = Math.round((num - n) * 100);
    let str = '';

    if (n === 0) return 'Zero Rupees';

    const crores = Math.floor(n / 10000000);
    n %= 10000000;
    if (crores > 0) {
        str += numToWords(crores) + ' Crore ';
    }

    const lakhs = Math.floor(n / 100000);
    n %= 100000;
    if (lakhs > 0) {
        str += numToWords(lakhs) + ' Lakh ';
    }

    const thousands = Math.floor(n / 1000);
    n %= 1000;
    if (thousands > 0) {
        str += numToWords(thousands) + ' Thousand ';
    }

    const hundreds = Math.floor(n / 100);
    n %= 100;
    if (hundreds > 0) {
        str += numToWords(hundreds) + ' Hundred ';
    }

    if (n > 0) {
        if (str !== '') str += 'And ';
        str += numToWords(n) + ' ';
    }

    str += 'Rupees';

    if (paise > 0) {
        str += ' And ' + numToWords(paise) + ' Paise';
    }

    return str + ' Only';
}

// Helper to convert numbers to USD Words
function numberToWordsUSD(num) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function numToWords(n) {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit !== 0 ? ' ' + a[digit] : '');
    }

    let n = Math.floor(num);
    const cents = Math.round((num - n) * 100);
    let str = '';

    if (n === 0) return 'Zero US Dollars';

    const millions = Math.floor(n / 1000000);
    n %= 1000000;
    if (millions > 0) {
        str += numToWords(millions) + ' Million ';
    }

    const thousands = Math.floor(n / 1000);
    n %= 1000;
    if (thousands > 0) {
        str += numToWords(thousands) + ' Thousand ';
    }

    const hundreds = Math.floor(n / 100);
    n %= 100;
    if (hundreds > 0) {
        str += numToWords(hundreds) + ' Hundred ';
    }

    if (n > 0) {
        if (str !== '') str += 'And ';
        str += numToWords(n) + ' ';
    }

    str += 'US Dollars';

    if (cents > 0) {
        str += ' And ' + numToWords(cents) + ' Cents';
    }

    return str + ' Only';
}

const getStateByGstin = (gstin, clientAddress = '') => {
    const code = gstin ? String(gstin).substring(0, 2) : '';
    const stateMap = {
        '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
        '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
        '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
        '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
        '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
        '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
        '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka',
        '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
        '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana',
        '37': 'Andhra Pradesh', '38': 'Ladakh'
    };
    if (stateMap[code]) {
        return { name: stateMap[code], code };
    }
    const addrLower = String(clientAddress).toLowerCase();
    for (const [c, name] of Object.entries(stateMap)) {
        if (addrLower.includes(name.toLowerCase())) {
            return { name, code: c };
        }
    }
    return { name: 'Maharashtra', code: '27' };
};

// 1. Get all charge master heads
router.get("/charges", (req, res) => {
    res.json({ success: true, charges: CHARGES });
});

// 2. Initialize Route for billing context selection
router.get("/init", authenticateJWT, async (req, res) => {
    try {
        const mblJobs = await knexDB("MasterBL").select("job_no", "mbl_no", "date_of_nomination", "pol", "pod", "shipper", "consignee");
        const hblJobs = await knexDB("HouseBL").select("job_no", "hbl_no", "mbl_no", "date_of_nomination", "shipper", "consignee");
        const customers = await knexDB("Customers").select("customer_id", "name", "address", "gstin", "customer_type");
        
        res.json({
            success: true,
            mblJobs,
            hblJobs,
            customers
        });
    } catch (error) {
        console.error("Error inside Tax Invoice init:", error);
        res.status(500).json({ success: false, message: "Database initialization error: " + error.message });
    }
});

// 3. Fetch specific job details polymorphically
router.get("/job-details/:jobNo", authenticateJWT, async (req, res) => {
    const jobNo = parseInt(req.params.jobNo);
    try {
        let job = await knexDB("MasterBL").where({ job_no: jobNo }).first();
        let relatedHBLs = [];
        let type = 'MBL';

        if (job) {
            relatedHBLs = await knexDB("HouseBL").where({ mbl_no: job.mbl_no }).select("id", "job_no", "hbl_no");
        } else {
            job = await knexDB("HouseBL").where({ job_no: jobNo }).first();
            type = 'HBL';
        }

        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        res.json({
            success: true,
            type,
            job,
            relatedHBLs
        });
    } catch (error) {
        console.error("Error fetching job details for Tax Invoice:", error);
        res.status(500).json({ success: false, message: "Internal server error: " + error.message });
    }
});

// 4. Search Sell Rates inside Selected MBL / HBL
router.get("/search-charges", authenticateJWT, async (req, res) => {
    const { job_no, mbl_hbl_type, mbl_hbl_no } = req.query;

    if (!job_no || !mbl_hbl_type || !mbl_hbl_no) {
        return res.status(400).json({ success: false, message: "Missing required search parameters" });
    }

    try {
        let record = null;
        if (mbl_hbl_type === 'MBL') {
            record = await knexDB("MasterBL").where({ mbl_no: mbl_hbl_no }).first();
        } else {
            record = await knexDB("HouseBL").where({ hbl_no: mbl_hbl_no }).first();
        }

        if (!record) {
            return res.status(404).json({ success: false, message: "BL record not found" });
        }

        let additionalDetails = {};
        if (record.additional_details) {
            additionalDetails = typeof record.additional_details === 'string'
                ? JSON.parse(record.additional_details)
                : record.additional_details;
        }

        const sellRates = additionalDetails.sell_rates || [];
        res.json({
            success: true,
            sellRates,
            additionalDetails
        });
    } catch (error) {
        console.error("Error searching charges for Tax Invoice:", error);
        res.status(500).json({ success: false, message: "Failed to query sell rates: " + error.message });
    }
});

// 5. Save Tax Invoice and Lock Sell Rates & Render PDF
router.post("/save", authenticateJWT, async (req, res) => {
    const {
        jobNo,
        mblHblType,
        mblHblNo,
        clientId,
        clientName,
        clientAddress,
        clientGstin,
        clientState,
        printType, // 'Invoice' or 'USD'
        invoiceDate,
        items,
        totals,
        exRate
    } = req.body;

    if (!jobNo || !mblHblNo || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: "Missing required invoice details" });
    }

    try {
        // Query maximum sequential number from existing invoices
        const existingInvoices = await knexDB("Invoices").select("invoice_no");
        let nextSeq = 1;
        existingInvoices.forEach(inv => {
            if (inv.invoice_no) {
                const parts = String(inv.invoice_no).split('/');
                const lastPart = parts[parts.length - 1];
                const seq = parseInt(lastPart, 10);
                if (!isNaN(seq) && seq >= nextSeq) {
                    nextSeq = seq + 1;
                }
            }
        });
        const invoiceNoStr = `SSR/INV/26-27/${String(nextSeq).padStart(4, '0')}`;

        const payload = {
            invoice_no: invoiceNoStr,
            job_no: jobNo,
            mbl_hbl_type: mblHblType,
            mbl_hbl_no: mblHblNo,
            client_id: clientId || null,
            client_name: clientName || '',
            client_address: clientAddress || '',
            client_gstin: clientGstin || '',
            client_state: clientState || '',
            print_type: printType || 'Invoice',
            invoice_date: invoiceDate || new Date().toISOString().split('T')[0],
            items: JSON.stringify(items),
            totals: JSON.stringify(totals),
            pdf_link: null
        };

        await knexDB("Invoices").insert(payload);

        // Retrieve Job details to fill PDF template metadata
        let jobRecord = null;
        if (mblHblType === 'MBL') {
            jobRecord = await knexDB("MasterBL").where({ job_no: jobNo }).first();
        } else {
            jobRecord = await knexDB("HouseBL").where({ hbl_no: mblHblNo }).first();
        }

        let addDetails = {};
        if (jobRecord && jobRecord.additional_details) {
            addDetails = typeof jobRecord.additional_details === 'string'
                ? JSON.parse(jobRecord.additional_details)
                : jobRecord.additional_details;
        }

        // Lock ALL sell rates inside this BL's additional_details JSON
        const sellRates = addDetails.sell_rates || [];
        const lockedSellRates = sellRates.map(r => ({
            ...r,
            locked: true
        }));

        addDetails.sell_rates = lockedSellRates;

        // Write locked rates and invoice details back to the Master/House BL table
        if (mblHblType === 'MBL') {
            await knexDB("MasterBL").where({ job_no: jobNo }).update({
                additional_details: JSON.stringify(addDetails),
                status: 'Invoice Finalized',
                invoice_no: invoiceNoStr,
                invoice_date: invoiceDate || new Date().toISOString().split('T')[0]
            });
        } else {
            await knexDB("HouseBL").where({ hbl_no: mblHblNo }).update({
                additional_details: JSON.stringify(addDetails),
                status: 'Invoice Finalized',
                invoice_no: invoiceNoStr,
                invoice_date: invoiceDate || new Date().toISOString().split('T')[0]
            });
        }

        // Setup manual parties if present
        let consigneeName = '';
        let shipperName = '';
        if (jobRecord) {
            consigneeName = jobRecord.consignee_name || '';
            shipperName = jobRecord.shipper_name || '';
            if (!consigneeName && jobRecord.manual_party_details) {
                try {
                    const mp = typeof jobRecord.manual_party_details === 'string'
                        ? JSON.parse(jobRecord.manual_party_details)
                        : jobRecord.manual_party_details;
                    consigneeName = mp.consignee || '';
                    shipperName = mp.shipper || '';
                } catch(e){}
            }
        }

        const formatDate = (dateStr) => {
            if (!dateStr) return '—';
            try {
                const d = new Date(dateStr);
                return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
            } catch (e) { return dateStr; }
        };

        const stateInfo = getStateByGstin(clientGstin, clientAddress);
        const isIntraState = stateInfo.code === '27';
        const effectiveExRate = parseFloat(exRate || 85.00);
        const targetCurrency = printType === 'USD' ? 'USD' : 'INR';

        // Process line items for the HTML/Puppeteer rendering payload
        const chargesList = items.map((item) => {
            const qty = parseFloat(item.quantity || 1);
            const baseRate = parseFloat(item.rate || 0);
            const itemCurrency = item.currency || 'USD';
            const rowExRate = parseFloat(item.ex_rate || effectiveExRate);

            let amount = qty * baseRate;
            let targetRate = baseRate;

            if (printType === 'USD') {
                if (itemCurrency === 'INR') {
                    amount = (qty * baseRate) / rowExRate;
                    targetRate = baseRate / rowExRate;
                }
            } else {
                if (itemCurrency === 'USD') {
                    amount = qty * baseRate * rowExRate;
                    targetRate = baseRate * rowExRate;
                }
            }

            const gstRate = parseFloat(item.gst || 0);
            const gstAmount = amount * (gstRate / 100);
            const totalAmount = amount + gstAmount;

            return {
                chargeName: item.charge || '—',
                hsnSac: item.hsn_sac || '996521',
                ratePerUnit: targetRate.toFixed(2),
                curr: targetCurrency,
                quantity: qty.toFixed(2),
                amount: amount.toFixed(2),
                gstRate: gstRate > 0 ? gstRate.toFixed(0) : '0',
                gstAmount: gstAmount.toFixed(2),
                totalAmount: totalAmount.toFixed(2),
                isFreight: String(item.charge || '').toLowerCase().includes('freight') || gstRate === 5,
                taxableAmtNum: amount,
                gstAmtNum: gstAmount
            };
        });

        // Compute GST Totals breakdown
        let taxableTotalVal = 0;
        let gstTotalVal = 0;
        let grandTotalVal = 0;

        let cgst9Val = 0;
        let cgstFreight25Val = 0;
        let sgst9Val = 0;
        let sgstFreight25Val = 0;

        let igst18Val = 0;
        let igstFreight5Val = 0;

        chargesList.forEach((c) => {
            taxableTotalVal += c.taxableAmtNum;
            gstTotalVal += c.gstAmtNum;
            grandTotalVal += c.taxableAmtNum + c.gstAmtNum;

            if (c.gstAmtNum > 0) {
                if (isIntraState) {
                    if (c.isFreight) {
                        cgstFreight25Val += c.gstAmtNum / 2;
                        sgstFreight25Val += c.gstAmtNum / 2;
                    } else {
                        cgst9Val += c.gstAmtNum / 2;
                        sgst9Val += c.gstAmtNum / 2;
                    }
                } else {
                    if (c.isFreight) {
                        igstFreight5Val += c.gstAmtNum;
                    } else {
                        igst18Val += c.gstAmtNum;
                    }
                }
            }
        });

        const inrGrandTotal = printType === 'USD' ? grandTotalVal * effectiveExRate : grandTotalVal;
        const roundedINRGrandTotal = Math.round(inrGrandTotal);

        const amountInWordsStr = printType === 'USD'
            ? `USD - ${numberToWordsUSD(grandTotalVal)}`
            : `INR - ${numberToWordsINR(roundedINRGrandTotal)}`;

        // Build Payload matching tax_invoice.html expectations
        const fillPayload = {
            partyName: clientName || '—',
            partyAddress: clientAddress || '—',
            partyGstNo: clientGstin || 'N/A',
            partyStateCode: stateInfo.code,
            placeOfSupply: stateInfo.name,
            invoiceNo: invoiceNoStr,
            invoiceDate: formatDate(invoiceDate || new Date()),
            refNo: addDetails.reference_no || '—',
            irn: addDetails.irn || '',
            narration: addDetails.narration || 'NIL',
            consignee: consigneeName || '—',
            shipperName: shipperName || '—',
            shippingLine: jobRecord?.shipping_line_name || addDetails.carrier || '—',
            cargoType: jobRecord?.cargo_type || addDetails.shipment_type || 'General',
            cargoWeight: jobRecord?.gross_weight || addDetails.gross_weight || '—',
            cbm: jobRecord?.net_weight || addDetails.volume || '—',
            pod: jobRecord?.pod || '—',
            noOfPkgs: addDetails.no_of_packages || '—',
            etaDate: formatDate(jobRecord?.eta || addDetails.eta_date),
            exRate: effectiveExRate.toFixed(2),
            hblNo: mblHblType === 'HBL' ? mblHblNo : (addDetails.hbl_no || '—'),
            hblDate: formatDate(jobRecord?.hbl_date || jobRecord?.created_at || addDetails.hbl_date),
            mblNo: mblHblType === 'MBL' ? mblHblNo : (jobRecord?.mbl_no || '—'),
            mblDate: formatDate(jobRecord?.mbl_date || jobRecord?.created_at || addDetails.mbl_date),
            vesselVoy: `${jobRecord?.vessel || addDetails.vessel || '—'} / ${addDetails.voyage || '—'}`,
            pol: jobRecord?.pol || '—',
            fpd: jobRecord?.final_pod || addDetails.fpd || '—',
            igmNo: addDetails.igm_no || '—',
            igmDate: formatDate(addDetails.igm_date || jobRecord?.created_at),
            lineNo: addDetails.item_no || '—',
            subLineNo: addDetails.sub_no || '—',
            etdDate: formatDate(jobRecord?.etd || addDetails.etd_date),
            cntrsType: `${jobRecord?.container_count || addDetails.inv_no_of_units || '1'} X ${jobRecord?.container_size || addDetails.inv_csize || '40HQ'}`,
            containerNo: jobRecord?.container_number || (addDetails.containers && addDetails.containers.map(c => c.containerNo).join(', ')) || '—',
            
            lineItems: chargesList,
            totals: {
                amount: taxableTotalVal.toFixed(2),
                gstAmount: gstTotalVal.toFixed(2),
                cgst9: cgst9Val.toFixed(2),
                cgstFreight25: cgstFreight25Val.toFixed(2),
                sgst9: sgst9Val.toFixed(2),
                sgstFreight25: sgstFreight25Val.toFixed(2),
                igst18: igst18Val.toFixed(2),
                igstFreight5: igstFreight5Val.toFixed(2),
                roundOff: (roundedINRGrandTotal - inrGrandTotal).toFixed(2),
                inrTotal: targetCurrency === 'USD' ? grandTotalVal.toFixed(2) : roundedINRGrandTotal.toFixed(2)
            },
            amountInWords: amountInWordsStr,
            reverseCharge: 'No'
        };

        // Render PDF locally on backend using headless Puppeteer & public template file
        const templatePath = path.join(__dirname, '..', '..', 'frontend', 'public', 'pdf-static', 'tax_invoice.html');
        let htmlContent = "";
        try {
            htmlContent = await fs.readFile(templatePath, 'utf-8');
        } catch (readErr) {
            // Fallback for different build structures if any
            const altTemplatePath = path.join(__dirname, '..', 'static', 'tax_invoice.html');
            htmlContent = await fs.readFile(altTemplatePath, 'utf-8');
        }

        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Load html and append embed=1 query to clean screen style
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        // Evaluate the fillDocument javascript directly in Puppeteer page context
        await page.evaluate((data) => {
            window.fillDocument(data);
            // Hide preview top bar
            var bar = document.querySelector(".no-print");
            if (bar) bar.style.display = "none";
            document.body.classList.remove("screen");
        }, fillPayload);

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '6mm',
                bottom: '6mm',
                left: '6mm',
                right: '6mm'
            }
        });
        await browser.close();

        // Upload generated PDF buffer to S3
        const filename = `TaxInvoice_${nextSeq}_${Date.now()}.pdf`;
        const uploadRes = await uploadFile({
            fileBuffer: pdfBuffer,
            key: filename,
            directory: 'invoices',
            contentType: 'application/pdf'
        });

        if (!uploadRes.success) {
            return res.status(500).json({ success: false, message: "Failed to upload generated Tax Invoice PDF to S3" });
        }

        // Store S3 PDF link in database matching PRIMARY KEY
        await knexDB("Invoices").where({ invoice_no: invoiceNoStr }).update({ pdf_link: uploadRes.url });

        res.json({
            success: true,
            message: "Tax invoice generated, saved, and sell rates locked successfully!",
            invoiceNo: invoiceNoStr,
            pdfUrl: uploadRes.url
        });

    } catch (error) {
        console.error("Error generating and saving Tax invoice:", error);
        res.status(500).json({ success: false, message: "Failed to process tax invoice: " + error.message });
    }
});

// 6. History Route
router.get("/history", authenticateJWT, async (req, res) => {
    try {
        const rows = await knexDB("Invoices").select('*').orderBy('created_at', 'desc');
        res.json({
            success: true,
            invoices: rows
        });
    } catch (error) {
        console.error("Error fetching tax invoice history:", error);
        res.status(500).json({ success: false, message: "Database query error: " + error.message });
    }
});

// Backward compatible endpoint for simple load
router.get("/job/:jobNo", async (req, res) => {
    try {
        const rows = await knexDB("Invoices").where({ job_no: req.params.jobNo }).first();
        if (rows) {
            return res.json({ success: true, invoice: rows });
        }
        res.json({ success: false, message: "No invoice found" });
    } catch (error) {
        console.error("Error fetching invoice:", error);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

export default router;
