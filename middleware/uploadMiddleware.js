const multer = require('multer');
const AppError = require('../utils/AppError');
const { getFileCategory, isFileAllowed } = require('../utils/fileCategories');

// Memory storage — file held in RAM as req.file.buffer, then forwarded to S3
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
