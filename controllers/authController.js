const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const AppError = require('../utils/AppError');

/**
 * Register a new user account.
 */
const register = async (req, res, next) => {
    try {
        const { userName, emailId, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            userName,
            emailId,
            password: hashedPassword,
            filesUploaded: [],
            filesUploadedCount: 0
        });

        const token = jwt.sign(
            { _id: user._id, emailId: user.emailId },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 60 * 60 * 1000,
            sameSite: 'lax'
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully.',
            data: {
                user: {
                    _id: user._id,
                    userName: user.userName,
                    emailId: user.emailId,
                    filesUploadedCount: user.filesUploadedCount
                },
                token
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Log into an existing account.
 */
const login = async (req, res, next) => {
    try {
        const { emailId, password } = req.body;

        const user = await User.findOne({ emailId });
        if (!user) {
            return next(new AppError('Invalid email or password.', 401));
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return next(new AppError('Invalid email or password.', 401));
        }

        const token = jwt.sign(
            { _id: user._id, emailId: user.emailId },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 60 * 60 * 1000,
            sameSite: 'lax'
        });

        res.status(200).json({
            success: true,
            message: 'User logged in successfully.',
            data: {
                user: {
                    _id: user._id,
                    userName: user.userName,
                    emailId: user.emailId,
                    filesUploadedCount: user.filesUploadedCount
                },
                token
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Log out and clear the JWT cookie.
 */
const logout = async (req, res, next) => {
    try {
        res.cookie('token', '', { expires: new Date(0) });
        res.status(200).json({
            success: true,
            message: 'User logged out successfully.'
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get profile of the currently logged-in user, including uploaded files and count.
 */
const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.result._id)
            .select('-password')
            .populate('filesUploaded');

        if (!user) {
            return next(new AppError('User not found.', 404));
        }

        res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully.',
            data: { user }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    register,
    login,
    logout,
    getProfile
};
