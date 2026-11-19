const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const main = require('./config/db');
const authRouter = require('./routes/authRoutes');
const fileRouter = require('./routes/fileRoutes');
const viewRouter = require('./routes/viewRoutes');
const errorHandler = require('./middleware/errorMiddleware');
const loggerMiddleware = require('./middleware/loggerMiddleware');

const app = express();

// Enable CORS
app.use(cors({
    origin: true,
    credentials: true
}));

// HTTP Request Logger
app.use(loggerMiddleware);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files (CSS, client-side JS)
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API Routes
app.use('/api/user', authRouter);
app.use('/api/file', fileRouter);

// Web View Routes (EJS)
app.use('/', viewRouter);

// Basic health-check route
app.get('/test', (req, res) => {
    res.status(200).json({ success: true, message: 'Hello from File Management Backend!' });
});

// Global error handler — must be registered after all routes
app.use(errorHandler);

async function initializeConnection() {
    try {
        if (!process.env.DB_STRING) {
            console.warn('⚠️ WARNING: DB_STRING is not set in .env. Please update .env with your MongoDB connection string.');
        } else {
            await main();
            console.log('✅ DB Connected Successfully');
        }

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`🚀 Server is listening at Port: ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Failed to initialize connection:', err);
    }
}

initializeConnection();
