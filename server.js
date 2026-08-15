require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const User = require('./models/User');
const Otp = require('./models/Otp');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_login_2026';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '475693894846-vo3m578joq2folkmt2qbnn2uahl8qsau.apps.googleusercontent.com';
const MONGO_URI = (process.env.MONGO_URI && process.env.MONGO_URI.trim()) || 'mongodb+srv://vaibhavkeshari495_db_user:8yysFuy2pC1nMp7i@cluster0.bkynzi0.mongodb.net/auth_db?retryWrites=true&w=majority&appName=Cluster0';
const EMAIL_USER = (process.env.EMAIL_USER || 'vaibhavkeshari495@gmail.com').trim().toLowerCase();
const EMAIL_PASS = (process.env.EMAIL_PASS || 'twzlaagrurnbvqes').replace(/\s+/g, '');

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  },
  connectionTimeout: 8000,
  greetingTimeout: 5000,
  socketTimeout: 10000
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log(' Connected to MongoDB Atlas successfully!');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.log('⏳ Retrying MongoDB connection in 5 seconds...');
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

const sendThinkPixelLabsOtpEmail = async (email, otp, firstName = 'there') => {
  const mailOptions = {
    from: `"THINK PIXELLABS" <${EMAIL_USER}>`,
    to: email,
    subject: `Your Verification Code: ${otp} — THINK PIXELLABS`,
    priority: 'high',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>THINK PIXELLABS Verification Code</title>
      </head>
      <body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:40px 15px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width:540px;background-color:#131b2e;border:1px solid #1f293d;border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
                <tr>
                  <td style="padding:36px 36px 20px 36px;text-align:center;background:linear-gradient(180deg,#1c2642 0%,#131b2e 100%);border-bottom:1px solid #1f293d;">
                    <div style="display:inline-block;padding:6px 16px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);border-radius:24px;color:#c084fc;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">
                      ✦ THINK PIXELLABS
                    </div>
                    <h1 style="margin:10px 0 6px 0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                      Welcome to THINK PIXELLABS
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
                      Thank you for choosing <strong>THINK PIXELLABS</strong>! Please enter the following 6-digit verification code to verify your email and complete your registration:
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
                      Explore our work at <a href="https://thinkpixellabs.com" target="_blank" style="color:#a78bfa;text-decoration:none;font-weight:600;">thinkpixellabs.com</a>
                    </p>
                    <p style="margin:0;font-size:12px;color:#475569;">
                      © ${new Date().getFullYear()} ThinkPixelLabs. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  return transporter.sendMail(mailOptions);
};

app.post('/api/send-otp', async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email: email.toLowerCase().trim() });

    const newOtp = new Otp({
      email: email.toLowerCase().trim(),
      otp: otpCode
    });
    await newOtp.save();

    try {
      await sendThinkPixelLabsOtpEmail(email.toLowerCase().trim(), otpCode, firstName.trim());
      console.log(`✅ OTP email delivered to ${email.toLowerCase().trim()}`);
    } catch (mailErr) {
      console.error('❌ Mail deliver error:', mailErr);
      return res.status(500).json({
        success: false,
        message: `Email sending failed: ${mailErr.message || 'SMTP Error'}`
      });
    }

    res.json({
      success: true,
      message: `OTP sent to ${email.toLowerCase().trim()}`
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to process OTP request.' });
  }
});

app.post('/api/verify-otp-signup', async (req, res) => {
  try {
    const { firstName, middleName, lastName, email, password, confirmPassword, otp } = req.body;

    if (!firstName || !lastName || !email || !password || !otp) {
      return res.status(400).json({ success: false, message: 'Please fill in all fields including the OTP.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const otpRecord = await Otp.findOne({
      email: email.toLowerCase().trim(),
      otp: otp.trim()
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please check your code or request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      user.firstName = firstName.trim();
      user.middleName = middleName ? middleName.trim() : '';
      user.lastName = lastName.trim();
      user.password = hashedPassword;
      await user.save();
    } else {
      user = new User({
        firstName: firstName.trim(),
        middleName: middleName ? middleName.trim() : '',
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword
      });
      await user.save();
    }

    await Otp.deleteMany({ email: email.toLowerCase().trim() });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      message: 'Email verified! Account created successfully.',
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

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.password) {
      return res.status(400).json({ success: false, message: 'This account uses Google Sign In. Please click "Log in with Google".' });
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

app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email, newPassword, confirmNewPassword } = req.body;

    if (!email || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully! Please log in with your new password.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

app.post('/api/google-auth', async (req, res) => {
  try {
    const { credential, accessToken, action } = req.body;
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

    if (action === 'signup') {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      await Otp.deleteMany({ email: email.toLowerCase().trim() });

      const newOtp = new Otp({
        email: email.toLowerCase().trim(),
        otp: otpCode
      });
      await newOtp.save();

      try {
        await sendThinkPixelLabsOtpEmail(email.toLowerCase().trim(), otpCode, given_name || 'there');
        console.log(`✅ Google Signup OTP email delivered to ${email.toLowerCase().trim()}`);
      } catch (mailErr) {
        console.error('❌ Google signup mail deliver error:', mailErr);
        return res.status(500).json({
          success: false,
          message: `Failed to send email: ${mailErr.message}`
        });
      }

      return res.json({
        success: true,
        requireOtp: true,
        message: `OTP sent to ${email.toLowerCase().trim()}`,
        googleUser: {
          firstName: given_name || 'Google User',
          middleName: '',
          lastName: family_name || '',
          email: email.toLowerCase().trim(),
          googleId: sub,
          avatar: picture || ''
        }
      });
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      await Otp.deleteMany({ email: email.toLowerCase().trim() });

      const newOtp = new Otp({
        email: email.toLowerCase().trim(),
        otp: otpCode
      });
      await newOtp.save();

      try {
        await sendThinkPixelLabsOtpEmail(email.toLowerCase().trim(), otpCode, given_name || 'there');
      } catch (mailErr) {
        console.error('❌ Google new user mail error:', mailErr);
      }

      return res.json({
        success: true,
        requireOtp: true,
        message: `Account not found. OTP sent to ${email.toLowerCase().trim()} to create your account!`,
        googleUser: {
          firstName: given_name || 'Google User',
          middleName: '',
          lastName: family_name || '',
          email: email.toLowerCase().trim(),
          googleId: sub,
          avatar: picture || ''
        }
      });
    }

    if (!user.googleId) {
      user.googleId = sub;
      if (!user.avatar && picture) user.avatar = picture;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      success: true,
      message: 'Signed in with Google successfully!',
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
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed.' });
  }
});

app.post('/api/verify-google-otp', async (req, res) => {
  try {
    const { email, firstName, lastName, googleId, avatar, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const otpRecord = await Otp.findOne({
      email: email.toLowerCase().trim(),
      otp: otp.trim()
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please check your code or request a new one.' });
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      user = new User({
        firstName: firstName || 'Google User',
        lastName: lastName || '',
        email: email.toLowerCase().trim(),
        googleId: googleId || '',
        avatar: avatar || ''
      });
      await user.save();
    } else {
      if (googleId) user.googleId = googleId;
      if (!user.avatar && avatar) user.avatar = avatar;
      await user.save();
    }

    await Otp.deleteMany({ email: email.toLowerCase().trim() });

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
