# 🔐 Full-Stack Authentication & OTP Verification System

[![npm version](https://img.shields.io/npm/v/@vaibhav_keshari/login-signup-app.svg?style=flat-square&color=8b5cf6)](https://www.npmjs.com/package/@vaibhav_keshari/login-signup-app)
[![license](https://img.shields.io/npm/l/@vaibhav_keshari/login-signup-app.svg?style=flat-square&color=blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg?style=flat-square)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg?style=flat-square&logo=mongodb)](https://www.mongodb.com/atlas)

A complete, production-ready, highly secure full-stack authentication system built with **Node.js, Express, MongoDB Atlas, Google OAuth 2.0, Brevo OTP Service**, and an interactive animated UI with cursor-tracking eyes.

---

## ✨ Features

- 🔑 **Dual Authentication**: Seamless login and signup with Email/Password or Google OAuth 2.0.
- 📩 **6-Digit Cryptographic OTP**: Email verification for signup and password reset with 3-minute TTL auto-expiration in MongoDB.
- 🛡️ **Enterprise Security (Grade A++)**:
  - **120,000+ Disposable Email Blocking**: Prevents fake/temporary accounts.
  - **DNS MX Record Validation**: Verifies mail server existence before dispatching emails.
  - **Honeypot Bot Defense**: Traps automated spam scripts and bots.
  - **Rate Limiting & Cooldown**: IP rate limiter + 60s cooldown per email + 4 OTP/day cap.
  - **Helmet & CSP Hardening**: Content Security Policy with Google popup support (`COOP`).
  - **NoSQL Injection Defense**: `express-mongo-sanitize` on all incoming payloads.
  - **Password Security**: Bcrypt 10 salt rounds hashing + JWT (30-day session support).
- 👁️ **Interactive Mascot UI**: Real-time cursor/touch tracking mascot eyes that hide during password entry.
- 📱 **Fully Responsive**: Mobile-first glassmorphism design with clean animations.

---

## 📦 Installation

Install the package via NPM:

```bash
npm install @vaibhav_keshari/login-signup-app
```

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/kesharivaibhav111/login-signup.git
cd login-signup
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
BREVO_API_KEY=your_brevo_v3_api_key
```

### 3. Start the Server

```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/send-otp` | Validates email & sends 6-digit registration OTP |
| `POST` | `/api/verify-otp-signup` | Verifies OTP & creates new user account |
| `POST` | `/api/login` | Authenticates user with email & password |
| `POST` | `/api/forgot-password-otp` | Sends password reset OTP |
| `POST` | `/api/verify-reset-otp` | Verifies reset OTP session |
| `POST` | `/api/reset-password` | Updates user password |
| `POST` | `/api/google-auth` | Handles Google OAuth login & registration |
| `POST` | `/api/verify-google-otp` | Verifies OTP for new Google signup users |
| `GET` | `/api/me` | Protected route: retrieves active user profile |

---

## 🛠️ Tech Stack & Dependencies

- **Runtime**: Node.js, Express.js
- **Database**: MongoDB Atlas, Mongoose
- **Security**: Helmet, bcryptjs, jsonwebtoken, express-rate-limit, express-mongo-sanitize, disposable-email-domains
- **Email Services**: Brevo API v3, Nodemailer
- **Frontend**: Vanilla JavaScript (ES6+), Modern CSS3, HTML5

---

## 👨‍💻 Author

**Vaibhav Keshari**
- Website: [Think Pixel Labs](https://thinkpixellabs.com)
- GitHub: [@kesharivaibhav111](https://github.com/kesharivaibhav111)
- NPM: [@vaibhav_keshari](https://www.npmjs.com/~vaibhav_keshari)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
