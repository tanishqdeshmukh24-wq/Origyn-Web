/* Origyn Store checkout + order creation integration. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const api = window.OrigynAPI;
  const checkoutButton = document.querySelector('#checkout-btn');
  const drawer = document.querySelector('#cart');
  if (!api || !checkoutButton || !drawer) return;

  let overlay = null;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const money = (paise, currency = 'INR') => {
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(Number(paise || 0) / 100); }
    catch (_error) { return `${currency} ${(Number(paise || 0) / 100).toLocaleString('en-IN')}`; }
  };

  const showCheckout = () => {
    if (!api.isAuthenticated()) {
      api.setAuthRequiredMessage?.('Sign in to continue to checkout.');
      alert('Sign in to continue to checkout.');
      return;
    }
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'origyn-checkout-overlay';
      overlay.innerHTML = `
        <div class="origyn-checkout-card" role="dialog" aria-modal="true" aria-labelledby="origyn-checkout-title">
          <button type="button" class="origyn-checkout-close" aria-label="Close checkout">×</button>
          <p class="eyebrow">ORIGYN CHECKOUT</p>
          <h2 id="origyn-checkout-title">Confirm your order.</h2>
          <p class="origyn-checkout-note">The server will re-check products, prices and inventory before creating the order.</p>
          <form id="origyn-checkout-form">
            <label>Shipping address <span class="origyn-optional">optional for digital products</span>
              <textarea id="origyn-shipping-address" maxlength="2000" placeholder="Name, address, city, state, PIN code"></textarea>
            </label>
            <div id="origyn-checkout-status" aria-live="polite"></div>
            <div class="origyn-checkout-actions"><button type="button" class="text-btn" id="origyn-checkout-cancel">Cancel</button><button type="submit" class="primary-btn" id="origyn-place-order">Place order →</button></div>
          </form>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('.origyn-checkout-close').addEventListener('click', closeCheckout);
      overlay.querySelector('#origyn-checkout-cancel').addEventListener('click', closeCheckout);
      overlay.addEventListener('click', (event) => { if (event.target === overlay) closeCheckout(); });
      overlay.querySelector('#origyn-checkout-form').addEventListener('submit', placeOrder);
    }
    overlay.hidden = false;
    overlay.querySelector('#origyn-checkout-status').textContent = '';
    overlay.querySelector('#origyn-place-order').disabled = false;
  };

  const closeCheckout = () => { if (overlay) overlay.hidden = true; };

  const setStatus = (message, error = false) => {
    const status = overlay?.querySelector('#origyn-checkout-status');
    if (status) { status.textContent = message; status.dataset.error = error ? 'true' : 'false'; }
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!api.isAuthenticated()) return setStatus('Please sign in again before placing the order.', true);
    const button = overlay.querySelector('#origyn-place-order');
    const shipping = overlay.querySelector('#origyn-shipping-address').value.trim();
    button.disabled = true;
    setStatus('Creating secure order…');
    const idempotencyKey = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    try {
      const response = await api.post('/api/orders', shipping ? { shipping_address: shipping } : {}, {
        headers: { 'Idempotency-Key': idempotencyKey }
      });
      const order = response.data || response;
      const total = money(order.total_paise, order.currency || 'INR');
      setStatus(`Order ${order.id ? order.id.slice(0, 8) : ''} created — ${total}.`);
      button.textContent = 'Order created ✓';
      setTimeout(() => { closeCheckout(); drawer.classList.remove('open'); }, 900);
      window.dispatchEvent(new CustomEvent('origyn:order-created', { detail: order }));
    } catch (error) {
      setStatus(error.message || 'Could not create the order. Your cart has not been cleared.', true);
      button.disabled = false;
    }
  };

  checkoutButton.addEventListener('click', (event) => { event.preventDefault(); showCheckout(); });
});
