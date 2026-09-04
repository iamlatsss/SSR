import express from 'express';
import { knexDB, mapPartyToCustomer } from '../Database.js';
import { authenticateJWT } from "../AuthAPI/Auth.js";
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import { getBrowser } from '../utils/pdfGenerator.js';
import { uploadFile } from '../S3/S3Service.js';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

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

    if (n === 0) return 'Zero Dollor Only';

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

    str += 'Dollor';

    if (cents > 0) {
        str += ' And ' + numToWords(cents) + ' Cents';
    }

    return str + ' Only';
}

// 1. Initialize Route
router.get("/init", authenticateJWT, async (req, res) => {
    try {
        // Fetch MBL jobs and HBL jobs from MasterBL table
        const mblJobs = await knexDB("MasterBL")
            .leftJoin('Parties as S', 'MasterBL.shipper', 'S.id')
            .leftJoin('Parties as C', 'MasterBL.consignee', 'C.id')
            .select(
                "MasterBL.job_no",
                "MasterBL.mbl_no",
                "MasterBL.hbl_no",
                "MasterBL.date_of_nomination",
                "MasterBL.pol",
                "MasterBL.pod",
                "MasterBL.shipper",
                "MasterBL.consignee",
                knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
                knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name")
            );

        const hblJobs = await knexDB("MasterBL")
            .leftJoin('Parties as S', 'MasterBL.hbl_shipper', 'S.id')
            .leftJoin('Parties as C', 'MasterBL.hbl_consignee', 'C.id')
            .select(
                "MasterBL.job_no",
                "MasterBL.hbl_no",
                "MasterBL.mbl_no",
                "MasterBL.date_of_nomination",
                "MasterBL.pol",
                "MasterBL.pod",
                "MasterBL.hbl_shipper as shipper",
                "MasterBL.hbl_consignee as consignee",
                knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_shipper'))) as shipper_name"),
                knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_consignee'))) as consignee_name")
            )
            .whereNotNull("MasterBL.hbl_no")
            .andWhereNot("MasterBL.hbl_no", "");
        
        // Fetch Customers list
        const parties = await knexDB("Parties").select("*");
        const customers = parties.map(mapPartyToCustomer);
        
        res.json({
            success: true,
            mblJobs,
            hblJobs,
            customers
        });
    } catch (error) {
        console.error("Error inside Proforma init:", error);
        res.status(500).json({ success: false, message: "Database initialization error: " + error.message });
    }
});

// 2. Fetch specific job details polymorphically
router.get("/job-details/:jobNo", authenticateJWT, async (req, res) => {
    const jobNo = parseInt(req.params.jobNo);
    try {
        let job = await knexDB("MasterBL")
            .leftJoin('Parties as S', 'MasterBL.shipper', 'S.id')
            .leftJoin('Parties as C', 'MasterBL.consignee', 'C.id')
            .leftJoin('Parties as HS', 'MasterBL.hbl_shipper', 'HS.id')
            .leftJoin('Parties as HC', 'MasterBL.hbl_consignee', 'HC.id')
            .select(
                'MasterBL.*',
                knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
                knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name"),
                knexDB.raw("COALESCE(HS.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_shipper'))) as hbl_shipper_name"),
                knexDB.raw("COALESCE(HC.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_consignee'))) as hbl_consignee_name")
            )
            .where({ 'MasterBL.job_no': jobNo })
            .first();

        let relatedHBLs = [];
        let type = 'MBL';

        if (job && job.hbl_no) {
            relatedHBLs.push({
                id: job.job_no,
                job_no: job.job_no,
                hbl_no: job.hbl_no
            });
        }

        try {
            const hblDocs = await knexDB('HBLDocuments')
                .where({ job_no: jobNo })
                .select('id', 'job_no', 'bl_no');
            
            for (const doc of hblDocs) {
                if (doc.bl_no && !relatedHBLs.some(r => r.hbl_no === doc.bl_no)) {
                    relatedHBLs.push({
                        id: doc.id,
                        job_no: doc.job_no,
                        hbl_no: doc.bl_no
                    });
                }
            }
        } catch (hblErr) {
            console.error("Error fetching HBLDocuments for job:", hblErr);
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
        console.error("Error fetching job details:", error);
        res.status(500).json({ success: false, message: "Internal server error: " + error.message });
    }
});

// 3. Search Sell Rates
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
            record = await knexDB("MasterBL").where({ hbl_no: mbl_hbl_no }).first();
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

        let filteredSellRates = sellRates;

        res.json({
            success: true,
            sellRates: filteredSellRates,
            additionalDetails
        });
    } catch (error) {
        console.error("Error searching charges:", error);
        res.status(500).json({ success: false, message: "Failed to query sell rates: " + error.message });
    }
});

// Helper to get State Name and State Code from GSTIN or Address
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

// 4. Save and Generate PDF
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
        proformaDate,
        items,
        totals,
        exRate
    } = req.body;

    if (!jobNo || !mblHblNo || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: "Missing required proforma details" });
    }

    try {
        const proformaNoStr = String(jobNo);

        // Retrieve Linked Job details to fill metadata
        const jobRecord = await knexDB("MasterBL")
            .leftJoin('Parties as S', 'MasterBL.shipper', 'S.id')
            .leftJoin('Parties as C', 'MasterBL.consignee', 'C.id')
            .leftJoin('Parties as HS', 'MasterBL.hbl_shipper', 'HS.id')
            .leftJoin('Parties as HC', 'MasterBL.hbl_consignee', 'HC.id')
            .select(
                'MasterBL.*',
                knexDB.raw("COALESCE(S.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.shipper'))) as shipper_name"),
                knexDB.raw("COALESCE(C.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.consignee'))) as consignee_name"),
                knexDB.raw("COALESCE(HS.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_shipper'))) as hbl_shipper_name"),
                knexDB.raw("COALESCE(HC.name, JSON_UNQUOTE(JSON_EXTRACT(MasterBL.manual_party_details, '$.hbl_consignee'))) as hbl_consignee_name")
            )
            .where({ 'MasterBL.job_no': jobNo })
            .first();

        let addDetails = {};
        if (jobRecord && jobRecord.additional_details) {
            addDetails = typeof jobRecord.additional_details === 'string'
                ? JSON.parse(jobRecord.additional_details)
                : jobRecord.additional_details;
        }

        // Setup manual parties or actual client details
        let consigneeName = '';
        let shipperName = '';
        if (jobRecord) {
            if (mblHblType === 'MBL') {
                consigneeName = jobRecord.consignee_name || '';
                shipperName = jobRecord.shipper_name || '';
            } else {
                consigneeName = jobRecord.hbl_consignee_name || '';
                shipperName = jobRecord.hbl_shipper_name || '';
            }
        }

        const formatDate = (dateStr) => {
            if (!dateStr) return '—';
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                const parts = dateStr.slice(0, 10).split('-');
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return dateStr;
                const yyyy = d.getUTCFullYear();
                const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                const dd = String(d.getUTCDate()).padStart(2, '0');
                return `${dd}-${mm}-${yyyy}`;
            } catch (e) { return dateStr; }
        };

        // Determine place of supply and client state code
        const stateInfo = getStateByGstin(clientGstin, clientAddress);
        const isIntraState = stateInfo.code === '27';
        const effectiveExRate = parseFloat(exRate || 85.00);
        const targetCurrency = printType === 'USD' ? 'USD' : 'INR';

        const isUSDFx = printType === 'USD';
        const hasDr = items.some(item => String(item.drcr || item.doc_type || '').toUpperCase() === 'DR');
        const is_usd_fx_dr = isUSDFx || hasDr;

        let taxableTotalVal = 0;
        let nonTaxableTotalVal = 0;
        let gstTotalVal = 0;
        let grandTotalVal = 0;

        let cgstVal = 0;
        let sgstVal = 0;
        let cgstFreightVal = 0;
        let sgstFreightVal = 0;

        let igstVal = 0;
        let igstFreightVal = 0;

        // Map and compute items
        const chargesList = items.map((item) => {
            const qty = parseFloat(item.quantity || 1);
            const baseRate = parseFloat(item.rate || 0);
            const itemCurrency = item.currency || (isUSDFx ? 'USD' : 'INR');
            const rowExRate = parseFloat(item.ex_rate || (itemCurrency === 'USD' ? 1 : effectiveExRate));

            let amount = qty * baseRate;

            if (printType === 'USD') {
                if (itemCurrency === 'INR') {
                    amount = (qty * baseRate) / rowExRate;
                }
            } else {
                if (itemCurrency === 'USD') {
                    amount = qty * baseRate * rowExRate;
                }
            }

            // For USD Invoices, no GST is added
            const gstRate = isUSDFx ? 0 : parseFloat(item.gst || 0);
            const gstAmount = isUSDFx ? 0 : amount * (gstRate / 100);
            const totalAmount = amount + gstAmount;

            const isFreight = String(item.charge || '').toLowerCase().includes('freight') || gstRate === 5;

            const totAmtChargeCurr = qty * baseRate;
            const taxable = gstRate > 0 ? amount.toFixed(2) : "0.00";
            const nonTaxable = gstRate === 0 ? amount.toFixed(2) : "0.00";

            if (gstRate > 0) {
                taxableTotalVal += amount;
            } else {
                nonTaxableTotalVal += amount;
            }

            gstTotalVal += gstAmount;
            grandTotalVal += totalAmount;

            if (gstRate > 0) {
                if (isIntraState) {
                    if (isFreight) {
                        cgstFreightVal += gstAmount / 2;
                        sgstFreightVal += gstAmount / 2;
                    } else {
                        cgstVal += gstAmount / 2;
                        sgstVal += gstAmount / 2;
                    }
                } else {
                    if (isFreight) {
                        igstFreightVal += gstAmount;
                    } else {
                        igstVal += gstAmount;
                    }
                }
            }

            return {
                charge_name: item.charge || '—',
                hsn_sac: item.hsn_sac || item.sac || '',
                rate: baseRate.toFixed(2),
                currency: itemCurrency,
                qty: qty,
                ex_rate: itemCurrency === 'USD' ? '1' : String(rowExRate),
                tot_amt_charge_curr: totAmtChargeCurr.toFixed(2),
                taxable: taxable,
                non_taxable: nonTaxable,
                amount: amount.toFixed(2),
                gst_rate: gstRate.toFixed(1),
                gst_amount: gstAmount.toFixed(2),
                total_amount: totalAmount.toFixed(2),
                is_freight: isFreight,
                taxable_amount: amount,
                gst_rate_num: gstRate,
                gst_amount_num: gstAmount
            };
        });

        const formatNum = (val) => val > 0 ? val.toFixed(2) : '0.00';

        const roundedGrandTotal = Math.round(grandTotalVal);
        const amountInWords = printType === 'USD'
            ? numberToWordsUSD(grandTotalVal)
            : numberToWordsINR(roundedGrandTotal);

        const termsConditions = `1) Payment becomes due on presentation of Invoice / Debit Note and must be settled immediately.
2) Interest would be charged @ 24% p.a. on delayed payment.
3) In case of any objection / reservation in the billed Invoice / Debit Note, the same must be lodged within 5 days from the issue date and a written receipt taken from our Accounts Manager.
4) Payment to be made at Mumbai by A/c payee Cheque / NEFT / RTGS only and receipt for the same must be insisted.
5) Any dispute subject to Mumbai Jurisdiction only.`;

        let polVal = jobRecord?.pol || addDetails?.pol || '—';
        let podVal = jobRecord?.pod || addDetails?.pod || '—';
        let fpdVal = jobRecord?.final_pod || addDetails?.fpd || addDetails?.final_pod || '—';

        if (polVal === '—' || podVal === '—' || fpdVal === '—') {
            let linkedMblNo = jobRecord?.mbl_no || addDetails?.mbl_no;
            if (linkedMblNo) {
                const mblRec = await knexDB("MasterBL").where({ mbl_no: linkedMblNo }).first();
                if (mblRec) {
                    if (polVal === '—') polVal = mblRec.pol || '—';
                    if (podVal === '—') podVal = mblRec.pod || '—';
                    if (fpdVal === '—') fpdVal = mblRec.final_pod || '—';
                }
            }
        }

        let logoBase64 = "https://ssr.sirifreight.com/image/logo_Gh64uq2d8W82fDF5F8D7yeWNAgqTjc6h.jpeg";
        try {
            const logoPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'images', 'SSR_Logo.png');
            const logoBuf = await fs.readFile(logoPath);
            logoBase64 = `data:image/png;base64,${logoBuf.toString('base64')}`;
        } catch (err) {}

        let companyStamp = "";
        try {
            const stampPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'images', 'ssr_stamp_signature.png');
            const stampBuf = await fs.readFile(stampPath);
            companyStamp = `data:image/png;base64,${stampBuf.toString('base64')}`;
        } catch (err) {}

        // Context for Handlebars template rendering
        const contextData = {
            is_usd_fx_dr: is_usd_fx_dr,
            company_logo: logoBase64,
            company_name: "SSR LOGISTIC SOLUTIONS PVT. LTD.",
            company_address: "Office No. 612, 6th Floor, Vashi Infotech Park, Sector - 30 A, Near Raghuleela Mall, Vashi,<br>Navi Mumbai- 400703, India Tel.No : 7700990630,",
            website: "www.ssrlogistic.net",
            state: "Maharashtra",
            state_code: "277",
            company_gst: "27ABMCS1941A1ZI",
            company_pan: "ABMCS1941A",
            company_stamp: companyStamp,

            party_name: clientName || '—',
            party_address: clientAddress || '—',
            party_city_country: (!clientGstin || clientGstin === 'N/A' || clientGstin === 'URP') ? '' : '',
            party_gst: clientGstin || 'N/A',
            party_state_code: stateInfo.code,
            place_of_supply: stateInfo.name,

            proforma_no: proformaNoStr,
            proforma_date: formatDate(proformaDate || new Date()),
            ref_no: jobNo,
            job_no: jobNo,
            job_date: formatDate(jobRecord?.date_of_nomination || jobRecord?.created_at || proformaDate),
            reference: addDetails?.reference_no || addDetails?.enquiry_no || '',

            hbl_no: mblHblType === 'HBL' ? mblHblNo : (addDetails.hbl_no || '—'),
            hbl_date: formatDate(jobRecord?.hbl_date || addDetails.hbl_date),
            mbl_no: mblHblType === 'MBL' ? mblHblNo : (jobRecord?.mbl_no || '—'),
            mbl_date: formatDate(jobRecord?.mbl_date || addDetails.mbl_date),
            vessel_voy: `${jobRecord?.shipping_line_name || addDetails.vessel || '—'} / ${addDetails.voyage || '—'}`,
            pol: polVal,
            be_no: addDetails?.boe_no || addDetails?.be_no || '',
            fpd: fpdVal,
            igm_no: addDetails.igm_no || '—',
            line_no: addDetails.item_no || '—',
            line_date: formatDate(addDetails.igm_date || jobRecord?.created_at),
            sub_line_no: addDetails.sub_no || '—',
            etd_date: formatDate(jobRecord?.etd || addDetails.etd_date),
            shipping_line: addDetails.carrier || jobRecord?.shipping_line_name || addDetails.shipping_line || '—',
            container_type_count: `${jobRecord?.container_count || addDetails.inv_no_of_units || '1'} X ${jobRecord?.container_size || addDetails.inv_csize || '40HQ'} ,`,
            consignee: consigneeName || '—',
            shipper: shipperName || '—',
            cargo_type: jobRecord?.cargo_type || addDetails.shipment_type || 'General',
            shipper_line: addDetails.carrier || '—',
            cargo_weight: jobRecord?.gross_weight || addDetails.gross_weight || '—',
            cbm: jobRecord?.volume || addDetails.volume || '—',
            pod: podVal,
            no_of_pkgs: addDetails.no_of_packages || '—',
            eta_date: formatDate(jobRecord?.eta || addDetails.eta_date),
            shipper_ref_no: addDetails?.reference_no || '',
            ex_rate: effectiveExRate.toFixed(2),
            container_numbers: jobRecord?.container_number || (addDetails.containers && addDetails.containers.map(c => c.container_no || c.containerNo).join(', ')) || '—',

            charges: chargesList,

            taxable_total: taxableTotalVal.toFixed(2),
            non_taxable_total: nonTaxableTotalVal.toFixed(2),
            gst_total: gstTotalVal.toFixed(2),
            grand_total: printType === 'USD' ? (Number.isInteger(grandTotalVal) ? grandTotalVal.toString() : grandTotalVal.toFixed(2)) : roundedGrandTotal.toFixed(2),

            is_intra_state: isIntraState,
            cgst: formatNum(cgstVal),
            sgst: formatNum(sgstVal),
            cgst_freight: formatNum(cgstFreightVal),
            sgst_freight: formatNum(sgstFreightVal),

            igst: formatNum(igstVal),
            igst_freight: formatNum(igstFreightVal),

            amount_in_words: amountInWords,
            currency_label: targetCurrency,
            reverse_charge: 'No',
            terms_conditions: termsConditions,
            bank_name: 'KOTAK MAHINDRA BANK LTD',
            account_number: '1050002555',
            ifsc: 'KKBK0001370'
        };

        // Read Template HTML (use dedicated Debit Invoice template for USD / DR)
        const templateFileName = is_usd_fx_dr ? 'debit_invoice_pdf.html' : 'proforma_pdf.html';
        const templatePath = path.join(__dirname, '..', 'Mail', templateFileName);
        const templateSource = await fs.readFile(templatePath, 'utf-8');

        // Compile with Handlebars
        const template = handlebars.compile(templateSource);
        const html = template(contextData);

        // Render to PDF using Puppeteer
        const browser = await getBrowser();
        const page = await browser.newPage();
        let pdfBuffer;
        try {
            await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 5000 });
            pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '0.4in',
                    bottom: '0.4in',
                    left: '0.4in',
                    right: '0.4in'
                }
            });
        } finally {
            await page.close().catch(() => {});
        }

        // Upload PDF to S3
        const filename = `Proforma_${proformaNoStr}_${Date.now()}.pdf`;
        const uploadRes = await uploadFile({
            fileBuffer: pdfBuffer,
            key: filename,
            directory: 'proformas',
            contentType: 'application/pdf'
        });

        if (!uploadRes.success) {
            return res.status(500).json({ success: false, message: "Failed to upload generated Proforma Invoice PDF to S3" });
        }

        // S3 upload successful, return PDF URL to frontend directly without storing to DB or updating job status

        res.json({
            success: true,
            message: "Proforma invoice generated and saved successfully!",
            proformaNo: proformaNoStr,
            pdfUrl: uploadRes.url
        });

    } catch (error) {
        console.error("Error generating and saving Proforma invoice:", error);
        res.status(500).json({ success: false, message: "Failed to process proforma invoice: " + error.message });
    }
});

// 5. History Route
router.get("/history", authenticateJWT, async (req, res) => {
    try {
        const rows = await knexDB("ProformaInvoices").select('*').orderBy('created_at', 'desc');
        res.json({
            success: true,
            invoices: rows
        });
    } catch (error) {
        console.error("Error fetching proforma history:", error);
        res.status(500).json({ success: false, message: "Database query error: " + error.message });
    }
});

// Delete proforma invoice from database and reset job status
router.delete("/delete/:id", authenticateJWT, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const proforma = await knexDB("ProformaInvoices").where({ id }).first();
        if (!proforma) {
            return res.status(404).json({ success: false, message: "Proforma Invoice not found" });
        }

        const { job_no, mbl_hbl_type, mbl_hbl_no } = proforma;

        await knexDB.transaction(async (trx) => {
            // Delete proforma invoice
            await trx("ProformaInvoices").where({ id }).delete();

            // Reset job status to Sell Rate Updated
            if (mbl_hbl_type === 'MBL') {
                await trx("MasterBL").where({ job_no }).update({
                    status: 'Sell Rate Updated'
                });
            } else {
                await trx("MasterBL").where({ hbl_no: mbl_hbl_no }).update({
                    status: 'Sell Rate Updated'
                });
            }
        });

        res.json({ success: true, message: "Proforma Invoice deleted successfully" });
    } catch (error) {
        console.error("Error deleting proforma invoice:", error);
        res.status(500).json({ success: false, message: "Failed to delete proforma invoice: " + error.message });
    }
});

// Update Proforma Invoice details (e.g. delete a charge) and re-render PDF
router.put("/update/:id", authenticateJWT, async (req, res) => {
    const id = parseInt(req.params.id);
    const { items, totals, proformaDate } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: "Missing required details: items" });
    }

    try {
        const proforma = await knexDB("ProformaInvoices").where({ id }).first();
        if (!proforma) {
            return res.status(404).json({ success: false, message: "Proforma not found" });
        }

        // 1. Update database
        const updatedDate = proformaDate || proforma.proforma_date;
        await knexDB("ProformaInvoices").where({ id }).update({
            items: JSON.stringify(items),
            totals: JSON.stringify(totals),
            proforma_date: updatedDate
        });

        // 2. Fetch details for PDF re-rendering
        const { job_no, mbl_hbl_type, mbl_hbl_no, client_name, client_address, client_gstin, client_state, print_type } = proforma;
        let jobRecord = null;
        if (mbl_hbl_type === 'MBL') {
            jobRecord = await knexDB("MasterBL").where({ job_no }).first();
        } else {
            jobRecord = await knexDB("MasterBL").where({ hbl_no: mbl_hbl_no }).first();
        }

        let addDetails = {};
        if (jobRecord && jobRecord.additional_details) {
            addDetails = typeof jobRecord.additional_details === 'string'
                ? JSON.parse(jobRecord.additional_details)
                : jobRecord.additional_details;
        }

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
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                const parts = dateStr.slice(0, 10).split('-');
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return dateStr;
                const yyyy = d.getUTCFullYear();
                const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                const dd = String(d.getUTCDate()).padStart(2, '0');
                return `${dd}-${mm}-${yyyy}`;
            } catch (e) { return dateStr; }
        };

        const stateInfo = getStateByGstin(client_gstin, client_address);
        const isIntraState = stateInfo.code === '27';
        const firstItem = items[0] || {};
        const effectiveExRate = parseFloat(firstItem.ex_rate || firstItem.exRate || 85.00);
        const targetCurrency = print_type === 'USD' ? 'USD' : 'INR';

        const isUSDFx = print_type === 'USD';
        const hasDr = items.some(item => String(item.drcr || item.doc_type || '').toUpperCase() === 'DR');
        const is_usd_fx_dr = isUSDFx || hasDr;

        let taxableTotalVal = 0;
        let nonTaxableTotalVal = 0;
        let gstTotalVal = 0;
        let grandTotalVal = 0;

        let cgstVal = 0;
        let sgstVal = 0;
        let cgstFreightVal = 0;
        let sgstFreightVal = 0;
        let igstVal = 0;
        let igstFreightVal = 0;

        const chargesList = items.map((item) => {
            const qty = parseFloat(item.quantity || item.qty || 1);
            const baseRate = parseFloat(item.rate || 0);
            const itemCurrency = item.currency || (isUSDFx ? 'USD' : 'INR');
            const rowExRate = parseFloat(item.ex_rate || item.exRate || (itemCurrency === 'USD' ? 1 : effectiveExRate));

            let amount = qty * baseRate;

            if (print_type === 'USD') {
                if (itemCurrency === 'INR') {
                    amount = (qty * baseRate) / rowExRate;
                }
            } else {
                if (itemCurrency === 'USD') {
                    amount = qty * baseRate * rowExRate;
                }
            }

            // For USD Invoices, no GST is added
            const gstRate = isUSDFx ? 0 : parseFloat(item.gst || item.taxPercent || 0);
            const gstAmount = isUSDFx ? 0 : amount * (gstRate / 100);
            const totalAmount = amount + gstAmount;

            const isFreight = String(item.charge || item.chargeName || '').toLowerCase().includes('freight') || gstRate === 5;

            const totAmtChargeCurr = qty * baseRate;
            const taxable = gstRate > 0 ? amount.toFixed(2) : "0.00";
            const nonTaxable = gstRate === 0 ? amount.toFixed(2) : "0.00";

            if (gstRate > 0) {
                taxableTotalVal += amount;
            } else {
                nonTaxableTotalVal += amount;
            }

            gstTotalVal += gstAmount;
            grandTotalVal += totalAmount;

            if (gstRate > 0) {
                if (isIntraState) {
                    if (isFreight) {
                        cgstFreightVal += gstAmount / 2;
                        sgstFreightVal += gstAmount / 2;
                    } else {
                        cgstVal += gstAmount / 2;
                        sgstVal += gstAmount / 2;
                    }
                } else {
                    if (isFreight) {
                        igstFreightVal += gstAmount;
                    } else {
                        igstVal += gstAmount;
                    }
                }
            }

            return {
                charge_name: item.charge || item.chargeName || '—',
                hsn_sac: item.hsn_sac || item.sac || '',
                rate: baseRate.toFixed(2),
                currency: itemCurrency,
                qty: qty,
                ex_rate: itemCurrency === 'USD' ? '1' : String(rowExRate),
                tot_amt_charge_curr: totAmtChargeCurr.toFixed(2),
                taxable: taxable,
                non_taxable: nonTaxable,
                amount: amount.toFixed(2),
                gst_rate: gstRate.toFixed(1),
                gst_amount: gstAmount.toFixed(2),
                total_amount: totalAmount.toFixed(2),
                is_freight: isFreight,
                taxable_amount: amount,
                gst_rate_num: gstRate,
                gst_amount_num: gstAmount
            };
        });

        const formatNum = (val) => val > 0 ? val.toFixed(2) : '0.00';
        const roundedGrandTotal = Math.round(grandTotalVal);
        const amountInWords = print_type === 'USD'
            ? numberToWordsUSD(grandTotalVal)
            : numberToWordsINR(roundedGrandTotal);

        const termsConditions = `1) Payment becomes due on presentation of Invoice / Debit Note and must be settled immediately.
2) Interest would be charged @ 24% p.a. on delayed payment.
3) In case of any objection / reservation in the billed Invoice / Debit Note, the same must be lodged within 5 days from the issue date and a written receipt taken from our Accounts Manager.
4) Payment to be made at Mumbai by A/c payee Cheque / NEFT / RTGS only and receipt for the same must be insisted.
5) Any dispute subject to Mumbai Jurisdiction only.`;

        let polVal = jobRecord?.pol || addDetails?.pol || '—';
        let podVal = jobRecord?.pod || addDetails?.pod || '—';
        let fpdVal = jobRecord?.final_pod || addDetails?.fpd || addDetails?.final_pod || '—';

        if (polVal === '—' || podVal === '—' || fpdVal === '—') {
            let linkedMblNo = jobRecord?.mbl_no || addDetails?.mbl_no;
            if (linkedMblNo) {
                const mblRec = await knexDB("MasterBL").where({ mbl_no: linkedMblNo }).first();
                if (mblRec) {
                    if (polVal === '—') polVal = mblRec.pol || '—';
                    if (podVal === '—') podVal = mblRec.pod || '—';
                    if (fpdVal === '—') fpdVal = mblRec.final_pod || '—';
                }
            }
        }

        let logoBase64 = "https://ssr.sirifreight.com/image/logo_Gh64uq2d8W82fDF5F8D7yeWNAgqTjc6h.jpeg";
        try {
            const logoPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'images', 'SSR_Logo.png');
            const logoBuf = await fs.readFile(logoPath);
            logoBase64 = `data:image/png;base64,${logoBuf.toString('base64')}`;
        } catch (err) {}

        let companyStamp = "";
        try {
            const stampPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'images', 'ssr_stamp_signature.png');
            const stampBuf = await fs.readFile(stampPath);
            companyStamp = `data:image/png;base64,${stampBuf.toString('base64')}`;
        } catch (err) {}

        const contextData = {
            is_usd_fx_dr: is_usd_fx_dr,
            company_logo: logoBase64,
            company_name: "SSR LOGISTIC SOLUTIONS PVT. LTD.",
            company_address: "Office No. 612, 6th Floor, Vashi Infotech Park, Sector - 30 A, Near Raghuleela Mall, Vashi,<br>Navi Mumbai- 400703, India Tel.No : 7700990630,",
            website: "www.ssrlogistic.net",
            state: "Maharashtra",
            state_code: "277",
            company_gst: "27ABMCS1941A1ZI",
            company_pan: "ABMCS1941A",
            company_stamp: companyStamp,

            party_name: client_name || '—',
            party_address: client_address || '—',
            party_city_country: (!client_gstin || client_gstin === 'N/A' || client_gstin === 'URP') ? '' : '',
            party_gst: client_gstin || 'N/A',
            party_state_code: stateInfo.code,
            place_of_supply: stateInfo.name,

            proforma_no: proforma.proforma_no,
            proforma_date: formatDate(updatedDate),
            ref_no: job_no,
            job_no: job_no,
            job_date: formatDate(jobRecord?.date_of_nomination || jobRecord?.created_at || updatedDate),
            reference: addDetails?.reference_no || addDetails?.enquiry_no || '',

            hbl_no: mbl_hbl_type === 'HBL' ? mbl_hbl_no : (addDetails.hbl_no || '—'),
            hbl_date: formatDate(jobRecord?.hbl_date || addDetails.hbl_date),
            mbl_no: mbl_hbl_type === 'MBL' ? mbl_hbl_no : (jobRecord?.mbl_no || '—'),
            mbl_date: formatDate(jobRecord?.mbl_date || addDetails.mbl_date),
            vessel_voy: `${jobRecord?.shipping_line_name || addDetails.vessel || '—'} / ${addDetails.voyage || '—'}`,
            pol: polVal,
            be_no: addDetails?.boe_no || addDetails?.be_no || '',
            fpd: fpdVal,
            igm_no: addDetails.igm_no || '—',
            line_no: addDetails.item_no || '—',
            line_date: formatDate(addDetails.igm_date || jobRecord?.created_at),
            sub_line_no: addDetails.sub_no || '—',
            etd_date: formatDate(jobRecord?.etd || addDetails.etd_date),
            shipping_line: addDetails.carrier || jobRecord?.shipping_line_name || addDetails.shipping_line || '—',
            container_type_count: `${jobRecord?.container_count || addDetails.inv_no_of_units || '1'} X ${jobRecord?.container_size || addDetails.inv_csize || '40HQ'} ,`,
            consignee: consigneeName || '—',
            shipper: shipperName || '—',
            cargo_type: jobRecord?.cargo_type || addDetails.shipment_type || 'General',
            shipper_line: addDetails.carrier || '—',
            cargo_weight: jobRecord?.gross_weight || addDetails.gross_weight || '—',
            cbm: jobRecord?.volume || addDetails.volume || '—',
            pod: podVal,
            no_of_pkgs: addDetails.no_of_packages || '—',
            eta_date: formatDate(jobRecord?.eta || addDetails.eta_date),
            shipper_ref_no: addDetails?.reference_no || '',
            ex_rate: effectiveExRate.toFixed(2),
            container_numbers: jobRecord?.container_number || (addDetails.containers && addDetails.containers.map(c => c.container_no || c.containerNo).join(', ')) || '—',

            charges: chargesList,

            taxable_total: taxableTotalVal.toFixed(2),
            non_taxable_total: nonTaxableTotalVal.toFixed(2),
            gst_total: gstTotalVal.toFixed(2),
            grand_total: print_type === 'USD' ? (Number.isInteger(grandTotalVal) ? grandTotalVal.toString() : grandTotalVal.toFixed(2)) : roundedGrandTotal.toFixed(2),

            is_intra_state: isIntraState,
            cgst: formatNum(cgstVal),
            sgst: formatNum(sgstVal),
            cgst_freight: formatNum(cgstFreightVal),
            sgst_freight: formatNum(sgstFreightVal),

            igst: formatNum(igstVal),
            igst_freight: formatNum(igstFreightVal),

            amount_in_words: amountInWords,
            currency_label: targetCurrency,
            reverse_charge: 'No',
            terms_conditions: termsConditions,
            bank_name: 'KOTAK MAHINDRA BANK LTD',
            account_number: '1050002555',
            ifsc: 'KKBK0001370'
        };

        const templateFileName = is_usd_fx_dr ? 'debit_invoice_pdf.html' : 'proforma_pdf.html';
        const templatePath = path.join(__dirname, '..', 'Mail', templateFileName);
        const templateSource = await fs.readFile(templatePath, 'utf-8');
        const template = handlebars.compile(templateSource);
        const html = template(contextData);

        const browser = await getBrowser();
        const page = await browser.newPage();
        let pdfBuffer;
        try {
            await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 5000 });
            pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' }
            });
        } finally {
            await page.close().catch(() => {});
        }

        let filename = `Proforma_${proforma.proforma_no}_${Date.now()}.pdf`;
        if (proforma.pdf_link) {
            try {
                const urlObj = new URL(proforma.pdf_link);
                const pathParts = urlObj.pathname.split('/');
                filename = pathParts[pathParts.length - 1];
            } catch(e){}
        }

        const uploadRes = await uploadFile({
            fileBuffer: pdfBuffer,
            key: filename,
            directory: 'proformas',
            contentType: 'application/pdf'
        });

        if (!uploadRes.success) {
            return res.status(500).json({ success: false, message: "Failed to upload updated Proforma Invoice PDF to S3" });
        }

        await knexDB("ProformaInvoices").where({ id }).update({ pdf_link: uploadRes.url });

        res.json({
            success: true,
            message: "Proforma invoice updated and PDF re-generated successfully!",
            pdfUrl: uploadRes.url
        });
    } catch (error) {
        console.error("Error updating Proforma invoice:", error);
        res.status(500).json({ success: false, message: "Failed to update proforma invoice: " + error.message });
    }
});

export default router;
