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
