const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const authController = require('../controllers/authController');

// Sayfa yönlendirmeleri
router.get('/', pageController.loginPage);
router.get('/panel', pageController.panelPage);

// Giriş işlemi
router.post('/login', authController.login);

module.exports = router;
