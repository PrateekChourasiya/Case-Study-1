# AWS S3 for File Storage — A Beginner-Friendly Guide

This guide walks you through uploading files to **real AWS S3** from a Node.js Express app running on your local machine — no simulation, no fakes.

> [!IMPORTANT]
> **"Run AWS services locally" means:** your Node.js app runs on `localhost:5000` as usual, but instead of saving files to your hard drive (`uploads/images/photo.png`), it sends them over the internet straight to Amazon's cloud storage (`s3://my-bucket/images/photo.png`). That's it — that's what every real production app does.

---

## Table of Contents

1. [What is AWS S3?](#1-what-is-aws-s3)
2. [Why S3 Over Local Disk?](#2-why-s3-over-local-disk)
3. [Core AWS Concepts You Need](#3-core-aws-concepts-you-need)
4. [The Big Picture — How It All Fits Together](#4-the-big-picture--how-it-all-fits-together)
5. [Step 1: Create a Free AWS Account](#5-step-1-create-a-free-aws-account)
6. [Step 2: Create an S3 Bucket](#6-step-2-create-an-s3-bucket)
7. [Step 3: Create an IAM User (Programmatic Credentials)](#7-step-3-create-an-iam-user-programmatic-credentials)
8. [Step 4: Install AWS SDK & Configure .env](#8-step-4-install-aws-sdk--configure-env)
9. [Step 5: Code — S3 Client Config (`config/s3.js`)](#9-step-5-code--s3-client-config-configs3js)
10. [Step 6: Code — S3 Helper (`utils/s3Helper.js`)](#10-step-6-code--s3-helper-utilss3helperjs)
11. [Step 7: Modify uploadMiddleware.js (Disk → Memory)](#11-step-7-modify-uploadmiddlewarejs-disk--memory)
12. [Step 8: Update fileController.js for S3](#12-step-8-update-filecontrollerjs-for-s3)
13. [Step 9: Update the File Model](#13-step-9-update-the-file-model)
14. [Local Disk vs. S3 — Quick Comparison](#14-local-disk-vs-s3--quick-comparison)
15. [Troubleshooting](#15-troubleshooting)
16. [Appendix: LocalStack (Optional — Offline Dev Only)](#16-appendix-localstack-optional--offline-dev-only)

---

## 1. What is AWS S3?

**Amazon S3 (Simple Storage Service)** is a giant, infinitely scalable **hard drive in the cloud** provided by Amazon Web Services.

```
uploads/images/photo.png        ← your current approach (local disk)
s3://my-bucket/images/photo.png ← the S3 approach (Amazon's cloud servers)
```

**Is it free?** — AWS gives new accounts a **12-month Free Tier**: 5 GB storage, 20,000 downloads, 2,000 uploads per month — all free. For a learning project you will never exceed this. After the free tier it costs roughly \$0.023 per GB/month (100 files × 1 MB = \$0.003/month — negligible).

---

## 2. Why S3 Over Local Disk?

| Problem with Local Disk | S3 Solution |
| :--- | :--- |
| Server crashes → files **lost** | S3 replicates across **3+ data centers** (99.999999999% durability) |
| Can't share files between multiple servers | All servers read from the same bucket |
| Disk runs out of space | S3 storage is **unlimited** |
| No built-in CDN or access control | Integrates with CloudFront CDN & fine-grained IAM policies |
| Files lost on redeployment (Render, Railway, etc.) | S3 is separate from your server — files persist forever |

---

## 3. Core AWS Concepts You Need

You already know how to create an EC2 instance and upload files to S3 via the AWS website. Here are the remaining concepts your Node.js app needs:

### Bucket
A top-level container for files. Think of it as the root folder in S3. Bucket names are **globally unique** — no two people on Earth can have the same bucket name. Example: `prateek-casestudy-uploads`.

### Object
A single file stored in a bucket. An object has three parts:
- **Key** — the file path inside the bucket (e.g. `images/photo.png`)
- **Body** — the actual binary file data
- **Metadata** — headers like `Content-Type: image/png`

### Region
Buckets live in a geographic region of Amazon's data centers. Use `ap-south-1` (Mumbai) for the lowest latency from India, or whichever region your AWS account allows (lab/sandbox accounts may lock you to a specific region like `ap-southeast-2` Sydney — that works fine too).

### IAM Credentials
When your app talks to S3 programmatically (not through the website), it authenticates with two strings:
- **Access Key ID** — like a username. Example: `AKIAIOSFODNN7EXAMPLE`
- **Secret Access Key** — like a password. Example: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

> [!WARNING]
> **Never hardcode these in your code or commit them to Git.** Store them in `.env` (which must be in `.gitignore`). They give full programmatic access to your AWS account.

### Presigned URL
Your S3 bucket is private — no one can access files directly via a URL. A **presigned URL** is a temporary, time-limited download link you generate on the server. It has your AWS signature baked into the URL itself, so the client can download that one specific file for a limited window (e.g., 1 hour) without needing their own AWS credentials. After the time limit the link simply stops working.

Example: `https://my-bucket.s3.ap-south-1.amazonaws.com/images/photo.png?X-Amz-Expires=3600&...`

---

## 4. The Big Picture — How It All Fits Together

**Uploading:**
```
Your Laptop (localhost:5000)
       │
       │  User POSTs a file to /api/file/upload
       ▼
  Express App (Node.js)
       │
       │  1. Multer holds the file in RAM (not disk)
       │  2. App sends the buffer → AWS SDK → real S3
       ▼
  AWS S3 Bucket (ap-south-1 / Mumbai)
  s3://prateek-casestudy-uploads/images/photo.png
       │
       │  App saves the S3 key → MongoDB
       ▼
  MongoDB Atlas
  { s3Key: "images/photo.png", ... }
```

**Downloading:**
```
User requests GET /api/file/:id/download
       │
       ▼
  Express App generates a presigned URL (valid 1 hour)
       │
       ▼
  Returns URL → user pastes it in browser → file downloads directly from S3
```

---

## 5. Step 1: Create a Free AWS Account

Skip this if you already have one.

1. Go to https://aws.amazon.com/free/ → **"Create a Free Account"**.
2. Enter your email, choose a username and password.
3. Add your phone number for OTP verification.
4. Add a **credit/debit card** (AWS requires it but will not charge you within Free Tier limits).
5. Choose **"Basic support — Free"** plan.
6. Sign in to the **AWS Management Console**.

---

## 6. Step 2: Create an S3 Bucket

1. In the AWS Console, search for **S3** → click it.
2. Click **"Create bucket"**.
3. **Bucket name**: `prateek-casestudy-uploads` (if taken, append a number, e.g. `-2003`).
4. **Region**: `ap-south-1` (Asia Pacific — Mumbai).
5. **Block Public Access**: keep **all checkboxes checked** (we use presigned URLs for private downloads — no need for public access).
6. Leave everything else as default → **Create bucket**.

✅ Done. Files uploaded here persist permanently until you delete them.

---

## 7. Step 3: Create an IAM User (Programmatic Credentials)

> [!IMPORTANT]
> Never use your root AWS account credentials in code. Create a dedicated IAM user with only the permissions it needs.

### Create the user:

1. In the AWS Console, search for **IAM** → click it.
2. Left sidebar → **Users** → **Create user**.
3. **User name**: `casestudy-app-user` → **Next**.
4. Select **"Attach policies directly"** → search for `AmazonS3FullAccess` → check it → **Next** → **Create user**.

### Generate access keys:

1. Click on `casestudy-app-user` → **Security credentials** tab.
2. Scroll to **Access keys** → **Create access key**.
3. Use case: **"Application running outside AWS"** → **Next** → **Create access key**.
4. **Copy both keys now** (or download the CSV). You **cannot** see the Secret Access Key again after leaving this page.

---

## 8. Step 4: Install AWS SDK & Configure .env

### Install the packages:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

| Package | Purpose |
|---|---|
| `@aws-sdk/client-s3` | Upload, download, delete S3 objects |
| `@aws-sdk/s3-request-presigner` | Generate presigned download URLs |

### Add to your `.env`:

```env
# AWS S3
AWS_ACCESS_KEY_ID=AKIA...your_key...
AWS_SECRET_ACCESS_KEY=your_secret_key...
AWS_REGION=ap-south-1
S3_BUCKET_NAME=prateek-casestudy-uploads
```

(Your existing `PORT`, `DB_STRING`, `JWT_KEY`, `MAX_FILE_SIZE_MB` stay as they are.)

---

## 9. Step 5: Code — S3 Client Config (`config/s3.js`)

Create `config/s3.js`:

```javascript
const { S3Client } = require('@aws-sdk/client-s3');

const clientConfig = {
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
};

// Optional: override endpoint for LocalStack offline dev (see Appendix)
if (process.env.S3_ENDPOINT) {
    clientConfig.endpoint = process.env.S3_ENDPOINT;
    clientConfig.forcePathStyle = true;
    // forcePathStyle: AWS normally uses subdomain URLs like
    //   https://my-bucket.s3.amazonaws.com/file.png
    // LocalStack can't do subdomains locally, so it needs path-style URLs:
    //   http://localhost:4566/my-bucket/file.png
    // This flag forces path-style. For real AWS it's not needed (omitted automatically).
}

const s3Client = new S3Client(clientConfig);

module.exports = s3Client;
```

For real AWS, you do **not** set `S3_ENDPOINT` in `.env`. The SDK automatically targets `https://s3.amazonaws.com`.

---

## 10. Step 6: Code — S3 Helper (`utils/s3Helper.js`)

Create `utils/s3Helper.js`:

```javascript
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
 */
async function getPresignedDownloadUrl(s3Key, expiresInSeconds = 3600) {
    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: s3Key
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

module.exports = { uploadToS3, deleteFromS3, getPresignedDownloadUrl };
```

---

## 11. Step 7: Modify uploadMiddleware.js (Disk → Memory)

> [!IMPORTANT]
> **The key shift:** Multer currently uses `diskStorage` (saves to your hard drive). We switch to `memoryStorage()` so the file is held in RAM as a `Buffer`, then forwarded straight to S3. The file never touches your disk.

```javascript
// middleware/uploadMiddleware.js (S3 version)
const multer = require('multer');
const AppError = require('../utils/AppError');
const { getFileCategory, isFileAllowed } = require('../utils/fileCategories');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (!isFileAllowed(file)) {
        return cb(new AppError('This file type is prohibited for security reasons.', 400));
    }
    req.fileCategory = getFileCategory(file);
    cb(null, true);
};

const maxSizeBytes = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024;

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeBytes }
});

module.exports = upload;
```

The `crypto` and `path` imports from the disk version are no longer needed here — unique filenames are now generated inside `s3Helper.js`.

---

## 12. Step 8: Update fileController.js for S3

Replace the disk-based upload/download/delete with S3 operations. The `subfolderPath` field becomes `s3Key`, and downloads return a presigned URL instead of streaming from disk.

```javascript
// controllers/fileController.js — changed functions only

const path = require('path');
const File = require('../models/file');
const User = require('../models/user');
const AppError = require('../utils/AppError');
const { uploadToS3, deleteFromS3, getPresignedDownloadUrl } = require('../utils/s3Helper');

// UPLOAD
const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new AppError('No file provided. Please attach a file under field name "file".', 400));
        }

        const category = req.fileCategory;
        const { s3Key, uniqueName } = await uploadToS3(req.file, category);
        const displayName = req.body.name?.trim() || req.file.originalname;

        const file = await File.create({
            name: displayName,
            originalName: req.file.originalname,
            systemFilename: uniqueName,
            category,
            type: req.file.mimetype,
            extension: path.extname(req.file.originalname).toLowerCase(),
            size: req.file.size,
            s3Key,
            upload_at: new Date(),
            uploaded_by: req.result._id
        });

        await User.findByIdAndUpdate(req.result._id, {
            $push: { filesUploaded: file._id },
            $inc: { filesUploadedCount: 1 }
        });

        res.status(201).json({
            success: true,
            message: 'File uploaded successfully to S3.',
            data: { file }
        });
    } catch (err) {
        next(err);
    }
};

// DOWNLOAD — returns a presigned URL (valid 1 hour)
const downloadFile = async (req, res, next) => {
    try {
        const file = await File.findOne({ _id: req.params.id, uploaded_by: req.result._id });
        if (!file) {
            return next(new AppError('File not found or you are not authorized to download it.', 404));
        }

        const downloadUrl = await getPresignedDownloadUrl(file.s3Key);

        res.status(200).json({
            success: true,
            message: 'Download URL generated. Valid for 1 hour.',
            data: { downloadUrl }
        });
    } catch (err) {
        next(err);
    }
};

// DELETE — removes from both S3 and MongoDB
const deleteFile = async (req, res, next) => {
    try {
        const file = await File.findOne({ _id: req.params.id, uploaded_by: req.result._id });
        if (!file) {
            return next(new AppError('File not found or you are not authorized to delete it.', 404));
        }

        await deleteFromS3(file.s3Key);
        await File.findByIdAndDelete(file._id);
        await User.findByIdAndUpdate(req.result._id, {
            $pull: { filesUploaded: file._id },
            $inc: { filesUploadedCount: -1 }
        });

        res.status(200).json({
            success: true,
            message: 'File deleted from S3 and database.',
            data: null
        });
    } catch (err) {
        next(err);
    }
};
```

---

## 13. Step 9: Update the File Model

In `models/file.js`, replace the `subfolderPath` field with `s3Key`:

```javascript
// Remove:
subfolderPath: { type: String, required: true }

// Add:
s3Key: { type: String, required: true }  // e.g. "images/173200123-abc123.png"
```

---

## 14. Local Disk vs. S3 — Quick Comparison

| | Local Disk (current) | Real AWS S3 (this guide) |
|---|---|---|
| **Where files live** | Your laptop | Amazon's servers (Mumbai) |
| **Persistence** | Lost on crash/redeploy | Permanent |
| **Capacity** | Limited by disk | Unlimited |
| **Download method** | `res.download()` | Presigned URL |
| **Multi-server** | ✗ | ✓ |
| **Access control** | None | IAM policies |
| **Internet required** | No | Yes |
| **Setup time** | Zero | ~15 minutes |

---

## 15. Troubleshooting

| Error | Cause | Fix |
| :--- | :--- | :--- |
| `CredentialsProviderError` | Missing or wrong keys in `.env` | Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` match your IAM user exactly |
| `NoSuchBucket` | `.env` bucket name doesn't match the real bucket | Check `S3_BUCKET_NAME` spelling — case-sensitive |
| `AccessDenied` | IAM user lacks S3 permission | IAM → your user → attach `AmazonS3FullAccess` |
| `InvalidSignatureException` | System clock out of sync | Windows: Settings → Time → Sync Now |
| `EntityTooLarge` | File exceeds `MAX_FILE_SIZE_MB` | Increase the limit in `.env` or use a smaller file |
| `NetworkingError` | No internet, or VPN blocking AWS endpoints | Check connection; disconnect VPN if needed |
| `InvalidBucketName` | Uppercase or underscores in bucket name | Bucket names allow only lowercase letters, numbers, and hyphens |

---

## 16. Appendix: LocalStack (Optional — Offline Dev Only)

> [!NOTE]
> Everything above uses **real AWS S3**. This appendix is entirely optional — it covers **LocalStack**, a tool that simulates S3 on your machine for offline development. Skip it unless you specifically need to work without internet or an AWS account.

### What is it?
LocalStack runs a fake AWS inside a Docker container on your laptop. Your app talks to `http://localhost:4566` instead of `https://s3.amazonaws.com`, using the exact same AWS SDK calls. No code changes needed — just swap `.env` values.

### Setup:

1. **Install Docker Desktop**: https://www.docker.com/products/docker-desktop/
2. **Start LocalStack**:
   ```bash
   docker run --rm -it -p 4566:4566 localstack/localstack
   ```
3. **Create a local bucket** (install AWS CLI from https://aws.amazon.com/cli/ first):
   ```bash
   aws configure
   # Access Key ID: test
   # Secret Access Key: test
   # Region: ap-south-1
   # Output: json

   aws --endpoint-url=http://localhost:4566 s3 mb s3://casestudy-uploads
   ```
4. **Switch `.env`** to LocalStack mode:
   ```env
   AWS_ACCESS_KEY_ID=test
   AWS_SECRET_ACCESS_KEY=test
   AWS_REGION=ap-south-1
   S3_BUCKET_NAME=casestudy-uploads
   S3_ENDPOINT=http://localhost:4566
   ```
   The `S3_ENDPOINT` line is what activates LocalStack mode in `config/s3.js`. Remove it to switch back to real AWS.

### When would you use this?
- Working offline (flight, no Wi-Fi)
- Running automated tests that shouldn't hit real AWS
- Team projects where not everyone has AWS credentials

For learning, **stick to real AWS S3** — it's simpler and you learn the actual workflow.
