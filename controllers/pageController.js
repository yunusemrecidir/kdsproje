const path = require('path');

exports.loginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
};

exports.panelPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'panel.html'));
};
