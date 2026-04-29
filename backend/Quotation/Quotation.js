import express from 'express';
import { saveQuotation, getAllSentQuotations, deleteQuotationsByIds } from '../Database.js';
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import { uploadFile, listFiles } from '../S3/S3Service.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.post('/generate-and-save', async (req, res) => {
    try {
        const data = req.body;
        
        // 1. Read HTML template
        const templatePath = path.join(__dirname, '..', 'Mail', 'quotation_pdf.html');
        let html = await fs.readFile(templatePath, 'utf-8');

        const quoteNo = `SSR/QT/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

        // 2. Replace placeholders
        const replacements = {
            '{{QUOTE_NO}}': quoteNo,
            '{{DATE}}': new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
            '{{VALIDITY_DATE}}': data.validity ? new Date(data.validity).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '',
            '{{CLIENT_NAME}}': data.client_name || '-',
            '{{ADDRESS}}': data.address || '-',
            '{{PHONE}}': data.phone_number || '-',
            '{{EMAIL}}': data.email || '-',
            '{{POL}}': data.pol || '-',
            '{{POD}}': data.pod || '-',
            '{{CONTAINER}}': data.containersize || '-',
            '{{COMMODITY}}': data.commodity || '-',
            '{{INCOTERMS}}': data.incoterms || '-',
            '{{REMARKS}}': data.remarks || '',
            '{{TERMS}}': data.terms || 'Standard Terms Apply'
        };

        let chargesHtml = '';
        if (data.charges && Array.isArray(data.charges)) {
            data.charges.forEach((charge, index) => {
                const currencyStr = charge.currency || 'USD';
                const badgeClass = currencyStr.toUpperCase() === 'USD' ? 'badge badge-usd' : 'badge badge-inr';
                chargesHtml += `
          <tr>
            <td>${index + 1}</td>
            <td>${charge.chargeName || '-'}</td>
            <td class="num">${charge.amount || '0'}</td>
            <td class="cur"><span class="${badgeClass}">${currencyStr}</span></td>
          </tr>`;
            });
        }
        replacements['{{CHARGES_ROWS}}'] = chargesHtml;

        for (const [key, value] of Object.entries(replacements)) {
            html = html.replace(new RegExp(key, 'g'), value);
        }

        // 3. Generate PDF with Puppeteer
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        // 4. Upload to S3
        const filename = `Quotation_${(data.client_name || 'Client').replace(/\s+/g, '_')}_${Date.now()}.pdf`;
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
            container_size_type: data.containersize,
            pdf_link: uploadRes.url
        };
        const saveRes = await saveQuotation(dbData);

        res.json({ success: true, pdfUrl: uploadRes.url });
    } catch (error) {
        console.error("Generate and Save Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
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
