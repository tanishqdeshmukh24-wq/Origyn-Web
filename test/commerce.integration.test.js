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

async function apiAs(accessToken, path, options = {}) {
  const previous = token;
  token = accessToken;
  try { return await api(path, options); } finally { token = previous; }
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
    TRUNCATE commerce_inventory_reservations, commerce_events, refunds, payments, product_reviews, wishlist_items, cart_items,
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
  const reservation = await db.query("SELECT quantity,status FROM commerce_inventory_reservations WHERE order_id=$1", [orderId]);
  assert.equal(reservation.rowCount, 1);
  assert.equal(Number(reservation.rows[0].quantity), 2);
  assert.equal(reservation.rows[0].status, 'active');

  const repeated = await api('/api/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': 'integration-order-1' },
    body: JSON.stringify({ shipping_address: { name: 'Integration User', address_line1: '1 Test Street', city: 'Pune', state: 'Maharashtra', postal_code: '411001', country: 'IN' } })
  });
  assert.equal(repeated.response.status, 200);
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
  const consumed = await db.query("SELECT status FROM commerce_inventory_reservations WHERE order_id=$1", [orderId]);
  assert.equal(consumed.rows[0].status, 'consumed');

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

test('concurrent checkout requests with the same idempotency key return one order', async () => {
  const add = await api('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity: 1 })
  });
  assert.equal(add.response.status, 201);

  const body = JSON.stringify({ shipping_address: { name: 'Integration User', address_line1: '1 Test Street', city: 'Pune', state: 'Maharashtra', postal_code: '411001', country: 'IN' } });
  const headers = { 'Idempotency-Key': 'concurrent-order-1' };
  const [first, second] = await Promise.all([
    api('/api/orders', { method: 'POST', headers, body }),
    api('/api/orders', { method: 'POST', headers, body })
  ]);
  assert.equal(first.response.status, 201);
  assert.equal(second.response.status, 200);
  assert.equal(first.body.id, second.body.id);

  const count = await db.query('SELECT COUNT(*)::int AS count FROM orders WHERE customer_id=$1 AND idempotency_key=$2', [userId, 'concurrent-order-1']);
  assert.equal(count.rows[0].count, 1);
});

test('inventory reservations prevent concurrent users from overselling limited stock', async () => {
  const category = await db.query(`SELECT id FROM categories WHERE slug='technology' LIMIT 1`);
  const product = await db.query(`
    INSERT INTO products (seller_id, category_id, name, slug, description, product_type, price_paise, currency, stock, status)
    VALUES ($1,$2,'Reserved Device','reserved-device','Reservation test','physical',10000,'INR',1,'published')
    RETURNING id
  `, [userId, category.rows[0].id]);
  const reservedProductId = product.rows[0].id;

  const other = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: `other-${crypto.randomUUID()}@example.test`, password: 'Integration123', name: 'Other User' })
  });
  assert.equal(other.response.status, 201);
  const otherToken = other.body.token;

  const addFirst = await api('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: reservedProductId, quantity: 1 })
  });
  assert.equal(addFirst.response.status, 201);
  const addSecond = await apiAs(otherToken, '/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: reservedProductId, quantity: 1 })
  });
  assert.equal(addSecond.response.status, 201);

  const address = { name: 'Integration User', address_line1: '1 Test Street', city: 'Pune', state: 'Maharashtra', postal_code: '411001', country: 'IN' };
  const [first, second] = await Promise.all([
    api('/api/orders', { method: 'POST', headers: { 'Idempotency-Key': 'reserve-user-1' }, body: JSON.stringify({ shipping_address: address }) }),
    apiAs(otherToken, '/api/orders', { method: 'POST', headers: { 'Idempotency-Key': 'reserve-user-2' }, body: JSON.stringify({ shipping_address: address }) })
  ]);
  const statuses = [first.response.status, second.response.status].sort((a,b) => a-b);
  assert.deepEqual(statuses, [201, 409]);

  const reservations = await db.query("SELECT COUNT(*)::int AS count FROM commerce_inventory_reservations WHERE product_id=$1 AND status='active'", [reservedProductId]);
  assert.equal(reservations.rows[0].count, 1);
});

test('security boundaries reject invalid webhook credentials and cross-user order access', async () => {
  const badWebhook = await api(`/api/payments/webhooks/test-provider`, {
    method: 'POST',
    headers: { 'x-origyn-webhook-secret': 'wrong-secret' },
    body: JSON.stringify({ order_id: orderId, provider_payment_id: 'invalid-test-payment', status: 'captured' })
  });
  assert.equal(badWebhook.response.status, 401);

  const primaryToken = token;
  const register = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: `third-${crypto.randomUUID()}@example.test`, password: 'Integration123', name: 'Third User' })
  });
  assert.equal(register.response.status, 201);
  token = register.body.token;
  const forbiddenOrder = await api(`/api/orders/${orderId}`);
  assert.equal(forbiddenOrder.response.status, 404);
  token = primaryToken;
});

test('invalid order and payment identifiers are rejected cleanly', async () => {
  const order = await api('/api/orders/not-a-uuid');
  assert.equal(order.response.status, 400);
  const initiate = await api('/api/payments/orders/not-a-uuid/initiate', { method: 'POST' });
  assert.equal(initiate.response.status, 400);
  const refund = await api('/api/payments/orders/not-a-uuid/refunds', {
    method: 'POST',
    body: JSON.stringify({ amount_paise: 1000 })
  });
  assert.equal(refund.response.status, 403);
});

test('customer cannot access admin refund endpoint', async () => {
  const response = await api(`/api/payments/orders/${orderId}/refunds`, {
    method: 'POST',
    body: JSON.stringify({ amount_paise: 1000, reason: 'test' })
  });
  assert.equal(response.response.status, 403);
});

test('commerce events reject oversized metadata', async () => {
  const metadata = { payload: 'x'.repeat(17 * 1024) };
  const response = await api('/api/commerce-events', {
    method: 'POST',
    body: JSON.stringify({ event_type: 'product_viewed', product_id: productId, metadata })
  });
  assert.equal(response.response.status, 413);
});
