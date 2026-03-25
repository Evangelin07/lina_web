const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  console.log('\n📧 [MAIL] sendEmail() called for:', options.email);

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.error('❌ [MAIL ERROR] EMAIL_USER or EMAIL_PASS missing from .env');
    throw new Error('Email credentials not configured');
  }

  // Use service gmail (most robust for App Passwords)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  const mailOptions = {
    from: `"Lina Community" <${emailUser}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  console.log(`📤 [MAIL] Sending "${options.subject}" to ${options.email}...`);
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ [MAIL SUCCESS] Message ID:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ [MAIL FAILURE]:', err.message);
    if (err.message.includes('535-5.7.8')) {
      console.error('   👉 ACTION REQUIRED: Your Gmail App Password was rejected.');
      console.error('   👉 Fix: Enable 2-Step Verification and create a new 16-character App Password.');
    }
    throw err;
  }
};

module.exports = sendEmail;

module.exports = sendEmail;
