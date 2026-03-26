const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const getSignedJwtToken = (id) => {
  if (!process.env.JWT_SECRET) {
    console.error('❌ [JWT ERROR] JWT_SECRET is missing from .env!');
    throw new Error('JWT Configuration Error');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res, next) => {
  try {
    const { fullname, username, email, password, bio, avatar } = req.body;
    console.log(`📝 [REGISTER ATTEMPT] Username: ${username}, Email: ${email}`);
    
    // Check for existing user (Case-insensitive check)
    const userExists = await User.findOne({ 
      $or: [
        { email: { $regex: new RegExp(`^${email}$`, 'i') } }, 
        { username: { $regex: new RegExp(`^${username}$`, 'i') } }
      ] 
    });

    if (userExists) {
      console.warn('⚠️ [REGISTER FAILED] Username or email already exists');
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    const user = await User.create({ fullname, username, email, password, bio, avatar });
    console.log(`✅ [REGISTER SUCCESS] User created: ${user.email}`);

    const token = getSignedJwtToken(user._id);
    
    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({ success: true, token, user: userObj });
  } catch (err) {
    return next(err);
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    
    console.log(`\n🔐 [LOGIN ATTEMPT] ----------------------`);
    console.log(`   Time: ${new Date().toISOString()}`);
    console.log(`   Identifier: "${identifier}"`);
    console.log(`   Has Password: ${password ? 'YES' : 'NO'}`);

    if (!identifier || !password) {
      console.warn('⚠️ [LOGIN FAILED] Missing identifier or password');
      return res.status(400).json({ success: false, error: 'Please provide an email/username and password' });
    }

    // Check for user (Case-Insensitive Regex)
    const escapedIdentifier = identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    console.log(`🔍 [LOGIN] Searching for user: "${identifier}"...`);
    const user = await User.findOne({ 
      $or: [
        { email: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } }, 
        { username: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } }
      ] 
    }).select('+password');

    if (!user) {
      console.log(`❌ [LOGIN FAILED] User NOT FOUND for identifier: "${identifier}"`);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    console.log(`👤 [LOGIN] User FOUND: ${user.email} (@${user.username})`);
    
    if (!user.password) {
      console.error(`❌ [LOGIN ERROR] Password field is MISSING in DB for user: ${user.email}`);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Verify password
    try {
      console.log(`⏳ [LOGIN] Verifying password...`);
      const isMatch = await user.matchPassword(password);
      
      if (!isMatch) {
        console.log(`❌ [LOGIN FAILED] Password mismatch for: ${user.email}`);
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
    } catch (bcryptErr) {
      console.error('❌ [LOGIN CRITICAL ERROR] Password comparison crashed:', bcryptErr.message);
      return res.status(500).json({ success: false, error: 'Server error during password verification.' });
    }

    console.log(`✅ [LOGIN] Password verified for: ${user.email}`);

    // JWT Generation
    try {
      if (!process.env.JWT_SECRET) {
        console.error('❌ [CONFIG ERROR] JWT_SECRET is missing on host environment!');
        return res.status(500).json({ success: false, error: 'Server configuration error (JWT_SECRET missing).' });
      }

      console.log(`⏳ [LOGIN] Generating token...`);
      const token = getSignedJwtToken(user._id);
      console.log(`✅ [LOGIN] Token generated.`);
      
      // Prepare response object
      const userObj = user.toObject();
      delete userObj.password;

      console.log(`🚀 [LOGIN] Sending success response for: ${user.email}`);
      console.log(`------------------------------------\n`);
      return res.status(200).json({ success: true, token, user: userObj });
    } catch (jwtErr) {
      console.error('❌ [LOGIN CRITICAL ERROR] Token generation failed:', jwtErr.message);
      return res.status(500).json({ success: false, error: 'Server error during token generation.' });
    }
  } catch (err) {
    console.error('💥 [LOGIN ROUTE ERROR]:', err);
    return next(err);
  }
});


// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, data: user });
});

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
router.post('/forgotpassword', async (req, res, next) => {
  let user;
  try {
    const { email } = req.body;
    console.log(`\n🔐 [FORGOT PASSWORD] ----------------------`);
    console.log(`   Time: ${new Date().toISOString()}`);
    console.log(`   Email received: "${email}"`);

    if (!email) {
      console.warn('⚠️ [FORGOT FAILED] No email provided in request body');
      return res.status(400).json({ success: false, error: 'Please provide an email address' });
    }

    console.log(`🔍 [FORGOT] Searching for user with email: "${email}"...`);
    user = await User.findOne({ email });
    
    if (!user) {
      console.warn(`❌ [FORGOT FAILED] No user found with email: "${email}"`);
      return res.status(404).json({ success: false, error: 'There is no user with that email' });
    }

    console.log(`👤 [FORGOT] User found: ${user.email} (ID: ${user._id})`);

    // Generate token
    console.log(`⏳ [FORGOT] Generating reset token...`);
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    console.log(`⏳ [FORGOT] Saving reset token to database...`);
    await user.save({ validateBeforeSave: false });
    console.log(`✅ [FORGOT] Token saved successfully.`);

    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${frontendUrl}/reset-password.html?token=${resetToken}`;
    
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please use the following link to reset your password:\n\n${resetUrl}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #6366f1; text-align: center;">Password Reset</h1>
        <p>You requested a password reset for your <strong>Lina Community</strong> account. Click the button below to set a new password. This link is valid for <strong>10 minutes</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Lina Community &bull; Your Knowledge Base</p>
      </div>
    `;

    console.log(`⏳ [FORGOT] Attempting to send email via SMTP...`);
    await sendEmail({
      email: user.email,
      subject: 'Lina Community Password Reset',
      message,
      html
    });

    console.log(`✅ [FORGOT SUCCESS] Email sent to: ${user.email}`);
    console.log(`------------------------------------\n`);
    return res.status(200).json({ success: true, data: 'Email sent successfully' });

  } catch (err) {
    console.error('\n💥 [FORGOT ROUTE FATAL ERROR] ----------------');
    console.error('   Message:', err.message);
    console.error('   Stack:', err.stack);
    
    // Attempt cleanup if DB save happened but email failed
    if (user) {
      console.log(`⏳ [FORGOT CLEANUP] Removing failed reset token from DB...`);
      try {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        console.log(`✅ [FORGOT CLEANUP] DB cleaned.`);
      } catch (cleanErr) {
        console.error(`❌ [FORGOT CLEANUP FAILED]:`, cleanErr.message);
      }
    }

    // Instead of just calling next(err), respond with a clear JSON error
    const statusCode = err.name === 'Error' && err.message.includes('configured') ? 500 : 500;
    return res.status(statusCode).json({ 
      success: false, 
      error: err.message || 'Server error. Could not send password reset email.' 
    });
  }
});

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
router.put('/resetpassword/:resettoken', async (req, res, next) => {
  try {
    const { resettoken } = req.params;
    const { password } = req.body;

    console.log(`\n🔄 [RESET] Request received with token: ${resettoken.substring(0, 5)}...`);

    if (!password) {
      console.warn('⚠️ [RESET FAILED] No password provided in body');
      return res.status(400).json({ success: false, error: 'Please provide a new password' });
    }

    // Hash the token provided in the URL to compare with the one in DB
    console.log('⏳ [RESET] Hashing incoming token for lookup...');
    const resetPasswordToken = crypto.createHash('sha256').update(resettoken).digest('hex');

    console.log('🔍 [RESET] Searching for user with active token...');
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      console.warn('❌ [RESET FAILED] Invalid or expired token');
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    console.log(`👤 [RESET] User found: ${user.email} (ID: ${user._id})`);

    // Set new password (the User model's pre-save hook will hash this)
    console.log(`⏳ [RESET] Updating password field...`);
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    console.log('⏳ [RESET] Saving user document...');
    await user.save();
    console.log('✅ [RESET SUCCESS] Password saved in MongoDB.');

    // Generate a new JWT token so the user is logged in immediately
    console.log('⏳ [RESET] Generating auto-login JWT...');
    const tokenLine = getSignedJwtToken(user._id); // renamed slightly to avoid confusion with the URL token
    
    const userObj = user.toObject();
    delete userObj.password;

    console.log('🚀 [RESET] Sending Success JSON');
    return res.status(200).json({ success: true, token: tokenLine, user: userObj });

  } catch (err) {
    console.error('\n❌ [RESET ROUTE CRITICAL ERROR] ----------------');
    console.error('   Message:', err.message);
    return next(err);
  }
});

module.exports = router;
