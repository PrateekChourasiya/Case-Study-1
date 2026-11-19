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
