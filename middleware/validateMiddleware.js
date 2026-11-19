const z = require('zod');
const AppError = require('../utils/AppError');

/**
 * Middleware factory for request body validation using Zod.
 * Matching the exact pattern from your event-management-app reference repo.
 */
const validateRequest = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        const firstError = Object.values(fieldErrors).flat()[0];
        return next(new AppError(firstError || 'Validation failed', 400));
    }

    req.body = result.data;
    next();
};

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

const registerSchema = z.object({
    userName: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username cannot exceed 30 characters'),
    emailId: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
    emailId: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
});

// ─── File Schemas ─────────────────────────────────────────────────────────────

const updateFileSchema = z.object({
    name: z.string().min(1, 'File name cannot be empty').max(100).optional()
});

module.exports = {
    validateRequest,
    registerSchema,
    loginSchema,
    updateFileSchema
};
