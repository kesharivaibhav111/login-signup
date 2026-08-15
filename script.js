(()=>{
  'use strict';

  const API_BASE = window.location.origin.includes('http') && !window.location.origin.includes('github.io')
    ? ''
    : 'http://localhost:3000';

  const GOOGLE_CLIENT_ID = '475693894846-vo3m578joq2folkmt2qbnn2uahl8qsau.apps.googleusercontent.com';

  const allEyesDivs = document.querySelectorAll('[data-eyes]');
  const allPupils = document.querySelectorAll('.pupil');
  const formsSlider = document.getElementById('formsSlider');
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
  const dashboardView = document.getElementById('dashboardView');
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
  const otpInput = document.getElementById('otpInput');
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
    formsSlider.style.display = 'none';
    dashboardView.style.display = 'block';
  }

  function hideDashboard() {
    dashboardView.style.display = 'none';
    formsSlider.style.display = 'flex';
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

  function resetSliderClasses() {
    formsSlider.classList.remove('show-signup', 'show-otp', 'show-forgot');
  }

  signupLink.addEventListener('click', e => {
    e.preventDefault();
    resetSliderClasses();
    formsSlider.classList.add('show-signup');
    setPeek(false);
    resetAllToggles();
  });

  loginLink.addEventListener('click', e => {
    e.preventDefault();
    resetSliderClasses();
    setPeek(false);
    resetAllToggles();
  });

  if (forgotLink) {
    forgotLink.addEventListener('click', e => {
      e.preventDefault();
      const loginEmailVal = document.getElementById('loginEmail').value.trim();
      if (loginEmailVal) {
        document.getElementById('resetEmail').value = loginEmailVal;
      }
      resetSliderClasses();
      formsSlider.classList.add('show-forgot');
      setPeek(false);
      resetAllToggles();
    });
  }

  if (backToLoginLink) {
    backToLoginLink.addEventListener('click', e => {
      e.preventDefault();
      resetSliderClasses();
      setPeek(false);
      resetAllToggles();
    });
  }

  if (backToSignupLink) {
    backToSignupLink.addEventListener('click', e => {
      e.preventDefault();
      resetSliderClasses();
      formsSlider.classList.add('show-signup');
      setPeek(false);
      resetAllToggles();
    });
  }

  logoutBtn.addEventListener('click', () => {
    clearAuthData();
    hideDashboard();
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
        pendingSignupData = { firstName, middleName, lastName, email, password, confirmPassword };
        otpEmailDisplay.textContent = email;
        resetSliderClasses();
        formsSlider.classList.add('show-otp');
        startOtpTimer();
        otpInput.value = '';
        otpInput.focus();
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
        const res = await fetch(`${API_BASE}/api/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingSignupData)
        });
        const data = await res.json();
        if (data.success) {
          startOtpTimer();
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

  if (otpForm) {
    otpForm.addEventListener('submit', async e => {
      e.preventDefault();
      const otp = otpInput.value.trim();

      if (!otp || otp.length !== 6) {
        showAlert('Please enter the 6-digit OTP code.');
        return;
      }

      if (!pendingSignupData) {
        showAlert('Signup session expired. Please sign up again.');
        resetSliderClasses();
        formsSlider.classList.add('show-signup');
        return;
      }

      verifyOtpBtn.disabled = true;
      verifyOtpBtn.textContent = 'Verifying…';

      try {
        const res = await fetch(`${API_BASE}/api/verify-otp-signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...pendingSignupData,
            otp
          })
        });
        const data = await res.json();

        if (data.success) {
          clearAuthData();
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          localStorage.setItem('auth_expiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());

          showAlert(data.message || 'Account verified and created successfully!', 'success');
          signupForm.reset();
          otpForm.reset();
          pendingSignupData = null;
          if (otpTimerInterval) clearInterval(otpTimerInterval);
          showDashboard(data.user);
        } else {
          showAlert(data.message || 'Invalid verification code.');
        }
      } catch (err) {
        showAlert('Unable to connect to server. Please ensure backend is running.');
      } finally {
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.textContent = 'Verify & Create Account';
      }
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
          resetSliderClasses();
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

  async function handleGoogleAccessToken(accessToken) {
    if (!accessToken) {
      showAlert('Google sign in failed. Please try again.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken })
      });
      const data = await res.json();

      if (data.success) {
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

  function initGoogleAuth() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            handleGoogleAccessToken(tokenResponse.access_token);
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

  function triggerGoogleSignIn() {
    if (!googleTokenClient) {
      initGoogleAuth();
    }

    if (googleTokenClient) {
      googleTokenClient.requestAccessToken({ prompt: 'select_account' });
    } else {
      showAlert('Google services are still loading. Please try again in a moment.');
    }
  }

  if (googleBtn) googleBtn.addEventListener('click', triggerGoogleSignIn);
  if (googleSignupBtn) googleSignupBtn.addEventListener('click', triggerGoogleSignIn);
})();
