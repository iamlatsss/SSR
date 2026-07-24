import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

function getS3Client() {
  const region = process.env.S3_REGION || 'us-east-1';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    client: new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    }),
    bucket
  };
}

/**
 * Uploads a local backup file to Amazon S3 if credentials exist.
 * @param {string} filePath - Path to local .sql.gz backup file
 * @returns {Promise<boolean>}
 */
export async function uploadBackupToS3(filePath) {
  const s3Config = getS3Client();

  if (!s3Config) {
    console.log('[S3] S3 environment variables missing. Skipping cloud upload.');
    return false;
  }

  const { client, bucket } = s3Config;
  const fileName = path.basename(filePath);
  const s3Key = `backups/${fileName}`;

  console.log(`[S3] Uploading ${fileName} to S3 bucket '${bucket}'...`);

  try {
    const fileStream = fs.createReadStream(filePath);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: fileStream,
      ContentType: 'application/gzip'
    });

    await client.send(command);
    console.log(`[S3] SUCCESS! Uploaded ${fileName} to s3://${bucket}/${s3Key}`);
    return true;
  } catch (err) {
    console.error(`[S3] Upload failed for ${fileName}:`, err.message);
    return false;
  }
}

/**
 * Cleans up backup objects in S3 older than a specified number of days (default: 90 days / 3 months).
 * @param {number} days - Maximum age of S3 backup objects in days (default: 90)
 * @returns {Promise<number>} Number of deleted S3 objects
 */
export async function cleanOldS3Backups(days = 90) {
  const s3Config = getS3Client();
  if (!s3Config) return 0;

  const { client, bucket } = s3Config;
  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

  try {
    const listCmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: 'backups/'
    });

    const response = await client.send(listCmd);
    if (!response.Contents || response.Contents.length === 0) {
      return 0;
    }

    const expiredObjects = response.Contents.filter(item => {
      if (!item.Key || item.Key === 'backups/') return false;
      const lastModified = new Date(item.LastModified).getTime();
      return lastModified < cutoffTime;
    });

    if (expiredObjects.length === 0) {
      console.log(`[S3 Retention] No S3 backups older than ${days} days (3 months) found.`);
      return 0;
    }

    console.log(`[S3 Retention] Found ${expiredObjects.length} S3 backup(s) older than ${days} days (3 months). Cleaning up...`);

    const deleteCmd = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: expiredObjects.map(obj => ({ Key: obj.Key }))
      }
    });

    await client.send(deleteCmd);
    expiredObjects.forEach(obj => {
      console.log(`[S3 Retention] Deleted expired S3 backup: s3://${bucket}/${obj.Key}`);
    });

    return expiredObjects.length;
  } catch (err) {
    console.error(`[S3 Retention] Error cleaning up old S3 backups:`, err.message);
    return 0;
  }
}
