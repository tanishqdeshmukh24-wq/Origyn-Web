/* Origyn common API client.
 * Store currently uses only public product endpoints from Ninad's backend.
 * Authenticated commerce endpoints will be added in their dedicated phase.
 */
(function () {
  'use strict';

  const base = (window.ORIGYN_API_BASE || 'http://localhost:5000').replace(/\/$/, '');
  const TOKEN_KEY = 'origyn_access_token';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(token) { if (token) localStorage.setItem(TOKEN_KEY, token); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  async function request(path, options = {}) {
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(options.headers || {})
      }
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (_) {
      payload = null;
    }

    if (!response.ok) {
      if (response.status === 401) clearToken();
      const error = new Error(payload?.error || payload?.message || `API request failed (${response.status})`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  window.OrigynAPI = {
    base,
    get: (path) => request(path),
    post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
    patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    del: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
    request,
    auth: {
      hasToken: () => Boolean(getToken()),
      token: getToken,
      setToken,
      clear: clearToken,
      async login(email, password) {
        const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        setToken(result.token);
        return result;
      },
      async register({ email, password, name }) {
        const result = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name, role: 'customer' }) });
        setToken(result.token);
        return result;
      },
      me: () => request('/api/auth/me')
    }
  };
})();
