const path = require('path');
const File = require('../models/file');
const User = require('../models/user');
const AppError = require('../utils/AppError');
const { getFileCategory } = require('../utils/fileCategories');
const { uploadToS3, deleteFromS3, getPresignedDownloadUrl } = require('../utils/s3Helper');

/**
 * Upload a file to S3 and store metadata in MongoDB.
 */
const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new AppError('No file provided. Please attach a file under field name "file".', 400));
        }

        const category = req.fileCategory || getFileCategory(req.file);
        const { s3Key, uniqueName } = await uploadToS3(req.file, category);

        const displayName = req.body.name && req.body.name.trim().length > 0
            ? req.body.name.trim()
            : req.file.originalname;

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

        const query = { uploaded_by: req.result._id };

        const selectedCategories = [];
        if (image === 'true') selectedCategories.push('images');
        if (pdf === 'true') selectedCategories.push('pdf');
        if (doc === 'true') selectedCategories.push('doc');
        if (ppt === 'true') selectedCategories.push('ppt');

        if (selectedCategories.length > 0) {
            query.category = { $in: selectedCategories };
        }

        if (size) {
            const sizeInBytes = parseFloat(size) * 1024;
            if (!isNaN(sizeInBytes)) {
                query.size = { $gte: sizeInBytes };
            }
        }

        if (search && search.trim().length > 0) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [{ name: regex }, { originalName: regex }];
        }

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
 * Download — returns a presigned URL (valid 1 hour) instead of streaming from disk.
 */
const downloadFile = async (req, res, next) => {
    try {
        const { id } = req.params;

        const file = await File.findOne({ _id: id, uploaded_by: req.result._id });
        if (!file) {
            return next(new AppError('File not found or you are not authorized to download it.', 404));
        }

        const downloadUrl = await getPresignedDownloadUrl(file.s3Key, file.originalName);

        res.status(200).json({
            success: true,
            message: 'Download URL generated. Valid for 1 hour.',
            data: { downloadUrl }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Update file display name and/or replace the file on S3.
 */
const updateFile = async (req, res, next) => {
    try {
        const { id } = req.params;

        const file = await File.findOne({ _id: id, uploaded_by: req.result._id });
        if (!file) {
            return next(new AppError('File not found or you are not authorized to update it.', 404));
        }

        const hasName = req.body.name && req.body.name.trim().length > 0;
        const hasFile = !!req.file;

        if (!hasName && !hasFile) {
            return next(new AppError('Please provide a new file and/or a new display name to update.', 400));
        }

        // Update display name if provided
        if (hasName) {
            file.name = req.body.name.trim();
        }

        // If a new file is uploaded, replace the old one on S3
        if (req.file) {
            // Delete the old file from S3
            await deleteFromS3(file.s3Key);

            const category = req.fileCategory || getFileCategory(req.file);
            const { s3Key, uniqueName } = await uploadToS3(req.file, category);

            file.originalName = req.file.originalname;
            file.systemFilename = uniqueName;
            file.category = category;
            file.type = req.file.mimetype;
            file.extension = path.extname(req.file.originalname).toLowerCase();
            file.size = req.file.size;
            file.s3Key = s3Key;
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
 * Delete file from S3 and remove metadata from MongoDB.
 */
const deleteFile = async (req, res, next) => {
    try {
        const { id } = req.params;

        const file = await File.findOne({ _id: id, uploaded_by: req.result._id });
        if (!file) {
            return next(new AppError('File not found or you are not authorized to delete it.', 404));
        }

        // Delete from S3
        await deleteFromS3(file.s3Key);

        // Delete from database
        await File.findByIdAndDelete(file._id);

        // Update user's files list and counter
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

module.exports = {
    uploadFile,
    getAllFiles,
    getFileById,
    downloadFile,
    updateFile,
    deleteFile
};
