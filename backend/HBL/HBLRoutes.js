import express from 'express';
import { knexDB } from '../Database.js';
import { authenticateJWT } from '../AuthAPI/Auth.js';
import { uploadFile } from '../S3/S3Service.js';
import puppeteer from 'puppeteer';
import { getBrowser } from '../utils/pdfGenerator.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper: Suffix generator (A, AB, AC, AD... etc.)
function getBLSuffix(index) {
    if (index === 0) return '';
    if (index === 1) return 'A';
    // 2 -> AB, 3 -> AC, 4 -> AD...
    const charCode = 65 + (index - 1); // 65 = A
    if (charCode <= 90) {
        return 'A' + String.fromCharCode(charCode);
    }
    return 'A' + String(index);
}

// 1. Generate unique BL Number
router.get('/generate-bl-no/:jobNo', authenticateJWT, async (req, res) => {
    const jobNo = parseInt(req.params.jobNo);
    if (!jobNo || isNaN(jobNo)) {
        return res.status(400).json({ success: false, message: 'Valid Job Number is required' });
    }

    try {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `LVSTS${yy}${mm}`;

        // Sequential job number formatted to 4 digits (e.g., 5007)
        const jobSeq = String(jobNo).padStart(4, '0');
        const baseBlNo = `${prefix}${jobSeq}`;

        // Check how many existing BLs belong to this job
        const existingBLs = await knexDB('HBLDocuments')
            .where({ job_no: jobNo })
            .orderBy('id', 'asc');

        let nextBlNo = baseBlNo;
        let suffixIdx = 0;

        // Check uniqueness in database
        while (true) {
            const currentSuffix = getBLSuffix(suffixIdx);
            const candidate = `${baseBlNo}${currentSuffix}`;
            const exists = await knexDB('HBLDocuments').where({ bl_no: candidate }).first();
            if (!exists) {
                nextBlNo = candidate;
                break;
            }
            suffixIdx++;
        }

        res.json({
            success: true,
            blNo: nextBlNo,
            baseBlNo,
            existingCount: existingBLs.length
        });
    } catch (error) {
        console.error('Error generating BL number:', error);
        res.status(500).json({ success: false, message: 'Failed to generate BL number: ' + error.message });
    }
});

// 2. Fetch Initial Job Details for HBL Generation
router.get('/job-init/:jobNo', authenticateJWT, async (req, res) => {
    const jobNo = parseInt(req.params.jobNo);
    if (!jobNo || isNaN(jobNo)) {
        return res.status(400).json({ success: false, message: 'Valid Job Number is required' });
    }

    try {
        const jobRecord = await knexDB('MasterBL')
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

        if (!jobRecord) {
            return res.status(404).json({ success: false, message: `Job #${jobNo} not found` });
        }

        let addDetails = {};
        if (jobRecord.additional_details) {
            addDetails = typeof jobRecord.additional_details === 'string'
                ? JSON.parse(jobRecord.additional_details)
                : jobRecord.additional_details;
        }

        // Fetch all existing HBL Documents under this job
        const existingHBLs = await knexDB('HBLDocuments')
            .where({ job_no: jobNo })
            .orderBy('id', 'desc');

        res.json({
            success: true,
            job: jobRecord,
            additionalDetails: addDetails,
            existingHBLs
        });
    } catch (error) {
        console.error('Error loading job init for HBL:', error);
        res.status(500).json({ success: false, message: 'Failed to load job init data: ' + error.message });
    }
});

// 3. Save / Update HBL Document & Render Single-Page A4 PDF
router.post('/save', authenticateJWT, async (req, res) => {
    const {
        job_no,
        document_type = 'Draft', // 'Draft' | 'Original'
        bl_no,
        bl_date,
        doc_data = {}
    } = req.body;

    const jobNo = parseInt(job_no);
    if (!jobNo || isNaN(jobNo)) {
        return res.status(400).json({ success: false, message: 'Valid Job Number is required' });
    }
    if (!bl_no || typeof bl_no !== 'string' || !bl_no.trim()) {
        return res.status(400).json({ success: false, message: 'B/L Number is required' });
    }

    const docTypeNormalized = (document_type || 'Draft').trim() === 'Original' ? 'Original' : 'Draft';

    // Original BL requires mandatory BL Date
    if (docTypeNormalized === 'Original' && (!bl_date || !String(bl_date).trim())) {
        return res.status(400).json({ success: false, message: 'B/L Date is mandatory for Original B/L' });
    }

    const userName = req.user?.user_name || req.user?.email || 'User';
    const userRole = req.user?.role || 'Operator';

    try {
        // Check if document already exists
        const existingDoc = await knexDB('HBLDocuments').where({ bl_no: bl_no.trim() }).first();

        if (existingDoc && existingDoc.is_locked) {
            // Check if there is an Approved edit request
            const approvedRequest = await knexDB('HBLEditRequests')
                .where({ bl_no: bl_no.trim(), status: 'Approved' })
                .first();

            if (!approvedRequest && userRole !== 'Admin' && userRole !== 'Director') {
                return res.status(403).json({
                    success: false,
                    is_locked: true,
                    message: 'This B/L has been locked permanently. Please submit an edit permission request to Admin.'
                });
            }
        }

        // Prepare local SSR Logo Base64
        let logoBase64 = "https://ssr.sirifreight.com/image/logo_Gh64uq2d8W82fDF5F8D7yeWNAgqTjc6h.jpeg";
        try {
            const logoPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'images', 'SSR_Logo.png');
            const logoBuf = await fs.readFile(logoPath);
            logoBase64 = `data:image/png;base64,${logoBuf.toString('base64')}`;
        } catch (err) {}

        const completeDocData = {
            ...doc_data,
            jobNo: String(jobNo),
            blNo: bl_no.trim(),
            blDate: bl_date || '',
            documentType: docTypeNormalized,
            companyLogo: logoBase64
        };

        // Render PDF locally using headless Puppeteer and hbl_document.html template
        let templateHtml = "";
        try {
            const templatePath = path.join(__dirname, '..', '..', 'frontend', 'public', 'pdf-static', 'hbl_document.html');
            templateHtml = await fs.readFile(templatePath, 'utf8');
        } catch (readErr) {
            const altPath = path.join(__dirname, '..', '..', 'frontend', 'dist', 'pdf-static', 'hbl_document.html');
            templateHtml = await fs.readFile(altPath, 'utf8');
        }

        const browser = await getBrowser();
        const page = await browser.newPage();
        let pdfBuffer;
        try {
            await page.setContent(templateHtml, { waitUntil: 'domcontentloaded', timeout: 5000 });
            await page.evaluate((payload) => {
                if (window.fillDocument) {
                    window.fillDocument(payload);
                }
            }, completeDocData);

            pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '5mm',
                    bottom: '5mm',
                    left: '5mm',
                    right: '5mm'
                }
            });
        } finally {
            await page.close().catch(() => {});
        }

        // Upload PDF Buffer to S3 Storage
        const filename = `HBL_${jobNo}_${bl_no.trim()}_${Date.now()}.pdf`;
        const uploadRes = await uploadFile({
            fileBuffer: pdfBuffer,
            key: filename,
            directory: 'hbl-documents',
            contentType: 'application/pdf'
        });

        let pdfUrl = uploadRes?.url || "";
        if (!pdfUrl && uploadRes?.key) {
            pdfUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${uploadRes.key}`;
        }
        if (!pdfUrl && pdfBuffer) {
            pdfUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
        }

        const dbPayload = {
            job_no: jobNo,
            document_type: docTypeNormalized,
            bl_no: bl_no.trim(),
            bl_date: bl_date || null,
            pdf_link: pdfUrl,
            status: docTypeNormalized === 'Original' ? 'Issued' : 'Draft',
            doc_data: JSON.stringify(completeDocData),
            updated_by: userName
        };

        let savedId;
        if (existingDoc) {
            await knexDB('HBLDocuments').where({ id: existingDoc.id }).update(dbPayload);
            savedId = existingDoc.id;

            // Audit log
            await knexDB('HBLAuditLogs').insert({
                bl_no: bl_no.trim(),
                job_no: jobNo,
                action: 'UPDATED',
                performed_by: userName,
                role: userRole,
                details: JSON.stringify({ document_type: docTypeNormalized, bl_date: bl_date || null })
            });

            // If an approved request was used, mark it as Completed
            await knexDB('HBLEditRequests')
                .where({ bl_no: bl_no.trim(), status: 'Approved' })
                .update({ status: 'Completed' });
        } else {
            dbPayload.created_by = userName;
            const [newId] = await knexDB('HBLDocuments').insert(dbPayload);
            savedId = newId;

            // Audit log
            await knexDB('HBLAuditLogs').insert({
                bl_no: bl_no.trim(),
                job_no: jobNo,
                action: 'CREATED',
                performed_by: userName,
                role: userRole,
                details: JSON.stringify({ document_type: docTypeNormalized, bl_date: bl_date || null })
            });
        }

        res.json({
            success: true,
            message: `${docTypeNormalized} B/L ${bl_no.trim()} saved and PDF generated successfully!`,
            id: savedId,
            blNo: bl_no.trim(),
            pdfUrl,
            documentType: docTypeNormalized
        });
    } catch (error) {
        console.error('Error saving HBL Document:', error);
        res.status(500).json({ success: false, message: 'Failed to process and save HBL: ' + error.message });
    }
});

// 4. HBL Register - Search & Filter
router.get('/register', authenticateJWT, async (req, res) => {
    try {
        const { search = '', document_type = '', is_locked = '' } = req.query;

        let query = knexDB('HBLDocuments').select('*').orderBy('id', 'desc');

        if (search && search.trim()) {
            const s = `%${search.trim()}%`;
            query = query.where(function() {
                this.where('bl_no', 'like', s)
                    .orWhere('job_no', 'like', s)
                    .orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(doc_data, '$.shipper')) LIKE ?", [s])
                    .orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(doc_data, '$.consignee')) LIKE ?", [s]);
            });
        }

        if (document_type && document_type !== 'all') {
            query = query.where({ document_type });
        }

        if (is_locked !== '' && is_locked !== 'all') {
            query = query.where({ is_locked: is_locked === '1' || is_locked === 'true' ? 1 : 0 });
        }

        const documents = await query;
        res.json({ success: true, documents });
    } catch (error) {
        console.error('Error fetching HBL register:', error);
        res.status(500).json({ success: false, message: 'Failed to load HBL register: ' + error.message });
    }
});

// 5. Get Single Document & Audit Logs
router.get('/document/:id', authenticateJWT, async (req, res) => {
    try {
        const doc = await knexDB('HBLDocuments').where({ id: req.params.id }).first();
        if (!doc) {
            return res.status(404).json({ success: false, message: 'HBL Document not found' });
        }

        const auditLogs = await knexDB('HBLAuditLogs')
            .where({ bl_no: doc.bl_no })
            .orderBy('created_at', 'desc');

        const pendingRequest = await knexDB('HBLEditRequests')
            .where({ bl_no: doc.bl_no, status: 'Pending' })
            .first();

        res.json({
            success: true,
            document: doc,
            auditLogs,
            pendingRequest: pendingRequest || null
        });
    } catch (error) {
        console.error('Error fetching HBL document details:', error);
        res.status(500).json({ success: false, message: 'Failed to load document: ' + error.message });
    }
});

// 6. Lock HBL Document Permanently (Director / Admin Only)
router.put('/lock/:id', authenticateJWT, async (req, res) => {
    const userRole = req.user?.role || '';
    if (userRole !== 'Director' && userRole !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Only Director or Admin can lock a B/L permanently.' });
    }

    try {
        const doc = await knexDB('HBLDocuments').where({ id: req.params.id }).first();
        if (!doc) {
            return res.status(404).json({ success: false, message: 'HBL Document not found' });
        }

        const userName = req.user?.user_name || req.user?.email || 'Director';

        await knexDB('HBLDocuments').where({ id: doc.id }).update({
            is_locked: 1,
            locked_by: userName,
            locked_at: new Date(),
            status: 'Locked'
        });

        await knexDB('HBLAuditLogs').insert({
            bl_no: doc.bl_no,
            job_no: doc.job_no,
            action: 'LOCKED',
            performed_by: userName,
            role: userRole,
            details: JSON.stringify({ reason: 'Permanently locked by Director' })
        });

        res.json({ success: true, message: `B/L ${doc.bl_no} is now locked permanently.` });
    } catch (error) {
        console.error('Error locking HBL:', error);
        res.status(500).json({ success: false, message: 'Failed to lock HBL: ' + error.message });
    }
});

// 7. Request Edit Permission for Locked BL
router.post('/request-edit', authenticateJWT, async (req, res) => {
    const { bl_no, job_no, reason } = req.body;
    if (!bl_no || !reason || !String(reason).trim()) {
        return res.status(400).json({ success: false, message: 'B/L number and reason are required' });
    }

    try {
        const userName = req.user?.user_name || req.user?.email || 'User';

        await knexDB('HBLEditRequests').insert({
            bl_no: bl_no.trim(),
            job_no: parseInt(job_no) || 0,
            requested_by: userName,
            reason: reason.trim(),
            status: 'Pending'
        });

        await knexDB('HBLAuditLogs').insert({
            bl_no: bl_no.trim(),
            job_no: parseInt(job_no) || 0,
            action: 'UNLOCK_REQUESTED',
            performed_by: userName,
            role: req.user?.role || 'Operator',
            details: JSON.stringify({ reason: reason.trim() })
        });

        res.json({ success: true, message: 'Edit permission request submitted to Admin successfully!' });
    } catch (error) {
        console.error('Error submitting edit request:', error);
        res.status(500).json({ success: false, message: 'Failed to submit edit request: ' + error.message });
    }
});

// 8. Review Edit Request (Admin / Director Approve or Reject)
router.put('/review-edit-request/:id', authenticateJWT, async (req, res) => {
    const userRole = req.user?.role || '';
    if (userRole !== 'Admin' && userRole !== 'Director') {
        return res.status(403).json({ success: false, message: 'Permission denied: Admin/Director only' });
    }

    const { status } = req.body; // 'Approved' | 'Rejected'
    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
    }

    try {
        const request = await knexDB('HBLEditRequests').where({ id: req.params.id }).first();
        if (!request) {
            return res.status(404).json({ success: false, message: 'Edit request not found' });
        }

        const userName = req.user?.user_name || req.user?.email || 'Admin';

        await knexDB('HBLEditRequests').where({ id: request.id }).update({
            status,
            reviewed_by: userName,
            reviewed_at: new Date()
        });

        if (status === 'Approved') {
            await knexDB('HBLDocuments').where({ bl_no: request.bl_no }).update({
                is_locked: 0,
                status: 'Unlocked for Edit'
            });
        }

        await knexDB('HBLAuditLogs').insert({
            bl_no: request.bl_no,
            job_no: request.job_no,
            action: status === 'Approved' ? 'UNLOCK_APPROVED' : 'UNLOCK_REJECTED',
            performed_by: userName,
            role: userRole,
            details: JSON.stringify({ reviewed_by: userName, status })
        });

        res.json({ success: true, message: `Edit request has been ${status.toLowerCase()}!` });
    } catch (error) {
        console.error('Error reviewing edit request:', error);
        res.status(500).json({ success: false, message: 'Failed to review request: ' + error.message });
    }
});

// 9. Get Audit Trail by BL No
router.get('/audit-logs/:blNo', authenticateJWT, async (req, res) => {
    try {
        const logs = await knexDB('HBLAuditLogs')
            .where({ bl_no: req.params.blNo })
            .orderBy('created_at', 'desc');

        res.json({ success: true, logs });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch audit trail: ' + error.message });
    }
});

export default router;
