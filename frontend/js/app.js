/**
 * Core Application Script
 * Theme toggle, notifications, audio chime synthesizer, and auth navigation
 */

let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playReminderChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  } catch (e) {}
}

function playEmergencySiren() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(950, now + 0.3);
    osc.frequency.linearRampToValueAtTime(600, now + 0.6);
    osc.frequency.linearRampToValueAtTime(950, now + 0.9);
    osc.frequency.linearRampToValueAtTime(600, now + 1.2);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.5);
  } catch (e) {}
}

function showToast(message, type = 'info', title = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;

  const iconMap = {
    success: 'fa-circle-check text-success',
    error: 'fa-circle-xmark text-danger',
    warning: 'fa-triangle-exclamation text-warning',
    info: 'fa-circle-info text-primary'
  };

  const icon = iconMap[type] || iconMap.info;
  toast.innerHTML = `
    <i class="fa-solid ${icon} fs-5 mt-1"></i>
    <div class="flex-grow-1">
      ${title ? `<div class="fw-bold mb-1">${title}</div>` : ''}
      <div class="small">${message}</div>
    </div>
    <button type="button" class="btn-close btn-sm" aria-label="Close"></button>
  `;

  toast.querySelector('.btn-close').addEventListener('click', () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

function initDarkMode() {
  const toggleBtn = document.getElementById('dark-mode-toggle');
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    updateThemeIcon(true);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      updateThemeIcon(isDark);
    });
  }
}

function updateThemeIcon(isDark) {
  const icon = document.querySelector('#dark-mode-toggle i');
  if (icon) {
    icon.className = isDark ? 'fa-solid fa-sun text-warning' : 'fa-solid fa-moon';
  }
}

function updateNavbarAuth() {
  const authNavContainer = document.getElementById('nav-auth-section');
  if (!authNavContainer) return;

  const user = API.getUser();
  const token = API.getToken();

  if (token && user) {
    authNavContainer.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <a href="emergency.html" class="btn btn-sos-compact text-white">
          <i class="fa-solid fa-truck-medical"></i> SOS
        </a>
        <div class="dropdown">
          <button class="btn btn-outline-primary btn-sm dropdown-toggle rounded-pill px-3 py-1 d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="fa-solid fa-circle-user text-primary"></i>
            <span class="fw-medium">${user.name || 'Account'}</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow border-0">
            <li><h6 class="dropdown-header">Signed in as <strong>${user.email}</strong></h6></li>
            <li><a class="dropdown-item" href="dashboard.html"><i class="fa-solid fa-gauge-high me-2 text-primary"></i>Dashboard</a></li>
            <li><a class="dropdown-item" href="medicines.html"><i class="fa-solid fa-pills me-2 text-success"></i>Medicines</a></li>
            <li><a class="dropdown-item" href="reminders.html"><i class="fa-solid fa-bell me-2 text-warning"></i>Reminders</a></li>
            <li><a class="dropdown-item" href="prescriptions.html"><i class="fa-solid fa-file-prescription me-2 text-info"></i>Prescriptions</a></li>
            <li><a class="dropdown-item" href="caregivers.html"><i class="fa-solid fa-user-doctor me-2 text-secondary"></i>Caregivers</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item text-danger" id="logout-btn"><i class="fa-solid fa-right-from-bracket me-2"></i>Logout</button></li>
          </ul>
        </div>
      </div>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  } else {
    authNavContainer.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <a href="auth.html?mode=login" class="btn btn-outline-primary btn-sm px-3 rounded-pill">Login</a>
        <a href="auth.html?mode=register" class="btn btn-primary-health btn-sm px-3 rounded-pill">Get Started</a>
      </div>
    `;
  }
}

function requireAuth() {
  const path = window.location.pathname.toLowerCase();
  const isAuthOrPublic = path.includes('auth') || path.includes('index') || path.endsWith('/') || path === '';
  if (isAuthOrPublic) {
    return; // Never redirect if user is on auth or home/index page
  }

  const token = API.getToken();
  if (!token) {
    const currentFile = path.split('/').pop();
    window.location.href = `auth.html?redirect=${encodeURIComponent(currentFile)}`;
  }
}

function handleLogout(e) {
  if (e) e.preventDefault();
  API.clearSession();
  showToast('You have been logged out.', 'info');
  setTimeout(() => { window.location.href = 'index.html'; }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  requireAuth();
  updateNavbarAuth();
});
