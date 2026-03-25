const express = require('express');
const Question = require('../models/Question');
const router = express.Router();

// @desc    Get all unique tags and their question counts
// @route   GET /api/tags
// @access  Public
router.get('/', async (req, res) => {
  try {
    const questions = await Question.find({}, 'tags');
    const tagMap = {};

    questions.forEach(q => {
      if (q.tags && Array.isArray(q.tags)) {
        q.tags.forEach(tag => {
          const t = tag.trim();
          if (t) {
            tagMap[t] = (tagMap[t] || 0) + 1;
          }
        });
      }
    });

    // Helper to get description for popular tags
    const getTagDesc = (name) => {
      const descriptions = {
        'javascript': 'High-level, often just-in-time compiled language that conforms to the ECMAScript specification.',
        'node.js': 'Cross-platform, open-source JavaScript runtime environment that executes JavaScript code outside a web browser.',
        'mongodb': 'Source-available cross-platform document-oriented database program.',
        'express': 'Fast, unopinionated, minimalist web framework for Node.js.',
        'react': 'Free and open-source front-end JavaScript library for building user interfaces based on UI components.',
        'css': 'Style sheet language used for describing the presentation of a document written in a markup language.',
        'html': 'Standard markup language for documents designed to be displayed in a web browser.',
        'python': 'High-level, general-purpose programming language known for its readability.',
        'java': 'High-level, class-based, object-oriented programming language designed to have as few implementation dependencies as possible.'
      };
      return descriptions[name.toLowerCase()] || `Questions related to ${name} development and troubleshooting.`;
    };

    // Convert map to array of objects and sort by count descending
    const tags = Object.keys(tagMap).map(name => {
      const count = tagMap[name];
      return {
        name,
        count: count,
        description: getTagDesc(name),
        isHot: count > 5, // Simple logic for "Hot" tags
        isTrending: count > 3 && count <= 5 // Logic for "Trending"
      };
    }).sort((a, b) => b.count - a.count);

    res.json({ success: true, data: tags });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
