// server/utils/authUtils.js

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Generates a new Access Token and Refresh Token pair for a user.
 * Stores the refresh token in the database.
 * @param {object} user - Mongoose User document
 * @returns {object} { accessToken, refreshToken, refreshTokenExpiresAt }
 */
const generateTokens = async (user) => {
    const accessToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '15m' }); // Short-lived Access Token

    const refreshToken = crypto.randomBytes(64).toString('hex'); // Long, random string for Refresh Token
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Store the refresh token in the database
    user.refreshTokens.push({ token: refreshToken, expiresAt: refreshTokenExpiresAt });
    await user.save();

    return { accessToken, refreshToken, refreshTokenExpiresAt };
};

module.exports = {
    generateTokens,
};