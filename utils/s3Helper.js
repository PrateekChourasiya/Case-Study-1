const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');
const s3Client = require('../config/s3');

const BUCKET = process.env.S3_BUCKET_NAME;

/**
 * Upload a file buffer to S3.
 * @param {Object} file - req.file from multer (memoryStorage)
 * @param {string} category - e.g. "images", "pdf", "doc"
 * @returns {{ s3Key: string, uniqueName: string }}
 */
async function uploadToS3(file, category) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const s3Key = `${category}/${uniqueName}`;

    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype
    }));

    return { s3Key, uniqueName };
}

/**
 * Delete a file from S3.
 */
async function deleteFromS3(s3Key) {
    await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: s3Key
    }));
}

/**
 * Generate a presigned download URL (expires in 1 hour by default).
 * Optionally sets ResponseContentDisposition to force download with original filename.
 */
async function getPresignedDownloadUrl(s3Key, originalName = null, expiresInSeconds = 3600) {
    const params = {
        Bucket: BUCKET,
        Key: s3Key
    };

    if (originalName) {
        // Forces browser to download with the proper original file name
        params.ResponseContentDisposition = `attachment; filename="${encodeURIComponent(originalName)}"`;
    }

    const command = new GetObjectCommand(params);
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

module.exports = { uploadToS3, deleteFromS3, getPresignedDownloadUrl };
