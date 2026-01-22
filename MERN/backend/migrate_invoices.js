import { knexDB } from './Database.js';

async function migrate() {
    try {
        const hasTable = await knexDB.schema.hasTable('Invoices');

        if (!hasTable) {
            await knexDB.schema.createTable('Invoices', (table) => {
                table.string('invoice_no').primary();
                table.integer('job_no').unsigned().notNullable();
                table.date('invoice_date');
                table.json('customer_details');
                table.json('items');
                table.json('totals');
                table.timestamps(true, true);

                table.index('job_no');
            });
            console.log('Migration successful: Created Invoices table.');
        } else {
            console.log('Migration skipped: Invoices table already exists.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
