const express = require('express');
const Vote = require('../models/Vote');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Toggle a vote on a question or answer
// @route   POST /api/votes
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { type, itemId } = req.body;

    if (!['question', 'answer'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid vote type' });
    }

    // Check if vote exists
    const existingVote = await Vote.findOne({ type, itemId, userId: req.user.id });

    let voteChange = 0;

    if (existingVote) {
      // User already voted, so remove vote (toggle off)
      await existingVote.deleteOne();
      voteChange = -1;
    } else {
      // Add new vote
      await Vote.create({ type, itemId, userId: req.user.id });
      voteChange = 1;
    }

    // Update Question or Answer
    let itemAuthorId;
    let itemTitle = '';
    let questionIdForLink = itemId;

    if (type === 'question') {
      const q = await Question.findByIdAndUpdate(itemId, { $inc: { votes: voteChange } });
      if (q) {
        itemAuthorId = q.authorId;
        itemTitle = q.title;
      }
    } else {
      const a = await Answer.findByIdAndUpdate(itemId, { $inc: { votes: voteChange } });
      if (a) {
        itemAuthorId = a.authorId;
        const parentQ = await Question.findById(a.questionId);
        itemTitle = parentQ ? parentQ.title : 'an answer';
        questionIdForLink = a.questionId;
      }
    }

    // Update reputation of the author who received/lost the vote
    if (itemAuthorId) {
      // Award/deduct 2 reputation per vote
      const repChange = voteChange * 2;
      await User.findByIdAndUpdate(itemAuthorId, { $inc: { reputation: repChange } });

       // Create notification for upvote (not for removing vote)
       if (voteChange === 1 && itemAuthorId.toString() !== req.user.id) {
        const displayTitle = itemTitle.length > 50 ? itemTitle.substring(0, 50) + '...' : itemTitle;
        const msg = type === 'question' 
          ? `${req.user.fullname} voted on your question: "${displayTitle}"`
          : `${req.user.fullname} voted on your answer to: "${displayTitle}"`;

        await Notification.create({
          recipient: itemAuthorId,
          sender: req.user.id,
          senderName: req.user.fullname,
          message: msg,
          type: 'vote',
          itemId: questionIdForLink
        });
      }
    }

    res.json({ success: true, voteChange });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
