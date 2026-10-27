/**
 * Frontend Configuration for Vercel & Render Deployment
 */
const CONFIG = {
  // Set your default Render backend URL here:
  // e.g., 'https://smart-medicine-backend.onrender.com/api'
  DEFAULT_RENDER_API: 'https://smart-medicine-backend.onrender.com/api',
  LOCAL_API: 'http://localhost:5000/api',

  get API_BASE_URL() {
    // 1. Check if user configured a custom backend in settings
    const stored = localStorage.getItem('CUSTOM_API_URL');
    if (stored && stored.trim()) {
      return stored.trim().replace(/\/+$/, '');
    }

    // 2. If running locally (localhost or 127.0.0.1)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return this.LOCAL_API;
    }

    // 3. In production on Vercel
    return this.DEFAULT_RENDER_API;
  },

  setCustomBackendUrl(url) {
    if (url) {
      localStorage.setItem('CUSTOM_API_URL', url.trim());
    } else {
      localStorage.removeItem('CUSTOM_API_URL');
    }
  }
};
