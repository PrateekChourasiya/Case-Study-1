const express = require('express');
const { register, login, logout, getProfile } = require('../controllers/authController');
const { validateRequest, registerSchema, loginSchema } = require('../middleware/validateMiddleware');
const userMiddleware = require('../middleware/userMiddleware');

const authRouter = express.Router();

authRouter.post('/register', validateRequest(registerSchema), register);
authRouter.post('/login', validateRequest(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.get('/profile', userMiddleware, getProfile);

module.exports = authRouter;
