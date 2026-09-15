/*
 * Origyn frontend API client.
 *
 * Responsibilities:
 * - keep API URL handling in one place
 * - attach the authenticated bearer token when present
 * - provide consistent JSON/error handling
 * - expose small request helpers for future Store/Publisher modules
 *
 * This client never accepts or stores server secrets. The browser only holds
 * the access token returned by the authentication API.
 */
(function createOrigynApi(global) {
  'use strict';

  const TOKEN_KEY = 'origyn_access_token';
  const DEFAULT_TIMEOUT_MS = 15000;

  function getToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch (_error) {
      return null;
    }
  }

  function setToken(token) {
    if (typeof token !== 'string' || !token.trim()) return false;
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function clearToken() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (_error) {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }

  function getBaseUrl() {
    const value = global.ORIGYN_API_BASE_URL;
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error('Origyn API base URL is not configured');
    }
    return value.replace(/\/+$/, '');
  }

  function buildUrl(path) {
    if (typeof path !== 'string' || !path.startsWith('/')) {
      throw new Error('API path must start with /');
    }
    return `${getBaseUrl()}${path}`;
  }

  async function request(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const hasBody = options.body !== undefined && options.body !== null;
    const headers = new Headers(options.headers || {});

    headers.set('Accept', 'application/json');
    if (hasBody && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const controller = new AbortController();
    const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(buildUrl(path), {
        method,
        headers,
        body: hasBody && !(options.body instanceof FormData)
          ? JSON.stringify(options.body)
          : options.body,
        signal: options.signal || controller.signal,
        cache: options.cache || 'no-store'
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Origyn API request timed out');
      }
      throw new Error('Unable to reach the Origyn API');
    } finally {
      clearTimeout(timeoutId);
    }

    let payload = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        payload = await response.json();
      } catch (_error) {
        payload = null;
      }
    } else {
      const text = await response.text();
      payload = text ? { message: text } : null;
    }

    if (!response.ok) {
      if (response.status === 401) clearToken();
      const message = payload?.error || payload?.message || `Origyn API request failed (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      error.data = payload;
      throw error;
    }

    return payload;
  }

  const api = Object.freeze({
    request,
    get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
    patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
    delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),

    auth: Object.freeze({
      async register(payload) {
        const result = await request('/auth/register', { method: 'POST', body: payload });
        if (result?.token) setToken(result.token);
        return result;
      },
      async login(payload) {
        const result = await request('/auth/login', { method: 'POST', body: payload });
        if (result?.token) setToken(result.token);
        return result;
      },
      async logout() {
        try {
          return await request('/auth/logout', { method: 'POST' });
        } finally {
          clearToken();
        }
      },
      me: () => request('/auth/me'),
      hasToken: () => Boolean(getToken()),
      clear: clearToken
    })
  });

  global.OrigynAPI = api;
})(window);
