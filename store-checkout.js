/* Origyn Store checkout flow.
 * Keeps the existing Store UI and connects it to authenticated cart/order/payment APIs.
 * Payment remains provider-controlled: the browser never marks a payment as captured.
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  if (!window.OrigynAPI) return;

  const css = document.createElement('style');
  css.textContent = `
    .origyn-checkout-overlay{position:fixed;inset:0;z-index:30000;background:rgba(15,12,9,.62);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:18px}
    .origyn-checkout-overlay.open{display:flex}
    .origyn-checkout-panel{width:min(720px,100%);max-height:calc(100dvh - 36px);overflow:auto;background:#fffaf4;border:1px solid #e7ddd0;border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.25);padding:28px}
    .origyn-checkout-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:20px}
    .origyn-checkout-head h2{margin:4px 0;font-size:32px;letter-spacing:-1.5px}
    .origyn-checkout-close{border:0;background:#eee6dc;border-radius:50%;width:38px;height:38px;font-size:22px;cursor:pointer}
    .origyn-auth-tabs{display:flex;gap:8px;margin-bottom:18px}
    .origyn-auth-tabs button{border:1px solid #ddd1c2;background:#fff;border-radius:999px;padding:9px 15px;font-weight:800;cursor:pointer}
    .origyn-auth-tabs button.active{background:#222;color:#fff;border-color:#222}
    .origyn-checkout-field{display:flex;flex-direction:column;gap:7px;margin:12px 0}
    .origyn-checkout-field label{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#6f665d}
    .origyn-checkout-field input,.origyn-checkout-field textarea{border:1px solid #ddd1c2;border-radius:12px;padding:12px 13px;font:inherit;background:#fff}
    .origyn-checkout-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .origyn-checkout-summary{border:1px solid #e5dbcf;background:#fff;border-radius:16px;padding:16px;margin:16px 0}
    .origyn-checkout-summary-row{display:flex;justify-content:space-between;gap:14px;padding:8px 0;border-bottom:1px solid #eee6dc}
    .origyn-checkout-summary-row:last-child{border-bottom:0;font-weight:900;font-size:17px}
    .origyn-checkout-message{min-height:22px;margin:10px 0;color:#b44b25;font-size:13px}
    .origyn-checkout-success{padding:20px;border:1px solid #b9dec3;background:#effaf1;border-radius:16px;color:#245c32}
    .origyn-checkout-success h3{margin-top:0}
    .origyn-checkout-muted{font-size:13px;color:#746c63;line-height:1.6}
    @media(max-width:600px){.origyn-checkout-panel{padding:20px}.origyn-checkout-grid{grid-template-columns:1fr}.origyn-checkout-head h2{font-size:27px}}
  `;
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.innerHTML = `
    <div id="origyn-auth-overlay" class="origyn-checkout-overlay" aria-hidden="true">
      <div class="origyn-checkout-panel">
        <div class="origyn-checkout-head"><div><p class="eyebrow">CHECKOUT · ACCOUNT</p><h2 id="origyn-auth-title">Sign in to continue</h2></div><button class="origyn-checkout-close" data-close-auth>×</button></div>
        <div class="origyn-auth-tabs"><button class="active" data-auth-mode="login">Sign in</button><button data-auth-mode="register">Create account</button></div>
        <form id="origyn-auth-form">
          <div class="origyn-checkout-field" id="origyn-name-field" hidden><label>Name</label><input id="origyn-auth-name" autocomplete="name"></div>
          <div class="origyn-checkout-field"><label>Email</label><input id="origyn-auth-email" type="email" autocomplete="email" required></div>
          <div class="origyn-checkout-field"><label>Password</label><input id="origyn-auth-password" type="password" minlength="10" required></div>
          <p id="origyn-auth-message" class="origyn-checkout-message"></p>
          <button class="primary-btn" type="submit" id="origyn-auth-submit">Sign in →</button>
        </form>
      </div>
    </div>
    <div id="origyn-checkout-overlay" class="origyn-checkout-overlay" aria-hidden="true">
      <div class="origyn-checkout-panel">
        <div class="origyn-checkout-head"><div><p class="eyebrow">ORIGYN CHECKOUT</p><h2>Complete your order</h2></div><button class="origyn-checkout-close" data-close-checkout>×</button></div>
        <div id="origyn-checkout-body"></div>
      </div>
    </div>`;
  document.body.appendChild(root);

  const authOverlay = document.querySelector('#origyn-auth-overlay');
  const checkoutOverlay = document.querySelector('#origyn-checkout-overlay');
  const authForm = document.querySelector('#origyn-auth-form');
  const authName = document.querySelector('#origyn-auth-name');
  const authEmail = document.querySelector('#origyn-auth-email');
  const authPassword = document.querySelector('#origyn-auth-password');
  const authMessage = document.querySelector('#origyn-auth-message');
  const authTitle = document.querySelector('#origyn-auth-title');
  const authSubmit = document.querySelector('#origyn-auth-submit');
  const nameField = document.querySelector('#origyn-name-field');
  const checkoutBody = document.querySelector('#origyn-checkout-body');
  let authMode = 'login';
  let pendingCheckout = false;

  const open = (el) => { el.classList.add('open'); el.setAttribute('aria-hidden','false'); };
  const close = (el) => { el.classList.remove('open'); el.setAttribute('aria-hidden','true'); };

  const money = (paise, currency='INR') => {
    try { return new Intl.NumberFormat('en-IN',{style:'currency',currency}).format(Number(paise||0)/100); }
    catch (_) { return `${currency} ${(Number(paise||0)/100).toLocaleString('en-IN')}`; }
  };

  function setAuthMode(mode) {
    authMode = mode;
    nameField.hidden = mode !== 'register';
    authTitle.textContent = mode === 'register' ? 'Create your Origyn account' : 'Sign in to continue';
    authSubmit.textContent = mode === 'register' ? 'Create account →' : 'Sign in →';
    authMessage.textContent = '';
    document.querySelectorAll('[data-auth-mode]').forEach(b => b.classList.toggle('active', b.dataset.authMode === mode));
  }

  document.querySelectorAll('[data-auth-mode]').forEach(b => b.addEventListener('click', () => setAuthMode(b.dataset.authMode)));
  document.querySelector('[data-close-auth]')?.addEventListener('click', () => close(authOverlay));
  document.querySelector('[data-close-checkout]')?.addEventListener('click', () => close(checkoutOverlay));
  [authOverlay, checkoutOverlay].forEach(el => el.addEventListener('click', e => { if(e.target === el) close(el); }));

  async function backendCart() {
    const response = await window.OrigynAPI.get('/api/cart');
    return response;
  }

  async function syncLocalCart() {
    const local = window.OrigynStore?.getCart?.() || [];
    if (!local.length) return backendCart();

    const existing = await backendCart();
    const map = new Map((existing.items || []).map(item => [`${item.product_id}:${item.variant_id || ''}`, Number(item.quantity)]));
    for (const item of local) {
      const key = `${item.product_id}:`;
      const already = map.get(key) || 0;
      const delta = Math.max(0, Number(item.quantity) - already);
      if (delta > 0) {
        await window.OrigynAPI.post('/api/cart/items', { product_id: item.product_id, quantity: delta });
      }
    }
    const fresh = await backendCart();
    window.OrigynStore?.clearCart?.();
    return fresh;
  }

  function needsShipping(items) {
    return (items || []).some(item => item.product_snapshot?.product_type === 'physical');
  }

  function renderCheckout(cart) {
    const shipping = needsShipping(cart.items);
    const rows = (cart.items || []).map(item => `
      <div class="origyn-checkout-summary-row">
        <span>${item.product_snapshot?.name || 'Product'} × ${item.quantity}</span>
        <strong>${money(Number(item.unit_price_paise) * Number(item.quantity), item.currency || cart.currency || 'INR')}</strong>
      </div>`).join('');
    checkoutBody.innerHTML = `
      <div class="origyn-checkout-summary">${rows}<div class="origyn-checkout-summary-row"><span>Total</span><strong>${money(cart.total_paise, cart.currency || 'INR')}</strong></div></div>
      ${shipping ? `
        <p class="origyn-checkout-muted">This cart contains a physical product, so a delivery address is required.</p>
        <div class="origyn-checkout-grid">
          <div class="origyn-checkout-field"><label>Name</label><input id="co-name" required autocomplete="name"></div>
          <div class="origyn-checkout-field"><label>Postal code</label><input id="co-postal" required autocomplete="postal-code"></div>
        </div>
        <div class="origyn-checkout-field"><label>Address</label><input id="co-address" required autocomplete="street-address"></div>
        <div class="origyn-checkout-grid">
          <div class="origyn-checkout-field"><label>City</label><input id="co-city" required></div>
          <div class="origyn-checkout-field"><label>State</label><input id="co-state" required></div>
        </div>
        <div class="origyn-checkout-field"><label>Country code</label><input id="co-country" value="IN" maxlength="2" required></div>
      ` : '<p class="origyn-checkout-muted">No shipping address is needed for this cart. Digital, software, API, model, dataset and service fulfilment is handled after payment.</p>'}
      <p id="origyn-checkout-message" class="origyn-checkout-message"></p>
      <button class="primary-btn" id="origyn-place-order">${shipping ? 'Place order & continue to payment →' : 'Place order & continue to payment →'}</button>`;
    document.querySelector('#origyn-place-order').addEventListener('click', placeOrder);
  }

  async function placeOrder() {
    const button = document.querySelector('#origyn-place-order');
    const message = document.querySelector('#origyn-checkout-message');
    button.disabled = true;
    message.textContent = 'Creating your order…';
    try {
      const cart = await backendCart();
      if (!cart.items?.length) throw new Error('Your cart is empty.');
      const shipping = needsShipping(cart.items);
      let address = null;
      if (shipping) {
        address = {
          name: document.querySelector('#co-name').value.trim(),
          address_line1: document.querySelector('#co-address').value.trim(),
          city: document.querySelector('#co-city').value.trim(),
          state: document.querySelector('#co-state').value.trim(),
          postal_code: document.querySelector('#co-postal').value.trim(),
          country: document.querySelector('#co-country').value.trim().toUpperCase()
        };
      }
      const key = `checkout-${crypto.randomUUID()}`;
      const orderResponse = await window.OrigynAPI.post('/api/orders', { shipping_address: address }, { headers: { 'Idempotency-Key': key } });
      const order = orderResponse;
      message.textContent = 'Order created. Starting payment…';
      const paymentResponse = await window.OrigynAPI.post(`/api/payments/orders/${order.id}/initiate`, {});
      renderPaymentPending(order, paymentResponse.payment);
    } catch (error) {
      message.textContent = error.message || 'Checkout failed. Please try again.';
      button.disabled = false;
    }
  }

  function renderPaymentPending(order, payment) {
    checkoutBody.innerHTML = `
      <div class="origyn-checkout-success">
        <h3>Order created ✓</h3>
        <p>Your order <strong>#${order.id.slice(0,8)}</strong> has been created for <strong>${money(order.total_paise, order.currency)}</strong>.</p>
        <p><strong>Payment status:</strong> ${payment?.status || 'pending'}</p>
        <p class="origyn-checkout-muted">The payment provider must confirm the payment before Origyn marks the order as paid. This browser flow never fakes a successful payment.</p>
        <button class="primary-btn" id="origyn-close-complete">Done</button>
      </div>`;
    document.querySelector('#origyn-close-complete').addEventListener('click', () => close(checkoutOverlay));
  }

  async function startCheckout() {
    pendingCheckout = true;
    if (!window.OrigynAPI.auth.hasToken()) {
      open(authOverlay);
      return;
    }
    try {
      const cart = await syncLocalCart();
      if (!cart.items?.length) throw new Error('Your cart is empty.');
      renderCheckout(cart);
      open(checkoutOverlay);
    } catch (error) {
      alert(error.message || 'Could not start checkout.');
    }
  }

  document.addEventListener('click', async e => {
    const checkoutButton = e.target.closest('#checkout-btn');
    if (!checkoutButton) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    await startCheckout();
  }, true);

  authForm.addEventListener('submit', async e => {
    e.preventDefault();
    authMessage.textContent = 'Please wait…';
    authSubmit.disabled = true;
    try {
      if (authMode === 'register') {
        await window.OrigynAPI.auth.register({ name: authName.value.trim(), email: authEmail.value.trim(), password: authPassword.value });
      } else {
        await window.OrigynAPI.auth.login(authEmail.value.trim(), authPassword.value);
      }
      close(authOverlay);
      const cart = await syncLocalCart();
      if (!cart.items?.length) throw new Error('Your cart is empty.');
      renderCheckout(cart);
      open(checkoutOverlay);
    } catch (error) {
      authMessage.textContent = error.message || 'Authentication failed.';
    } finally {
      authSubmit.disabled = false;
    }
  });
});