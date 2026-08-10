import express from 'express';
import { saveQuotation, getAllSentQuotations, deleteQuotationsByIds, getNextQuoteNo, knexDB } from '../Database.js';
import fs from 'fs/promises';
import path from 'path';
import { generatePdf } from '../utils/pdfGenerator.js';
import { uploadFile, listFiles } from '../S3/S3Service.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { CHARGES } from '../Invoice/Invoice.js';

const router = express.Router();

router.get('/charges', async (req, res) => {
    try {
        const rows = await knexDB("Charges").select("*");
        res.json({ success: true, charges: rows });
    } catch (error) {
        console.error("Failed to fetch charges in Quotation:", error);
        res.json({ success: true, charges: CHARGES });
    }
});

function isIndianPort(portStr) {
    if (!portStr) return false;
    const str = String(portStr).toLowerCase();
    return str.includes('india') || str.includes('innsa') || str.includes('inbom') || str.includes('inmaa') || str.includes('inmun') || str.includes('inccu') || str.includes('incok') || str.includes('intut') || str.includes('inixy') || str.includes('ingoi') || str.includes('invtz');
}

function getChargeCategory(charge, pol, pod) {
    if (charge.category) return charge.category.toLowerCase();
    
    const name = (charge.chargeName || '').toUpperCase();
    if (name.includes('FREIGHT') || name.includes('OCEAN') || name.includes('AIR') || name.includes('BAF') || name.includes('CAF')) {
        return 'freight';
    }
    if (name.includes('POD') || name.includes('DESTINATION') || name.includes('DO CHARGES') || name.includes('DELIVERY ORDER') || name.includes('CUSTOMS') || name.includes('DEMURRAGE') || name.includes('STORAGE') || name.includes('DETENTION') || name.includes('IMPORT') || name.includes('CFS')) {
        return 'destination';
    }
    if (name.includes('POL') || name.includes('ORIGIN') || name.includes('SEAL') || name.includes('MANDATORY') || name.includes('BL ') || name.includes('DOCUMENTATION') || name.includes('TOLL') || name.includes('VGM') || name.includes('EXPORT')) {
        return 'origin';
    }

    const isExport = isIndianPort(pol) || (!isIndianPort(pod) && !!pol);
    return isExport ? 'origin' : 'destination';
}

function renderChargeTable(title, chargesList) {
    if (!chargesList || chargesList.length === 0) return '';
    
    let rowsHtml = '';
    chargesList.forEach((charge) => {
        const currencyStr = charge.currency || 'USD';
        const basisStr = charge.basis || '20\'';
        
        const rawQty = parseFloat(charge.quantity);
        const qtyNum = isNaN(rawQty) ? 1 : rawQty;

        const rawRate = parseFloat(charge.amount);
        const rateNum = isNaN(rawRate) ? 0 : rawRate;

        const rawTax = parseFloat(charge.tax);
        const taxNum = isNaN(rawTax) ? (title.includes('Freight') ? 5 : 18) : rawTax;

        const subtotalNum = qtyNum * rateNum * (1 + taxNum / 100);

        const qty = qtyNum.toFixed(2);
        const rate = rateNum.toFixed(2);
        const tax = taxNum;
        const subtotal = subtotalNum.toFixed(2);

        rowsHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="text-align: left; padding: 4px 8px; border-right: 1px solid #e2e8f0; vertical-align: middle; font-weight: 500; color: #1e293b;">${charge.chargeName || '-'}</td>
            <td style="text-align: center; padding: 4px 6px; border-right: 1px solid #e2e8f0; vertical-align: middle; color: #334155;">${basisStr}</td>
            <td style="text-align: center; padding: 4px 6px; border-right: 1px solid #e2e8f0; vertical-align: middle; color: #334155;">${qty}</td>
            <td style="text-align: center; padding: 4px 6px; border-right: 1px solid #e2e8f0; vertical-align: middle; color: #334155;">${currencyStr}</td>
            <td style="text-align: center; padding: 4px 6px; border-right: 1px solid #e2e8f0; vertical-align: middle; color: #334155;">${rate}</td>
            <td style="text-align: center; padding: 4px 6px; border-right: 1px solid #e2e8f0; vertical-align: middle; color: #334155;">${tax}%</td>
            <td style="text-align: center; padding: 4px 6px; font-weight: 700; color: #0f2460; vertical-align: middle; white-space: nowrap;">${currencyStr} ${subtotal}</td>
          </tr>`;
    });

    return `
      <div style="margin-bottom: 8px; page-break-inside: avoid;">
        <div style="background: #0f2460; color: #ffffff; padding: 4px 10px; font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; border-top-left-radius: 4px; border-top-right-radius: 4px;">
          ${title}
        </div>
        <div style="border: 1px solid #cbd5e1; border-top: none; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 1.5px solid #cbd5e1;">
                <th style="text-align: left; padding: 4px 8px; border-right: 1px solid #cbd5e1; font-weight: 700; color: #0f2460; font-size: 9.5px; text-transform: uppercase; width: 30%;">CHARGE HEAD</th>
                <th style="text-align: center; padding: 4px 6px; border-right: 1px solid #cbd5e1; font-weight: 700; color: #0f2460; font-size: 9.5px; text-transform: uppercase; width: 16%;">BASIS</th>
                <th style="text-align: center; padding: 4px 6px; border-right: 1px solid #cbd5e1; font-weight: 700; color: #0f2460; font-size: 9.5px; text-transform: uppercase; width: 11%;">QUANTITY</th>
                <th style="text-align: center; padding: 4px 6px; border-right: 1px solid #cbd5e1; font-weight: 700; color: #0f2460; font-size: 9.5px; text-transform: uppercase; width: 11%;">CURRENCY</th>
                <th style="text-align: center; padding: 4px 6px; border-right: 1px solid #cbd5e1; font-weight: 700; color: #0f2460; font-size: 9.5px; text-transform: uppercase; width: 10%;">RATE</th>
                <th style="text-align: center; padding: 4px 6px; border-right: 1px solid #cbd5e1; font-weight: 700; color: #0f2460; font-size: 9.5px; text-transform: uppercase; width: 9%;">TAX (%)</th>
                <th style="text-align: center; padding: 4px 6px; font-weight: 700; color: #0f2460; font-size: 9.5px; text-transform: uppercase; width: 13%;">SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
}

function buildChargesSectionsHtml(charges, pol, pod) {
    if (!charges || !Array.isArray(charges) || charges.length === 0) {
        return '<div style="padding: 10px; text-align: center; font-style: italic; color: #888;">No charges specified</div>';
    }

    const freightList = charges.filter(c => getChargeCategory(c, pol, pod) === 'freight');
    const originList = charges.filter(c => getChargeCategory(c, pol, pod) === 'origin');
    const destinationList = charges.filter(c => getChargeCategory(c, pol, pod) === 'destination');

    let html = '';
    html += renderChargeTable('Freight Charges', freightList);
    html += renderChargeTable('Origin Charges', originList);
    html += renderChargeTable('Destination Charges', destinationList);

    return html;
}

router.post('/generate-and-save', async (req, res) => {
    try {
        const data = req.body;
        const quoteNo = data.quote_no || await getNextQuoteNo();
        
        // 1. Read HTML template
        const templatePath = path.join(__dirname, '..', 'Mail', 'quotation_pdf.html');
        let html = await fs.readFile(templatePath, 'utf-8');

        // 2. Replace placeholders
        const replacements = {
            '{{QUOTE_NO}}': quoteNo,
            '{{DATE}}': new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
            '{{VALIDITY_DATE}}': data.validity ? new Date(data.validity).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '-',
            '{{CLIENT_NAME}}': data.client_name || '-',
            '{{ADDRESS}}': data.address || '-',
            '{{PHONE}}': data.phone_number || '-',
            '{{EMAIL}}': data.email || '-',
            '{{POL}}': data.pol || '-',
            '{{POD}}': data.pod || '-',
            '{{CONTAINER}}': data.containersize || '-',
            '{{COMMODITY}}': data.commodity || '-',
            '{{INCOTERMS}}': data.incoterms || '-',
            '{{TRANSIT_TIME}}': data.transit_time || '-',
            '{{REMARKS}}': data.remarks || '-',
            '{{TERMS}}': data.terms || 'Standard Terms Apply',
            '{{CHARGES_SECTIONS}}': buildChargesSectionsHtml(data.charges, data.pol, data.pod)
        };

        for (const [key, value] of Object.entries(replacements)) {
            html = html.replace(new RegExp(key, 'g'), value);
        }

        // 3. Generate PDF with Puppeteer
        const pdfBuffer = await generatePdf({
            htmlContent: html,
            pdfOptions: { format: 'A4', printBackground: true }
        });

        // 4. Upload to S3
        const filename = `Quotation_${quoteNo}_${Date.now()}.pdf`;
        const uploadRes = await uploadFile({
            fileBuffer: pdfBuffer,
            key: filename,
            directory: 'quotations',
            contentType: 'application/pdf'
        });

        if (!uploadRes.success) {
            return res.status(500).json({ success: false, message: "Failed to upload PDF to S3" });
        }

        // 5. Save to database
        const dbData = {
            ...data,
            quote_no: quoteNo,
            container_size_type: data.containersize,
            pdf_link: uploadRes.url
        };
        const saveRes = await saveQuotation(dbData);

        res.json({ success: true, pdfUrl: uploadRes.url, quoteNo });
    } catch (error) {
        console.error("Generate and Save Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Download PDF directly as stream
router.post('/download-pdf', async (req, res) => {
    try {
        const data = req.body;
        const quoteNo = data.quote_no || await getNextQuoteNo();
        
        const templatePath = path.join(__dirname, '..', 'Mail', 'quotation_pdf.html');
        let html = await fs.readFile(templatePath, 'utf-8');

        const replacements = {
            '{{QUOTE_NO}}': quoteNo,
            '{{DATE}}': new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
            '{{VALIDITY_DATE}}': data.validity ? new Date(data.validity).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '-',
            '{{CLIENT_NAME}}': data.client_name || '-',
            '{{ADDRESS}}': data.address || '-',
            '{{PHONE}}': data.phone_number || '-',
            '{{EMAIL}}': data.email || '-',
            '{{POL}}': data.pol || '-',
            '{{POD}}': data.pod || '-',
            '{{CONTAINER}}': data.containersize || '-',
            '{{COMMODITY}}': data.commodity || '-',
            '{{INCOTERMS}}': data.incoterms || '-',
            '{{TRANSIT_TIME}}': data.transit_time || '-',
            '{{REMARKS}}': data.remarks || '-',
            '{{TERMS}}': data.terms || 'Standard Terms Apply',
            '{{CHARGES_SECTIONS}}': buildChargesSectionsHtml(data.charges, data.pol, data.pod)
        };

        for (const [key, value] of Object.entries(replacements)) {
            html = html.replace(new RegExp(key, 'g'), value);
        }

        const pdfBuffer = await generatePdf({
            htmlContent: html,
            pdfOptions: { format: 'A4', printBackground: true }
        });

        // Save & S3 upload synchronously to guarantee database log persistence
        const filename = `Quotation_${quoteNo}_${Date.now()}.pdf`;
        try {
            const uploadRes = await uploadFile({
                fileBuffer: pdfBuffer,
                key: filename,
                directory: 'quotations',
                contentType: 'application/pdf'
            });

            if (uploadRes.success) {
                await saveQuotation({
                    ...data,
                    quote_no: quoteNo,
                    container_size_type: data.containersize,
                    pdf_link: uploadRes.url
                });
            }
        } catch (uploadErr) {
            console.error("Save & S3 Upload error in download-pdf:", uploadErr);
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${quoteNo}.pdf"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("Download PDF Error:", error);
        res.status(500).json({ success: false, message: "Failed to generate PDF" });
    }
});

// Save new sent quotation (old direct save)
router.post('/save', async (req, res) => {
    try {
        const result = await saveQuotation(req.body);
        if (result.ok) {
            res.json({ success: true, message: "Quotation saved successfully", id: result.insertId });
        } else {
            res.status(500).json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error("Save Quotation Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Get all sent quotations — auto-cleans rows whose S3 PDF was deleted
router.get('/all', async (req, res) => {
    try {
        const result = await getAllSentQuotations();
        if (!result.ok) {
            return res.status(500).json({ success: false, message: result.message });
        }

        const quotations = result.data;
        if (quotations.length === 0) {
            return res.json({ success: true, quotations: [] });
        }

        // Fetch all existing S3 keys under quotations/
        let existingKeys = new Set();
        try {
            const s3List = await listFiles('quotations/');
            if (s3List.success) {
                existingKeys = new Set(s3List.files.map(f => f.key));
            }
        } catch (s3Err) {
            console.warn("S3 list failed, skipping cleanup:", s3Err.message);
            // If S3 is unreachable, return all rows without cleanup
            return res.json({ success: true, quotations });
        }

        // Find rows whose PDF no longer exists in S3
        const staleIds = [];
        const liveQuotations = [];

        for (const q of quotations) {
            if (!q.pdf_link) {
                staleIds.push(q.id);
                continue;
            }
            // Extract the S3 key from the full URL
            // URL format: https://BUCKET.s3.amazonaws.com/quotations/filename.pdf
            const urlParts = q.pdf_link.split('.amazonaws.com/');
            const s3Key = urlParts.length > 1 ? urlParts[1] : null;

            if (s3Key && existingKeys.has(s3Key)) {
                liveQuotations.push(q);
            } else {
                staleIds.push(q.id);
            }
        }

        // Delete stale DB rows
        if (staleIds.length > 0) {
            const delResult = await deleteQuotationsByIds(staleIds);
            console.log(`Cleaned ${delResult.affected || 0} stale quotation(s) from DB`);
        }

        res.json({ success: true, quotations: liveQuotations });
    } catch (error) {
        console.error("Get Quotations Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

export default router;
