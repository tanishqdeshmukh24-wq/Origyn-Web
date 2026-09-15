/* Origyn Store persistent cart integration. Loaded after the Store UI scripts. */
if (!document.querySelector('script[data-origyn-reviews]')) {
  document.write('<script src="store-reviews.js" data-origyn-reviews="true"><\/script>');
}
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
  let selectedProductId = null;

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

  const resolveSelectedProduct = async () => {
    const name = document.querySelector('#modal-name')?.textContent?.trim();
    if (!name) return null;
    const response = await api.get(`/api/products?q=${encodeURIComponent(name)}&limit=10`);
    const matches = Array.isArray(response?.data) ? response.data : [];
    const exact = matches.find((product) => product.name === name);
    return exact || matches[0] || null;
  };

  const addToCart = async () => {
    if (!authRequired()) return;
    try {
      const product = await resolveSelectedProduct();
      if (!product?.id) throw new Error('Could not identify this product. Please reopen the product and try again.');
      selectedProductId = product.id;
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const variantId = variants.length === 1 ? variants[0].id : null;
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
      event.preventDefault();
      event.stopImmediatePropagation();
      addToCart();
    }, true);
  }

  const modal = document.querySelector('#product-modal');
  if (modal) {
    const observer = new MutationObserver(() => {
      if (!modal.classList.contains('open')) selectedProductId = null;
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }

  loadCart();
});
