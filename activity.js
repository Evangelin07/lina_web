const express = require('express');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Vote = require('../models/Vote');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get current user's activity
// @route   GET /api/activity/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get questions posted by user
    const questions = await Question.find({ authorId: userId }).sort({ createdAt: -1 }).limit(15);

    // Get answers posted by user, populate the parent question
    const answers = await Answer.find({ authorId: userId }).sort({ createdAt: -1 }).limit(15);

    // Get votes by user
    const votes = await Vote.find({ userId: userId }).sort({ createdAt: -1 }).limit(15);

    // Resolve question titles for answers
    const answerQuestionIds = [...new Set(answers.map(a => a.questionId.toString()))];
    const answerQuestions = await Question.find({ _id: { $in: answerQuestionIds } }).select('_id title');
    const answerQMap = {};
    answerQuestions.forEach(q => { answerQMap[q._id.toString()] = q.title; });

    // Resolve question/answer titles for votes
    const questionVoteIds = votes.filter(v => v.type === 'question').map(v => v.itemId.toString());
    const answerVoteIds  = votes.filter(v => v.type === 'answer').map(v => v.itemId.toString());

    const voteQuestions = questionVoteIds.length
      ? await Question.find({ _id: { $in: questionVoteIds } }).select('_id title')
      : [];
    const voteAnswers = answerVoteIds.length
      ? await Answer.find({ _id: { $in: answerVoteIds } }).select('_id questionId text')
      : [];

    const voteQMap = {};
    voteQuestions.forEach(q => { voteQMap[q._id.toString()] = { title: q.title, questionId: q._id }; });

    // For answer-votes, we need the parent question title
    const voteAnswerQIds = [...new Set(voteAnswers.map(a => a.questionId.toString()))];
    const voteAnswerParentQs = voteAnswerQIds.length
      ? await Question.find({ _id: { $in: voteAnswerQIds } }).select('_id title')
      : [];
    const voteAnswerParentQMap = {};
    voteAnswerParentQs.forEach(q => { voteAnswerParentQMap[q._id.toString()] = q.title; });

    const voteAMap = {};
    voteAnswers.forEach(a => {
      voteAMap[a._id.toString()] = {
        text: a.text ? a.text.substring(0, 60) + (a.text.length > 60 ? '…' : '') : 'an answer',
        questionId: a.questionId,
        questionTitle: voteAnswerParentQMap[a.questionId.toString()] || 'a question'
      };
    });

    // Format activities
    let activities = [];

    questions.forEach(q => {
      activities.push({
        type: 'question',
        text: `You posted: "${q.title}"`,
        createdAt: q.createdAt,
        itemId: q._id,
        questionId: q._id,
        questionTitle: q.title
      });
    });

    answers.forEach(a => {
      const qTitle = answerQMap[a.questionId.toString()] || 'a question';
      activities.push({
        type: 'answer',
        text: `You answered: "${qTitle}"`,
        createdAt: a.createdAt,
        itemId: a.questionId,        // link to question
        questionId: a.questionId,
        questionTitle: qTitle,
        answerText: a.text
      });
    });

    votes.forEach(v => {
      const idStr = v.itemId.toString();
      let displayTitle = 'an item';
      let questionId = v.itemId;

      if (v.type === 'question' && voteQMap[idStr]) {
        displayTitle = voteQMap[idStr].title;
        questionId = voteQMap[idStr].questionId;
      } else if (v.type === 'answer' && voteAMap[idStr]) {
        displayTitle = voteAMap[idStr].questionTitle;
        questionId = voteAMap[idStr].questionId;
      }

      activities.push({
        type: 'vote',
        text: `You voted on: "${displayTitle}"`,
        createdAt: v.createdAt || new Date(v._id.getTimestamp()),
        itemId: questionId,
        questionId: questionId,
        questionTitle: displayTitle
      });
    });

    // Sort by date descending, take top 30
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    activities = activities.slice(0, 30);

    res.json({ success: true, data: activities });
  } catch (err) {
    console.error('Activity error:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
