/*
 * Origyn frontend API configuration.
 *
 * Local development defaults to the backend on port 5000.
 * Production deployments can set window.ORIGYN_API_BASE_URL before api.js loads.
 * Never put credentials, API keys, JWT secrets, or other private values here.
 */
(function configureOrigynApi() {
  if (window.ORIGYN_API_BASE_URL) return;

  const host = window.location.hostname || 'localhost';
  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const isLocalFile = window.location.protocol === 'file:';

  window.ORIGYN_API_BASE_URL = isLocalhost || isLocalFile
    ? `http://${host}:5000/api`
    : `${window.location.origin}/api`;
})();
