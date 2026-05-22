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
        const customers = await knexDB("Customers").select("customer_id", "name", "address", "gstin", "customer_type");
        
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
        let job = null;
        let relatedHBLs = [];
        let type = 'MBL';

        if (jobNo >= 8000 && jobNo < 9000) {
            // MasterBL
            job = await knexDB("MasterBL").where({ job_no: jobNo }).first();
            if (job) {
                relatedHBLs = await knexDB("HouseBL").where({ mbl_no: job.mbl_no }).select("job_no", "hbl_no");
            }
        } else if (jobNo >= 9000) {
            // HouseBL
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
            record = await knexDB("MasterBL").where({ mbl_no }).first();
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
        console.error("Error searching charges:", error);
        res.status(500).json({ success: false, message: "Failed to query sell rates: " + error.message });
    }
});

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
        // Insert a record into database first to get the sequential ID starting at 5300
        const payload = {
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
            pdf_link: null // will be updated shortly
        };

        const [insertedId] = await knexDB("ProformaInvoices").insert(payload);
        const proformaNoStr = String(insertedId);

        // Update proforma_no field
        await knexDB("ProformaInvoices").where({ id: insertedId }).update({ proforma_no: proformaNoStr });

        // Retrieve the linked Job details to fill metadata in A4 layout
        let jobRecord = null;
        if (mblHblType === 'MBL') {
            jobRecord = await knexDB("MasterBL").where({ job_no: jobNo }).first();
        } else {
            jobRecord = await knexDB("HouseBL").where({ job_no: jobNo }).first();
        }

        let addDetails = {};
        if (jobRecord && jobRecord.additional_details) {
            addDetails = typeof jobRecord.additional_details === 'string'
                ? JSON.parse(jobRecord.additional_details)
                : jobRecord.additional_details;
        }

        // Setup manual parties or actual client metadata
        let consigneeName = '';
        let shipperName = '';
        if (jobRecord) {
            consigneeName = jobRecord.consignee_name || '';
            shipperName = jobRecord.shipper_name || '';
            if (!consigneeName && jobRecord.manual_party_details) {
                try {
                    const mp = typeof jobRecord.manual_party_details === 'string' ? JSON.parse(jobRecord.manual_party_details) : jobRecord.manual_party_details;
                    consigneeName = mp.consignee || '';
                    shipperName = mp.shipper || '';
                } catch(e){}
            }
        }

        // Formatting dates
        const formatDate = (dateStr) => {
            if (!dateStr) return '—';
            try {
                const d = new Date(dateStr);
                return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
            } catch (e) { return dateStr; }
        };

        // Prepare Replacements map
        const replacements = {
            '{{PRINT_TYPE_LABEL}}': printType === 'USD' ? 'USD PRICING' : 'INR LOCAL',
            '{{PARTY_NAME}}': clientName || '—',
            '{{PARTY_ADDRESS}}': clientAddress || '—',
            '{{PARTY_GSTIN}}': clientGstin || 'N/A',
            '{{PARTY_STATE}}': clientState || '—',
            '{{PROFORMA_NO}}': proformaNoStr,
            '{{PROFORMA_DATE}}': formatDate(proformaDate || new Date()),
            '{{REF_NO}}': addDetails.reference_no || '—',
            '{{JOB_NO}}': String(jobNo),
            '{{HBL_NO}}': mblHblType === 'HBL' ? mblHblNo : (addDetails.hbl_no || '—'),
            '{{MBL_NO}}': mblHblType === 'MBL' ? mblHblNo : (jobRecord?.mbl_no || '—'),
            '{{VESSEL_VOYAGE}}': `${jobRecord?.vessel || addDetails.vessel || '—'} / ${addDetails.voyage || '—'}`,
            '{{POL}}': jobRecord?.pol || '—',
            '{{FPD}}': jobRecord?.final_pod || addDetails.fpd || '—',
            '{{IGM_NO}}': addDetails.igm_no || '—',
            '{{LINE_NO}}': `${addDetails.item_no || '—'} (Date: ${formatDate(addDetails.igm_date)})`,
            '{{SUB_LINE_NO}}': addDetails.sub_no || '—',
            '{{ETD_DATE}}': formatDate(jobRecord?.etd || addDetails.etd_date),
            '{{CNTRS_TYPE}}': `${jobRecord?.container_count || addDetails.inv_no_of_units || '1'} X ${jobRecord?.container_size || addDetails.inv_csize || '40HQ'}`,
            '{{CONSIGNEE}}': consigneeName || '—',
            '{{SHIPPER}}': shipperName || '—',
            '{{CARGO_TYPE}}': jobRecord?.cargo_type || addDetails.shipment_type || 'General',
            '{{SHIPPER_LINE}}': jobRecord?.shipping_line_name || addDetails.carrier || '—',
            '{{CARGO_WEIGHT}}': jobRecord?.gross_weight || addDetails.gross_weight || '—',
            '{{CBM}}': jobRecord?.net_weight || addDetails.volume || '—',
            '{{POD}}': jobRecord?.pod || '—',
            '{{NO_OF_PKGS}}': addDetails.no_of_packages || '—',
            '{{ETA_DATE}}': formatDate(jobRecord?.eta || addDetails.eta_date),
            '{{EX_RATE}}': parseFloat(exRate || 85.00).toFixed(2),
            '{{CONTAINER_NO}}': jobRecord?.container_number || (addDetails.containers && addDetails.containers.map(c => c.containerNo).join(', ')) || '—',
            '{{GENERATED_AT}}': new Date().toLocaleString()
        };

        // Build Table Headers and Rows depending on INR vs USD Print Type
        let headersHtml = '';
        let rowsHtml = '';
        let subtotalHtml = '';
        let taxRowsHtml = '';
        let grandTotalValStr = '';
        let grandTotalLabel = 'INR TOTAL';
        let wordsStr = '';

        const effectiveExRate = parseFloat(exRate || 85.00);

        if (printType === 'USD') {
            headersHtml = `
            <thead>
              <tr>
                <th>Particulars</th>
                <th>HSN / SAC</th>
                <th>Rate</th>
                <th>Qty</th>
                <th>Curr.</th>
                <th>EX RATE</th>
                <th>Amount (FC)</th>
                <th>Taxable (USD)</th>
                <th>Non-Taxable (USD)</th>
              </tr>
            </thead>`;

            // Totals Accumulator in USD
            let taxableUSDTotal = 0;
            let nonTaxableUSDTotal = 0;
            let igstUSDTotal = 0;
            let cgstUSDTotal = 0;
            let sgstUSDTotal = 0;

            items.forEach((item) => {
                const qty = parseFloat(item.quantity || 1);
                const rate = parseFloat(item.rate || 0);
                const itemCurrency = item.currency || 'USD';
                const rowExRate = parseFloat(item.ex_rate || effectiveExRate);

                let amountFC = qty * rate;
                let amountUSD = amountFC;
                if (itemCurrency === 'INR') {
                    // Convert INR to USD
                    amountUSD = amountFC / rowExRate;
                }

                const gstRate = parseFloat(item.gst || 0);
                const isMaharashtra = String(clientState || '').startsWith('27') || String(clientGstin || '').startsWith('27');

                let taxableUSD = 0;
                let nonTaxableUSD = 0;

                if (gstRate > 0) {
                    taxableUSD = amountUSD;
                    taxableUSDTotal += amountUSD;

                    // Calculate tax in USD
                    const taxAmountUSD = amountUSD * (gstRate / 100);
                    if (isMaharashtra) {
                        cgstUSDTotal += taxAmountUSD / 2;
                        sgstUSDTotal += taxAmountUSD / 2;
                    } else {
                        igstUSDTotal += taxAmountUSD;
                    }
                } else {
                    nonTaxableUSD = amountUSD;
                    nonTaxableUSDTotal += amountUSD;
                }

                rowsHtml += `
                <tr>
                  <td>${item.charge}</td>
                  <td class="center">${item.hsn_sac || '996521'}</td>
                  <td class="num">${rate.toFixed(2)}</td>
                  <td class="center">${qty}</td>
                  <td class="center">${itemCurrency}</td>
                  <td class="num">${rowExRate.toFixed(2)}</td>
                  <td class="num">${amountFC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="num">${taxableUSD > 0 ? taxableUSD.toFixed(2) : '0.00'}</td>
                  <td class="num">${nonTaxableUSD > 0 ? nonTaxableUSD.toFixed(2) : '0.00'}</td>
                </tr>`;
            });

            const subtotalUSD = taxableUSDTotal + nonTaxableUSDTotal;
            const totalTaxUSD = igstUSDTotal + cgstUSDTotal + sgstUSDTotal;
            const grandTotalUSD = subtotalUSD + totalTaxUSD;

            subtotalHtml = `
            <tr>
              <th colspan="7" style="text-align:right">SUBTOTAL (USD)</th>
              <th class="num">${taxableUSDTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
              <th class="num">${nonTaxableUSDTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
            </tr>`;

            // Build tax breakdown
            if (igstUSDTotal > 0) {
                taxRowsHtml += `IGST USD Total: ${igstUSDTotal.toFixed(2)}<br>`;
            }
            if (cgstUSDTotal > 0) {
                taxRowsHtml += `CGST USD Total: ${cgstUSDTotal.toFixed(2)}<br>`;
            }
            if (sgstUSDTotal > 0) {
                taxRowsHtml += `SGST USD Total: ${sgstUSDTotal.toFixed(2)}<br>`;
            }

            grandTotalLabel = 'USD GRAND TOTAL';
            grandTotalValStr = `$ ${grandTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Equiv. INR ${(grandTotalUSD * effectiveExRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
            wordsStr = `${numberToWordsUSD(grandTotalUSD)}`;

        } else {
            // INR LOCAL Print Type
            headersHtml = `
            <thead>
              <tr>
                <th>Charge Name</th>
                <th>HSN / SAC</th>
                <th>Rate Per Unit</th>
                <th>Curr.</th>
                <th>Qty</th>
                <th>Amount (INR)</th>
                <th>GST Rate (%)</th>
                <th>GST Amount (INR)</th>
                <th>Total Amount (INR)</th>
              </tr>
            </thead>`;

            let subtotalINR = 0;
            let taxTotalINR = 0;
            let igstTotalINR = 0;
            let cgstTotalINR = 0;
            let sgstTotalINR = 0;

            items.forEach((item) => {
                const qty = parseFloat(item.quantity || 1);
                const rate = parseFloat(item.rate || 0);
                const itemCurrency = item.currency || 'INR';
                const rowExRate = parseFloat(item.ex_rate || effectiveExRate);

                let baseAmountINR = qty * rate;
                if (itemCurrency === 'USD') {
                    baseAmountINR = qty * rate * rowExRate;
                }

                const gstRate = parseFloat(item.gst || 0);
                const taxAmountINR = baseAmountINR * (gstRate / 100);
                const isMaharashtra = String(clientState || '').startsWith('27') || String(clientGstin || '').startsWith('27');

                if (isMaharashtra) {
                    cgstTotalINR += taxAmountINR / 2;
                    sgstTotalINR += taxAmountINR / 2;
                } else {
                    igstTotalINR += taxAmountINR;
                }

                subtotalINR += baseAmountINR;
                taxTotalINR += taxAmountINR;

                rowsHtml += `
                <tr>
                  <td>${item.charge}</td>
                  <td class="center">${item.hsn_sac || '996521'}</td>
                  <td class="num">${rate.toFixed(2)}</td>
                  <td class="center">${itemCurrency}</td>
                  <td class="center">${qty}</td>
                  <td class="num">${baseAmountINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="center">${gstRate > 0 ? gstRate.toFixed(1) + '%' : '0%'}</td>
                  <td class="num">${taxAmountINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="num">${(baseAmountINR + taxAmountINR).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>`;
            });

            const grandTotalINR = subtotalINR + taxTotalINR;

            subtotalHtml = `
            <tr>
              <th colspan="5" style="text-align:right">SUBTOTAL</th>
              <th class="num">${subtotalINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
              <th></th>
              <th class="num">${taxTotalINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
              <th class="num">${grandTotalINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
            </tr>`;

            if (igstTotalINR > 0) {
                taxRowsHtml += `IGST Total: INR ${igstTotalINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br>`;
            }
            if (cgstTotalINR > 0) {
                taxRowsHtml += `CGST Total: INR ${cgstTotalINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br>`;
            }
            if (sgstTotalINR > 0) {
                taxRowsHtml += `SGST Total: INR ${sgstTotalINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br>`;
            }

            grandTotalLabel = 'INR GRAND TOTAL';
            grandTotalValStr = `INR ${grandTotalINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            wordsStr = `${numberToWordsINR(grandTotalINR)}`;
        }

        replacements['{{CHARGES_THEAD}}'] = headersHtml;
        replacements['{{CHARGES_ROWS}}'] = rowsHtml;
        replacements['{{SUBTOTAL_ROW}}'] = subtotalHtml;
        replacements['{{TAX_ROWS}}'] = taxRowsHtml;
        replacements['{{GRAND_TOTAL_LABEL}}'] = grandTotalLabel;
        replacements['{{GRAND_TOTAL_VAL}}'] = grandTotalValStr;
        replacements['{{GRAND_TOTAL_WORDS}}'] = wordsStr;

        // Read Template HTML
        const templatePath = path.join(__dirname, '..', 'Mail', 'proforma_pdf.html');
        let html = await fs.readFile(templatePath, 'utf-8');

        // Apply replacements
        for (const [key, value] of Object.entries(replacements)) {
            html = html.replace(new RegExp(key, 'g'), value);
        }

        // Launch Puppeteer to render and build the PDF
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

        // Upload generated PDF to S3
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

        // Update the S3 PDF link in database
        await knexDB("ProformaInvoices").where({ id: insertedId }).update({ pdf_link: uploadRes.url });

        // Update status of the MasterBL / HouseBL job record to 'Invoice Generated' if applicable
        if (mblHblType === 'MBL') {
            await knexDB("MasterBL").where({ job_no: jobNo }).update({ status: 'Invoice Generated' });
        } else {
            await knexDB("HouseBL").where({ job_no: jobNo }).update({ status: 'Invoice Generated' });
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

export default router;
