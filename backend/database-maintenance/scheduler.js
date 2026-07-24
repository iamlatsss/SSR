import '../config.js';
import cron from 'node-cron';
import { createBackup } from './backup.js';

/**
 * Starts the automated backup cron task.
 * Default schedule: "30 14 * * *" (Every day at 8:00 PM IST / 14:30 UTC).
 */
export function startBackupScheduler(cronExpression = null) {
  const schedule = cronExpression || process.env.CRON_SCHEDULE || '30 14 * * *';

  console.log(`[Scheduler] Initializing automated backup with schedule: '${schedule}' (8:00 PM IST)`);

  cron.schedule(schedule, async () => {
    console.log(`[Scheduler] Trigger fired (${new Date().toISOString()}). Starting backup...`);
    try {
      await createBackup();
      console.log('[Scheduler] Daily automated backup completed successfully.');
    } catch (err) {
      console.error('[Scheduler] Automated backup failed:', err.message);
    }
  });

  console.log(`[Scheduler] Active! Daily backup will trigger according to pattern: '${schedule}'`);
}

// Allow running as a standalone background process: node database-maintenance/scheduler.js
if (process.argv[1] && process.argv[1].endsWith('scheduler.js')) {
  startBackupScheduler();
}
