const express = require('express');
const Question = require('../models/Question');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all questions
// @route   GET /api/questions
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { filter } = req.query;
    let query = {};
    let sort = { createdAt: -1 };

    if (filter === 'unanswered') {
      query.answers = 0;
    } else if (filter === 'featured') {
      // Define featured as practical engagement: at least 1 vote OR 1 answer
      query.$or = [{ votes: { $gte: 1 } }, { answers: { $gte: 1 } }];
      sort = { votes: -1, answers: -1, createdAt: -1 };
    } else if (filter === 'trending') {
      // Sort priority: votes, then answers, then newest
      sort = { votes: -1, answers: -1, createdAt: -1 };
    } else if (filter === 'newest') {
      sort = { createdAt: -1 };
    }

    const questions = await Question.find(query).sort(sort);
    res.json({ success: true, data: questions });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Get current user's questions
// @route   GET /api/questions/my
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const questions = await Question.find({ authorId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: questions });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Get saved questions
// @route   GET /api/questions/saved
// @access  Private
router.get('/saved', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('savedQuestions');
    // We reverse populated array manually or depend on creation logic
    const questions = user.savedQuestions || [];
    res.json({ success: true, data: questions });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Save/Unsave a question
// @route   POST /api/questions/:id/save
// @access  Private
router.post('/:id/save', protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, error: 'Question not found' });
    
    const qIdStr = req.params.id;
    let user = await User.findById(req.user.id);
    const isAlreadySaved = user.savedQuestions && user.savedQuestions.some(id => id.toString() === qIdStr);
    
    let isSaved = false;
    if (isAlreadySaved) {
      await User.findByIdAndUpdate(req.user.id, { $pull: { savedQuestions: qIdStr } });
      isSaved = false;
    } else {
      await User.findByIdAndUpdate(req.user.id, { $addToSet: { savedQuestions: qIdStr } });
      isSaved = true;
    }
    
    res.json({ success: true, isSaved });
  } catch (err) {
    console.error('Save Question Error:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Create a question
// @route   POST /api/questions
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, tags } = req.body;
    
    const question = await Question.create({
      title,
      description,
      tags,
      authorId: req.user.id,
      authorName: req.user.fullname,
      authorHandle: req.user.username,
      authorAvatar: req.user.avatar,
    });

    // Award reputation or update question count on User
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { questions: 1, reputation: 5 }
    });

    res.status(201).json({ success: true, data: question });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// @desc    Get a single question by ID
// @route   GET /api/questions/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, error: 'Question not found' });
    res.json({ success: true, data: question });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Update a question (Owner only)
// @route   PUT /api/questions/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, error: 'Question not found' });
    
    // Check ownership
    if (question.authorId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to edit' });
    }

    const { title, description, tags } = req.body;
    const updateData = { title, description };
    if (Array.isArray(tags)) updateData.tags = tags;

    question = await Question.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    
    res.json({ success: true, data: question });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Delete a question (Owner only)
// @route   DELETE /api/questions/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, error: 'Question not found' });
    
    // Check ownership
    if (question.authorId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to delete' });
    }

    await question.deleteOne();
    
    // Update user question count (decrement)
    await User.findByIdAndUpdate(req.user.id, { $inc: { questions: -1 } });

    res.json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
