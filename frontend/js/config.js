/**
 * Frontend Configuration for Vercel & Render Deployment
 */
const CONFIG = {
  // Live Render backend URL:
  DEFAULT_RENDER_API: 'https://smart-med-rd7w.onrender.com/api',
  LOCAL_API: 'http://localhost:5000/api',

  get API_BASE_URL() {
    let url = this.DEFAULT_RENDER_API;

    // 1. Check if user configured a custom backend in settings
    const stored = localStorage.getItem('CUSTOM_API_URL');
    if (stored && stored.trim()) {
      url = stored.trim();
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      url = this.LOCAL_API;
    }

    // Ensure URL has no trailing slashes and always includes /api
    url = url.replace(/\/+$/, '');
    if (!url.endsWith('/api')) {
      url = `${url}/api`;
    }
    return url;
  },

  setCustomBackendUrl(url) {
    if (url) {
      localStorage.setItem('CUSTOM_API_URL', url.trim());
    } else {
      localStorage.removeItem('CUSTOM_API_URL');
    }
  }
};
