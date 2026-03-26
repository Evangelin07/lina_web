const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  console.log('\n📧 [MAIL] sendEmail() called for:', options.email);

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.error('❌ [MAIL ERROR] EMAIL_USER or EMAIL_PASS missing from environment variables');
    throw new Error('Email credentials not configured');
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  // Verify connection configuration
  try {
    console.log('⏳ [MAIL] Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ [MAIL] SMTP Connection ready.');
  } catch (verifyErr) {
    console.error('❌ [MAIL AUTH ERROR]:', verifyErr.message);
    throw new Error(`Email authentication failed: ${verifyErr.message}`);
  }

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
    console.error('❌ [MAIL SEND FAILURE]:', err.message);
    throw err;
  }
};

module.exports = sendEmail;
