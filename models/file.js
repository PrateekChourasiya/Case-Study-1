const mongoose = require('mongoose');

const { Schema } = mongoose;

const fileSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        originalName: {
            type: String,
            required: true
        },
        systemFilename: {
            type: String,
            required: true,
            unique: true
        },
        category: {
            type: String,
            enum: ['images', 'pdf', 'doc', 'ppt', 'others'],
            required: true
        },
        type: {
            type: String,
            required: true // MIME type e.g. 'image/png'
        },
        extension: {
            type: String,
            required: true // e.g. '.png'
        },
        size: {
            type: Number,
            required: true // size in bytes
        },
        s3Key: {
            type: String,
            required: true // S3 object key e.g. 'images/173200123-abc123.png'
        },
        upload_at: {
            type: Date,
            default: Date.now
        },
        uploaded_by: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true
        }
    },
    { timestamps: true }
);

const File = mongoose.model('file', fileSchema);

module.exports = File;
