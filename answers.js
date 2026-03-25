const express = require('express');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get answers for a specific question
// @route   GET /api/answers/:questionId
// @access  Public
router.get('/:questionId', async (req, res) => {
  try {
    const answers = await Answer.find({ questionId: req.params.questionId }).sort({ createdAt: 1 });
    res.json({ success: true, data: answers });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Create an answer
// @route   POST /api/answers
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { text, questionId } = req.body;

    const answer = await Answer.create({
      text,
      questionId,
      authorId: req.user.id,
      authorName: req.user.fullname,
      authorHandle: req.user.username,
      authorAvatar: req.user.avatar,
    });

    // Update answer count on question
    await Question.findByIdAndUpdate(questionId, { $inc: { answers: 1 } });
    
    // Update answer count & rep on user
    await User.findByIdAndUpdate(req.user.id, { $inc: { answers: 1, reputation: 5 } });

    // Create notification for question owner
    const question = await Question.findById(questionId);
    if (question && question.authorId.toString() !== req.user.id) {
      // Shorten title to avoid massive notifications if they're too long
      const qTitle = question.title.length > 50 ? question.title.substring(0, 50) + '...' : question.title;
      await Notification.create({
        recipient: question.authorId,
        sender: req.user.id,
        senderName: req.user.fullname,
        message: `${req.user.fullname} answered your question: "${qTitle}"`,
        type: 'answer',
        itemId: questionId
      });
    }

    res.status(201).json({ success: true, data: answer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// @desc    Update an answer (Owner only)
// @route   PUT /api/answers/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).json({ success: false, error: 'Answer not found' });
    
    // Check ownership
    if (answer.authorId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to edit' });
    }

    answer = await Answer.findByIdAndUpdate(req.params.id, { text: req.body.text }, { new: true, runValidators: true });
    res.json({ success: true, data: answer });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Delete an answer (Owner only)
// @route   DELETE /api/answers/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).json({ success: false, error: 'Answer not found' });
    
    // Check ownership
    if (answer.authorId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to delete' });
    }

    const questionId = answer.questionId;
    await answer.deleteOne();
    
    // Update answer count on question
    await Question.findByIdAndUpdate(questionId, { $inc: { answers: -1 } });
    
    // Update answer count on user
    await User.findByIdAndUpdate(req.user.id, { $inc: { answers: -1 } });

    res.json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
