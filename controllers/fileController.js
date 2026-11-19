const path = require('path');
const fs = require('fs');
const File = require('../models/file');
const User = require('../models/user');
const AppError = require('../utils/AppError');
const { getFileCategory } = require('../utils/fileCategories');

/**
 * Upload a file, save to specific category subfolder, and store metadata in MongoDB.
 */
const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new AppError('No file provided. Please attach a file under field name "file".', 400));
        }

        const category = req.fileCategory || getFileCategory(req.file);
        const subfolderPath = path.join('uploads', category, req.file.filename).replace(/\\/g, '/');
        const displayName = req.body.name && req.body.name.trim().length > 0
            ? req.body.name.trim()
            : req.file.originalname;

        const file = await File.create({
            name: displayName,
            originalName: req.file.originalname,
            systemFilename: req.file.filename,
            category,
            type: req.file.mimetype,
            extension: path.extname(req.file.originalname).toLowerCase(),
            size: req.file.size,
            subfolderPath,
            upload_at: new Date(),
            uploaded_by: req.result._id
        });

        // Update the user's reference list and count
        await User.findByIdAndUpdate(req.result._id, {
            $push: { filesUploaded: file._id },
            $inc: { filesUploadedCount: 1 }
        });

        res.status(201).json({
            success: true,
            message: 'File uploaded successfully.',
            data: { file }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get all files uploaded by the authenticated user with query param filters.
 * Supported query params:
 *   ?image=true
 *   ?pdf=true
 *   ?doc=true
 *   ?ppt=true
 *   ?size=50 (files >= 50 KB)
 *   ?search=name
 *   ?sort=oldest|newest
 */
const getAllFiles = async (req, res, next) => {
    try {
        const { image, pdf, doc, ppt, size, search, sort } = req.query;

        // Base query: only files belonging to this authenticated user
        const query = { uploaded_by: req.result._id };

        // Category filter based on query params
        const selectedCategories = [];
        if (image === 'true') selectedCategories.push('images');
        if (pdf === 'true') selectedCategories.push('pdf');
        if (doc === 'true') selectedCategories.push('doc');
        if (ppt === 'true') selectedCategories.push('ppt');

        if (selectedCategories.length > 0) {
            query.category = { $in: selectedCategories };
        }

        // Size filter in KB (size >= X KB)
        if (size) {
            const sizeInBytes = parseFloat(size) * 1024;
            if (!isNaN(sizeInBytes)) {
                query.size = { $gte: sizeInBytes };
            }
        }

        // Search by file name or original name
        if (search && search.trim().length > 0) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [{ name: regex }, { originalName: regex }];
        }

        // Sorting
        const sortOption = sort === 'oldest' ? { upload_at: 1 } : { upload_at: -1 };

        const files = await File.find(query).sort(sortOption);

        res.status(200).json({
            success: true,
            message: 'Files fetched successfully.',
            data: {
                count: files.length,
                files
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * View metadata for a single file by ID.
 */
const getFileById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const file = await File.findOne({ _id: id, uploaded_by: req.result._id });
        if (!file) {
            return next(new AppError('File not found or you are not authorized to view it.', 404));
        }

        res.status(200).json({
            success: true,
            message: 'File metadata fetched successfully.',
            data: { file }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Download/stream the physical file from disk.
 */
const downloadFile = async (req, res, next) => {
    try {
        const { id } = req.params;

        const file = await File.findOne({ _id: id, uploaded_by: req.result._id });
        if (!file) {
            return next(new AppError('File not found or you are not authorized to download it.', 404));
        }

        const absolutePath = path.join(__dirname, '..', file.subfolderPath);

        if (!fs.existsSync(absolutePath)) {
            return next(new AppError('Physical file was not found on the server disk.', 404));
        }

        res.download(absolutePath, file.originalName);
    } catch (err) {
        next(err);
    }
};

/**
 * Update file display name and/or replace the physical file on disk.
 */
const updateFile = async (req, res, next) => {
    try {
        const { id } = req.params;

        const file = await File.findOne({ _id: id, uploaded_by: req.result._id });
        if (!file) {
            return next(new AppError('File not found or you are not authorized to update it.', 404));
        }

        // Update display name if provided
        if (req.body.name && req.body.name.trim().length > 0) {
            file.name = req.body.name.trim();
        }

        // If a new file is uploaded, replace the physical file
        if (req.file) {
            // Delete the old physical file from its previous folder
            const oldPath = path.join(__dirname, '..', file.subfolderPath);
            if (fs.existsSync(oldPath)) {
                await fs.promises.unlink(oldPath);
            }

            const category = req.fileCategory || getFileCategory(req.file);
            const subfolderPath = path.join('uploads', category, req.file.filename).replace(/\\/g, '/');

            file.originalName = req.file.originalname;
            file.systemFilename = req.file.filename;
            file.category = category;
            file.type = req.file.mimetype;
            file.extension = path.extname(req.file.originalname).toLowerCase();
            file.size = req.file.size;
            file.subfolderPath = subfolderPath;
        }

        await file.save();

        res.status(200).json({
            success: true,
            message: 'File updated successfully.',
            data: { file }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Delete file metadata from MongoDB and delete the physical file from disk.
 */
const deleteFile = async (req, res, next) => {
    try {
        const { id } = req.params;

        const file = await File.findOne({ _id: id, uploaded_by: req.result._id });
        if (!file) {
            return next(new AppError('File not found or you are not authorized to delete it.', 404));
        }

        // Remove the physical file from disk
        const physicalPath = path.join(__dirname, '..', file.subfolderPath);
        if (fs.existsSync(physicalPath)) {
            await fs.promises.unlink(physicalPath);
        }

        // Delete from database
        await File.findByIdAndDelete(file._id);

        // Update user's files list and counter
        await User.findByIdAndUpdate(req.result._id, {
            $pull: { filesUploaded: file._id },
            $inc: { filesUploadedCount: -1 }
        });

        res.status(200).json({
            success: true,
            message: 'File deleted successfully from database and server disk.'
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    uploadFile,
    getAllFiles,
    getFileById,
    downloadFile,
    updateFile,
    deleteFile
};
