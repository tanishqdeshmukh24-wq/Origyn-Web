const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { Client } = require('pg');

const BASE_PORT = Number(process.env.TEST_PORT || 5100);
const BASE_URL = `http://127.0.0.1:${BASE_PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-long';
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'test-webhook-secret';

let child;
let db;
let token;
let userId;
let productId;
let orderId;

async function api(path, options = {}) {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const { response } = await api('/api/health');
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Backend did not become ready');
}

async function resetDatabase() {
  await db.query(`
    TRUNCATE commerce_events, refunds, payments, product_reviews, wishlist_items, cart_items,
      order_items, orders, product_inventory, product_variants, product_options,
      product_option_values, product_images, product_delivery, product_shipping,
      product_policies, products, publishers, auth_sessions, users CASCADE
  `);
}

test.before(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for integration tests');
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.PAYMENT_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.PAYMENT_PROVIDER = 'test-provider';

  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await resetDatabase();

  child = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(BASE_PORT), JWT_SECRET, PAYMENT_WEBHOOK_SECRET: WEBHOOK_SECRET, PAYMENT_PROVIDER: 'test-provider' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stderr.on('data', chunk => process.stderr.write(chunk));
  await waitForServer();
});

test.after(async () => {
  if (child && !child.killed) child.kill('SIGTERM');
  if (db) {
    try { await resetDatabase(); } finally { await db.end(); }
  }
});

test('health endpoint is database-backed', async () => {
  const { response, body } = await api('/api/health');
  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: 'ok' });
});

test('authenticated commerce flow preserves server authority', async () => {
  const email = `commerce-${crypto.randomUUID()}@example.test`;
  const register = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'Integration123', name: 'Integration User' })
  });
  assert.equal(register.response.status, 201);
  token = register.body.token;
  userId = register.body.user.id;

  const category = await db.query(`SELECT id FROM categories WHERE slug='technology' LIMIT 1`);
  assert.equal(category.rowCount, 1);

  const product = await db.query(`
    INSERT INTO products (seller_id, category_id, name, slug, description, product_type, price_paise, currency, stock, status)
    VALUES ($1,$2,'Integration Phone','integration-phone','Test product','physical',199900,'INR',5,'published')
    RETURNING id
  `, [userId, category.rows[0].id]);
  productId = product.rows[0].id;

  const add = await api('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity: 2 })
  });
  assert.equal(add.response.status, 201);
  assert.equal(add.body.items.length, 1);
  assert.equal(Number(add.body.items[0].quantity), 2);
  assert.equal(Number(add.body.items[0].unit_price_paise), 199900);

  const wishlist = await api(`/api/wishlist/${productId}`, { method: 'POST' });
  assert.equal(wishlist.response.status, 201);
  const wishlistStatus = await api(`/api/wishlist/${productId}/status`);
  assert.equal(wishlistStatus.response.status, 200);
  assert.equal(wishlistStatus.body.saved, true);

  const review = await api(`/api/products/${productId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating: 5, review_text: 'Integration review' })
  });
  assert.equal(review.response.status, 201);

  const checkout = await api('/api/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': 'integration-order-1' },
    body: JSON.stringify({ shipping_address: { name: 'Integration User', address_line1: '1 Test Street', city: 'Pune', state: 'Maharashtra', postal_code: '411001', country: 'IN' } })
  });
  assert.equal(checkout.response.status, 201);
  orderId = checkout.body.id;
  assert.equal(Number(checkout.body.total_paise), 399800);
  assert.equal(checkout.body.payment_status, 'pending');
  assert.equal(checkout.body.fulfilment_status, 'pending');

  const stockBeforePayment = await db.query('SELECT stock FROM products WHERE id=$1', [productId]);
  assert.equal(Number(stockBeforePayment.rows[0].stock), 5, 'inventory must not be consumed before payment capture');

  const repeated = await api('/api/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': 'integration-order-1' },
    body: JSON.stringify({ shipping_address: { name: 'Integration User', address_line1: '1 Test Street', city: 'Pune', state: 'Maharashtra', postal_code: '411001', country: 'IN' } })
  });
  assert.equal(repeated.response.status, 201);
  assert.equal(repeated.body.id, orderId);

  const capture = await api('/api/payments/webhooks/test-provider', {
    method: 'POST',
    headers: { 'x-origyn-webhook-secret': WEBHOOK_SECRET },
    body: JSON.stringify({ order_id: orderId, provider_payment_id: 'test-payment-1', status: 'captured' })
  });
  assert.equal(capture.response.status, 200);

  const order = await api(`/api/orders/${orderId}`);
  assert.equal(order.response.status, 200);
  assert.equal(order.body.payment_status, 'paid');
  assert.equal(order.body.status, 'confirmed');

  const stockAfterPayment = await db.query('SELECT stock FROM products WHERE id=$1', [productId]);
  assert.equal(Number(stockAfterPayment.rows[0].stock), 3, 'inventory is consumed exactly on payment capture');

  const cart = await api('/api/cart');
  assert.equal(cart.response.status, 200);
  assert.equal(cart.body.items.length, 0);

  const rating = await api(`/api/products/${productId}/reviews`);
  assert.equal(rating.response.status, 200);
  assert.equal(Number(rating.body.rating.total_count), 1);
  assert.equal(Number(rating.body.rating.average), 5);
});

test('unauthenticated commerce endpoints reject access', async () => {
  const previous = token;
  token = null;
  const cart = await api('/api/cart');
  assert.equal(cart.response.status, 401);
  const orders = await api('/api/orders');
  assert.equal(orders.response.status, 401);
  token = previous;
});
