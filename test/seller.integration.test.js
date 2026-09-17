const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const { Client } = require('pg');
const app = require('../server');
const pool = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-long';

let server;
let db;
let BASE_URL;

async function api(token, path, options = {}) {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

async function register(name) {
  const localPart = String(name || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user';
  return api(null, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `${localPart}-${crypto.randomUUID()}@example.test`,
      password: 'Integration123',
      name,
    }),
  });
}

test.before(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for seller integration tests');
  process.env.JWT_SECRET = JWT_SECRET;
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  BASE_URL = `http://127.0.0.1:${server.address().port}`;

  const health = await api(null, '/api/health');
  assert.equal(health.response.status, 200, JSON.stringify(health.body));
});

test.after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (db) await db.end();
  await pool.end();
});

test('seller onboarding creates a pending external seller profile and returns private tax identifiers only on the owner endpoint', async () => {
  const registration = await register('Seller Onboarding');
  assert.equal(registration.response.status, 201, JSON.stringify(registration.body));
  const token = registration.body.token;

  const create = await api(token, '/api/seller', {
    method: 'POST',
    body: JSON.stringify({
      seller_type: 'external',
      legal_name: 'Example Seller Pvt Ltd',
      display_name: 'Example Seller',
      country_code: 'IN',
      principal_address: '1 Test Street, Pune, Maharashtra',
      customer_care_email: 'support@example.test',
      grievance_officer_name: 'Grievance Officer',
      grievance_officer_email: 'grievance@example.test',
      gstin: '27ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
    }),
  });

  assert.equal(create.response.status, 201, JSON.stringify(create.body));
  assert.equal(create.body.seller.seller_type, 'external');
  assert.equal(create.body.seller.verification_status, 'pending');
  assert.equal(create.body.seller.active, true);
  assert.equal(create.body.seller.gstin, '27ABCDE1234F1Z5');
  assert.equal(create.body.seller.pan, 'ABCDE1234F');

  const duplicate = await api(token, '/api/seller', {
    method: 'POST',
    body: JSON.stringify({ legal_name: 'Duplicate', display_name: 'Duplicate', country_code: 'IN' }),
  });
  assert.equal(duplicate.response.status, 409);

  const own = await api(token, '/api/seller');
  assert.equal(own.response.status, 200);
  assert.equal(own.body.seller.display_name, 'Example Seller');
  assert.equal(own.body.seller.gstin, '27ABCDE1234F1Z5');
  assert.equal(own.body.seller.pan, 'ABCDE1234F');
});

test('seller onboarding rejects invalid country codes and non-admin Origyn seller creation', async () => {
  const registration = await register('External Seller');
  assert.equal(registration.response.status, 201, JSON.stringify(registration.body));
  const token = registration.body.token;

  const invalidCountry = await api(token, '/api/seller', {
    method: 'POST',
    body: JSON.stringify({ legal_name: 'Invalid Seller', display_name: 'Invalid Seller', country_code: 'IND' }),
  });
  assert.equal(invalidCountry.response.status, 400);

  const origyn = await api(token, '/api/seller', {
    method: 'POST',
    body: JSON.stringify({ seller_type: 'origyn', legal_name: 'Origyn', display_name: 'Origyn', country_code: 'IN' }),
  });
  assert.equal(origyn.response.status, 403);
});

test('admin verification changes seller state and verified sellers cannot self-edit', async () => {
  const sellerRegistration = await register('Verification Seller');
  assert.equal(sellerRegistration.response.status, 201, JSON.stringify(sellerRegistration.body));
  const sellerToken = sellerRegistration.body.token;

  const create = await api(sellerToken, '/api/seller', {
    method: 'POST',
    body: JSON.stringify({ legal_name: 'Verification Seller Pvt Ltd', display_name: 'Verification Seller', country_code: 'IN' }),
  });
  assert.equal(create.response.status, 201, JSON.stringify(create.body));
  const sellerId = create.body.seller.id;

  const adminRegistration = await register('Seller Admin');
  assert.equal(adminRegistration.response.status, 201, JSON.stringify(adminRegistration.body));
  const adminId = adminRegistration.body.user.id;
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [adminId]);
  const adminToken = adminRegistration.body.token;

  const verified = await api(adminToken, `/api/seller/${sellerId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ verification_status: 'verified' }),
  });
  assert.equal(verified.response.status, 200);
  assert.equal(verified.body.seller.verification_status, 'verified');
  assert.ok(verified.body.seller.verified_at);

  const selfEdit = await api(sellerToken, '/api/seller', {
    method: 'PATCH',
    body: JSON.stringify({ display_name: 'Changed After Verification' }),
  });
  assert.equal(selfEdit.response.status, 409);

  const rejected = await api(adminToken, `/api/seller/${sellerId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ verification_status: 'rejected' }),
  });
  assert.equal(rejected.response.status, 200);
  assert.equal(rejected.body.seller.verification_status, 'rejected');
  assert.equal(rejected.body.seller.verified_at, null);
});

test('current seller agreement must be accepted before a seller can publish, and a new version requires re-acceptance', async () => {
  const registration = await register('Agreement Seller');
  assert.equal(registration.response.status, 201, JSON.stringify(registration.body));
  const token = registration.body.token;
  const userId = registration.body.user.id;

  await db.query("UPDATE users SET role='seller' WHERE id=$1", [userId]);
  const seller = await db.query(
    `INSERT INTO seller_profiles (user_id, seller_type, legal_name, display_name, country_code, verification_status, verified_at, active)
     VALUES ($1,'external','Agreement Seller Pvt Ltd','Agreement Seller','IN','verified',NOW(),TRUE)
     RETURNING id`,
    [userId]
  );
  const sellerId = seller.rows[0].id;

  await db.query(`UPDATE seller_agreement_versions SET active=false WHERE agreement_key='seller_marketplace_terms' AND active=true`);

  const adminRegistration = await register('Agreement Admin');
  assert.equal(adminRegistration.response.status, 201, JSON.stringify(adminRegistration.body));
  const adminId = adminRegistration.body.user.id;
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [adminId]);
  const adminToken = adminRegistration.body.token;

  const agreementV1 = await api(adminToken, '/api/seller-agreements/versions', {
    method: 'POST',
    body: JSON.stringify({
      version: `test-${crypto.randomUUID()}`,
      title: 'Seller Terms v1',
      content: 'Approved test terms v1',
    }),
  });
  assert.equal(agreementV1.response.status, 201, JSON.stringify(agreementV1.body));

  const category = await db.query(
    `INSERT INTO categories (name, slug) VALUES ($1,$2) RETURNING id`,
    [`Agreement Category ${crypto.randomUUID()}`, `agreement-${crypto.randomUUID()}`]
  );
  const product = await db.query(
    `INSERT INTO products (seller_id, category_id, name, slug, description, product_type, price_paise, currency, status)
     VALUES ($1,$2,$3,$4,'A publish-gate test product','digital',1000,'INR','draft')
     RETURNING id`,
    [userId, category.rows[0].id, `Agreement Product ${crypto.randomUUID()}`, `agreement-product-${crypto.randomUUID()}`]
  );
  const productId = product.rows[0].id;

  const blocked = await api(token, `/api/products/${productId}/publish`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  assert.equal(blocked.response.status, 403);
  assert.equal(blocked.body.code, 'SELLER_AGREEMENT_REQUIRED');

  const accepted = await api(token, '/api/seller-agreements/accept', {
    method: 'POST',
    body: JSON.stringify({ agreement_version_id: agreementV1.body.agreement.id }),
  });
  assert.equal(accepted.response.status, 201);
  assert.equal(accepted.body.accepted, true);

  await db.query(
    `INSERT INTO product_delivery (product_id, method) VALUES ($1,'download')`,
    [productId]
  );
  await db.query(
    `INSERT INTO product_policies (product_id, seller_rights_confirmed) VALUES ($1,TRUE)`,
    [productId]
  );

  const published = await api(token, `/api/products/${productId}/publish`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  assert.equal(published.response.status, 200);
  assert.equal(published.body.status, 'published');

  const agreementV2 = await api(adminToken, '/api/seller-agreements/versions', {
    method: 'POST',
    body: JSON.stringify({
      version: `test-${crypto.randomUUID()}`,
      title: 'Seller Terms v2',
      content: 'Approved test terms v2',
    }),
  });
  assert.equal(agreementV2.response.status, 201, JSON.stringify(agreementV2.body));

  const current = await api(null, '/api/seller-agreements/current');
  assert.equal(current.response.status, 200, JSON.stringify(current.body));
  assert.equal(current.body.agreement.id, agreementV2.body.agreement.id, JSON.stringify(current.body));

  const status = await api(token, '/api/seller-agreements/status');
  assert.equal(status.response.status, 200, JSON.stringify(status.body));
  assert.equal(status.body.agreement.accepted, false);
  assert.equal(status.body.agreement.id, agreementV2.body.agreement.id);

  const blockedAfterVersion = await api(token, `/api/products/${productId}/publish`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  assert.equal(blockedAfterVersion.response.status, 403);
  assert.equal(blockedAfterVersion.body.code, 'SELLER_AGREEMENT_REQUIRED');

  assert.ok(sellerId);
});
