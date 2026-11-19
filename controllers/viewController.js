/**
 * View controllers for rendering minimal EJS pages.
 */
const renderLogin = (req, res) => {
    res.render('login');
};

const renderRegister = (req, res) => {
    res.render('register');
};

const renderDashboard = (req, res) => {
    res.render('dashboard');
};

const renderHome = (req, res) => {
    res.redirect('/dashboard');
};

module.exports = {
    renderLogin,
    renderRegister,
    renderDashboard,
    renderHome
};
