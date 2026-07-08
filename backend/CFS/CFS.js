import express from 'express';
import multer from 'multer';
import { knexDB } from "../Database.js";
import { authenticateJWT } from "../AuthAPI/Auth.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const uploadFields = upload.fields([
  { name: 'gstin_doc', maxCount: 1 },
  { name: 'pan_doc', maxCount: 1 },
  { name: 'iec_doc', maxCount: 1 },
  { name: 'kyc_letterhead_doc', maxCount: 1 }
]);

// Search CFS with pagination
router.get("/search", authenticateJWT, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = knexDB("Parties").where({ category_type: 'CFS' });
        if (search) {
            query = query.andWhere(function() {
                this.where("name", "like", `%${search}%`)
                    .orWhere("email", "like", `%${search}%`)
                    .orWhere("pan_no", "like", `%${search}%`)
                    .orWhere("marketing", "like", `%${search}%`);
            });
        }

        const totalResult = await query.clone().count("id as count").first();
        const total = totalResult ? totalResult.count : 0;

        const rows = await query.select("*")
            .orderBy("name", "asc")
            .limit(limit)
            .offset(offset);

        const parties = rows.map(row => {
            let parsedAddresses = [];
            if (row.addresses) {
                try {
                    parsedAddresses = typeof row.addresses === 'string' ? JSON.parse(row.addresses) : row.addresses;
                } catch (e) {
                    console.error("Error parsing addresses JSON:", e);
                }
            }
            return { ...row, addresses: parsedAddresses };
        });

        res.json({
            success: true,
            parties,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Error searching CFS:", error);
        res.status(500).json({ success: false, message: "Internal server error: " + error.message });
    }
});

// Get all CFS
router.get("/", authenticateJWT, async (req, res) => {
    try {
        const rows = await knexDB("Parties").where({ category_type: 'CFS' }).orderBy("name", "asc");
        const parties = rows.map(row => {
            let parsedAddresses = [];
            if (row.addresses) {
                try {
                    parsedAddresses = typeof row.addresses === 'string' ? JSON.parse(row.addresses) : row.addresses;
                } catch (e) {
                    console.error("Error parsing addresses JSON:", e);
                }
            }
            return { ...row, addresses: parsedAddresses };
        });
        res.json({ success: true, parties });
    } catch (error) {
        console.error("Error getting CFS:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Insert new CFS
router.post("/insert", authenticateJWT, uploadFields, async (req, res) => {
    try {
        const payload = {
            ...req.body,
            category_type: 'CFS',
            status: req.body.status || 'Enabled',
            party_status: req.body.party_status || 'Draft',
            addresses: req.body.addresses ? JSON.stringify(typeof req.body.addresses === 'string' ? JSON.parse(req.body.addresses) : req.body.addresses) : JSON.stringify([])
        };
        const [cfsId] = await knexDB("Parties").insert(payload);
        res.status(201).json({ success: true, message: "CFS created", id: cfsId });
    } catch (error) {
        console.error("Error inserting CFS:", error);
        res.status(500).json({ success: false, message: "Internal server error: " + error.message });
    }
});

// Update CFS
router.put("/update/:id", authenticateJWT, uploadFields, async (req, res) => {
    try {
        const { id } = req.params;
        const payload = {
            ...req.body,
            category_type: 'CFS',
            addresses: req.body.addresses ? JSON.stringify(typeof req.body.addresses === 'string' ? JSON.parse(req.body.addresses) : req.body.addresses) : JSON.stringify([])
        };
        delete payload.id;
        delete payload.created_at;
        delete payload.updated_at;

        await knexDB("Parties").where({ id }).update(payload);
        res.json({ success: true, message: "CFS updated" });
    } catch (error) {
        console.error("Error updating CFS:", error);
        res.status(500).json({ success: false, message: "Internal server error: " + error.message });
    }
});

// Delete CFS
router.delete("/delete/:id", authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        await knexDB("Parties").where({ id }).delete();
        res.json({ success: true, message: "CFS deleted successfully" });
    } catch (error) {
        console.error("Error deleting CFS:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

export default router;
