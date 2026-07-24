import '../config.js';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { uploadBackupToS3, cleanOldS3Backups } from './s3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.resolve(__dirname, '../backups');

function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * Cleans up local EC2 backup files older than maxDays (default: 7 days).
 * @param {number} maxDays - Maximum age in days (default: 7)
 */
export function cleanOldLocalBackups(maxDays = 7) {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const cutoffTime = Date.now() - (maxDays * 24 * 60 * 60 * 1000);

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql.gz'))
    .map(f => {
      const fullPath = path.join(BACKUP_DIR, f);
      return {
        path: fullPath,
        filename: f,
        time: fs.statSync(fullPath).mtimeMs
      };
    })
    .sort((a, b) => b.time - a.time);

  let deletedCount = 0;
  files.forEach((item, index) => {
    // Keep top 7 newest backups AND delete files older than 7 days
    if (index >= 7 || item.time < cutoffTime) {
      try {
        fs.unlinkSync(item.path);
        console.log(`[Local Retention] Deleted old backup file: ${item.filename}`);
        deletedCount++;
      } catch (err) {
        console.error(`[Local Retention] Failed to delete ${item.filename}:`, err.message);
      }
    }
  });

  if (deletedCount === 0) {
    console.log(`[Local Retention] Local backups within 7-day threshold. No cleanup needed.`);
  }
}

function removeFailedBackupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Backup Cleanup] Deleted failed/partial backup file: ${path.basename(filePath)}`);
    }
  } catch (err) {
    console.error(`[Backup Cleanup] Failed to delete file ${path.basename(filePath)}:`, err.message);
  }
}

export async function createBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = process.env.MYSQL_PORT || '3306';
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'ssr';

  const filename = `${database}_backup_${formatTimestamp()}.sql.gz`;
  const backupPath = path.join(BACKUP_DIR, filename);

  console.log(`[Backup] Starting full backup for database '${database}'...`);
  console.log(`[Backup] Target file: ${filename}`);

  const dumpArgs = [
    `--host=${host}`,
    `--port=${port}`,
    `--user=${user}`,
    `--databases`, database,
    `--add-drop-database`,
    `--routines`,
    `--triggers`,
    `--events`,
    `--no-tablespaces`,
    `--skip-lock-tables`,
    `--set-gtid-purged=OFF`,
    `--quick`,
    `--extended-insert`
  ];

  if (password) {
    process.env.MYSQL_PWD = password;
  }

  return new Promise((resolve, reject) => {
    const dumpProc = spawn('mysqldump', dumpArgs, { windowsHide: true });
    const gzipProc = zlib.createGzip();
    const fileStream = fs.createWriteStream(backupPath);

    let stderr = '';
    let hasFailed = false;

    dumpProc.stderr.on('data', chunk => { stderr += chunk.toString(); });

    dumpProc.on('error', err => {
      hasFailed = true;
      fileStream.destroy();
      removeFailedBackupFile(backupPath);
      reject(new Error(`Failed to spawn mysqldump CLI: ${err.message}`));
    });

    dumpProc.on('close', code => {
      if (code !== 0) {
        hasFailed = true;
        console.error(`[Backup] FAILED with code ${code}: ${stderr.trim()}`);
        fileStream.destroy();
        removeFailedBackupFile(backupPath);
        return reject(new Error(`mysqldump failed: ${stderr.trim()}`));
      }
    });

    fileStream.on('finish', async () => {
      if (hasFailed) return;

      console.log(`[Backup] SUCCESS! Full database backup saved to: ${filename}`);
      
      try {
        // 1. Upload to S3 if configured
        await uploadBackupToS3(backupPath);

        // 2. Local EC2 Retention Cleanup (max 7 days)
        cleanOldLocalBackups(7);

        // 3. Amazon S3 Retention Cleanup (max 90 days / 3 months)
        await cleanOldS3Backups(90);

        resolve(backupPath);
      } catch (err) {
        console.error(`[Backup Post-Processing Error]`, err.message);
        resolve(backupPath);
      }
    });

    fileStream.on('error', err => {
      hasFailed = true;
      removeFailedBackupFile(backupPath);
      reject(err);
    });

    dumpProc.stdout.pipe(gzipProc).pipe(fileStream);
  });
}
