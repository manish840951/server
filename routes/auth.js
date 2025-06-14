// const express = require('express');
// const bcrypt = require('bcrypt');
// const app = express();

// app.use(express.json()); // Parse JSON bodies

// // In-memory user store (for demonstration only; use a DB in production)
// const users = [];

// app.post('/signup', async (req, res) => {
//   const { email, password } = req.body;

//   // Simple validation
//   if (!email || !password) {
//     return res.status(400).json({ message: 'Email and password are required.' });
//   }

//   // Check if user already exists
//   if (users.some(user => user.email === email)) {
//     return res.status(409).json({ message: 'User already exists.' });
//   }

//   try {
//     // Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Save user (never save plain passwords!)
//     users.push({ email, password: hashedPassword });

//     res.status(201).json({ message: 'Signup successful!' });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error.' });
//   }
// });

// // // Start the server
// // app.listen(5000, () => {
// //   console.log('Server running on http://localhost:5000');
// // });

// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.post('/sync', async (req, res) => {
  const { auth0Id, email, event } = req.body;
  let user = await User.findOne({ auth0Id });

  if (!user && event === "login") {
    // New signup
    user = new User({ auth0Id, email, signupAt: new Date(), lastLoginAt: new Date(), isLoggedIn: true });
    await user.save();
    return res.json({ status: "signup", user });
  }

  if (user && event === "login") {
    user.lastLoginAt = new Date();
    user.isLoggedIn = true;
    await user.save();
    return res.json({ status: "login", user });
  }

  if (user && event === "logout") {
    user.lastLogoutAt = new Date();
    user.isLoggedIn = false;
    await user.save();
    return res.json({ status: "logout", user });
  }

  res.json({ status: "unknown event" });
});

module.exports = router;
