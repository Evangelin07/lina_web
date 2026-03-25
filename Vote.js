const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['question', 'answer'] },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vote', voteSchema);
