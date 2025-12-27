import { knexDB } from './Database.js';

async function migrate() {
    try {
        const hasColumn = await knexDB.schema.hasColumn('Booking', 'igm_no');

        if (!hasColumn) {
            await knexDB.schema.table('Booking', (table) => {
                table.string('igm_no');
                table.string('igm_on');
                table.integer('cha').unsigned(); // FK to Customers
                table.integer('cfs').unsigned(); // FK to Customers
                table.string('freight_amount');
                table.string('freight_currency');
                table.date('do_validity');
                // container_number might already exist or be part of manual fields, but adding if missing
                // Checking if container_number exists effectively
            });

            // Add container_number separately if not checking above, but knex schema builder is chainable
            // Let's checks explicitly for container_number 
            const hasContainer = await knexDB.schema.hasColumn('Booking', 'container_number');
            if (!hasContainer) {
                await knexDB.schema.table('Booking', (table) => {
                    table.string('container_number');
                });
            }

            console.log('Migration successful: Added IGM columns to Booking table.');
        } else {
            console.log('Migration skipped: Columns already exist.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
