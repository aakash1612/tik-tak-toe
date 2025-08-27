// tik-tok-toe/server/routes/auth.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ✅ Helper to generate JWT and Refresh Token
const generateTokens = async (user) => {
    const accessToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '15m' }); // Short-lived Access Token

    const refreshToken = crypto.randomBytes(64).toString('hex'); // Long, random string for Refresh Token
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Store the refresh token in the database
    user.refreshTokens.push({ token: refreshToken, expiresAt: refreshTokenExpiresAt });
    await user.save();

    return { accessToken, refreshToken, refreshTokenExpiresAt };
};


// ✅ REGISTER
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    console.log("➡️ Registering user:", username, email);

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        // ✅ Generate and send both tokens
        const { accessToken, refreshToken, refreshTokenExpiresAt } = await generateTokens(newUser);

        res.status(201).json({
            message: 'User registered successfully',
            accessToken,
            refreshToken,
            refreshTokenExpiresAt
        });

    } catch (error) {
        console.error("❌ Detailed Error in register:", error);
        if (error.code === 11000) {
            console.error("MongoDB Duplicate Key Error (E11000):", error.message);
            return res.status(400).json({ message: 'A user with this username or email already exists.' });
        }
        if (error.name === 'ValidationError') {
            console.error("Mongoose Validation Error:", error.message);
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Internal error has occurred' });
    }
});

// ✅ LOGIN - UPDATED TO RETURN ACCESS & REFRESH TOKENS
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const identifier = username;
        console.log("username taken");
        if (!identifier || !password) {
            return res.status(400).json({ message: 'Username/Email and password are required' });
        }
         
        const user = await User.findOne({
            $or: [{ username: identifier }, { email: identifier }]
        });
        console.log("credentials taken");
        if (!user) return res.status(404).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // ✅ Generate and send both tokens
        const { accessToken, refreshToken, refreshTokenExpiresAt } = await generateTokens(user);

        res.json({
            message: 'Login successful',
            accessToken,
            refreshToken,
            refreshTokenExpiresAt,
            username: user.username // Still return username for display
        });
    } catch (err) {
        console.error("❌ Error in login:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ NEW: REFRESH TOKEN ENDPOINT
router.post('/refresh-token', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh Token is required' });
    }

    try {
        // Find user by the provided refresh token
        const user = await User.findOne({
            'refreshTokens.token': refreshToken
        });

        if (!user) {
            console.warn('Refresh token not found for any user. Likely invalid or already used.');
            return res.status(401).json({ message: 'Invalid Refresh Token' });
        }

        // Find the specific refresh token in the user's array
        const storedRefreshToken = user.refreshTokens.find(rt => rt.token === refreshToken);

        if (!storedRefreshToken) {
            console.warn(`Refresh token found in user ${user.username} but not matching for provided token.`);
            return res.status(401).json({ message: 'Invalid Refresh Token' });
        }

        // Check if the refresh token has expired
        if (new Date() > storedRefreshToken.expiresAt) {
            // If expired, remove it and return unauthorized
            user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
            await user.save();
            console.warn(`Expired Refresh Token for user ${user.username} - token removed.`);
            return res.status(401).json({ message: 'Refresh Token expired. Please log in again.' });
        }

        // ✅ Invalidate the old refresh token (optional, but good for security - One-Time Use Refresh Tokens)
        user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
        await user.save();

        // Generate new access and refresh tokens
        const { accessToken, refreshToken: newRefreshToken, refreshTokenExpiresAt } = await generateTokens(user);

        res.json({
            message: 'Tokens refreshed successfully',
            accessToken,
            refreshToken: newRefreshToken,
            refreshTokenExpiresAt
        });

    } catch (err) {
        console.error("❌ Error in refresh-token:", err);
        res.status(500).json({ message: 'Server error during token refresh.' });
    }
});


// ✅ FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
    const { username } = req.body;
    const identifier = username;

    try {
        const user = await User.findOne({
            $or: [{ username: identifier }, { email: identifier }]
        });

        if (!user) {
            return res.status(200).json({
                message: 'If an account with that username exists, a password reset link has been sent to the associated email address.'
            });
        }

        if (!user.email) {
            return res.status(400).json({ message: 'This account does not have an email associated for password reset. Please contact support.' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // valid for 1 hour
        await user.save();

        const resetUrl = `${CLIENT_URL}/reset-password?token=${token}`;
        const emailSubject = 'Tic-Tac-Toe Password Reset Request';
        const emailHtml = `
            <h1>Password Reset Request</h1>
            <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
            <p>Please click on the following link to reset your password:</p>
            <p><a href="${resetUrl}">Reset Password Link</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
            <p>Thank you,</p>
            <p>The Tic-Tac-Toe Team</p>
        `;

        const emailResult = await sendEmail(user.email, emailSubject, emailHtml);

        if (!emailResult.success) {
            console.error('❌ Failed to send reset email:', emailResult.error);
        }

        res.status(200).json({
            message: 'If an account with that username exists, a password reset link has been sent to the associated email address.'
        });

    } catch (err) {
        console.error('❌ Forgot Password Error:', err);
        res.status(500).json({ message: 'Error processing your request. Please try again later.' });
    }
});

// ✅ RESET PASSWORD
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Invalidate the reset token after use
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        // ✅ Remove all existing refresh tokens if password is reset for security
        user.refreshTokens = [];

        await user.save();
        res.status(200).json({ message: 'Password reset successful' });

    } catch (err) {
        console.error('❌ Reset Password Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;