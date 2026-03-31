const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Public
router.get('/', async (req, res) => {
  try {
    const sortParams = req.query.sort || 'all';
    let sortObj = { createdAt: -1 };

    if (sortParams === 'newest') {
      sortObj = { createdAt: -1 };
    } else if (sortParams === 'active') {
      sortObj = { answers: -1, questions: -1 };
    } else if (sortParams === 'contributors') {
      sortObj = { reputation: -1, answers: -1 };
    } else if (sortParams === 'all') {
      sortObj = { createdAt: -1 }; // Default fallback
    }

    const users = await User.find().select('-password').sort(sortObj);
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Get leaderboard (sorted by reputation)
// @route   GET /api/users/leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ reputation: -1, questions: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { fullname, username, email, bio, avatar } = req.body;

    // Fetch current user to compare submitted values
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ success: false, error: 'User not found' });

    // Only check uniqueness when a different value is submitted
    const orConditions = [];
    if (username && username.trim() && username.trim() !== currentUser.username) {
      orConditions.push({ username: username.trim() });
    }
    if (email && email.trim() && email.trim() !== currentUser.email) {
      orConditions.push({ email: email.trim() });
    }

    if (orConditions.length > 0) {
      const existingUser = await User.findOne({ $or: orConditions, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Username or email already in use by another account' });
      }
    }

    // Build $set object — only update fields that were provided
    const updateFields = {};
    if (fullname && fullname.trim()) updateFields.fullname = fullname.trim();
    if (username && username.trim()) updateFields.username = username.trim();
    if (email && email.trim()) updateFields.email = email.trim();
    if (bio !== undefined) updateFields.bio = bio;
    if (avatar !== undefined) updateFields.avatar = avatar || '';

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, data: updatedUser });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
