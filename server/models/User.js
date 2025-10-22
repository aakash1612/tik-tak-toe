// tik-tok-toe/server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  emailVerificationToken: {
    type: String,
  },

  emailVerificationExpires: {
    type: Date,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/, 'Please enter a valid email address']
  },
  
  password: {
    type: String,
    required: true,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  
  refreshTokens: [
    {
      token: { type: String, required: true },
      expiresAt: { type: Date, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('User', userSchema);