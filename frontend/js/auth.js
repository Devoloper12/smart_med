/**
 * Authentication Module (Login, Register, Forgot Password)
 */

function switchTab(tabName) {
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  const forgotSection = document.getElementById('forgot-section');

  const pillLogin = document.getElementById('pill-btn-login');
  const pillRegister = document.getElementById('pill-btn-register');

  if (loginSection) loginSection.classList.add('d-none');
  if (registerSection) registerSection.classList.add('d-none');
  if (forgotSection) forgotSection.classList.add('d-none');

  if (pillLogin) {
    if (tabName === 'login') {
      pillLogin.className = 'btn btn-sm flex-fill rounded-pill py-2 fw-semibold btn-primary text-white shadow-sm';
    } else {
      pillLogin.className = 'btn btn-sm flex-fill rounded-pill py-2 fw-semibold text-muted';
    }
  }

  if (pillRegister) {
    if (tabName === 'register') {
      pillRegister.className = 'btn btn-sm flex-fill rounded-pill py-2 fw-semibold btn-primary text-white shadow-sm';
    } else {
      pillRegister.className = 'btn btn-sm flex-fill rounded-pill py-2 fw-semibold text-muted';
    }
  }

  if (tabName === 'register' && registerSection) {
    registerSection.classList.remove('d-none');
  } else if (tabName === 'forgot' && forgotSection) {
    forgotSection.classList.remove('d-none');
  } else if (loginSection) {
    loginSection.classList.remove('d-none');
  }
}
window.switchTab = switchTab;

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');

  // If already logged in and not explicitly requesting register or logout session
  if (API.getToken() && !mode && !window.location.search.includes('session=expired')) {
    window.location.href = 'dashboard.html';
    return;
  }

  if (urlParams.get('session') === 'expired') {
    showToast('Your session has expired. Please sign in again.', 'warning');
  }

  if (mode === 'register') {
    switchTab('register');
  } else if (mode === 'forgot') {
    switchTab('forgot');
  } else {
    switchTab('login');
  }

  // Handle data-auth-tab attribute triggers
  document.querySelectorAll('[data-auth-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-auth-tab');
      switchTab(target);
    });
  });

  // Handle Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (!email || !password) {
        showToast('Please enter both email and password.', 'error');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In...';

        const data = await API.post('/auth/login', { email, password });
        API.setToken(data.token);
        API.setUser(data.user);
        API.setPatient(data.patient);

        showToast(`Welcome back, ${data.user.name}!`, 'success');
        const redirect = urlParams.get('redirect') || 'dashboard.html';
        setTimeout(() => { window.location.href = redirect; }, 700);
      } catch (err) {
        showToast(err.message || 'Login failed. Please check credentials.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket me-2"></i>Sign In';
      }
    });
  }

  // Handle Registration Form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const role = document.getElementById('reg-role').value;
      const age = document.getElementById('reg-age').value;
      const bloodGroup = document.getElementById('reg-bloodgroup').value;
      const conditions = document.getElementById('reg-conditions').value;
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      if (!name || !email || !password) {
        showToast('Please provide your name, email, and password.', 'error');
        return;
      }

      if (password.length < 6) {
        showToast('Password must be at least 6 characters long.', 'error');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating Account...';

        const payload = {
          name, email, password, role,
          age: age ? Number(age) : 30,
          bloodGroup,
          medicalConditions: conditions
        };

        const data = await API.post('/auth/register', payload);
        API.setToken(data.token);
        API.setUser(data.user);
        API.setPatient(data.patient);

        showToast('Account created successfully! Welcome to SmartMed.', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
      } catch (err) {
        showToast(err.message || 'Registration failed.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-user-plus me-2"></i>Create Account';
      }
    });
  }

  // Handle Forgot Password Form
  const forgotForm = document.getElementById('forgot-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();
      if (!email) return showToast('Please enter your email address.', 'error');

      try {
        const data = await API.post('/auth/forgot-password', { email });
        showToast(data.message, 'success');
        setTimeout(() => switchTab('login'), 2000);
      } catch (err) {
        showToast(err.message || 'Could not send reset link.', 'error');
      }
    });
  }
});
