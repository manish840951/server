// // routes/progress.js
// const express = require('express');
// const router = express.Router();
// const User = require('../models/user');

// // Middleware to require authentication and get user from Auth0
// const { requiresAuth } = require('express-openid-connect');

// router.post('/watch', requiresAuth(), async (req, res) => {
//   const { videoId } = req.body;
//   const userId = req.oidc.user.sub; // Auth0 user ID

//   try {
//     const user = await User.findOneAndUpdate(
//       { auth0Id: userId },
//       { $addToSet: { watchedVideos: videoId } }, // avoid duplicates
//       { new: true }
//     );
//     res.json({ watchedVideos: user.watchedVideos });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to update progress' });
//   }
// });

// // Get watched videos for user
// router.get('/watched', requiresAuth(), async (req, res) => {
//   const userId = req.oidc.user.sub;
//   try {
//     const user = await User.findOne({ auth0Id: userId }).populate('watchedVideos');
//     res.json({ watchedVideos: user.watchedVideos });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch progress' });
//   }
// });

// module.exports = router;


const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Middleware to require authentication and get user from Auth0
const { requiresAuth } = require('express-openid-connect');

// Mark a video as watched
router.post('/watch', requiresAuth(), async (req, res) => {
  const { videoId } = req.body;
  const userId = req.oidc.user.sub; // Auth0 user ID

  try {
    const user = await User.findOne({ auth0Id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Add videoId to watchedVideos array if not already present
    if (!user.watchedVideos.includes(videoId)) {
      user.watchedVideos.push(videoId);
      await user.save();
    }
    res.json({ watchedVideos: user.watchedVideos });
  } catch (err) {
    console.error('Error updating watched videos:', err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Get watched videos for user
router.get('/watched', requiresAuth(), async (req, res) => {
  const userId = req.oidc.user.sub;
  try {
    const user = await User.findOne({ auth0Id: userId }).populate('watchedVideos');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ watchedVideos: user.watchedVideos });
  } catch (err) {
    console.error('Error fetching watched videos:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

module.exports = router;
