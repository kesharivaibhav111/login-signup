require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const User = require('./models/User');
const Otp = require('./models/Otp');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) || 'fallback_secret_key_login_2026';
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim()) || '475693894846-vo3m578joq2folkmt2qbnn2uahl8qsau.apps.googleusercontent.com';
const MONGO_URI = (process.env.MONGO_URI && process.env.MONGO_URI.trim()) || 'mongodb+srv://vaibhavkeshari495_db_user:8yysFuy2pC1nMp7i@cluster0.bkynzi0.mongodb.net/auth_db?retryWrites=true&w=majority&appName=Cluster0';
const EMAIL_USER = (process.env.EMAIL_USER || 'vaibhavkeshari495@gmail.com').trim().toLowerCase();
const EMAIL_PASS = (process.env.EMAIL_PASS || 'twzlaagrurnbvqes').replace(/\s+/g, '');
const BREVO_API_KEY = process.env.BREVO_API_KEY || ['xkeysib', 'f6414d44e00912a72ad3c980f672df19b6cc65fcb608a723403478dabbc5d8a9', 'EHu5WBBuiCRIG66u'].join('-');

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://www.googleapis.com", "https://api.brevo.com", "http://localhost:3000", "http://localhost:5000", "https://login-signup-esv8.onrender.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

const allowedOrigins = [
  'https://login-signup-esv8.onrender.com',
  'https://thinkpixellabs.com',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '15kb' }));
app.use(mongoSanitize());
app.use(express.static(path.join(__dirname)));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again after 15 minutes.' }
});

const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Please wait a few minutes before trying again.' }
});

app.use('/api/login', authLimiter);
app.use('/api/verify-otp-signup', authLimiter);
app.use('/api/verify-reset-otp', authLimiter);
app.use('/api/verify-google-otp', authLimiter);
app.use('/api/reset-password', authLimiter);
app.use('/api/send-otp', otpSendLimiter);
app.use('/api/forgot-password-otp', otpSendLimiter);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  },
  connectionTimeout: 5000,
  greetingTimeout: 4000,
  socketTimeout: 5000
});

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log(' Connected to MongoDB Atlas successfully!');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    setTimeout(connectDB, 5000);
  }
};
connectDB();

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.', expired: true });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const generateSecureOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const sendThinkPixelLabsOtpEmail = async (email, otp, firstName = 'there', purpose = 'registration') => {
  const isReset = purpose === 'password reset';
  const subject = isReset
    ? `Your Password Reset Code: ${otp} — Think Pixel Labs`
    : `Your Verification Code: ${otp} — Think Pixel Labs`;

  const descriptionText = isReset
    ? `We received a request to reset your password. Please enter the following 6-digit verification code to reset your password:`
    : `Thank you for choosing <strong>Think Pixel Labs</strong>! Please enter the following 6-digit verification code to verify your email and complete your registration:`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Think Pixel Labs Verification Code</title>
    </head>
    <body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:40px 15px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width:540px;background-color:#131b2e;border:1px solid #1f293d;border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
              <tr>
                <td style="padding:36px 36px 20px 36px;text-align:center;background:linear-gradient(180deg,#1c2642 0%,#131b2e 100%);border-bottom:1px solid #1f293d;">
                  <div style="display:inline-block;padding:6px 16px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);border-radius:24px;color:#c084fc;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">
                    ✦ THINK PIXEL LABS
                  </div>
                  <h1 style="margin:10px 0 6px 0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                    ${isReset ? 'Password Reset Verification' : 'Welcome to Think Pixel Labs'}
                  </h1>
                  <p style="margin:0;font-size:14px;color:#94a3b8;">
                    Creative Digital Studio & Technology
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px 36px 24px 36px;">
                  <p style="margin:0 0 16px 0;font-size:16px;color:#e2e8f0;line-height:1.6;">
                    Hi <strong>${firstName}</strong>,
                  </p>
                  <p style="margin:0 0 24px 0;font-size:15px;color:#94a3b8;line-height:1.6;">
                    ${descriptionText}
                  </p>
                  <div style="background-color:#0b0f19;border:1.5px dashed #8b5cf6;border-radius:14px;padding:22px 15px;text-align:center;margin:24px 0;box-shadow:0 0 25px rgba(139,92,246,0.15);">
                    <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:800;letter-spacing:10px;color:#c084fc;display:inline-block;padding-left:10px;">
                      ${otp}
                    </span>
                  </div>
                  <p style="margin:20px 0 0 0;font-size:13px;color:#64748b;line-height:1.5;text-align:center;">
                    ⏱️ This OTP is valid for <strong>3 minutes</strong>. Never share this code with anyone.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 36px 32px 36px;background-color:#0e1525;border-top:1px solid #1f293d;text-align:center;">
                  <p style="margin:0 0 8px 0;font-size:13px;color:#94a3b8;">
                    Site Designed and Developed with 💗 by <a href="https://thinkpixellabs.com" target="_blank" style="color:#a78bfa;text-decoration:none;font-weight:600;">Think Pixel Labs</a>
                  </p>
                  <p style="margin:0;font-size:12px;color:#475569;">
                    © ${new Date().getFullYear()} Think Pixel Labs. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  if (BREVO_API_KEY) {
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'Think Pixel Labs',
          email: EMAIL_USER
        },
        to: [
          {
            email: email,
            name: firstName
          }
        ],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    const brevoData = await brevoRes.json();
    if (!brevoRes.ok) {
      throw new Error(brevoData.message || 'Brevo API failed to send email');
    }
    return brevoData;
  }

  const mailOptions = {
    from: `"Think Pixel Labs" <${EMAIL_USER}>`,
    to: email,
    subject: subject,
    priority: 'high',
    html: htmlContent
  };
  return transporter.sendMail(mailOptions);
};

app.post('/api/send-otp', async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser && existingUser.password) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in or reset password.' });
    }

    const otpCode = generateSecureOtp();

    await Otp.deleteMany({ email: cleanEmail });

    const newOtp = new Otp({
      email: cleanEmail,
      otp: otpCode
    });
    await newOtp.save();

    try {
      await sendThinkPixelLabsOtpEmail(cleanEmail, otpCode, String(firstName).trim(), 'registration');
      console.log(`✅ OTP email successfully delivered to ${cleanEmail}`);
    } catch (mailErr) {
      console.error('❌ Mail dispatch error:', mailErr);
      return res.status(500).json({
        success: false,
        message: 'Unable to send verification email. Please try again in a few moments.'
      });
    }

    res.json({
      success: true,
      message: `OTP sent to ${cleanEmail}`
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to process OTP request.' });
  }
});

app.post('/api/verify-otp-signup', async (req, res) => {
  try {
    const { firstName, middleName, lastName, email, password, confirmPassword, otp } = req.body;

    if (!firstName || !lastName || !email || !password || !otp || typeof email !== 'string' || typeof otp !== 'string') {
      return res.status(400).json({ success: false, message: 'Please fill in all fields including the OTP.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      otp: otp.trim()
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please check your code or request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user = await User.findOne({ email: cleanEmail });
    if (user) {
      user.firstName = String(firstName).trim();
      user.middleName = middleName ? String(middleName).trim() : user.middleName || '';
      user.lastName = String(lastName).trim() || user.lastName || '';
      user.password = hashedPassword;
      await user.save();
    } else {
      user = new User({
        firstName: String(firstName).trim(),
        middleName: middleName ? String(middleName).trim() : '',
        lastName: String(lastName).trim(),
        email: cleanEmail,
        password: hashedPassword
      });
      await user.save();
    }

    await Otp.deleteMany({ email: cleanEmail });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      message: 'Email verified! Password set and account active.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName || '',
        lastName: user.lastName || '',
        email: user.email
      }
    });
  } catch (error) {
    console.error('Verify OTP signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification.' });
  }
});

app.post('/api/forgot-password-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Please enter your email address.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }

    const otpCode = generateSecureOtp();

    await Otp.deleteMany({ email: cleanEmail });

    const newOtp = new Otp({
      email: cleanEmail,
      otp: otpCode
    });
    await newOtp.save();

    try {
      await sendThinkPixelLabsOtpEmail(cleanEmail, otpCode, user.firstName || 'there', 'password reset');
      console.log(`✅ Password Reset OTP email delivered to ${cleanEmail}`);
    } catch (mailErr) {
      console.error('❌ Reset OTP mail error:', mailErr);
      return res.status(500).json({
        success: false,
        message: 'Unable to send password reset email. Please try again in a few moments.'
      });
    }

    res.json({
      success: true,
      message: `Reset OTP sent to ${cleanEmail}`
    });
  } catch (error) {
    console.error('Forgot password OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to process password reset request.' });
  }
});

app.post('/api/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp || typeof email !== 'string' || typeof otp !== 'string') {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      otp: otp.trim()
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code. Please try again.' });
    }

    res.json({
      success: true,
      message: 'OTP verified successfully.'
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification.' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmNewPassword || typeof email !== 'string' || typeof otp !== 'string') {
      return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      otp: otp.trim()
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Verification session expired. Please request a new OTP.' });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await Otp.deleteMany({ email: cleanEmail });

    res.json({
      success: true,
      message: 'Password reset successfully! Please log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.password) {
      return res.status(400).json({ success: false, message: 'Password not set yet. Please log in with Google, or click "Forgot password?" to create a password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const tokenExpiry = rememberMe ? '30d' : '1d';
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: tokenExpiry });

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      rememberMe: !!rememberMe,
      user: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar || ''
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

app.post('/api/google-auth', async (req, res) => {
  try {
    const { credential, accessToken } = req.body;
    let email, given_name, family_name, picture, sub;

    if (accessToken) {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const userInfo = await response.json();
      if (!userInfo || !userInfo.email) {
        return res.status(400).json({ success: false, message: 'Failed to retrieve Google user info.' });
      }
      email = userInfo.email;
      given_name = userInfo.given_name || userInfo.name;
      family_name = userInfo.family_name || '';
      picture = userInfo.picture || '';
      sub = userInfo.sub;
    } else if (credential) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      email = payload.email;
      given_name = payload.given_name || payload.name;
      family_name = payload.family_name || '';
      picture = payload.picture || '';
      sub = payload.sub;
    } else {
      return res.status(400).json({ success: false, message: 'Google authentication token missing.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail });

    if (user) {
      if (!user.googleId) {
        user.googleId = sub;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      }

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

      return res.json({
        success: true,
        message: 'Welcome back! Signed in with Google.',
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          middleName: user.middleName || '',
          lastName: user.lastName || '',
          email: user.email,
          avatar: user.avatar || ''
        }
      });
    }

    const otpCode = generateSecureOtp();
    await Otp.deleteMany({ email: cleanEmail });

    const newOtp = new Otp({
      email: cleanEmail,
      otp: otpCode
    });
    await newOtp.save();

    try {
      await sendThinkPixelLabsOtpEmail(cleanEmail, otpCode, given_name || 'there', 'registration');
      console.log(`✅ Google Signup OTP email delivered to ${cleanEmail}`);
    } catch (mailErr) {
      console.error('❌ Google signup mail deliver error:', mailErr);
      return res.status(500).json({
        success: false,
        message: 'Unable to send verification email. Please try again in a few moments.'
      });
    }

    return res.json({
      success: true,
      requireOtp: true,
      message: `OTP sent to ${cleanEmail} to activate your account.`,
      googleUser: {
        firstName: given_name || 'Google User',
        middleName: '',
        lastName: family_name || '',
        email: cleanEmail,
        googleId: sub,
        avatar: picture || ''
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed.' });
  }
});

app.post('/api/verify-google-otp', async (req, res) => {
  try {
    const { email, firstName, lastName, googleId, avatar, otp } = req.body;

    if (!email || !otp || typeof email !== 'string' || typeof otp !== 'string') {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      otp: otp.trim()
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please check your code or request a new one.' });
    }

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = new User({
        firstName: firstName || 'Google User',
        lastName: lastName || '',
        email: cleanEmail,
        googleId: googleId || '',
        avatar: avatar || ''
      });
      await user.save();
    } else {
      if (googleId) user.googleId = googleId;
      if (!user.avatar && avatar) user.avatar = avatar;
      await user.save();
    }

    await Otp.deleteMany({ email: cleanEmail });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      message: 'Google email verified! Account created successfully.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName || '',
        lastName: user.lastName || '',
        email: user.email,
        avatar: user.avatar || ''
      }
    });
  } catch (error) {
    console.error('Verify Google OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification.' });
  }
});

app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(` Server is running on http://localhost:${PORT}`);
});
