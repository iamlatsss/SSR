#!/usr/bin/env node
import { createBackup, cleanOldLocalBackups } from './backup.js';
import { cleanOldS3Backups } from './s3.js';
import { startBackupScheduler } from './scheduler.js';

const args = process.argv.slice(2);
const command = args[0] ? args[0].toLowerCase() : 'help';

async function main() {
  try {
    switch (command) {
      case 'backup':
        await createBackup();
        break;

      case 'cleanup':
        console.log('[Cleanup] Running manual cleanup...');
        cleanOldLocalBackups(7);
        await cleanOldS3Backups(90);
        console.log('[Cleanup] Completed manual cleanup.');
        break;

      case 'schedule':
        startBackupScheduler();
        break;

      case 'help':
      default:
        console.log(`
Database Maintenance CLI
------------------------
Usage:
  # Create a single backup immediately and upload to S3:
  node database-maintenance/cli.js backup

  # Run retention cleanup (7 days local EC2 / 90 days S3 bucket):
  node database-maintenance/cli.js cleanup

  # Start automated daily backup daemon:
  node database-maintenance/cli.js schedule
`);
        break;
    }
  } catch (err) {
    console.error(`[CLI Error]`, err.message);
    process.exit(1);
  }
}

main();
