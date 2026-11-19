const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema(
    {
        userName: {
            type: String,
            required: true,
            minLength: 3,
            maxLength: 30,
            trim: true
        },
        emailId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            minLength: 6
        },
        password: {
            type: String,
            required: true
        },
        filesUploaded: [
            {
                type: Schema.Types.ObjectId,
                ref: 'file'
            }
        ],
        filesUploadedCount: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

const User = mongoose.model('user', userSchema);

module.exports = User;
