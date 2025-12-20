const path = require('path');

// Giriş sayfası
exports.loginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
};

// Panel sayfası
exports.panelPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'panel.html'));
};
