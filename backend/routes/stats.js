const express = require('express');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/User');

const router = express.Router();

// @desc    Get global statistics (questions, answers, users)
// @route   GET /api/stats
// @access  Public
router.get('/', async (req, res) => {
  try {
    const totalQuestions = await Question.countDocuments();
    const totalAnswers = await Answer.countDocuments();
    const totalUsers = await User.countDocuments();
    
    res.json({
      success: true,
      data: {
        totalQuestions,
        totalAnswers,
        totalUsers
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
