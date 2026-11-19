const express = require('express');
const {
    renderHome,
    renderLogin,
    renderRegister,
    renderDashboard
} = require('../controllers/viewController');

const viewRouter = express.Router();

viewRouter.get('/', renderHome);
viewRouter.get('/login', renderLogin);
viewRouter.get('/register', renderRegister);
viewRouter.get('/dashboard', renderDashboard);

module.exports = viewRouter;
