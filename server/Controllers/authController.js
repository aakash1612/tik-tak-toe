// server/controllers/authController.js

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User'); 
const sendEmail = require('../utils/emailService'); 
const { generateTokens } = require('../utils/authUtils'); 

// Constants
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';


// 🔑 REGISTER Controller
exports.register = async (req, res) => {
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
            if (existingUser.isVerified) {
                const message = (existingUser.username === username)
                    ? 'Username already exists and is verified.'
                    : 'Email already registered and is verified.';
                return res.status(400).json({ message });
            }
            
            // Resend email logic for unverified existing user
            console.log(`⚠️ User ${existingUser.username} found but not verified. Resending email.`);
            
            const newVerificationToken = crypto.randomBytes(20).toString('hex');
            const newVerificationExpires = Date.now() + 60 * 60 * 1000; // 1 hour
            existingUser.emailVerificationToken = newVerificationToken;
            existingUser.emailVerificationExpires = newVerificationExpires;
            await existingUser.save();
            
            const verifyUrl = `${SERVER_URL}/api/auth/verify-email?token=${newVerificationToken}`;
            const emailSubject = 'Tic-Tac-Toe Email Verification (Resent)';
            const emailHtml = `<h1>Welcome to Tic-Tac-Toe!</h1>
                <p>You attempted to register again. Please click the NEW link below to verify your email address:</p>
                <p><a href="${verifyUrl}">Verify My Email Address</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>The Tic-Tac-Toe Team</p>`;
            
            await sendEmail(email, emailSubject, emailHtml);

            return res.status(202).json({
                message: `This email (${email}) is registered but not verified. A new verification link has been sent.`,
                requiresVerification: true 
            });

        } else { // Proceed with NEW USER REGISTRATION
            const hashedPassword = await bcrypt.hash(password, 10);
            const verificationToken = crypto.randomBytes(20).toString('hex');
            const verificationExpires = Date.now() + 60*60*1000;
            
            const newUser = new User({ 
                username, email, password: hashedPassword,
                isVerified: false, emailVerificationToken: verificationToken,
                emailVerificationExpires: verificationExpires
            });
            await newUser.save();
            
            const verifyUrl = `${SERVER_URL}/api/auth/verify-email?token=${verificationToken}`; 
            const emailSubject = 'Tic-Tac-Toe Email Verification';
            const emailHtml = `<h1>Welcome to Tic-Tac-Toe!</h1>
                <p>Thank you for registering. Please click on the link below to verify your email address:</p>
                <p><a href="${verifyUrl}">Verify My Email Address</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you did not sign up for this, please ignore this email.</p>
                <p>The Tic-Tac-Toe Team</p>`;
            
            await sendEmail(email, emailSubject, emailHtml);
            
            res.status(202).json({
                message: 'Registration successful! Please check your email to verify your account.',
                requiresVerification: true
            });
        }
        
    } 
    catch (error) {
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
};


// 🔑 VERIFY EMAIL Controller
exports.verifyEmail = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ message: 'Verification token is required' });
    }

    try {
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.redirect(`${CLIENT_URL}/verification-status?status=error&message=Invalid or expired verification link.`);
            }

        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        return res.redirect(`${CLIENT_URL}/verification-status?status=success&message=Email verified successfully! You can now log in.`);
    } catch (error) {
        console.error("❌ Error in email verification:", error);
        res.redirect(`${CLIENT_URL}/verification-status?status=error&message=Server error during verification.`);
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
        
        if (!user) return res.status(404).json({ message: 'Invalid credentials' });
        
        if (!user.isVerified) {
            return res.status(403).json({ message: 'Email not verified. Please verify your email before logging in.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const { accessToken, refreshToken, refreshTokenExpiresAt } = await generateTokens(user);

        res.json({
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

// 🔑 FORGOT PASSWORD Controller
exports.forgotPassword = async (req, res) => {
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
};


// 🔑 RESET PASSWORD Controller
exports.resetPassword = async (req, res) => {
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

        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.refreshTokens = [];

        await user.save();
        res.status(200).json({ message: 'Password reset successful' });

    } catch (err) {
        console.error('❌ Reset Password Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};