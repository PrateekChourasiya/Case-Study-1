const express = require('express');
const userMiddleware = require('../middleware/userMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { validateRequest, updateFileSchema } = require('../middleware/validateMiddleware');
const {
    uploadFile,
    getAllFiles,
    getFileById,
    downloadFile,
    updateFile,
    deleteFile
} = require('../controllers/fileController');

const fileRouter = express.Router();

// All file routes require user authentication
fileRouter.use(userMiddleware);

// Upload a file (multipart/form-data with field 'file')
fileRouter.post('/upload', upload.single('file'), uploadFile);

// Get all files with query param filters (?image=true, ?pdf=true, ?doc=true, ?ppt=true, ?size=50, ?search=...)
fileRouter.get('/all', getAllFiles);

// View metadata for a single file by ID
fileRouter.get('/:id', getFileById);

// Download physical file from disk
fileRouter.get('/:id/download', downloadFile);

// Update file display name and/or replace physical file
fileRouter.put('/:id', upload.single('file'), validateRequest(updateFileSchema), updateFile);

// Delete file metadata and remove from disk
fileRouter.delete('/:id', deleteFile);

module.exports = fileRouter;
