const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const authController = require('../controllers/authController');

router.get('/', pageController.loginPage);
router.get('/panel', pageController.panelPage);

router.post('/login', authController.login);

module.exports = router;
