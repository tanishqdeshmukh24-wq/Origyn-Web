/* Origyn Store persistent cart integration. Loaded after the Store UI scripts. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const api = window.OrigynAPI;
  const cartItems = document.querySelector('#cart-items');
  const cartTotal = document.querySelector('#cart-total');
  const cartCount = document.querySelector('#cart-count');
  const cartDrawer = document.querySelector('#cart');
  const modalAdd = document.querySelector('#modal-add');
  if (!api || !cartItems || !cartTotal || !cartCount || !cartDrawer) return;

  let cart = { items: [], total_paise: 0, currency: 'INR' };
  let selected = null;

  const money = (paise, currency = 'INR') => {
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(Number(paise || 0) / 100); }
    catch (_error) { return `${currency} ${(Number(paise || 0) / 100).toLocaleString('en-IN')}`; }
  };

  const authRequired = () => {
    if (api.isAuthenticated()) return true;
    api.setAuthRequiredMessage?.('Sign in to use your cart.');
    alert('Sign in to use your cart.');
    return false;
  };

  const productName = (item) => item.product_snapshot?.name || 'Origyn product';
  const productImage = (item) => item.product_snapshot?.image || '';

  const render = () => {
    const items = Array.isArray(cart.items) ? cart.items : [];
    cartCount.textContent = String(items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
    cartTotal.textContent = money(cart.total_paise, cart.currency || 'INR');
    cartItems.innerHTML = items.length ? items.map((item) => `
      <div class="cart-item" data-cart-id="${item.id}">
        <div class="cart-item-image">${productImage(item) ? `<img src="${productImage(item)}" alt="${productName(item)}">` : '<span>O</span>'}</div>
        <div class="cart-item-info">
          <strong>${productName(item)}</strong>
          <small>${money(item.unit_price_paise, item.product_snapshot?.currency || cart.currency || 'INR')}</small>
          <div class="cart-item-controls">
            <button type="button" data-cart-minus="${item.id}" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-cart-plus="${item.id}" aria-label="Increase quantity">+</button>
            <button type="button" data-cart-remove="${item.id}" aria-label="Remove product">Remove</button>
          </div>
        </div>
      </div>`).join('') : '<div class="store-empty-state"><p>Your cart is empty.</p></div>';
  };

  const loadCart = async () => {
    if (!api.isAuthenticated()) { cart = { items: [], total_paise: 0, currency: 'INR' }; render(); return; }
    try { cart = await api.get('/api/cart'); render(); }
    catch (error) { console.warn('Cart could not be loaded:', error.message); }
  };

  const openCart = () => { cartDrawer.classList.add('open'); loadCart(); };
  const closeCart = () => cartDrawer.classList.remove('open');

  document.querySelector('#cart-open')?.addEventListener('click', (event) => { event.preventDefault(); openCart(); });
  document.querySelector('#cart-close')?.addEventListener('click', closeCart);

  const addToCart = async (product) => {
    if (!authRequired()) return;
    const variantId = product.variants?.length === 1 ? product.variants[0].id : null;
    try {
      cart = await api.post('/api/cart/items', { product_id: product.id, variant_id: variantId, quantity: 1 });
      render();
      openCart();
    } catch (error) {
      alert(error.message || 'Could not add this product to your cart.');
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try { cart = await api.patch(`/api/cart/items/${encodeURIComponent(itemId)}`, { quantity }); render(); }
    catch (error) { alert(error.message || 'Could not update cart quantity.'); }
  };

  const removeItem = async (itemId) => {
    try { await api.delete(`/api/cart/items/${encodeURIComponent(itemId)}`); await loadCart(); }
    catch (error) { alert(error.message || 'Could not remove the item.'); }
  };

  cartItems.addEventListener('click', (event) => {
    const plus = event.target.closest('[data-cart-plus]');
    const minus = event.target.closest('[data-cart-minus]');
    const remove = event.target.closest('[data-cart-remove]');
    const id = plus?.dataset.cartPlus || minus?.dataset.cartMinus || remove?.dataset.cartRemove;
    if (!id) return;
    const item = cart.items.find((entry) => entry.id === id);
    if (remove) removeItem(id);
    else if (item) updateQuantity(id, Math.max(1, Number(item.quantity) + (plus ? 1 : -1)));
  });

  if (modalAdd) {
    modalAdd.addEventListener('click', (event) => {
      event.stopImmediatePropagation();
      if (selected) addToCart(selected);
    }, true);
  }

  // store-api.js keeps the selected product private, so capture product-open clicks
  // and obtain the authoritative product before adding it to the persistent cart.
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-product]');
    if (!button || button === modalAdd) return;
    // The modal is opened by store-api.js. We intentionally don't add here.
  }, true);

  const observeModal = () => {
    const modal = document.querySelector('#product-modal');
    if (!modal) return;
    const observer = new MutationObserver(() => {
      if (!modal.classList.contains('open')) return;
      const name = document.querySelector('#modal-name')?.textContent?.trim();
      if (!name) return;
      // Match the displayed modal against the already-loaded Store product list.
      const source = window.origynStoreProducts;
      if (Array.isArray(source)) selected = source.find((p) => p.n === name) || null;
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  };
  observeModal();
  loadCart();
});
