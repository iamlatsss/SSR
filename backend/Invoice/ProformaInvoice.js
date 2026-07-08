import express from 'express';
import { knexDB, mapPartyToCustomer } from '../Database.js';
import { authenticateJWT } from "../AuthAPI/Auth.js";
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
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

// 1. Initialize Route
router.get("/init", authenticateJWT, async (req, res) => {
    try {
        // Fetch MBL jobs and HBL jobs
        const mblJobs = await knexDB("MasterBL").select("job_no", "mbl_no", "date_of_nomination", "pol", "pod", "shipper", "consignee");
        const hblJobs = await knexDB("HouseBL").select("job_no", "hbl_no", "mbl_no", "date_of_nomination", "shipper", "consignee");
        
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

        // Check if there is an existing Tax Invoice for this job/BL
        const existingInvoice = await knexDB("Invoices")
            .where({ job_no: parseInt(job_no) })
            .first();

        let filteredSellRates = sellRates;
        if (existingInvoice) {
            let invoiceItems = [];
            try {
                invoiceItems = typeof existingInvoice.items === 'string'
                    ? JSON.parse(existingInvoice.items)
                    : (existingInvoice.items || []);
            } catch (e) {
                invoiceItems = [];
            }

            const pool = [...invoiceItems];
            filteredSellRates = sellRates.filter(r => {
                // If it is not locked, it is a new charge. Always keep it!
                if (!r.locked) {
                    return true;
                }

                // If it is locked, it must be present in the Tax Invoice items pool to be visible
                const matchIndex = pool.findIndex(item => {
                    const chargeNameMatch = (r.charge || r.chargeName || '').toLowerCase().trim() === 
                                            (item.charge || item.chargeName || '').toLowerCase().trim();
                    const partyMatch = String(r.party || r.clientId || r.clientName || '').trim() === 
                                       String(item.party || item.clientId || item.clientName || '').trim();
                    const rateMatch = Math.abs(parseFloat(r.rate || 0) - parseFloat(item.rate || 0)) < 0.01;
                    const qtyMatch = Math.abs(parseFloat(r.quantity || r.qty || 0) - parseFloat(item.quantity || item.qty || 0)) < 0.01;
                    const currencyMatch = (r.currency || '').toLowerCase().trim() === 
                                          (item.currency || '').toLowerCase().trim();
                    const gstMatch = Math.abs(parseFloat(r.gst || r.taxPercent || 0) - parseFloat(item.gst || item.taxPercent || 0)) < 0.01;

                    return chargeNameMatch && partyMatch && rateMatch && qtyMatch && currencyMatch && gstMatch;
                });

                if (matchIndex !== -1) {
                    pool.splice(matchIndex, 1);
                    return true;
                }
                return false;
            });
        }

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
        // Prevent duplicate/overwrite issues by deleting existing proforma invoice for this job/MBL/HBL
        const existingProforma = await knexDB("ProformaInvoices")
            .where({ job_no: jobNo, mbl_hbl_type: mblHblType, mbl_hbl_no: mblHblNo })
            .first();

        if (existingProforma) {
            await knexDB("ProformaInvoices").where({ id: existingProforma.id }).delete();
        }

        const proformaNoStr = String(jobNo);

        // Insert record into DB
        const payload = {
            proforma_no: proformaNoStr,
            job_no: jobNo,
            mbl_hbl_type: mblHblType,
            mbl_hbl_no: mblHblNo,
            client_id: clientId || null,
            client_name: clientName || '',
            client_address: clientAddress || '',
            client_gstin: clientGstin || '',
            client_state: clientState || '',
            print_type: printType || 'Invoice',
            proforma_date: proformaDate || new Date().toISOString().split('T')[0],
            items: JSON.stringify(items),
            totals: JSON.stringify(totals),
            pdf_link: null
        };

        const [insertedId] = await knexDB("ProformaInvoices").insert(payload);

        // Retrieve Linked Job details to fill metadata
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

        // Setup manual parties or actual client details
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

        // Determine place of supply and client state code
        const stateInfo = getStateByGstin(clientGstin, clientAddress);
        const isIntraState = stateInfo.code === '27';
        const effectiveExRate = parseFloat(exRate || 85.00);
        const targetCurrency = printType === 'USD' ? 'USD' : 'INR';

        // Map and compute items
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

            // Classify as freight if the name contains 'freight' or the gst rate is 5%
            const isFreight = String(item.charge || '').toLowerCase().includes('freight') || gstRate === 5;

            return {
                charge_name: item.charge || '—',
                hsn_sac: item.hsn_sac || item.sac || '996521',
                rate: targetRate.toFixed(2),
                currency: targetCurrency,
                qty: qty,
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

        // Compute GST breakdown
        let taxableTotalVal = 0;
        let gstTotalVal = 0;
        let grandTotalVal = 0;

        let cgstVal = 0;
        let sgstVal = 0;
        let cgstFreightVal = 0;
        let sgstFreightVal = 0;

        let igstVal = 0;
        let igstFreightVal = 0;

        chargesList.forEach((c) => {
            taxableTotalVal += c.taxable_amount;
            gstTotalVal += c.gst_amount_num;
            grandTotalVal += c.taxable_amount + c.gst_amount_num;

            if (c.gst_rate_num > 0) {
                if (isIntraState) {
                    if (c.is_freight) {
                        cgstFreightVal += c.gst_amount_num / 2;
                        sgstFreightVal += c.gst_amount_num / 2;
                    } else {
                        cgstVal += c.gst_amount_num / 2;
                        sgstVal += c.gst_amount_num / 2;
                    }
                } else {
                    if (c.is_freight) {
                        igstFreightVal += c.gst_amount_num;
                    } else {
                        igstVal += c.gst_amount_num;
                    }
                }
            }
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

        // Context for Handlebars template rendering
        const contextData = {
            company_logo: "https://ssr.sirifreight.com/image/logo_Gh64uq2d8W82fDF5F8D7yeWNAgqTjc6h.jpeg",
            company_name: "SSR LOGISTIC SOLUTIONS PRIVATE LIMITED",
            company_address: "Office No. 612, 6th Floor, Vashi Infotech Park, Sector - 30 A, Near Raghuleela Mall, Vashi, Navi Mumbai - 400703, Maharashtra, India",
            website: "www.ssrlogistic.net",
            state: "Maharashtra",
            state_code: "27",
            company_gst: "27ABMCS1941A1ZI",
            company_pan: "ABMCS1941A",
            company_stamp: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", // transparent spacer

            party_name: clientName || '—',
            party_address: clientAddress || '—',
            party_gst: clientGstin || 'N/A',
            place_of_supply: stateInfo.name,

            proforma_no: proformaNoStr,
            proforma_date: formatDate(proformaDate || new Date()),
            ref_no: jobNo,

            hbl_no: mblHblType === 'HBL' ? mblHblNo : (addDetails.hbl_no || '—'),
            hbl_date: formatDate(jobRecord?.hbl_date || jobRecord?.created_at || addDetails.hbl_date),
            mbl_no: mblHblType === 'MBL' ? mblHblNo : (jobRecord?.mbl_no || '—'),
            mbl_date: formatDate(jobRecord?.mbl_date || jobRecord?.created_at || addDetails.mbl_date),
            vessel_voy: `${jobRecord?.vessel || addDetails.vessel || '—'} / ${addDetails.voyage || '—'}`,
            pol: polVal,
            fpd: fpdVal,
            igm_no: addDetails.igm_no || '—',
            line_no: addDetails.item_no || '—',
            line_date: formatDate(addDetails.igm_date || jobRecord?.created_at),
            sub_line_no: addDetails.sub_no || '—',
            etd_date: formatDate(jobRecord?.etd || addDetails.etd_date),
            container_type_count: `${jobRecord?.container_count || addDetails.inv_no_of_units || '1'} X ${jobRecord?.container_size || addDetails.inv_csize || '40HQ'}`,
            consignee: consigneeName || '—',
            shipper: shipperName || '—',
            cargo_type: jobRecord?.cargo_type || addDetails.shipment_type || 'General',
            shipper_line: jobRecord?.shipping_line_name || addDetails.carrier || '—',
            cargo_weight: jobRecord?.gross_weight || addDetails.gross_weight || '—',
            cbm: jobRecord?.net_weight || addDetails.volume || '—',
            pod: podVal,
            no_of_pkgs: addDetails.no_of_packages || '—',
            eta_date: formatDate(jobRecord?.eta || addDetails.eta_date),
            ex_rate: effectiveExRate.toFixed(2),
            container_numbers: jobRecord?.container_number || (addDetails.containers && addDetails.containers.map(c => c.containerNo).join(', ')) || '—',

            charges: chargesList,

            taxable_total: taxableTotalVal.toFixed(2),
            gst_total: gstTotalVal.toFixed(2),
            grand_total: printType === 'USD' ? grandTotalVal.toFixed(2) : roundedGrandTotal.toFixed(2),

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

        // Read Template HTML
        const templatePath = path.join(__dirname, '..', 'Mail', 'proforma_pdf.html');
        const templateSource = await fs.readFile(templatePath, 'utf-8');

        // Compile with Handlebars
        const template = handlebars.compile(templateSource);
        const html = template(contextData);

        // Render to PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0.4in',
                bottom: '0.4in',
                left: '0.4in',
                right: '0.4in'
            }
        });
        await browser.close();

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

        // Update S3 PDF link in database
        await knexDB("ProformaInvoices").where({ id: insertedId }).update({ pdf_link: uploadRes.url });

        // Update MasterBL / HouseBL status
        if (mblHblType === 'MBL') {
            await knexDB("MasterBL").where({ job_no: jobNo }).update({ status: 'Invoice Generated' });
        } else {
            await knexDB("HouseBL").where({ hbl_no: mblHblNo }).update({ status: 'Invoice Generated' });
        }

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
                await trx("HouseBL").where({ hbl_no: mbl_hbl_no }).update({
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
            jobRecord = await knexDB("HouseBL").where({ hbl_no: mbl_hbl_no }).first();
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
            try {
                const d = new Date(dateStr);
                return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
            } catch (e) { return dateStr; }
        };

        const stateInfo = getStateByGstin(client_gstin, client_address);
        const isIntraState = stateInfo.code === '27';
        const firstItem = items[0] || {};
        const effectiveExRate = parseFloat(firstItem.ex_rate || firstItem.exRate || 85.00);
        const targetCurrency = print_type === 'USD' ? 'USD' : 'INR';

        const chargesList = items.map((item) => {
            const qty = parseFloat(item.quantity || item.qty || 1);
            const baseRate = parseFloat(item.rate || 0);
            const itemCurrency = item.currency || 'USD';
            const rowExRate = parseFloat(item.ex_rate || item.exRate || effectiveExRate);

            let amount = qty * baseRate;
            let targetRate = baseRate;

            if (print_type === 'USD') {
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

            const gstRate = parseFloat(item.gst || item.taxPercent || 0);
            const gstAmount = amount * (gstRate / 100);
            const totalAmount = amount + gstAmount;

            const isFreight = String(item.charge || item.chargeName || '').toLowerCase().includes('freight') || gstRate === 5;

            return {
                charge_name: item.charge || item.chargeName || '—',
                hsn_sac: item.hsn_sac || item.sac || '996521',
                rate: targetRate.toFixed(2),
                currency: targetCurrency,
                qty: qty,
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

        let taxableTotalVal = 0;
        let gstTotalVal = 0;
        let grandTotalVal = 0;

        let cgstVal = 0;
        let sgstVal = 0;
        let cgstFreightVal = 0;
        let sgstFreightVal = 0;
        let igstVal = 0;
        let igstFreightVal = 0;

        chargesList.forEach((c) => {
            taxableTotalVal += c.taxable_amount;
            gstTotalVal += c.gst_amount_num;
            grandTotalVal += c.taxable_amount + c.gst_amount_num;

            if (c.gst_rate_num > 0) {
                if (isIntraState) {
                    if (c.is_freight) {
                        cgstFreightVal += c.gst_amount_num / 2;
                        sgstFreightVal += c.gst_amount_num / 2;
                    } else {
                        cgstVal += c.gst_amount_num / 2;
                        sgstVal += c.gst_amount_num / 2;
                    }
                } else {
                    if (c.is_freight) {
                        igstFreightVal += c.gst_amount_num;
                    } else {
                        igstVal += c.gst_amount_num;
                    }
                }
            }
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

        const contextData = {
            company_logo: "https://ssr.sirifreight.com/image/logo_Gh64uq2d8W82fDF5F8D7yeWNAgqTjc6h.jpeg",
            company_name: "SSR LOGISTIC SOLUTIONS PRIVATE LIMITED",
            company_address: "Office No. 612, 6th Floor, Vashi Infotech Park, Sector - 30 A, Near Raghuleela Mall, Vashi, Navi Mumbai - 400703, Maharashtra, India",
            website: "www.ssrlogistic.net",
            state: "Maharashtra",
            state_code: "27",
            company_gst: "27ABMCS1941A1ZI",
            company_pan: "ABMCS1941A",
            company_stamp: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", // transparent spacer

            party_name: client_name || '—',
            party_address: client_address || '—',
            party_gst: client_gstin || 'N/A',
            place_of_supply: stateInfo.name,

            proforma_no: proforma.proforma_no,
            proforma_date: formatDate(updatedDate),
            ref_no: job_no,

            hbl_no: mbl_hbl_type === 'HBL' ? mbl_hbl_no : (addDetails.hbl_no || '—'),
            hbl_date: formatDate(jobRecord?.hbl_date || jobRecord?.created_at || addDetails.hbl_date),
            mbl_no: mbl_hbl_type === 'MBL' ? mbl_hbl_no : (jobRecord?.mbl_no || '—'),
            mbl_date: formatDate(jobRecord?.mbl_date || jobRecord?.created_at || addDetails.mbl_date),
            vessel_voy: `${jobRecord?.vessel || addDetails.vessel || '—'} / ${addDetails.voyage || '—'}`,
            pol: polVal,
            fpd: fpdVal,
            igm_no: addDetails.igm_no || '—',
            line_no: addDetails.item_no || '—',
            line_date: formatDate(addDetails.igm_date || jobRecord?.created_at),
            sub_line_no: addDetails.sub_no || '—',
            etd_date: formatDate(jobRecord?.etd || addDetails.etd_date),
            container_type_count: `${jobRecord?.container_count || addDetails.inv_no_of_units || '1'} X ${jobRecord?.container_size || addDetails.inv_csize || '40HQ'}`,
            consignee: consigneeName || '—',
            shipper: shipperName || '—',
            cargo_type: jobRecord?.cargo_type || addDetails.shipment_type || 'General',
            shipper_line: jobRecord?.shipping_line_name || addDetails.carrier || '—',
            cargo_weight: jobRecord?.gross_weight || addDetails.gross_weight || '—',
            cbm: jobRecord?.net_weight || addDetails.volume || '—',
            pod: podVal,
            no_of_pkgs: addDetails.no_of_packages || '—',
            eta_date: formatDate(jobRecord?.eta || addDetails.eta_date),
            ex_rate: effectiveExRate.toFixed(2),
            container_numbers: jobRecord?.container_number || (addDetails.containers && addDetails.containers.map(c => c.containerNo).join(', ')) || '—',

            charges: chargesList,

            taxable_total: taxableTotalVal.toFixed(2),
            gst_total: gstTotalVal.toFixed(2),
            grand_total: print_type === 'USD' ? grandTotalVal.toFixed(2) : roundedGrandTotal.toFixed(2),

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

        const templatePath = path.join(__dirname, '..', 'Mail', 'proforma_pdf.html');
        const templateSource = await fs.readFile(templatePath, 'utf-8');
        const template = handlebars.compile(templateSource);
        const html = template(contextData);

        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' }
        });
        await browser.close();

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
