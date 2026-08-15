(()=>{
  'use strict';

  const API_BASE = window.location.origin.includes('http') && !window.location.origin.includes('github.io')
    ? ''
    : 'http://localhost:3000';

  const GOOGLE_CLIENT_ID = '475693894846-vo3m578joq2folkmt2qbnn2uahl8qsau.apps.googleusercontent.com';

  const allEyesDivs = document.querySelectorAll('[data-eyes]');
  const allPupils = document.querySelectorAll('.pupil');
  const allViews = document.querySelectorAll('.auth-view');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const otpForm = document.getElementById('otpForm');
  const resetForm = document.getElementById('resetForm');
  const signupLink = document.getElementById('signupLink');
  const loginLink = document.getElementById('loginLink');
  const forgotLink = document.getElementById('forgotLink');
  const backToLoginLink = document.getElementById('backToLoginLink');
  const backToSignupLink = document.getElementById('backToSignupLink');
  const allPwInputs = document.querySelectorAll('.pw-input');
  const alertBox = document.getElementById('alertBox');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  const resendOtpBtn = document.getElementById('resendOtpBtn');
  const resetBtn = document.getElementById('resetBtn');
  const googleBtn = document.getElementById('googleBtn');
  const googleSignupBtn = document.getElementById('googleSignupBtn');
  const rememberCheckbox = document.getElementById('remember');
  const otpDigits = document.querySelectorAll('.otp-digit');
  const otpEmailDisplay = document.getElementById('otpEmailDisplay');
  const otpCountdown = document.getElementById('otpCountdown');
  const otpTimerText = document.getElementById('otpTimerText');

  let peekActive = false;
  let alertTimer = null;
  let googleTokenClient = null;
  let pendingSignupData = null;
  let otpTimerInterval = null;

  function showAlert(message, type = 'error') {
    if (alertTimer) clearTimeout(alertTimer);
    alertBox.textContent = message;
    alertBox.className = `alert-box alert-${type} show`;
    alertTimer = setTimeout(() => {
      alertBox.classList.remove('show');
    }, 4500);
  }

  function switchView(viewId) {
    allViews.forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
    }
    setPeek(false);
    resetAllToggles();
  }

  function showDashboard(user) {
    userName.textContent = user.firstName || 'User';
    userEmail.textContent = user.email || '';
    if (userAvatar) {
      if (user.avatar) {
        userAvatar.innerHTML = `<img src="${user.avatar}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
      } else {
        userAvatar.textContent = '✦';
      }
    }
    switchView('dashboardView');
  }

  function clearAuthData() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_expiry');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
  }

  function getStoredToken() {
    const expiry = localStorage.getItem('auth_expiry');
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      clearAuthData();
      showAlert('Your 30-day session has expired. Please log in again.');
      return null;
    }
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

  async function checkAuthSession() {
    const token = getStoredToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        showDashboard(data.user);
      } else {
        clearAuthData();
        if (data.expired) {
          showAlert('Your 30-day session has expired. Please log in again.');
        }
      }
    } catch (e) {
      const savedUser = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
      if (savedUser) {
        try { showDashboard(JSON.parse(savedUser)); } catch(_) {}
      }
    }
  }
  checkAuthSession();

  signupLink.addEventListener('click', e => {
    e.preventDefault();
    switchView('signupView');
  });

  loginLink.addEventListener('click', e => {
    e.preventDefault();
    switchView('loginView');
  });

  if (forgotLink) {
    forgotLink.addEventListener('click', e => {
      e.preventDefault();
      const loginEmailVal = document.getElementById('loginEmail').value.trim();
      if (loginEmailVal) {
        document.getElementById('resetEmail').value = loginEmailVal;
      }
      switchView('resetView');
    });
  }

  if (backToLoginLink) {
    backToLoginLink.addEventListener('click', e => {
      e.preventDefault();
      switchView('loginView');
    });
  }

  if (backToSignupLink) {
    backToSignupLink.addEventListener('click', e => {
      e.preventDefault();
      switchView('signupView');
    });
  }

  logoutBtn.addEventListener('click', () => {
    clearAuthData();
    switchView('loginView');
    showAlert('Logged out successfully.', 'success');
  });

  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.pwToggle);
      if (!input) return;
      const iconOpen = btn.querySelector('.eye-icon-open');
      const iconClosed = btn.querySelector('.eye-icon-closed');
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      iconOpen.style.display = isPassword ? 'none' : 'block';
      iconClosed.style.display = isPassword ? 'block' : 'none';
      setPeek(!isPassword);
      input.focus();
    });
  });

  function resetAllToggles() {
    document.querySelectorAll('.pw-input').forEach(i => { i.type = 'password'; });
    document.querySelectorAll('.pw-toggle').forEach(b => {
      b.querySelector('.eye-icon-open').style.display = 'block';
      b.querySelector('.eye-icon-closed').style.display = 'none';
    });
  }

  function setPeek(on) {
    peekActive = on;
    allEyesDivs.forEach(d => d.classList.toggle('eyes-peek', on));
  }

  const MAX_OFFSET = 3.5;
  function movePupils(cx, cy) {
    allPupils.forEach(p => {
      if (peekActive && p.closest('.eye:first-child')) return;
      const e = p.parentElement;
      const r = e.getBoundingClientRect();
      const ex = r.left + r.width / 2;
      const ey = r.top + r.height / 2;
      const dx = cx - ex, dy = cy - ey;
      const a = Math.atan2(dy, dx);
      const d = Math.min(Math.hypot(dx, dy) * 0.04, MAX_OFFSET);
      p.style.transform = `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`;
    });
  }

  document.addEventListener('mousemove', e => movePupils(e.clientX, e.clientY));
  document.addEventListener('touchmove', e => {
    if (e.touches.length) movePupils(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  allPwInputs.forEach(input => {
    input.addEventListener('focus', () => setPeek(true));
    input.addEventListener('blur', () => { if (input.type === 'password') setPeek(false); });
  });

  function getEnteredOtp() {
    return Array.from(otpDigits).map(d => d.value.trim()).join('');
  }

  function clearOtpDigits() {
    otpDigits.forEach(d => {
      d.value = '';
      d.classList.remove('filled');
    });
  }

  function focusFirstOtpDigit() {
    setTimeout(() => {
      if (otpDigits.length) {
        otpDigits[0].focus();
        otpDigits[0].select();
      }
    }, 150);
  }

  otpDigits.forEach((digitInput, idx) => {
    digitInput.addEventListener('input', e => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      digitInput.value = val ? val.slice(-1) : '';

      if (digitInput.value) {
        digitInput.classList.add('filled');
        if (idx < otpDigits.length - 1) {
          otpDigits[idx + 1].focus();
          otpDigits[idx + 1].select();
        } else {
          digitInput.blur();
          if (getEnteredOtp().length === 6) {
            submitOtpVerification();
          }
        }
      } else {
        digitInput.classList.remove('filled');
      }
    });

    digitInput.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !digitInput.value && idx > 0) {
        otpDigits[idx - 1].focus();
        otpDigits[idx - 1].value = '';
        otpDigits[idx - 1].classList.remove('filled');
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        otpDigits[idx - 1].focus();
      } else if (e.key === 'ArrowRight' && idx < otpDigits.length - 1) {
        otpDigits[idx + 1].focus();
      }
    });

    digitInput.addEventListener('paste', e => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/[^0-9]/g, '');
      if (!pasteData) return;

      const digits = pasteData.slice(0, 6).split('');
      digits.forEach((char, i) => {
        if (otpDigits[i]) {
          otpDigits[i].value = char;
          otpDigits[i].classList.add('filled');
        }
      });

      if (digits.length === 6) {
        otpDigits[5].focus();
        submitOtpVerification();
      } else if (digits.length < 6 && otpDigits[digits.length]) {
        otpDigits[digits.length].focus();
      }
    });
  });

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;

    if (!email || !password) {
      showAlert('Please enter both email and password.');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in…';

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe })
      });
      const data = await res.json();

      if (data.success) {
        clearAuthData();
        if (rememberMe) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          localStorage.setItem('auth_expiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());
        } else {
          sessionStorage.setItem('auth_token', data.token);
          sessionStorage.setItem('auth_user', JSON.stringify(data.user));
        }

        showAlert(data.message || 'Login successful!', 'success');
        loginForm.reset();
        showDashboard(data.user);
      } else {
        showAlert(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      showAlert('Unable to connect to server. Please ensure backend is running.');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Log in';
    }
  });

  function startOtpTimer() {
    if (otpTimerInterval) clearInterval(otpTimerInterval);
    let secondsLeft = 60;
    otpCountdown.textContent = '01:00';
    otpTimerText.style.display = 'inline';
    resendOtpBtn.style.display = 'none';

    otpTimerInterval = setInterval(() => {
      secondsLeft--;
      const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
      const secs = String(secondsLeft % 60).padStart(2, '0');
      otpCountdown.textContent = `${mins}:${secs}`;

      if (secondsLeft <= 0) {
        clearInterval(otpTimerInterval);
        otpTimerText.style.display = 'none';
        resendOtpBtn.style.display = 'inline';
      }
    }, 1000);
  }

  signupForm.addEventListener('submit', async e => {
    e.preventDefault();
    const firstName = document.getElementById('firstName').value.trim();
    const middleName = document.getElementById('middleName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      showAlert('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 6) {
      showAlert('Password must be at least 6 characters.');
      return;
    }

    signupBtn.disabled = true;
    signupBtn.textContent = 'Sending OTP…';

    try {
      const res = await fetch(`${API_BASE}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          middleName,
          lastName,
          email,
          password,
          confirmPassword
        })
      });
      const data = await res.json();

      if (data.success) {
        pendingSignupData = { firstName, middleName, lastName, email, password, confirmPassword, isGoogle: false };
        otpEmailDisplay.textContent = email;
        switchView('otpView');
        startOtpTimer();
        clearOtpDigits();
        focusFirstOtpDigit();
        showAlert(data.message || 'OTP sent! Please check your email.', 'success');
      } else {
        showAlert(data.message || 'Failed to send verification code.');
      }
    } catch (err) {
      showAlert('Unable to connect to server. Please ensure backend is running.');
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = 'Send Verification OTP';
    }
  });

  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', async () => {
      if (!pendingSignupData) return;
      resendOtpBtn.disabled = true;
      resendOtpBtn.textContent = 'Sending…';

      try {
        const endpoint = `${API_BASE}/api/send-otp`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: pendingSignupData.firstName,
            lastName: pendingSignupData.lastName,
            email: pendingSignupData.email,
            password: pendingSignupData.password || 'google_auth_placeholder',
            confirmPassword: pendingSignupData.password || 'google_auth_placeholder'
          })
        });
        const data = await res.json();
        if (data.success) {
          startOtpTimer();
          clearOtpDigits();
          focusFirstOtpDigit();
          showAlert('New OTP sent to your email!', 'success');
        } else {
          showAlert(data.message || 'Failed to resend OTP.');
        }
      } catch (err) {
        showAlert('Unable to connect to server.');
      } finally {
        resendOtpBtn.disabled = false;
        resendOtpBtn.textContent = 'Resend OTP';
      }
    });
  }

  async function submitOtpVerification() {
    const otp = getEnteredOtp();

    if (!otp || otp.length !== 6) {
      showAlert('Please enter all 6 digits of the OTP.');
      return;
    }

    if (!pendingSignupData) {
      showAlert('Signup session expired. Please sign up again.');
      switchView('signupView');
      return;
    }

    verifyOtpBtn.disabled = true;
    verifyOtpBtn.textContent = 'Verifying…';

    try {
      const endpoint = pendingSignupData.isGoogle
        ? `${API_BASE}/api/verify-google-otp`
        : `${API_BASE}/api/verify-otp-signup`;

      const payload = pendingSignupData.isGoogle
        ? {
            email: pendingSignupData.email,
            firstName: pendingSignupData.firstName,
            lastName: pendingSignupData.lastName,
            googleId: pendingSignupData.googleId,
            avatar: pendingSignupData.avatar,
            otp
          }
        : {
            ...pendingSignupData,
            otp
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        clearAuthData();
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.setItem('auth_expiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());

        showAlert(data.message || 'Account verified successfully!', 'success');
        signupForm.reset();
        otpForm.reset();
        clearOtpDigits();
        pendingSignupData = null;
        if (otpTimerInterval) clearInterval(otpTimerInterval);
        showDashboard(data.user);
      } else {
        showAlert(data.message || 'Invalid verification code. Please check and retry.');
      }
    } catch (err) {
      showAlert('Unable to connect to server. Please ensure backend is running.');
    } finally {
      verifyOtpBtn.disabled = false;
      verifyOtpBtn.textContent = 'Verify & Create Account';
    }
  }

  if (otpForm) {
    otpForm.addEventListener('submit', e => {
      e.preventDefault();
      submitOtpVerification();
    });
  }

  if (resetForm) {
    resetForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('resetEmail').value.trim();
      const newPassword = document.getElementById('newPassword').value;
      const confirmNewPassword = document.getElementById('confirmNewPassword').value;

      if (!email || !newPassword || !confirmNewPassword) {
        showAlert('Please fill in all fields.');
        return;
      }

      if (newPassword !== confirmNewPassword) {
        showAlert('New passwords do not match. Please re-enter.');
        return;
      }

      if (newPassword.length < 6) {
        showAlert('Password must be at least 6 characters.');
        return;
      }

      resetBtn.disabled = true;
      resetBtn.textContent = 'Updating password…';

      try {
        const res = await fetch(`${API_BASE}/api/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            newPassword,
            confirmNewPassword
          })
        });
        const data = await res.json();

        if (data.success) {
          showAlert(data.message || 'Password reset successfully! Please log in.', 'success');
          resetForm.reset();
          document.getElementById('loginEmail').value = email;
          switchView('loginView');
        } else {
          showAlert(data.message || 'Failed to reset password.');
        }
      } catch (err) {
        showAlert('Unable to connect to server. Please ensure backend is running.');
      } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = 'Save new password';
      }
    });
  }

  async function handleGoogleAccessToken(accessToken, action = 'login') {
    if (!accessToken) {
      showAlert('Google sign in failed. Please try again.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, action })
      });
      const data = await res.json();

      if (data.requireOtp && data.googleUser) {
        pendingSignupData = { ...data.googleUser, isGoogle: true };
        otpEmailDisplay.textContent = data.googleUser.email;
        switchView('otpView');
        startOtpTimer();
        clearOtpDigits();
        focusFirstOtpDigit();
        showAlert(data.message || 'OTP sent to your Google email! Please verify to complete signup.', 'success');
      } else if (data.success) {
        clearAuthData();
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.setItem('auth_expiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());

        showAlert(data.message || 'Signed in with Google!', 'success');
        showDashboard(data.user);
      } else {
        showAlert(data.message || 'Google authentication failed.');
      }
    } catch (err) {
      showAlert('Unable to connect to server. Please ensure backend is running.');
    }
  }

  let currentGoogleAction = 'login';

  function initGoogleAuth() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            handleGoogleAccessToken(tokenResponse.access_token, currentGoogleAction);
          } else if (tokenResponse && tokenResponse.error) {
            showAlert('Google sign in was cancelled or failed.');
          }
        }
      });
    }
  }

  window.addEventListener('load', () => {
    let checkCount = 0;
    const interval = setInterval(() => {
      checkCount++;
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        initGoogleAuth();
        clearInterval(interval);
      } else if (checkCount > 20) {
        clearInterval(interval);
      }
    }, 200);
  });

  function triggerGoogleSignIn(action = 'login') {
    currentGoogleAction = action;
    if (!googleTokenClient) {
      initGoogleAuth();
    }

    if (googleTokenClient) {
      googleTokenClient.requestAccessToken({ prompt: 'select_account' });
    } else {
      showAlert('Google services are still loading. Please try again in a moment.');
    }
  }

  if (googleBtn) googleBtn.addEventListener('click', () => triggerGoogleSignIn('login'));
  if (googleSignupBtn) googleSignupBtn.addEventListener('click', () => triggerGoogleSignIn('signup'));
})();
