// server/controllers/authController.js

const bcrypt = require('bcryptjs');
const User = require('../models/User'); 
const { generateTokens } = require('../utils/authUtils'); 

// Constants
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';


// 🔑 REGISTER Controller
exports.register = async (req, res) => {
    console.log("📥 RAW BODY RECEIVED:", req.body);
    console.log("📥 USERNAME RECEIVED:", req.body.username);
    console.log("📥 EMAIL RECEIVED:", req.body.email);
    const { username, email, password } = req.body;
    console.log("➡️ Registering user:", username, email);

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });

        if (existingUser) { 
            return res.status(400).json({ message: 'A user with this username or email already exists.' });
        } 
        else { 
            // Proceed with NEW USER REGISTRATION
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({ 
                username, email, password: hashedPassword,
                isVerified: true
            });
            await newUser.save();
            
            res.status(201).json({
                message: 'Registration successful!',
            });
        }
        
    } 
    catch (error) {
       console.error("❌ Error in registration:", error);
       res.status(500).json({ message: 'Server error during registration.' });
    }
};


// 🔑 LOGIN Controller
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const identifier = username;
        
        if (!identifier || !password) {
            return res.status(400).json({ message: 'Username/Email and password are required' });
        }
          
        const user = await User.findOne({
            $or: [{ username: identifier }, { email: identifier }]
        });
        if (!user) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }
        const isMatch = await bcrypt.compare(password, user.password);
         if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }
     

        const { accessToken, refreshToken, refreshTokenExpiresAt } = await generateTokens(user);

        res.status(200).json({
            message: 'Login successful',
            accessToken,
            refreshToken,
            refreshTokenExpiresAt,
            username: user.username
        });
    } catch (err) {
        console.error("❌ Error in login:", err);
        res.status(500).json({ message: 'Server error' });
    }
};


// 🔑 REFRESH TOKEN Controller
exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh Token is required' });
    }

    try {
        const user = await User.findOne({
            'refreshTokens.token': refreshToken
        });

        if (!user) {
            console.warn('Refresh token not found for any user. Likely invalid or already used.');
            return res.status(401).json({ message: 'Invalid Refresh Token' });
        }

        const storedRefreshToken = user.refreshTokens.find(rt => rt.token === refreshToken);

        if (!storedRefreshToken) {
            console.warn(`Refresh token found in user ${user.username} but not matching for provided token.`);
            return res.status(401).json({ message: 'Invalid Refresh Token' });
        }

        if (new Date() > storedRefreshToken.expiresAt) {
            user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
            await user.save();
            console.warn(`Expired Refresh Token for user ${user.username} - token removed.`);
            return res.status(401).json({ message: 'Refresh Token expired. Please log in again.' });
        }

        user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
        await user.save();

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
};

