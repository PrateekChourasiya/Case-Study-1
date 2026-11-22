# The Complete Beginner-Friendly Guide to Multer

This guide explains **Multer** from the ground up: why it exists, how it works under the hood, standard code patterns from the official docs, and an in-depth breakdown of every single line in [middleware/uploadMiddleware.js](file:///c:/Users/Prateek%20Chourasiya/Desktop/CaseStudy/middleware/uploadMiddleware.js).

---

## 1. What is Multer and Why Do We Need It?

### The Core Problem: Why Can't Express Handle File Uploads by Default?
When you send normal data (like logging in with email and password), the browser sends text formatted as JSON:
```http
Content-Type: application/json

{"emailId": "user@example.com", "password": "123"}
```
Express easily reads this with `app.use(express.json())`.

However, files (images, PDFs, videos) are **not text**—they are raw **binary data** (millions of `0`s and `1`s). When you submit a form with a file, the browser packages it using a special encoding called:
```http
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```
`express.json()` and `express.urlencoded()` **cannot parse multipart/form-data**. If you try to upload a file without a multipart parser, `req.body` will be completely empty (`{}`), and your file will be lost in the raw network stream.

### Where Multer Steps In
**Multer** is a Node.js middleware for Express that intercepts incoming `multipart/form-data` requests. It:
1. Slices open the incoming binary data stream.
2. Extracts non-file text fields and places them neatly into `req.body`.
3. Streams the uploaded file(s) onto your computer's hard disk (or RAM) and attaches metadata about the file to **`req.file`** (or `req.files`).

```text
[ Client Upload ] 
       │
       ▼ (multipart/form-data stream)
[ Multer Middleware ]
       │
       ├── Saves binary file to Disk ──► (e.g. uploads/images/photo.png)
       ├── Puts text fields ───────────► req.body (e.g. { name: "My Report" })
       └── Puts file details ──────────► req.file (filename, size, path, etc.)
       │
       ▼
[ Your Controller / next() ]
```

---

## 2. Common & Starter Code from Multer's Official Documentation

Before diving into custom code, let's look at the standard patterns you will find in Multer's documentation.

### 2.1 The Absolute Simplest Starter Code
```javascript
const express = require('express');
const multer = require('multer');

// Tell multer where to save files
const upload = multer({ dest: 'uploads/' });

const app = express();

app.post('/profile', upload.single('avatar'), (req, res) => {
    // req.file contains info about 'avatar'
    // req.body contains any text fields sent along with the form
    console.log(req.file);
    console.log(req.body);
    res.send('Uploaded successfully!');
});
```

> **Why is `{ dest: 'uploads/' }` rarely used in production?**
> When you use `dest`, Multer strips off the original file name and the file extension for security (saving files as random strings like `a4f89d38c10e`). Because there is no `.png` or `.pdf` extension, operating systems don't know how to open the file. To control file names and extensions, we use **`multer.diskStorage()`**.

---

### 2.2 The 5 Upload Methods Provided by Multer

Depending on how many files and input fields you have, Multer gives you 5 different methods to attach as route middleware:

| Method | When to Use | Where Data Arrives |
| :--- | :--- | :--- |
| `upload.single('fieldName')` | Uploading exactly **one single file** from a field named `'fieldName'`. | `req.file` |
| `upload.array('fieldName', maxCount)` | Uploading **multiple files from one input** (e.g. `<input type="file" name="photos" multiple>`). | `req.files` (Array) |
| `upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'gallery', maxCount: 8 }])` | Uploading files from **different form fields**. | `req.files['avatar']`<br>`req.files['gallery']` |
| `upload.none()` | For forms that use `multipart/form-data` but **only contain text fields** (rejects any files). | `req.body` only |
| `upload.any()` | Accepts any file from any field name. *(Caution: Avoid in production as it can accept unexpected files).* | `req.files` (Array) |

---

### 2.3 Disk Storage vs. Memory Storage

Multer provides two storage engines:

1. **`multer.diskStorage()`** *(Used in our project)*:
   Streams files straight onto the server's local hard drive. 
   - **Pro:** Can handle large files (e.g. 100 MB or 1 GB) without crashing server memory.
   - **Use cases:** Local file management, intranet servers, storing images/documents on local disk.

2. **`multer.memoryStorage()`**:
   Stores files temporarily in the server's RAM as a `Buffer` (`req.file.buffer`).
   - **Pro:** Super fast; no files written to disk.
   - **Use cases:** When you immediately forward the file to cloud storage (like AWS S3, Cloudinary, or Firebase) and don't want to save a temporary copy on disk.
   - **Con:** Large files can cause Node.js to run out of memory (Heap Out of Memory crash).

---

## 3. In-Depth Breakdown of Our `uploadMiddleware.js`

Here is the complete source code of your [middleware/uploadMiddleware.js](file:///c:/Users/Prateek%20Chourasiya/Desktop/CaseStudy/middleware/uploadMiddleware.js), followed by a step-by-step explanation of every single block.

```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { getFileCategory, isFileAllowed } = require('../utils/fileCategories');

// Base directory for uploads
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const category = getFileCategory(file);
        const targetDir = path.join(UPLOADS_ROOT, category);

        // Ensure category directory exists
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Store category on request object for easy controller access
        req.fileCategory = category;
        cb(null, targetDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
        const sanitizedFilename = `${uniqueSuffix}${ext}`;
        cb(null, sanitizedFilename);
    }
});

const fileFilter = (req, file, cb) => {
    if (!isFileAllowed(file)) {
        return cb(new AppError('This file type is prohibited for security reasons.', 400));
    }
    cb(null, true);
};

const maxSizeBytes = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024;

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: maxSizeBytes
    }
});

module.exports = upload;
```

---

### Step 1: The Dependencies (Lines 1–6)
```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { getFileCategory, isFileAllowed } = require('../utils/fileCategories');
```
* **`multer`**: The core library handling multipart data.
* **`path`**: Node's built-in module for resolving directory and file paths safely across Windows (`\`) and Linux (`/`).
* **`fs`**: Node's file system module used to verify if directories exist and create them on the fly.
* **`crypto`**: Node's cryptography module used to generate random cryptographic strings for unique file names.
* **`AppError`**: Our custom operational error class that carries HTTP status codes (e.g. `400`).
* **`getFileCategory, isFileAllowed`**: Custom helper functions we wrote in `utils/fileCategories.js` that inspect file extensions and MIME types.

---

### Step 2: Defining Root Uploads Directory (Line 9)
```javascript
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
```
* `__dirname` is the absolute path to the current directory (`.../CaseStudy/middleware`).
* `'..'` steps up one level into `.../CaseStudy`.
* `'uploads'` targets `.../CaseStudy/uploads`.
* `path.join` resolves this into a clean, safe absolute path on your system.

---

### Step 3: Custom Disk Storage Engine (Lines 11–31)
`multer.diskStorage` gives you full manual control over two critical decisions:
1. **`destination`**: *Where should the file be saved?*
2. **`filename`**: *What should the file be named on disk?*

Both functions use Node's classic **callback pattern**: `cb(error, result)`. If there is no error, you pass `null` as the first argument: `cb(null, result)`.

#### A. The `destination` Function (Lines 12–24)
```javascript
destination: (req, file, cb) => {
    const category = getFileCategory(file);
    const targetDir = path.join(UPLOADS_ROOT, category);

    // Ensure category directory exists
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Store category on request object for easy controller access
    req.fileCategory = category;
    cb(null, targetDir);
}
```
* **Parameters**:
  * `req`: The standard Express request object.
  * `file`: An object containing info about the file being processed (such as `file.originalname` and `file.mimetype`).
  * `cb`: The callback to tell Multer where to save the file.
* **What it does**:
  1. Calls `getFileCategory(file)`: If it's a `.png`, it returns `'images'`. If it's a `.pdf`, it returns `'pdf'`, etc.
  2. Builds the target folder path: `uploads/images` or `uploads/pdf`.
  3. `fs.existsSync(targetDir)` checks if that subfolder already exists on disk.
  4. If it doesn't exist, `fs.mkdirSync(targetDir, { recursive: true })` creates the folder automatically.
  5. `req.fileCategory = category`: We sneak the chosen category directly onto `req` so our controller doesn't have to re-calculate it later!
  6. `cb(null, targetDir)`: We hand the directory path over to Multer.

---

#### B. The `filename` Function (Lines 25–30)
```javascript
filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const sanitizedFilename = `${uniqueSuffix}${ext}`;
    cb(null, sanitizedFilename);
}
```
* **Why can't we just use `file.originalname` directly?**
  1. **Name Collisions**: If User A uploads `resume.pdf` and User B also uploads `resume.pdf`, User B would overwrite and destroy User A's file!
  2. **Directory Traversal Attacks**: A malicious user could name their file `../../etc/passwd` or `../../index.js` to overwrite server source code.
* **How our code solves this**:
  1. `path.extname(file.originalname).toLowerCase()`: Extracts only the extension (e.g. `'.pdf'`).
  2. `Date.now()`: Milliseconds timestamp (e.g. `1732001234567`).
  3. `crypto.randomBytes(6).toString('hex')`: Generates 12 random hexadecimal characters (e.g. `'3a9f2c7b1e4d'`).
  4. Combines them: `1732001234567-3a9f2c7b1e4d.pdf`.
  5. This guarantees that **no two uploaded files can ever have the same filename on disk**.

---

### Step 4: The Security Filter (`fileFilter`) (Lines 33–38)
```javascript
const fileFilter = (req, file, cb) => {
    if (!isFileAllowed(file)) {
        return cb(new AppError('This file type is prohibited for security reasons.', 400));
    }
    cb(null, true);
};
```
* The `fileFilter` decides whether a file is accepted or rejected **before** it is saved to disk.
* `isFileAllowed(file)` checks our blacklist of dangerous executable extensions (`.exe`, `.sh`, `.bat`, `.cmd`, `.msi`).
* **If dangerous**: It calls `cb(new AppError(...), false)`. Multer immediately halts the upload and passes the 400 error directly to our global `errorMiddleware`.
* **If safe**: It calls `cb(null, true)` to allow the upload to proceed.

---

### Step 5: File Size Limits (Lines 40 & 45–47)
```javascript
const maxSizeBytes = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024;
```
* Multer expects limits in **bytes**.
* $1\text{ MB} = 1024\text{ KB} = 1024 \times 1024\text{ Bytes} = 1,048,576\text{ bytes}$.
* So $10\text{ MB} = 10 \times 1024 \times 1024 = 10,485,760\text{ bytes}$.
* If an incoming file exceeds this limit, Multer immediately aborts the upload and emits a `LIMIT_FILE_SIZE` error, which our `errorMiddleware` catches and returns as:
  ```json
  { "success": false, "message": "File too large. Maximum allowed size is 10 MB." }
  ```

---

### Step 6: Assembling and Exporting the Multer Instance (Lines 42–50)
```javascript
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: maxSizeBytes
    }
});

module.exports = upload;
```
We package the `storage`, `fileFilter`, and `limits` into one configured Multer middleware instance (`upload`) and export it.

Now, whenever any route needs file upload capability, we just plug it in:
```javascript
// In routes/fileRoutes.js
router.post('/upload', upload.single('file'), fileController.uploadFile);
```

---

## 4. What Does `req.file` Look Like Inside Your Controller?

Once Multer finishes processing the file, it attaches an object named **`req.file`** to the request. Inside `fileController.js`, `req.file` looks like this:

| Property | Example Value | Meaning |
| :--- | :--- | :--- |
| `req.file.fieldname` | `'file'` | The name of the form input field (e.g. `<input name="file">`). |
| `req.file.originalname`| `'Annual_Report.pdf'` | The original name of the file on the user's computer. |
| `req.file.encoding` | `'7bit'` | The encoding type of the file. |
| `req.file.mimetype` | `'application/pdf'` | The MIME type recognized by the browser. |
| `req.file.size` | `142580` | Size of the file in bytes (~139 KB). |
| `req.file.destination` | `'C:\...\CaseStudy\uploads\pdf'` | Directory where the file was saved. |
| `req.file.filename` | `'173200123-3a9f2c.pdf'` | The generated unique filename on disk. |
| `req.file.path` | `'C:\...\uploads\pdf\173200123-3a9f2c.pdf'` | Full absolute path to the saved file. |

This is why our `fileController.js` can easily write to MongoDB:
```javascript
const file = await File.create({
    name: req.body.name || req.file.originalname,
    originalName: req.file.originalname,
    systemFilename: req.file.filename,
    category: req.fileCategory,
    type: req.file.mimetype,
    size: req.file.size,
    subfolderPath: path.join('uploads', req.fileCategory, req.file.filename)
});
```

---

## 5. Summary Cheat Sheet

| Question | Answer |
| :--- | :--- |
| **Why Multer?** | Express cannot parse binary `multipart/form-data`. Multer decodes it and saves the file. |
| **Where are files saved?** | Defined by `storage.destination` (dynamically in `uploads/images/`, `uploads/pdf/`, etc.). |
| **Why not keep original names?** | Name collisions (overwriting someone else's file) and directory traversal hacks. |
| **How does Multer pass errors?** | Via the standard 4-parameter Express error middleware (`MulterError`). |
| **Where does the file info go?** | In `req.file` (for single uploads) or `req.files` (for multiple uploads). |
| **Where do text fields go?** | In `req.body` (just like normal POST requests). |
