const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user');
const AppError = require('../utils/AppError');

/**
 * Authentication middleware.
 * Verifies JWT from cookies or Authorization Bearer header.
 * Attaches the authenticated user object to req.result.
 */
const userMiddleware = async (req, res, next) => {
    try {
        let token = req.cookies?.token;

        // Also allow Authorization header (Bearer token) for flexibility in Postman
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('Authentication required. Please log in.', 401));
        }

        const payload = jwt.verify(token, process.env.JWT_KEY);

        // Validate that payload contains a valid MongoDB ObjectId before querying DB
        if (!payload?._id || !mongoose.Types.ObjectId.isValid(payload._id)) {
            return next(new AppError('Invalid token payload. Please log in again.', 401));
        }

        const user = await User.findById(payload._id);
        if (!user) {
            return next(new AppError('User not found. Please log in again.', 401));
        }

        req.result = user;
        next();
    } catch (err) {
        next(err); // Passed to errorMiddleware (handles JsonWebTokenError, TokenExpiredError)
    }
};

module.exports = userMiddleware;
