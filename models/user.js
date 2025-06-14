// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  auth0Id: { type: String, required: true, unique: true }, // Auth0 user ID
  email: { type: String, required: true, unique: true },
  signupAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date },
  lastLogoutAt: { type: Date },
  isLoggedIn: { type: Boolean, default: false },
  watchedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }]
});

module.exports = mongoose.model('User', userSchema);


