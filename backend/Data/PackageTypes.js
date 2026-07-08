import express from 'express';
const router = express.Router();

const PACKAGE_TYPES = [
  "BAGS", "BAILS", "BALES", "BARREL", "BOXES", "BULK", "BUNDLE", "CANS", "CARBOYS",
  "CARTONS", "CASES", "CHEST", "COILS", "COLLIES", "CONTAINER", "CRATES", "CYLINDER",
  "DRUMS", "FLASK", "FLEXITANKS", "FUTS", "HABBUCK", "IBC TOTES", "INGOT", "JOTTA",
  "JUMBLE BALE", "KEGGS", "LIFT", "LOGS", "PACKAGES", "PALLETS", "PALLS", "QUADS",
  "REELS", "ROLLS", "ROOLS", "SHIPPERS", "SKID & SKIDDED PKGS", "SLABS", "STEEL BLOCKS",
  "STEEL BULKS", "STEEL ENVELOPES", "TABLE", "TINS", "TRUNK", "UNITS", "WOODEN BOXES",
  "WOODEN CASES"
];

router.get('/', (req, res) => {
  res.json({ success: true, packageTypes: PACKAGE_TYPES });
});

export default router;
