import { knexDB } from './Database.js';
import { uploadFile } from './S3/S3Service.js';
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function getFinancialYear(dateStr) {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth();
    let startYear, endYear;
    if (month >= 3) {
        startYear = year;
        endYear = year + 1;
    } else {
        startYear = year - 1;
        endYear = year;
    }
    return `${startYear}-${endYear}`;
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

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    } catch (e) { return dateStr; }
};

async function migrateAll() {
    console.log("Starting Invoices & Proformas migration script...");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        // ─── PART 1: TAX INVOICES ────────────────────────────────────────────────
        const invoices = await knexDB("Invoices").select("*");
        console.log(`Found ${invoices.length} existing Tax Invoices.`);

        for (const inv of invoices) {
            console.log(`Processing Tax Invoice ID: ${inv.id}, old no: ${inv.invoice_no}`);
            const jobNo = inv.job_no;
            const mblHblType = inv.mbl_hbl_type;
            const mblHblNo = inv.mbl_hbl_no;
            const clientName = inv.client_name;
            const clientAddress = inv.client_address;
            const clientGstin = inv.client_gstin;
            const printType = inv.print_type;
            const invoiceDate = inv.invoice_date;
            
            const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items;
            const totals = typeof inv.totals === 'string' ? JSON.parse(inv.totals) : inv.totals;

            const invoiceNoStr = `SSRINV${getFinancialYear(invoiceDate)}-${jobNo}`;

            // Fetch Job details
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

            const stateInfo = getStateByGstin(clientGstin, clientAddress);
            const isIntraState = stateInfo.code === '27';
            const exRate = inv.totals?.exRate || 85.00;
            const targetCurrency = printType === 'USD' ? 'USD' : 'INR';

            const chargesList = items.map((item) => {
                const qty = parseFloat(item.quantity || 1);
                const baseRate = parseFloat(item.rate || 0);
                const itemCurrency = item.currency || 'USD';
                const rowExRate = parseFloat(item.ex_rate || exRate);

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
                    hsnSac: item.hsn_sac || item.sac || '996521',
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

            const inrGrandTotal = printType === 'USD' ? grandTotalVal * exRate : grandTotalVal;
            const roundedINRGrandTotal = Math.round(inrGrandTotal);

            const amountInWordsStr = printType === 'USD'
                ? `USD - ${numberToWordsUSD(grandTotalVal)}`
                : `INR - ${numberToWordsINR(roundedINRGrandTotal)}`;

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

            const fillPayload = {
                partyName: clientName || '—',
                partyAddress: clientAddress || '—',
                partyGstNo: clientGstin || 'N/A',
                partyStateCode: stateInfo.code,
                placeOfSupply: stateInfo.name,
                invoiceNo: invoiceNoStr,
                invoiceDate: formatDate(invoiceDate),
                refNo: jobNo,
                irn: '',
                narration: 'NIL',
                consignee: consigneeName || '—',
                shipperName: shipperName || '—',
                shippingLine: jobRecord?.shipping_line_name || addDetails.carrier || '—',
                cargoType: jobRecord?.cargo_type || addDetails.shipment_type || 'General',
                cargoWeight: jobRecord?.gross_weight || addDetails.gross_weight || '—',
                cbm: jobRecord?.net_weight || addDetails.volume || '—',
                pod: podVal,
                noOfPkgs: addDetails.no_of_packages || '—',
                etaDate: formatDate(jobRecord?.eta || addDetails.eta_date),
                exRate: exRate.toFixed(2),
                hblNo: mblHblType === 'HBL' ? mblHblNo : (addDetails.hbl_no || '—'),
                hblDate: formatDate(jobRecord?.hbl_date || jobRecord?.created_at || addDetails.hbl_date),
                mblNo: mblHblType === 'MBL' ? mblHblNo : (jobRecord?.mbl_no || '—'),
                mblDate: formatDate(jobRecord?.mbl_date || jobRecord?.created_at || addDetails.mbl_date),
                vesselVoy: `${jobRecord?.vessel || addDetails.vessel || '—'} / ${addDetails.voyage || '—'}`,
                pol: polVal,
                fpd: fpdVal,
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

            const templatePath = path.join(__dirname, '..', 'frontend', 'public', 'pdf-static', 'tax_invoice.html');
            const htmlContent = await fs.readFile(templatePath, 'utf-8');

            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            await page.evaluate((data) => {
                window.fillDocument(data);
                var bar = document.querySelector(".no-print");
                if (bar) bar.style.display = "none";
                document.body.classList.remove("screen");
            }, fillPayload);

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '6mm', bottom: '6mm', left: '6mm', right: '6mm' }
            });
            await page.close();

            const filename = `TaxInvoice_${jobNo}_${Date.now()}.pdf`;
            const uploadRes = await uploadFile({
                fileBuffer: pdfBuffer,
                key: filename,
                directory: 'invoices',
                contentType: 'application/pdf'
            });

            if (uploadRes.success) {
                // Update Invoice
                await knexDB("Invoices").where({ id: inv.id }).update({
                    invoice_no: invoiceNoStr,
                    pdf_link: uploadRes.url
                });

                // Update MasterBL / HouseBL
                if (mblHblType === 'MBL') {
                    await knexDB("MasterBL").where({ job_no: jobNo }).update({
                        invoice_no: invoiceNoStr
                    });
                } else {
                    await knexDB("HouseBL").where({ hbl_no: mblHblNo }).update({
                        invoice_no: invoiceNoStr
                    });
                }
                console.log(`Successfully migrated Tax Invoice ID: ${inv.id} to invoice no: ${invoiceNoStr}`);
            } else {
                console.error(`Failed to upload newly rendered PDF for Tax Invoice ID: ${inv.id}`);
            }
        }

        // ─── PART 2: PROFORMA INVOICES ───────────────────────────────────────────
        const proformas = await knexDB("ProformaInvoices").select("*");
        console.log(`Found ${proformas.length} existing Proforma Invoices.`);

        // Read Template HTML
        const proformaTemplatePath = path.join(__dirname, 'Mail', 'proforma_pdf.html');
        const proformaTemplateSource = await fs.readFile(proformaTemplatePath, 'utf-8');
        const proformaTemplate = handlebars.compile(proformaTemplateSource);

        for (const prof of proformas) {
            console.log(`Processing Proforma ID: ${prof.id}, old no: ${prof.proforma_no}`);
            const jobNo = prof.job_no;
            const mblHblType = prof.mbl_hbl_type;
            const mblHblNo = prof.mbl_hbl_no;
            const clientName = prof.client_name;
            const clientAddress = prof.client_address;
            const clientGstin = prof.client_gstin;
            const printType = prof.print_type;
            const proformaDate = prof.proforma_date;
            
            const items = typeof prof.items === 'string' ? JSON.parse(prof.items) : prof.items;
            const totals = typeof prof.totals === 'string' ? JSON.parse(prof.totals) : prof.totals;

            const proformaNoStr = String(jobNo);

            // Fetch Job details
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

            const stateInfo = getStateByGstin(clientGstin, clientAddress);
            const isIntraState = stateInfo.code === '27';
            const exRate = prof.totals?.exRate || 85.00;
            const targetCurrency = printType === 'USD' ? 'USD' : 'INR';

            const chargesList = items.map((item) => {
                const qty = parseFloat(item.quantity || 1);
                const baseRate = parseFloat(item.rate || 0);
                const itemCurrency = item.currency || 'USD';
                const rowExRate = parseFloat(item.ex_rate || exRate);

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

            const contextData = {
                company_logo: "https://ssr.sirifreight.com/image/logo_Gh64uq2d8W82fDF5F8D7yeWNAgqTjc6h.jpeg",
                company_name: "SSR LOGISTIC SOLUTIONS PRIVATE LIMITED",
                company_address: "Office No. 612, 6th Floor, Vashi Infotech Park, Sector - 30 A, Near Raghuleela Mall, Vashi, Navi Mumbai - 400703, Maharashtra, India",
                website: "www.ssrlogistic.net",
                state: "Maharashtra",
                state_code: "27",
                company_gst: "27ABMCS1941A1ZI",
                company_pan: "ABMCS1941A",
                company_stamp: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",

                party_name: clientName || '—',
                party_address: clientAddress || '—',
                party_gst: clientGstin || 'N/A',
                place_of_supply: stateInfo.name,

                proforma_no: proformaNoStr,
                proforma_date: formatDate(proformaDate),
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
                ex_rate: exRate.toFixed(2),
                container_numbers: jobRecord?.container_number || (addDetails.containers && addDetails.containers.map(c => c.containerNo).join(', ')) || '—',

                charges: chargesList,

                taxable_total: taxableTotalVal.toFixed(2),
                gst_total: gstTotalVal.toFixed(2),
                grand_total: printType === 'USD' ? grandTotalVal.toFixed(2) : roundedGrandTotal.toFixed(2),

                is_intra_state: isIntraState,
                cgst: cgstVal > 0 ? cgstVal.toFixed(2) : '0.00',
                sgst: sgstVal > 0 ? sgstVal.toFixed(2) : '0.00',
                cgst_freight: cgstFreightVal > 0 ? cgstFreightVal.toFixed(2) : '0.00',
                sgst_freight: sgstFreightVal > 0 ? sgstFreightVal.toFixed(2) : '0.00',

                igst: igstVal > 0 ? igstVal.toFixed(2) : '0.00',
                igst_freight: igstFreightVal > 0 ? igstFreightVal.toFixed(2) : '0.00',

                amount_in_words: amountInWords,
                currency_label: targetCurrency,
                reverse_charge: 'No',
                terms_conditions: termsConditions,
                bank_name: 'KOTAK MAHINDRA BANK LTD',
                account_number: '1050002555',
                ifsc: 'KKBK0001370'
            };

            const html = proformaTemplate(contextData);

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' }
            });
            await page.close();

            const filename = `Proforma_${proformaNoStr}_${Date.now()}.pdf`;
            const uploadRes = await uploadFile({
                fileBuffer: pdfBuffer,
                key: filename,
                directory: 'proformas',
                contentType: 'application/pdf'
            });

            if (uploadRes.success) {
                await knexDB("ProformaInvoices").where({ id: prof.id }).update({
                    proforma_no: proformaNoStr,
                    pdf_link: uploadRes.url
                });
                console.log(`Successfully migrated Proforma ID: ${prof.id} to proforma no: ${proformaNoStr}`);
            } else {
                console.error(`Failed to upload newly rendered PDF for Proforma ID: ${prof.id}`);
            }
        }

    } catch (e) {
        console.error("Migration error:", e);
    } finally {
        await browser.close();
        console.log("Migration complete!");
        process.exit(0);
    }
}

migrateAll();
