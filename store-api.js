/* Origyn Store API integration.
 * Keeps the existing Store presentation but replaces demo product data with
 * published products from the common backend. Cart/wishlist/checkout remain
 * local until their dedicated integration phases.
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
    desc: p.description || 'A product available on the Origyn marketplace.',
    featured: 0,
    rating: 0,
    reviews: 0,
    images: Array.isArray(p.images) ? p.images : [],
    variants: Array.isArray(p.variants) ? p.variants : [],
    stock: p.stock,
    raw: p,
    index
  });

  function score(p, q) {
    if (!q) return 0;
    const fields = [p.n, p.cat, p.type, p.seller, p.desc].map(v => String(v || '').toLowerCase());
    let x = 0;
    if (fields[0] === q) x += 100;
    if (fields[0].startsWith(q)) x += 70;
    if (fields[0].includes(q)) x += 45;
    if (fields[1] === q) x += 35;
    if (fields[2].includes(q)) x += 25;
    if (fields[3].includes(q)) x += 18;
    if (fields[4].includes(q)) x += 10;
    return x;
  }

  function matches(p) {
    return (filter === 'All' || p.cat === filter) && (!query || score(p, query) > 0);
  }

  function ratingMarkup(p) {
    if (!p.reviews) return '<div class="product-rating"><small>No ratings yet</small></div>';
    return `<div class="product-rating" aria-label="${p.rating} out of 5 stars"><span>★★★★★</span><b>${p.rating}</b><small>(${p.reviews})</small></div>`;
  }

  function imageStyle(p) {
    const image = p.images.find(x => x && x.url)?.url;
    return image ? ` style="background-image:url('${String(image).replace(/'/g, '%27')}');background-size:cover;background-position:center"` : '';
  }

  function card(p, i) {
    const unavailable = p.stock !== null && p.stock !== undefined && Number(p.stock) <= 0;
    return `<article class="product-card"><div class="product-visual"${imageStyle(p)}><span class="product-badge">${p.type}</span><button class="product-save" data-api-save="${i}" aria-label="Save product">♡</button>${!p.images.length ? `<span class="product-mark">${p.mark}</span>` : ''}</div><div class="product-body"><span class="product-origin">${p.origin} · ${p.cat}</span><h3>${escapeHtml(p.n)}</h3>${ratingMarkup(p)}<p>${escapeHtml(p.desc)}</p><div class="product-foot"><strong class="product-price">${money(p.p, p.raw.currency)}</strong><div class="product-actions"><button class="mini-btn" data-api-view="${i}">View</button><button class="mini-btn dark" data-api-add="${i}" ${unavailable ? 'disabled' : ''}>${unavailable ? 'Unavailable' : 'Add'}</button></div></div></div></article>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function render() {
    let list = products.map((p, i) => ({ p, i, matchScore: score(p, query) })).filter(x => matches(x.p));
    if (query) list.sort((a, b) => b.matchScore - a.matchScore);
    else if (sort === 'low') list.sort((a, b) => a.p.p - b.p.p);
    else if (sort === 'high') list.sort((a, b) => b.p.p - a.p.p);
    else if (sort === 'newest') list.sort((a, b) => new Date(b.p.raw.created_at || 0) - new Date(a.p.raw.created_at || 0));
    else list.sort((a, b) => new Date(b.p.raw.created_at || 0) - new Date(a.p.raw.created_at || 0));

    if (!list.length) {
      grid.innerHTML = `<div class="saved-empty search-empty-state"><div class="saved-empty-icon">⌕</div><h3>No products found</h3><p>We couldn’t find a published product matching your search.</p><small class="search-hint">Try a different spelling, category, or product name.</small></div>`;
    } else {
      grid.innerHTML = list.map(x => card(x.p, x.i)).join('');
    }
    const count = $('#result-count');
    if (count) count.textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
  }

  function renderEcosystem() {
    const root = $('#ecosystem-grid');
    if (!root) return;
    const ecosystem = products.filter(p => p.origin !== 'Marketplace').slice(0, 4);
    root.innerHTML = ecosystem.map((p, i) => `<article class="ecosystem-card"><div class="card-meta"><span>${p.origin}</span><span>0${i + 1}</span></div><div><div class="card-mark">${p.mark}</div><h3>${escapeHtml(p.n)}</h3>${ratingMarkup(p)}<p>${escapeHtml(p.desc)}</p></div></article>`).join('');
  }

  function openProduct(i) {
    selected = products[i];
    if (!selected) return;
    const modal = $('#product-modal');
    if (!modal) return;
    $('#modal-badge').textContent = `${selected.origin} · ${selected.cat} · ${selected.type}`;
    $('#modal-name').textContent = selected.n;
    $('#modal-description').textContent = selected.desc;
    $('#modal-seller').textContent = selected.seller;
    $('#modal-price').textContent = money(selected.p, selected.raw.currency);
    const image = selected.images.find(x => x && x.url)?.url;
    const imageBox = $('#modal-image');
    if (image) {
      imageBox.textContent = '';
      imageBox.style.backgroundImage = `url('${String(image).replace(/'/g, '%27')}')`;
      imageBox.style.backgroundSize = 'cover';
      imageBox.style.backgroundPosition = 'center';
    } else {
      imageBox.style.backgroundImage = '';
      imageBox.textContent = selected.mark;
    }
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  }

  function renderCart() {
    const box = $('#cart-items');
    if (!box) return;
    if (!cart.length) box.innerHTML = '<div class="cart-empty">Your cart is empty.<br>Find something worth owning.</div>';
    else box.innerHTML = cart.map((x, i) => `<div class="cart-row"><div><h4>${escapeHtml(x.p.n)}</h4><p>${money(x.p.p, x.p.raw.currency)} · ${x.q}</p><div class="cart-controls"><button data-api-dec="${i}">−</button><button data-api-inc="${i}">+</button><button data-api-rem="${i}">×</button></div></div><strong>${money(x.p.p * x.q, x.p.raw.currency)}</strong></div>`).join('');
    const total = cart.reduce((sum, x) => sum + x.p.p * x.q, 0);
    if ($('#cart-total')) $('#cart-total').textContent = money(total);
    if ($('#cart-count')) $('#cart-count').textContent = cart.reduce((sum, x) => sum + x.q, 0);
  }

  function add(i) {
    const p = products[i];
    if (!p) return;
    const item = cart.find(x => x.p.id === p.id);
    if (item) item.q += 1;
    else cart.push({ p, q: 1 });
    renderCart();
    $('#cart')?.classList.add('open');
  }

  async function loadProducts() {
    grid.innerHTML = '<div class="saved-empty search-empty-state"><div class="saved-empty-icon">◌</div><h3>Loading Origyn products…</h3><p>Fetching published products from the marketplace.</p></div>';
    try {
      const result = await window.OrigynAPI.get('/products?limit=100');
      products = Array.isArray(result?.data) ? result.data.map(normalize) : [];
      render();
      renderEcosystem();
    } catch (error) {
      grid.innerHTML = `<div class="saved-empty search-empty-state"><div class="saved-empty-icon">!</div><h3>Store unavailable</h3><p>${escapeHtml(error.message || 'Unable to load products.')}</p><small class="search-hint">Check that the Origyn backend is running and try again.</small></div>`;
    }
  }

  function setFilter(value) {
    filter = value;
    document.querySelectorAll('.filter').forEach(button => button.classList.toggle('active', button.dataset.filter === value));
    render();
  }

  function setSearch(value) {
    query = String(value || '').trim().toLowerCase();
    const top = $('#top-search');
    const store = $('#store-search');
    if (top && top.value !== value) top.value = value;
    if (store && store.value !== value) store.value = value;
    render();
  }

  document.addEventListener('click', event => {
    const filterButton = event.target.closest('.filter, [data-category]');
    if (filterButton) {
      event.preventDefault();
      event.stopPropagation();
      const value = filterButton.dataset.filter || filterButton.dataset.category;
      if (value) setFilter(value);
      document.querySelector('#discover')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const view = event.target.closest('[data-api-view]');
    const addButton = event.target.closest('[data-api-add]');
    const save = event.target.closest('[data-api-save]');
    if (view) { event.preventDefault(); event.stopPropagation(); openProduct(Number(view.dataset.apiView)); return; }
    if (addButton) { event.preventDefault(); event.stopPropagation(); add(Number(addButton.dataset.apiAdd)); return; }
    if (save) {
      event.preventDefault(); event.stopPropagation();
      const i = Number(save.dataset.apiSave);
      const id = products[i]?.id;
      if (id) saved.has(id) ? saved.delete(id) : saved.add(id);
      save.textContent = saved.has(id) ? '♥' : '♡';
      save.classList.toggle('saved', saved.has(id));
      return;
    }
    const inc = event.target.closest('[data-api-inc]');
    const dec = event.target.closest('[data-api-dec]');
    const rem = event.target.closest('[data-api-rem]');
    if (inc || dec || rem) {
      event.preventDefault(); event.stopPropagation();
      const i = Number((inc || dec || rem).dataset.apiInc ?? (inc || dec || rem).dataset.apiDec ?? (inc || dec || rem).dataset.apiRem);
      if (inc) cart[i].q += 1;
      if (dec) { cart[i].q -= 1; if (cart[i].q < 1) cart.splice(i, 1); }
      if (rem) cart.splice(i, 1);
      renderCart();
    }
  }, true);

  document.addEventListener('input', event => {
    if (event.target.id !== 'top-search' && event.target.id !== 'store-search') return;
    event.stopPropagation();
    clearTimeout(searchTimer);
    const value = event.target.value;
    searchTimer = setTimeout(() => setSearch(value), 200);
  }, true);

  document.addEventListener('change', event => {
    if (event.target.id !== 'sort-products') return;
    event.stopPropagation();
    sort = event.target.value;
    render();
  }, true);

  $('#clear-search')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    setSearch('');
  }, true);

  $('#wishlist-open')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    alert('Wishlist API integration is the next Store phase.');
  }, true);

  $('#modal-close')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    $('#product-modal')?.classList.remove('open');
    document.body.classList.remove('modal-open');
  }, true);

  $('#modal-add')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (selected) add(products.findIndex(p => p.id === selected.id));
    $('#product-modal')?.classList.remove('open');
    document.body.classList.remove('modal-open');
  }, true);

  $('#cart-open')?.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation(); $('#cart')?.classList.add('open'); renderCart();
  }, true);
  $('#cart-close')?.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation(); $('#cart')?.classList.remove('open');
  }, true);

  loadProducts();
});
