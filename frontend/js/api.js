/**
 * API Client Module
 * Connects to Render Backend with JWT token injection and dynamic endpoint resolution
 */
const API = {
  get baseURL() {
    return (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : '/api';
  },

  getToken() {
    return localStorage.getItem('token');
  },

  setToken(token) {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  },

  getUser() {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  },

  getPatient() {
    try {
      const p = localStorage.getItem('patient');
      return p ? JSON.parse(p) : null;
    } catch (e) {
      return null;
    }
  },

  setPatient(patient) {
    if (patient) localStorage.setItem('patient', JSON.stringify(patient));
    else localStorage.removeItem('patient');
  },

  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('patient');
  },

  async request(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseURL}${cleanEndpoint}`;
    const token = this.getToken();

    const headers = { ...(options.headers || {}) };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
          this.clearSession();
          if (!window.location.pathname.includes('auth.html') && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
            window.location.href = 'auth.html?session=expired';
          }
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
  post(endpoint, data) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }); },
  put(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }); },
  patch(endpoint, data = {}) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }); },
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); },
  upload(endpoint, formData) { return this.request(endpoint, { method: 'POST', body: formData }); }
};
