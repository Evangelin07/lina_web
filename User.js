const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  fullName: { type: String }, // For compatibility with imported data
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  questions: { type: Number, default: 0 },
  answers: { type: Number, default: 0 },
  reputation: { type: Number, default: 10 },
  savedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: { type: Date, default: Date.now }
});

// Sync fullName and fullname if one is missing
userSchema.pre('save', async function() {
  if (this.fullName && !this.fullname) {
    this.fullname = this.fullName;
  } else if (this.fullname && !this.fullName) {
    this.fullName = this.fullname;
  }
});


// Encrypt password before saving
userSchema.pre('save', async function() {
  try {
    if (!this.isModified('password') || !this.password) {
      return;
    }
    
    if (typeof this.password !== 'string' || this.password.trim() === '') {
      return;
    }

    console.log(`⏳ [PRE-SAVE] Hashing password for: ${this.email || 'new user'}...`);
    const salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
    console.log('✅ [PRE-SAVE] Hashing COMPLETE');
  } catch (err) {
    console.error('❌ [PRE-SAVE ERROR]:', err.message);
    throw err;
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    if (!this.password || typeof this.password !== 'string') {
      console.error(`❌ [BCRYPT ERROR] Stored password field is missing or invalid.`);
      return false;
    }
    
    // Check if stored password is a bcrypt hash
    if (!this.password.startsWith('$2')) {
      console.warn(`⚠️ [BCRYPT WARN] Stored password for ${this.email} is NOT a valid hash. Comparing as plain-text.`);
      return enteredPassword === this.password;
    }

    return bcrypt.compareSync(enteredPassword, this.password);
  } catch (err) {
    console.error('❌ [MATCH PASSWORD ERROR]:', err.message);
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);
