/* Origyn Store API integration.
 * Keeps the existing Store presentation but replaces demo product data with
 * published products from the common backend. Cart/checkout remain local
 * until their dedicated integration phases. Wishlist is server-backed.
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const grid = $('#store-grid');
  if (!grid || !window.OrigynAPI) return;

  let products = [];
  let filter = 'All';
  let query = '';
  let sort = 'featured';
  let selected = null;
  let cart = [];
  let saved = new Set();
  let searchTimer = null;

  const money = (paise, currency = 'INR') => {
    const value = Number(paise || 0) / 100;
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value);
    } catch (_error) {
      return `${currency} ${value.toLocaleString('en-IN')}`;
    }
  };

  const normalize = (p, index) => ({
    id: p.id,
    n: p.name || 'Untitled product',
    cat: p.category_name || 'Other',
    type: p.product_type || 'Product',
    p: Number(p.price_paise || 0),
    mark: (p.name || 'O').slice(0, 3).toUpperCase(),
    seller: p.publisher_name || 'Origyn Marketplace',
    origin: p.ecosystem_status === 'origyn' ? 'Origyn Original'
      : p.ecosystem_status === 'origyn_member' ? 'Origyn Ecosystem'
      : 'Marketplace',
    d: p.description || 'Discover this product on Origyn.',
    image: Array.isArray(p.images) && p.images.length ? p.images[0] : '',
    rating: Number(p.rating_average || 0),
    reviews: Number(p.rating_count || 0),
    stock: Number(p.stock || 0),
    variants: Array.isArray(p.variants) ? p.variants : [],
    created: p.created_at || '',
    featured: p.ecosystem_status === 'origyn' || p.ecosystem_status === 'origyn_member' || index < 3
  });

  const setLoading = (message) => {
    grid.innerHTML = `<div class="store-empty-state"><p>${message}</p></div>`;
  };

  const loadProducts = async () => {
    setLoading('Loading products…');
    try {
      const response = await window.OrigynAPI.get('/api/products?limit=100');
      products = (response.data || []).map(normalize);
      await loadWishlist();
      render();
    } catch (error) {
      console.error('Origyn Store product load failed:', error);
      setLoading('Could not load products. Please make sure the Origyn API is running and try again.');
    }
  };

  const loadWishlist = async () => {
    saved = new Set();
    try {
      const response = await window.OrigynAPI.get('/api/wishlist');
      (response.data || []).forEach((item) => {
        if (item.product_id) saved.add(item.product_id);
      });
    } catch (error) {
      if (error.status !== 401) console.warn('Wishlist could not be loaded:', error.message);
    }
  };

  const toggleWishlist = async (productId) => {
    if (!window.OrigynAPI.isAuthenticated()) {
      window.OrigynAPI.setAuthRequiredMessage?.('Sign in to save products to your wishlist.');
      return;
    }

    const wasSaved = saved.has(productId);
    try {
      if (wasSaved) {
        await window.OrigynAPI.delete(`/api/wishlist/${productId}`);
        saved.delete(productId);
      } else {
        await window.OrigynAPI.post(`/api/wishlist/${productId}`);
        saved.add(productId);
      }
      render();
      if (selected && selected.id === productId) renderModal(selected);
    } catch (error) {
      console.error('Wishlist update failed:', error);
      alert(error.message || 'Could not update your saved products.');
    }
  };

  const filtered = () => {
    let list = products.filter((p) => {
      const matchesFilter = filter === 'All' || p.cat === filter || p.type === filter;
      const haystack = `${p.n} ${p.cat} ${p.type} ${p.seller} ${p.d}`.toLowerCase();
      return matchesFilter && (!query || haystack.includes(query.toLowerCase()));
    });

    if (sort === 'low') list.sort((a, b) => a.p - b.p);
    else if (sort === 'high') list.sort((a, b) => b.p - a.p);
    else if (sort === 'newest') list.sort((a, b) => new Date(b.created) - new Date(a.created));
    else list.sort((a, b) => Number(b.featured) - Number(a.featured));
    return list;
  };

  const render = () => {
    const list = filtered();
    const count = $('#result-count');
    if (count) count.textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
    grid.innerHTML = list.length ? list.map((p) => `
      <article class="product-card" data-id="${p.id}">
        <button class="save-product ${saved.has(p.id) ? 'saved' : ''}" data-save="${p.id}" aria-label="${saved.has(p.id) ? 'Remove from saved' : 'Save product'}">${saved.has(p.id) ? '♥' : '♡'}</button>
        <button class="product-card-main" data-product="${p.id}">
          <div class="product-image">${p.image ? `<img src="${p.image}" alt="${p.n}" loading="lazy">` : `<span>${p.mark}</span>`}</div>
          <div class="product-card-copy"><small>${p.cat} · ${p.origin}</small><h3>${p.n}</h3><p>${p.seller}</p><strong>${money(p.p)}</strong></div>
        </button>
      </article>
    `).join('') : '<div class="store-empty-state"><p>No products match your search.</p></div>';

    grid.querySelectorAll('[data-product]').forEach((button) => {
      button.addEventListener('click', () => openProduct(button.dataset.product));
    });
    grid.querySelectorAll('[data-save]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleWishlist(button.dataset.save);
      });
    });
  };

  const openProduct = async (id) => {
    try {
      const response = await window.OrigynAPI.get(`/api/products/${id}`);
      selected = normalize(response.data || response);
      renderModal(selected);
    } catch (error) {
      const product = products.find((p) => p.id === id);
      if (product) {
        selected = product;
        renderModal(product);
      }
    }
  };

  const renderModal = (p) => {
    $('#modal-badge').textContent = `${p.cat} · ${p.origin}`;
    $('#modal-name').textContent = p.n;
    $('#modal-description').textContent = p.d;
    $('#modal-seller').textContent = p.seller;
    $('#modal-price').textContent = money(p.p);
    $('#modal-image').innerHTML = p.image ? `<img src="${p.image}" alt="${p.n}">` : `<span>${p.mark}</span>`;
    const addButton = $('#modal-add');
    if (addButton) addButton.textContent = saved.has(p.id) ? 'Saved ✓' : 'Add to cart →';
    $('#product-modal').classList.add('open');
  };

  $('#modal-close')?.addEventListener('click', () => $('#product-modal').classList.remove('open'));
  $('#product-modal')?.addEventListener('click', (event) => {
    if (event.target.id === 'product-modal') $('#product-modal').classList.remove('open');
  });

  $('#modal-add')?.addEventListener('click', () => {
    if (selected) toggleWishlist(selected.id);
  });

  $('#store-search')?.addEventListener('input', (event) => {
    query = event.target.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 150);
  });
  $('#top-search')?.addEventListener('input', (event) => {
    query = event.target.value.trim();
    const input = $('#store-search');
    if (input) input.value = event.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 150);
  });
  $('#clear-search')?.addEventListener('click', () => {
    query = '';
    if ($('#store-search')) $('#store-search').value = '';
    if ($('#top-search')) $('#top-search').value = '';
    render();
  });
  $('#sort-products')?.addEventListener('change', (event) => {
    sort = event.target.value;
    render();
  });
  document.querySelectorAll('.quick-filters .filter').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.quick-filters .filter').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      filter = button.dataset.filter;
      render();
    });
  });

  document.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => {
      filter = button.dataset.category;
      document.querySelectorAll('.quick-filters .filter').forEach((b) => b.classList.toggle('active', b.dataset.filter === filter));
      document.querySelector('#discover')?.scrollIntoView({ behavior: 'smooth' });
      render();
    });
  });

  $('#wishlist-open')?.addEventListener('click', () => {
    if (!window.OrigynAPI.isAuthenticated()) {
      window.OrigynAPI.setAuthRequiredMessage?.('Sign in to view your saved products.');
      return;
    }
    const savedProducts = products.filter((p) => saved.has(p.id));
    grid.innerHTML = savedProducts.length
      ? savedProducts.map((p) => `<article class="product-card" data-id="${p.id}"><button class="save-product saved" data-save="${p.id}" aria-label="Remove from saved">♥</button><button class="product-card-main" data-product="${p.id}"><div class="product-image">${p.image ? `<img src="${p.image}" alt="${p.n}" loading="lazy">` : `<span>${p.mark}</span>`}</div><div class="product-card-copy"><small>${p.cat} · ${p.origin}</small><h3>${p.n}</h3><p>${p.seller}</p><strong>${money(p.p)}</strong></div></button></article>`).join('')
      : '<div class="store-empty-state"><p>Your saved products will appear here.</p></div>';
    grid.querySelectorAll('[data-product]').forEach((button) => button.addEventListener('click', () => openProduct(button.dataset.product)));
    grid.querySelectorAll('[data-save]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); toggleWishlist(button.dataset.save); }));
    document.querySelector('#discover')?.scrollIntoView({ behavior: 'smooth' });
  });

  loadProducts();
});
