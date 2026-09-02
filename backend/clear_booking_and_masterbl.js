import { knexDB } from './Database.js';

async function clearData() {
  console.log('Starting data deletion for Booking Updates and Sea Master BL...');

  try {
    const buDeleted = await knexDB('BookingUpdates').del();
    console.log(`Deleted ${buDeleted} records from BookingUpdates.`);

    const mblDeleted = await knexDB('MasterBL').del();
    console.log(`Deleted ${mblDeleted} records from MasterBL.`);

    if (await knexDB.schema.hasTable('HBLDocuments')) {
      const hblDocDeleted = await knexDB('HBLDocuments').del();
      console.log(`Deleted ${hblDocDeleted} records from HBLDocuments.`);
    }

    if (await knexDB.schema.hasTable('Booking')) {
      const bookingDeleted = await knexDB('Booking').del();
      console.log(`Deleted ${bookingDeleted} records from Booking.`);
    }

    if (await knexDB.schema.hasTable('HouseBL')) {
      const houseBlDeleted = await knexDB('HouseBL').del();
      console.log(`Deleted ${houseBlDeleted} records from HouseBL.`);
    }

    console.log('Data deletion completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during data deletion:', error);
    process.exit(1);
  }
}

clearData();
