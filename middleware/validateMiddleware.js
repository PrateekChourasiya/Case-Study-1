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

const passwordValidation = z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const registerSchema = z.object({
    userName: z
        .string()
        .trim()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username cannot exceed 30 characters'),
    emailId: z
        .string()
        .trim()
        .toLowerCase()
        .email('Invalid email address'),
    password: passwordValidation
});

const loginSchema = z.object({
    emailId: z
        .string()
        .trim()
        .toLowerCase()
        .email('Invalid email address'),
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
