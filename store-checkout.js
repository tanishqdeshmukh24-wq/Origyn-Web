/* Origyn Store checkout.
 * Bridges the existing Store cart to the server-authoritative order/payment APIs.
 * No prices, inventory, seller identity, or payment state are trusted from the browser.
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const checkoutButton = document.querySelector('#checkout-btn');
  if (!checkoutButton || !window.OrigynAPI || !window.OrigynStore) return;

  let activeOrderId = null;
  let pollTimer = null;
  let checkoutKey = null;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const money = (paise, currency = 'INR') => {
    const value = Number(paise || 0) / 100;
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value);
    } catch (_) {
      return `${currency} ${value.toLocaleString('en-IN')}`;
    }
  };

  const cart = () => (window.OrigynStore.getCart ? window.OrigynStore.getCart() : []);

  const needsShipping = (items) => items.some((item) => item.product_type === 'physical');

  const injectStyles = () => {
    if (document.querySelector('#origyn-checkout-styles')) return;
    const style = document.createElement('style');
    style.id = 'origyn-checkout-styles';
    style.textContent = `
      #origyn-checkout-modal { position:fixed; inset:0; z-index:10000; display:none; align-items:center; justify-content:center; padding:24px; background:rgba(0,0,0,.62); }
      #origyn-checkout-modal.open { display:flex; }
      .origyn-checkout-card { width:min(760px,100%); max-height:90vh; overflow:auto; background:#fff; border-radius:18px; box-shadow:0 24px 80px rgba(0,0,0,.25); padding:28px; color:#111; }
      .origyn-checkout-head { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; margin-bottom:22px; }
      .origyn-checkout-head h2 { margin:4px 0 0; }
      .origyn-checkout-close { border:0; background:transparent; font-size:28px; cursor:pointer; }
      .origyn-checkout-items { display:grid; gap:10px; margin:16px 0 24px; }
      .origyn-checkout-item { display:flex; justify-content:space-between; gap:16px; padding:12px 0; border-bottom:1px solid #e8e8e8; }
      .origyn-checkout-item small { display:block; opacity:.65; margin-top:4px; }
      .origyn-checkout-section { margin-top:22px; }
      .origyn-checkout-section h3 { margin-bottom:12px; }
      .origyn-checkout-form { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      .origyn-checkout-form label { display:grid; gap:6px; font-size:13px; }
      .origyn-checkout-form label.full { grid-column:1 / -1; }
      .origyn-checkout-form input { width:100%; box-sizing:border-box; padding:11px 12px; border:1px solid #d5d5d5; border-radius:9px; font:inherit; }
      .origyn-checkout-total { display:flex; justify-content:space-between; font-size:18px; font-weight:700; padding:18px 0; margin-top:8px; border-top:1px solid #ddd; }
      .origyn-checkout-error { padding:12px 14px; border-radius:10px; background:#fff0f0; color:#9b1c1c; margin:14px 0; }
      .origyn-checkout-status { text-align:center; padding:24px 10px; }
      .origyn-checkout-status h3 { margin:8px 0; }
      .origyn-checkout-muted { opacity:.68; }
      .origyn-checkout-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:18px; }
      .origyn-checkout-actions button { cursor:pointer; }
      @media (max-width:620px) { .origyn-checkout-card { padding:20px; } .origyn-checkout-form { grid-template-columns:1fr; } .origyn-checkout-form label.full { grid-column:auto; } }
    `;
    document.head.appendChild(style);
  };

  const ensureModal = () => {
    let modal = document.querySelector('#origyn-checkout-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'origyn-checkout-modal';
    modal.innerHTML = '<div class="origyn-checkout-card" role="dialog" aria-modal="true" aria-labelledby="origyn-checkout-title"><div id="origyn-checkout-content"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
    return modal;
  };

  const closeModal = () => {
    clearTimeout(pollTimer);
    const modal = document.querySelector('#origyn-checkout-modal');
    if (modal) modal.classList.remove('open');
  };

  const openModal = (html) => {
    const modal = ensureModal();
    document.querySelector('#origyn-checkout-content').innerHTML = html;
    modal.classList.add('open');
  };

  const renderCheckout = (items) => {
    const physical = needsShipping(items);
    const rows = items.map((item) => `
      <div class="origyn-checkout-item">
        <div><strong>${esc(item.name)}</strong><small>${esc(item.product_type)} · Qty ${item.quantity}</small></div>
        <strong>${money(Number(item.unit_price_paise) * Number(item.quantity))}</strong>
      </div>
    `).join('');

    return `
      <div class="origyn-checkout-head">
        <div><p class="eyebrow">ORIGYN STORE · CHECKOUT</p><h2 id="origyn-checkout-title">Review your order</h2></div>
        <button class="origyn-checkout-close" data-checkout-close aria-label="Close">×</button>
      </div>
      <div class="origyn-checkout-items">${rows}</div>
      <div class="origyn-checkout-section">
        <h3>${physical ? 'Delivery details' : 'Fulfilment'}</h3>
        ${physical ? `
          <form id="origyn-shipping-form" class="origyn-checkout-form">
            <label class="full">Name<input name="name" required maxlength="200" autocomplete="name"></label>
            <label class="full">Address line 1<input name="address_line1" required maxlength="200" autocomplete="street-address"></label>
            <label>City<input name="city" required maxlength="200" autocomplete="address-level2"></label>
            <label>State<input name="state" required maxlength="200" autocomplete="address-level1"></label>
            <label>Postal code<input name="postal_code" required maxlength="200" autocomplete="postal-code"></label>
            <label>Country code<input name="country" required value="IN" maxlength="2" autocomplete="country"></label>
          </form>
        ` : '<p class="origyn-checkout-muted">No shipping address is required. Digital/software/API products are fulfilled through account/download access; services are fulfilled as services.</p>'}
      </div>
      <div class="origyn-checkout-total"><span>Server will calculate the final total</span><span>Secure checkout</span></div>
      <div id="origyn-checkout-error"></div>
      <div class="origyn-checkout-actions">
        <button class="text-btn" data-checkout-close>Cancel</button>
        <button class="primary-btn" id="origyn-place-order">Place order →</button>
      </div>
    `;
  };

  const showError = (message) => {
    const box = document.querySelector('#origyn-checkout-error');
    if (box) box.innerHTML = `<div class="origyn-checkout-error">${esc(message)}</div>`;
  };

  const shippingFromForm = () => {
    const form = document.querySelector('#origyn-shipping-form');
    if (!form) return null;
    const data = new FormData(form);
    return Object.fromEntries(data.entries());
  };

  const showStatus = (title, message, order = null, stateClass = '') => {
    openModal(`
      <div class="origyn-checkout-status ${stateClass}">
        <p class="eyebrow">ORIGYN ORDER</p>
        <h3>${esc(title)}</h3>
        <p>${esc(message)}</p>
        ${order ? `<p class="origyn-checkout-muted">Order ${esc(order.id)} · ${esc(order.payment_status || order.payment?.status || 'pending')}</p>` : ''}
        <div class="origyn-checkout-actions">
          ${order ? '<button class="primary-btn" id="origyn-refresh-order">Refresh payment status</button>' : ''}
          <button class="text-btn" data-checkout-close>Close</button>
        </div>
      </div>
    `);
  };

  const refreshOrder = async () => {
    if (!activeOrderId) return null;
    const order = await window.OrigynAPI.get(`/api/orders/${encodeURIComponent(activeOrderId)}`);
    const paymentStatus = order.payment_status || order.payment?.status || 'pending';

    if (paymentStatus === 'paid' || paymentStatus === 'captured') {
      clearTimeout(pollTimer);
      showStatus('Payment successful', 'Your order has been confirmed.', order, 'success');
      return order;
    }
    if (['failed', 'cancelled'].includes(paymentStatus)) {
      clearTimeout(pollTimer);
      showStatus('Payment not completed', `The payment is ${paymentStatus}. Inventory reservations are released by the backend for failed/cancelled payments.`, order, 'error');
      return order;
    }

    showStatus('Payment pending', 'The order exists, but payment confirmation has not reached Origyn yet. This page will not invent a success state.', order);
    clearTimeout(pollTimer);
    pollTimer = setTimeout(() => refreshOrder().catch((error) => console.warn('Order status refresh failed:', error)), 4000);
    return order;
  };

  const initiatePayment = async (order) => {
    activeOrderId = order.id;
    try {
      await window.OrigynAPI.post(`/api/payments/orders/${encodeURIComponent(order.id)}/initiate`, {});
      await refreshOrder();
    } catch (error) {
      if (error.status === 503) {
        showStatus('Order created — payment provider not configured', 'The backend created the order, but no payment provider is configured for this environment. No payment success is being assumed.', order, 'error');
        return;
      }
      showStatus('Payment initiation failed', error.message || 'Could not initialize payment.', order, 'error');
    }
  };

  const syncServerCart = async (items) => {
    if (!window.OrigynAPI.auth?.hasToken?.()) {
      const error = new Error('Please sign in before checkout.');
      error.status = 401;
      throw error;
    }

    // The Store UI currently keeps its cart locally. Reconcile it to the
    // authenticated server cart before checkout so the order service can
    // remain server-authoritative for price, inventory, and fulfilment.
    const serverCart = await window.OrigynAPI.get('/api/cart');
    const localByProduct = new Map(items.map((item) => [item.product_id, item]));

    for (const serverItem of (serverCart.items || [])) {
      if (!localByProduct.has(serverItem.product_id)) {
        await window.OrigynAPI.del(`/api/cart/items/${encodeURIComponent(serverItem.id)}`);
      } else if (serverItem.variant_id) {
        // The current Store cart has no variant selector. Remove stale
        // variant-backed rows rather than accidentally ordering the wrong SKU.
        await window.OrigynAPI.del(`/api/cart/items/${encodeURIComponent(serverItem.id)}`);
      }
    }

    const refreshed = await window.OrigynAPI.get('/api/cart');
    const existing = new Map(
      (refreshed.items || []).map((item) => [item.product_id, item])
    );

    for (const item of items) {
      const current = existing.get(item.product_id);
      if (current) {
        await window.OrigynAPI.patch(
          `/api/cart/items/${encodeURIComponent(current.id)}`,
          { quantity: item.quantity }
        );
      } else {
        await window.OrigynAPI.post('/api/cart/items', {
          product_id: item.product_id,
          quantity: item.quantity
        });
      }
    }
  };

  const placeOrder = async () => {
    const items = cart();
    if (!items.length) {
      closeModal();
      return;
    }

    const button = document.querySelector('#origyn-place-order');
    if (button) {
      button.disabled = true;
      button.textContent = 'Creating order…';
    }

    checkoutKey = checkoutKey || (crypto.randomUUID ? crypto.randomUUID() : `origyn-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    try {
      const shippingAddress = needsShipping(items) ? shippingFromForm() : null;
      await syncServerCart(items);
      const order = await window.OrigynAPI.post('/api/orders', { shipping_address: shippingAddress }, {
        headers: { 'Idempotency-Key': checkoutKey }
      });

      window.OrigynStore.clearCart();
      activeOrderId = order.id;
      await initiatePayment(order);
    } catch (error) {
      if (error.status === 401) {
        showError('Please sign in before checkout. Your cart is still available.');
      } else {
        showError(error.message || 'Could not create the order.');
      }
      if (button) {
        button.disabled = false;
        button.textContent = 'Place order →';
      }
    }
  };

  const openCheckout = () => {
    const items = cart();
    if (!items.length) return;
    checkoutKey = null;
    openModal(renderCheckout(items));
  };

  injectStyles();
  ensureModal();

  document.addEventListener('click', (event) => {
    if (event.target.closest('#checkout-btn')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openCheckout();
      return;
    }

    if (event.target.closest('[data-checkout-close]')) {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.target.closest('#origyn-place-order')) {
      event.preventDefault();
      placeOrder();
      return;
    }

    if (event.target.closest('#origyn-refresh-order')) {
      event.preventDefault();
      refreshOrder().catch((error) => showStatus('Could not refresh order', error.message || 'Please try again.'));
    }
  }, true);
});
