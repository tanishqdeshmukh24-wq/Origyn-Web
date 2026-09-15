/* Origyn common API client.
 * Store currently uses only public product endpoints from Ninad's backend.
 * Authenticated commerce endpoints will be added in their dedicated phase.
 */
(function () {
  'use strict';

  const base = (window.ORIGYN_API_BASE || 'http://localhost:5000').replace(/\/$/, '');

  async function request(path, options = {}) {
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
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
      const error = new Error(payload?.error || payload?.message || `API request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  window.OrigynAPI = {
    base,
    get: (path) => request(path),
    request
  };
})();
