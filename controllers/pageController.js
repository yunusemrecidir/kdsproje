const path = require('path');

exports.loginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
};

exports.panelPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'panel.html'));
};
