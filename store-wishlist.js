/* Origyn Store wishlist integration. Loaded after the Store UI scripts. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  if (!window.OrigynAPI) return;

  const grid = document.querySelector('#store-grid');
  const wishlistButton = document.querySelector('#wishlist-open');
  if (!grid || !wishlistButton) return;

  let saved = new Set();

  const loadWishlist = async () => {
    if (!window.OrigynAPI.isAuthenticated()) return;
    try {
      const response = await window.OrigynAPI.get('/api/wishlist');
      saved = new Set((response.data || []).map((item) => item.product_id).filter(Boolean));
      refreshSaveButtons();
    } catch (error) {
      console.warn('Wishlist could not be loaded:', error.message);
    }
  };

  const refreshSaveButtons = () => {
    document.querySelectorAll('[data-save]').forEach((button) => {
      const productId = button.dataset.save;
      const active = saved.has(productId);
      button.classList.toggle('saved', active);
      button.textContent = active ? '♥' : '♡';
      button.setAttribute('aria-label', active ? 'Remove from saved' : 'Save product');
    });
  };

  const toggle = async (productId, button) => {
    if (!window.OrigynAPI.isAuthenticated()) {
      window.OrigynAPI.setAuthRequiredMessage?.('Sign in to save products to your wishlist.');
      return;
    }
    const wasSaved = saved.has(productId);
    button.disabled = true;
    try {
      if (wasSaved) {
        await window.OrigynAPI.delete(`/api/wishlist/${productId}`);
        saved.delete(productId);
      } else {
        await window.OrigynAPI.post(`/api/wishlist/${productId}`);
        saved.add(productId);
      }
      refreshSaveButtons();
    } catch (error) {
      console.error('Wishlist update failed:', error);
      alert(error.message || 'Could not update your saved products.');
    } finally {
      button.disabled = false;
    }
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-save]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    toggle(button.dataset.save, button);
  }, true);

  wishlistButton.addEventListener('click', async (event) => {
    event.preventDefault();
    if (!window.OrigynAPI.isAuthenticated()) {
      window.OrigynAPI.setAuthRequiredMessage?.('Sign in to view your saved products.');
      return;
    }
    await loadWishlist();
    const cards = Array.from(grid.querySelectorAll('.product-card'));
    cards.forEach((card) => {
      card.hidden = !saved.has(card.dataset.id);
    });
    grid.classList.add('wishlist-view');
    if (!saved.size) {
      grid.innerHTML = '<div class="store-empty-state"><p>Your saved products will appear here.</p></div>';
    }
    document.querySelector('#discover')?.scrollIntoView({ behavior: 'smooth' });
  });

  loadWishlist();
});
