// server/routes/auth.js

const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController'); // Import the new controller

// Authentication Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);


module.exports = router;