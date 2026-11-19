const AppError = require('../utils/AppError');

/**
 * Global Error Handling Middleware.
 * Must have exactly 4 parameters so Express recognizes it as an error handler.
 * Registered LAST in index.js after all routes.
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Handle Mongoose CastError (e.g. invalid ObjectId format)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid value for field: ${err.path}`;
    }

    // Handle Mongoose ValidationError
    if (err.name === 'ValidationError') {
        statusCode = 400;
        const errors = Object.values(err.errors).map(e => e.message);
        message = `Validation failed: ${errors.join(', ')}`;
    }

    // Handle Mongoose duplicate key errors (e.g. unique email)
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue)[0];
        message = `A user with that ${field} already exists.`;
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token. Please log in again.';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Your session has expired. Please log in again.';
    }

    // Handle Multer errors
    if (err.name === 'MulterError') {
        statusCode = 400;
        if (err.code === 'LIMIT_FILE_SIZE') {
            const maxMB = process.env.MAX_FILE_SIZE_MB || 10;
            message = `File too large. Maximum allowed size is ${maxMB} MB.`;
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = `Unexpected file field. Please upload using field name 'file'.`;
        } else {
            message = `File upload error: ${err.message}`;
        }
    }

    const isDev = process.env.NODE_ENV !== 'production';

    res.status(statusCode).json({
        success: false,
        message,
        ...(isDev && !err.isOperational && { stack: err.stack })
    });
};

module.exports = errorHandler;
