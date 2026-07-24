# Database Maintenance (Automated Backup & S3 Upload)

A clean, 100% read-only MySQL database backup module for Node.js.

---

## 🔒 Safety Guarantee

- **Does it alter the database?** **NO.**
- `backup` is strictly a **100% read-only fetch operation**.
- It uses `mysqldump` to read table structures and data rows.
- It performs **zero** writes, **zero** table alterations, and **zero** deletions on your database.
- Automatically uploads compressed `.sql.gz` backup files to **Amazon S3**.

---

## ☁️ Amazon S3 Cloud Storage & Retention Rules

### 1. Local EC2 Retention (Max 7 Days)
- Keeps local backups in `backend/backups/` for **7 days**.
- Automatically deletes `.sql.gz` files older than 7 days to conserve local EC2 disk space.

### 2. Amazon S3 Cloud Retention (Max 3 Months / 90 Days)
- Automatically uploads backups to `s3://<S3_BUCKET>/backups/ssr_backup_YYYYMMDD_HHMMSS.sql.gz`.
- Inspects `s3://<S3_BUCKET>/backups/` and automatically deletes cloud backups older than **90 days (3 months)**.

---

## ⏰ Automated Daily Backup (8:00 PM IST / 14:30 UTC)

The backup scheduler is integrated directly into `backend/server.js`.

Whenever the backend server starts, `startBackupScheduler('30 14 * * *')` is activated:
- Automatically triggers every day at **8:00 PM IST** (14:30 UTC).
- Creates local compressed `.sql.gz` backup.
- Uploads to Amazon S3.
- Runs 7-day local EC2 cleanup & 90-day (3 months) S3 bucket cleanup.

---

## 💻 Manual CLI Commands

Run from `backend/`:

### Create Backup Immediately (Safe, Read-Only, Auto S3 Upload & Cleanups)
```bash
node database-maintenance/cli.js backup
```
*Or using npm shortcut:*
```bash
npm run backup
```

### Run Retention Cleanup Manually
```bash
node database-maintenance/cli.js cleanup
```
