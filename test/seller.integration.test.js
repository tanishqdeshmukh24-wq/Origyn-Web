const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { Client } = require('pg');

const PORT = Number(process.env.SELLER_TEST_PORT || 5201);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-long';

let child;
let db;

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
  return api(null, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `${name}-${crypto.randomUUID()}@example.test`,
      password: 'Integration123',
      name,
    }),
  });
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const { response } = await api(null, '/api/health');
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Backend did not become ready');
}

test.before(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for seller integration tests');
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  child = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(PORT), JWT_SECRET },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', chunk => process.stderr.write(chunk));
  await waitForServer();
});

test.after(async () => {
  if (child && !child.killed) child.kill('SIGTERM');
  if (db) await db.end();
});

test('seller onboarding creates a pending external seller profile and returns private tax identifiers only on the owner endpoint', async () => {
  const registration = await register('Seller Onboarding');
  assert.equal(registration.response.status, 201);
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

  assert.equal(create.response.status, 201);
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
  assert.equal(registration.response.status, 201);
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
  assert.equal(sellerRegistration.response.status, 201);
  const sellerToken = sellerRegistration.body.token;

  const create = await api(sellerToken, '/api/seller', {
    method: 'POST',
    body: JSON.stringify({ legal_name: 'Verification Seller Pvt Ltd', display_name: 'Verification Seller', country_code: 'IN' }),
  });
  assert.equal(create.response.status, 201);
  const sellerId = create.body.seller.id;

  const adminRegistration = await register('Seller Admin');
  assert.equal(adminRegistration.response.status, 201);
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
