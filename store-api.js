/* Origyn Store API integration.
 * Replaces the demo product dataset with published products from Ninad's backend
 * while preserving the existing Store presentation and local cart/wishlist UX.
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const grid = $('#store-grid');
  if (!grid || !window.OrigynAPI) return;

  let products = [];
  let filter = 'All';
  let query = '';
  let sort = 'featured';
  let selected = null;
  let cart = [];
  let saved = new Set();
  let savedView = false;
  let searchTimer = null;
  let searchStarted = false;

  const money = (paise, currency = 'INR') => {
    const value = Number(paise || 0) / 100;
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value);
    } catch (_) {
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
    origin: p.ecosystem_status === 'origyn_owned' || p.ecosystem_status === 'origyn'
      ? 'Origyn Original'
      : p.ecosystem_status === 'origyn_member'
        ? 'Origyn Ecosystem'
        : 'Marketplace',
    d: p.description || 'Discover this product on Origyn.',
    image: Array.isArray(p.images) && p.images.length ? p.images[0]?.url || p.images[0] : '',
    rating: Number(p.rating_average || 0),
    reviews: Number(p.rating_count || 0),
    stock: p.inventory?.stock == null ? null : Number(p.inventory.stock),
    created: p.created_at || '',
    featured: p.ecosystem_status === 'origyn_owned' || p.ecosystem_status === 'origyn' || p.ecosystem_status === 'origyn_member' || index < 3
  });

  const setLoading = (message) => {
    grid.innerHTML = `<div class="search-empty-state"><div class="saved-empty-icon">⌕</div><h3>${message}</h3></div>`;
  };

  const loadProducts = async () => {
    setLoading('Loading products…');
    try {
      const response = await window.OrigynAPI.get('/api/products?limit=100');
      products = (response.data || []).map(normalize);
      renderEcosystem();
      render();
    } catch (error) {
      console.error('Origyn Store product load failed:', error);
      setLoading('Could not load products. Make sure the Origyn API is running.');
    }
  };

  const score = (p, q) => {
    if (!q) return 0;
    const fields = [p.n, p.cat, p.type, p.seller, p.d].map((v) => String(v).toLowerCase());
    let value = 0;
    if (fields[0] === q) value += 100;
    if (fields[0].startsWith(q)) value += 70;
    if (fields[0].includes(q)) value += 45;
    if (fields[1].includes(q)) value += 35;
    if (fields[2].includes(q)) value += 25;
    if (fields[3].includes(q)) value += 18;
    if (fields[4].includes(q)) value += 10;
    return value;
  };

  const card = (p) => `
    <article class="product-card" data-id="${p.id}">
      <div class="product-visual">
        <span class="product-badge">${p.type}</span>
        <button class="product-save ${saved.has(p.id) ? 'saved' : ''}" data-save="${p.id}" aria-label="${saved.has(p.id) ? 'Remove from saved' : 'Save product'}">${saved.has(p.id) ? '♥' : '♡'}</button>
        ${p.image ? `<img class="product-api-image" src="${p.image}" alt="${p.n}" loading="lazy">` : `<span class="product-mark">${p.mark}</span>`}
      </div>
      <div class="product-body">
        <span class="product-origin">${p.origin} · ${p.cat}</span>
        <h3>${p.n}</h3>
        <p>${p.d}</p>
        <div class="product-foot">
          <strong class="product-price">${money(p.p)}</strong>
          <div class="product-actions">
            <button class="mini-btn" data-view="${p.id}">View</button>
            <button class="mini-btn dark" data-add="${p.id}">Add</button>
          </div>
        </div>
      </div>
    </article>`;

  const filtered = () => {
    const q = query.toLowerCase().trim();
    let list = products
      .map((p) => ({ p, score: score(p, q) }))
      .filter(({ p, score: matchScore }) => {
        const categoryMatch = filter === 'All' || p.cat === filter;
        return savedView ? categoryMatch && saved.has(p.id) : categoryMatch && (!q || matchScore > 0);
      });

    if (q && !savedView) list.sort((a, b) => b.score - a.score || Number(b.p.featured) - Number(a.p.featured));
    else if (sort === 'low') list.sort((a, b) => a.p.p - b.p.p);
    else if (sort === 'high') list.sort((a, b) => b.p.p - a.p.p);
    else if (sort === 'newest') list.sort((a, b) => new Date(b.p.created) - new Date(a.p.created));
    else list.sort((a, b) => Number(b.p.featured) - Number(a.p.featured));

    return list.map((x) => x.p);
  };

  const render = () => {
    const list = filtered();
    const count = $('#result-count');
    if (count) count.textContent = savedView
      ? `${list.length} saved product${list.length === 1 ? '' : 's'}`
      : `${list.length} product${list.length === 1 ? '' : 's'}`;

    if (!list.length) {
      grid.innerHTML = `<div class="saved-empty search-empty-state"><div class="saved-empty-icon">⌕</div><h3>${savedView ? 'Nothing saved yet' : 'No products found'}</h3><p>${savedView ? 'Tap the ♡ on any product to save it here.' : 'We couldn’t find a product matching your search.'}</p>${!savedView && query ? '<small class="search-hint">Try a different spelling, category, or product name.</small>' : ''}${savedView ? '<button class="primary-btn" id="browse-saved-products">Browse products →</button>' : ''}</div>`;
    } else {
      grid.innerHTML = list.map(card).join('');
    }

    bindGrid();
  };

  const renderEcosystem = () => {
    const root = $('#ecosystem-grid');
    if (!root) return;
    const featured = products.filter((p) => p.origin !== 'Marketplace').slice(0, 4);
    root.innerHTML = featured.map((p, i) => `
      <article class="ecosystem-card">
        <div class="card-meta"><span>${p.origin}</span><span>0${i + 1}</span></div>
        <div><div class="card-mark">${p.mark}</div><h3>${p.n}</h3><p>${p.d}</p></div>
      </article>`).join('');
  };

  const bindGrid = () => {
    grid.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => openProduct(button.dataset.view)));
    grid.querySelectorAll('[data-add]').forEach((button) => button.addEventListener('click', () => add(button.dataset.add)));
    grid.querySelectorAll('[data-save]').forEach((button) => button.addEventListener('click', (event) => {
      event.stopPropagation();
      const id = button.dataset.save;
      saved.has(id) ? saved.delete(id) : saved.add(id);
      render();
      updateSavedCount();
    }));
    $('#browse-saved-products')?.addEventListener('click', () => {
      savedView = false;
      render();
    });
  };

  const add = (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const item = cart.find((x) => x.p.id === id);
    item ? item.q++ : cart.push({ p: product, q: 1 });
    renderCart();
    $('#cart')?.classList.add('open');
  };

  const renderCart = () => {
    const box = $('#cart-items');
    if (!box) return;
    if (!cart.length) box.innerHTML = '<div class="cart-empty">Your cart is empty.<br>Find something worth owning.</div>';
    else box.innerHTML = cart.map((x, i) => `<div class="cart-row"><div><h4>${x.p.n}</h4><p>${money(x.p.p)} · ${x.q}</p><div class="cart-controls"><button data-dec="${i}">−</button><button data-inc="${i}">+</button><button data-rem="${i}">×</button></div></div><strong>${money(x.p.p * x.q)}</strong></div>`).join('');
    const total = cart.reduce((sum, x) => sum + x.p.p * x.q, 0);
    $('#cart-total') && ($('#cart-total').textContent = money(total));
    $('#cart-count') && ($('#cart-count').textContent = cart.reduce((sum, x) => sum + x.q, 0));
  };

  const updateSavedCount = () => {
    const el = $('#saved-count');
    if (el) el.textContent = saved.size;
  };

  const openProduct = async (id) => {
    let product = products.find((p) => p.id === id);
    try {
      const response = await window.OrigynAPI.get(`/api/products/${id}`);
      product = normalize(response.data || response, 0);
    } catch (error) {
      console.warn('Product detail API request failed; using listing data:', error);
    }
    if (!product) return;
    selected = product;
    $('#modal-badge').textContent = `${product.origin} · ${product.cat} · ${product.type}`;
    $('#modal-name').textContent = product.n;
    $('#modal-description').textContent = product.d;
    $('#modal-seller').textContent = product.seller;
    $('#modal-price').textContent = money(product.p);
    $('#modal-image').innerHTML = product.image ? `<img src="${product.image}" alt="${product.n}">` : `<span>${product.mark}</span>`;

    const related = products
      .filter((p) => p.id !== product.id)
      .map((p) => ({ p, score: (p.cat === product.cat ? 40 : 0) + (p.type === product.type ? 25 : 0) + (p.origin === product.origin ? 15 : 0) + p.rating }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    let rec = $('#modal-recommendations');
    if (!rec) {
      rec = document.createElement('div');
      rec.id = 'modal-recommendations';
      rec.className = 'modal-recommendations';
      $('.modal-card')?.appendChild(rec);
    }
    rec.innerHTML = `<div class="modal-recommend-head"><span>YOU MAY ALSO LIKE</span><b>Similar products</b></div><div class="modal-recommend-grid">${related.map((x) => `<button class="modal-recommend" data-related="${x.p.id}"><span>${x.p.mark}</span><strong>${x.p.n}</strong><small>${money(x.p.p)}</small></button>`).join('')}</div>`;
    rec.querySelectorAll('[data-related]').forEach((button) => button.addEventListener('click', () => openProduct(button.dataset.related)));
    $('#product-modal')?.classList.add('open');
    document.body.classList.add('modal-open');
  };

  const syncSearch = (value) => {
    query = value.trim();
    const storeSearch = $('#store-search');
    const topSearch = $('#top-search');
    if (storeSearch && storeSearch.value !== value) storeSearch.value = value;
    if (topSearch && topSearch.value !== value) topSearch.value = value;
    savedView = false;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      render();
      if (query && !searchStarted) {
        searchStarted = true;
        const target = grid.querySelector('.product-card') || grid.querySelector('.search-empty-state');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (!query) searchStarted = false;
    }, 150);
  };

  const setFilter = (value) => {
    savedView = false;
    filter = value;
    $$('.quick-filters .filter').forEach((button) => button.classList.toggle('active', button.dataset.filter === value));
    render();
  };

  // Capture-phase handlers prevent the old demo Store listeners from fighting the API-backed Store.
  document.addEventListener('click', (event) => {
    const filterButton = event.target.closest('.quick-filters .filter');
    const categoryButton = event.target.closest('[data-category]');
    const viewButton = event.target.closest('[data-view]');
    const addButton = event.target.closest('[data-add]');
    const saveButton = event.target.closest('[data-save]');
    const relatedButton = event.target.closest('[data-related]');

    if (filterButton || categoryButton || viewButton || addButton || saveButton || relatedButton) {
      event.stopPropagation();
      if (filterButton) setFilter(filterButton.dataset.filter);
      else if (categoryButton) { setFilter(categoryButton.dataset.category); $('#discover')?.scrollIntoView({ behavior: 'smooth' }); }
      else if (viewButton) openProduct(viewButton.dataset.view);
      else if (addButton) add(addButton.dataset.add);
      else if (saveButton) { const id = saveButton.dataset.save; saved.has(id) ? saved.delete(id) : saved.add(id); render(); updateSavedCount(); }
      else if (relatedButton) openProduct(relatedButton.dataset.related);
      return;
    }

    if (event.target.closest('#wishlist-open')) {
      event.stopPropagation();
      savedView = true;
      render();
      $('#discover')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (event.target.closest('#modal-add') && selected) {
      event.stopPropagation();
      add(selected.id);
      $('#product-modal')?.classList.remove('open');
      document.body.classList.remove('modal-open');
    }
  }, true);

  document.addEventListener('input', (event) => {
    if (event.target.id === 'store-search' || event.target.id === 'top-search') {
      event.stopPropagation();
      syncSearch(event.target.value);
    }
  }, true);

  document.addEventListener('change', (event) => {
    if (event.target.id === 'sort-products') {
      event.stopPropagation();
      sort = event.target.value;
      render();
    }
  }, true);

  $('#clear-search')?.addEventListener('click', (event) => {
    event.stopImmediatePropagation();
    searchStarted = false;
    syncSearch('');
  });

  $('#modal-close')?.addEventListener('click', () => {
    $('#product-modal')?.classList.remove('open');
    document.body.classList.remove('modal-open');
  });

  $('#product-modal')?.addEventListener('click', (event) => {
    if (event.target.id === 'product-modal') {
      $('#product-modal').classList.remove('open');
      document.body.classList.remove('modal-open');
    }
  });

  grid.addEventListener('click', (event) => {
    if (event.target.closest('[data-view],[data-add],[data-save]')) event.stopPropagation();
  }, true);

  loadProducts();
});
