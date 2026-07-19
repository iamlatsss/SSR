import { knexDB } from '../Database.js';

async function clean() {
    try {
        console.log("Cleaning invoices...");
        const deletedProformas = await knexDB("ProformaInvoices").del();
        const deletedInvoices = await knexDB("Invoices").del();
        console.log(`Successfully deleted ${deletedProformas} Proforma Invoice(s) and ${deletedInvoices} Tax Invoice(s).`);
        process.exit(0);
    } catch (err) {
        console.error("Error cleaning invoices:", err);
        process.exit(1);
    }
}

clean();
