import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, 'ports.json');

// Helper to load data
const loadPortsData = () => {
    try {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error loading ports data:", err);
        return null;
    }
};

/**
 * GET /ports
 * Query params:
 * - country: (Optional) Filter by country name (case-insensitive)
 * Returns: { country_name: [ports...] } or { ports: [ports...] } if specific country requested
 */
router.get('/', (req, res) => {
    const { country } = req.query;
    const allPorts = loadPortsData();

    if (!allPorts) {
        return res.status(500).json({ error: "Failed to load ports data" });
    }

    if (country) {
        // Case-insensitive search for country key
        const countryKey = Object.keys(allPorts).find(k => k.toLowerCase() === country.toLowerCase());

        if (countryKey) {
            return res.status(200).json({
                success: true,
                country: countryKey,
                ports: allPorts[countryKey]
            });
        } else {
            return res.status(404).json({ error: "Country not found" });
        }
    }

    // Return all data if no filter
    return res.status(200).json({ success: true, data: allPorts });
});

export default router;
