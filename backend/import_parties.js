import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { knexDB } from './Database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Wait for Database.js IIFE initializations (table creation, seeding) to complete
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function importParties() {
  // Find the data file
  let filePath = path.resolve(__dirname, 'parties.json');
  if (!fs.existsSync(filePath)) {
    filePath = path.resolve(__dirname, 'parties.js');
  }
  if (!fs.existsSync(filePath)) {
    console.error(`Error: Neither parties.json nor parties.js found in ${__dirname}`);
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const parties = JSON.parse(rawData);
    console.log(`Loaded ${parties.length} parties from file.`);

    // Wait for Database.js startup initializations to complete
    console.log("Waiting 8 seconds for Database startup initializations to complete...");
    await delay(8000);

    console.log("Starting import...");
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const item of parties) {
      const companyName = item.company_name ? item.company_name.trim() : '';
      if (!companyName) {
        console.warn(`Skipping party with empty company_name (party_id: ${item.party_id})`);
        skippedCount++;
        continue;
      }

      // Map country_id to a readable country name
      let country = 'India';
      const cId = String(item.country_id || '').trim();
      const countryMap = {
        '99': 'India', '100': 'India',
        '44': 'China',
        '209': 'Thailand',
        '221': 'UAE',
        '107': 'Hong Kong', '187': 'Hong Kong',
        '81': 'Germany', '114': 'Germany',
        '222': 'United Kingdom',
        '223': 'USA',
        '230': 'Vietnam',
      };
      country = countryMap[cId] || (cId ? 'Overseas' : 'India');

      // Build the address object with ALL fields from JSON
      const addressObj = {
        email: item.email || '',
        telephone: item.phone || '',
        fax: '',
        tan_no: '',
        gst_no: (item.gst && item.gst !== 'NA') ? item.gst : '',
        address_line1: item.address1 || '',
        address_line2: item.address2 || '',
        city: item.city || '',
        pin_code: item.pincode || '',
        country: country,
        gst_state: '',
        is_head_office: 'Yes',
        is_sez: 'No',
        status: 'Enabled',
        is_default: true
      };

      const payload = {
        name: companyName,
        email: item.email || '',
        pan_no: (item.pan_no && item.pan_no !== 'NA') ? item.pan_no : '',
        web_url: item.website || '',
        party_status: 'Data Updated',
        status: 'Enabled',
        addresses: JSON.stringify([addressObj])
      };

      // Also map contact_person if available
      if (item.contact_person && item.contact_person.trim()) {
        payload.director_name = item.contact_person.trim();
      }

      try {
        const existing = await knexDB("Parties").where({ name: companyName }).first();
        if (existing) {
          await knexDB("Parties").where({ id: existing.id }).update(payload);
          updatedCount++;
        } else {
          await knexDB("Parties").insert(payload);
          insertedCount++;
        }
      } catch (err) {
        // Handle duplicate name errors gracefully
        if (err.code === 'ER_DUP_ENTRY') {
          console.warn(`Duplicate entry for "${companyName}", skipping.`);
          skippedCount++;
        } else {
          console.error(`Error processing "${companyName}":`, err.message);
          skippedCount++;
        }
      }
    }

    console.log(`\nImport completed successfully!`);
    console.log(`  Inserted: ${insertedCount}`);
    console.log(`  Updated:  ${updatedCount}`);
    console.log(`  Skipped:  ${skippedCount}`);
    console.log(`  Total:    ${parties.length}`);
  } catch (err) {
    console.error("Error importing parties:", err);
  } finally {
    process.exit(0);
  }
}

importParties();
