import { knexDB } from './Database.js';

async function migrate() {
    try {
        const hasColumn = await knexDB.schema.hasColumn('Booking', 'incoterms');

        if (!hasColumn) {
            await knexDB.schema.table('Booking', (table) => {
                table.string('incoterms');
            });
            console.log('Migration successful: Added incoterms column to Booking table.');
        } else {
            console.log('Migration skipped: incoterms column already exists.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
