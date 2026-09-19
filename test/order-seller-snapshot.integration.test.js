const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Client } = require('pg');

let db;
const ids = {};

async function cleanup() {
  if (!db) return;
  await db.query('DELETE FROM order_items WHERE order_id=$1', [ids.orderId]).catch(() => {});
  await db.query('DELETE FROM orders WHERE id=$1', [ids.orderId]).catch(() => {});
  await db.query('DELETE FROM products WHERE id=$1', [ids.productId]).catch(() => {});
  await db.query('DELETE FROM seller_profiles WHERE id=$1', [ids.sellerProfileId]).catch(() => {});
  await db.query('DELETE FROM users WHERE id=$1', [ids.sellerUserId]).catch(() => {});
}

test.before(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for integration tests');
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
});

test.after(async () => {
  await cleanup();
  if (db) await db.end();
});

test('order item captures an immutable seller snapshot', async () => {
  ids.sellerUserId = crypto.randomUUID();
  ids.sellerProfileId = crypto.randomUUID();
  ids.orderId = crypto.randomUUID();
  ids.productId = crypto.randomUUID();

  const category = await db.query("SELECT id FROM categories WHERE slug='technology' LIMIT 1");
  assert.equal(category.rowCount, 1);

  await db.query(
    `INSERT INTO users(id,email,name,role) VALUES($1,$2,$3,'seller')`,
    [ids.sellerUserId, `${ids.sellerUserId}@example.test`, 'Snapshot Seller']
  );
  await db.query(
    `INSERT INTO seller_profiles(id,user_id,seller_type,legal_name,display_name,country_code,principal_address,customer_care_email,verification_status,verified_at)
     VALUES($1,$2,'external','Snapshot Seller Legal','Snapshot Seller','IN','1 Snapshot Street','care@example.test','verified',NOW())`,
    [ids.sellerProfileId, ids.sellerUserId]
  );
  await db.query(
    `INSERT INTO products(id,seller_id,category_id,name,slug,description,product_type,price_paise,currency,stock,status)
     VALUES($1,$2,$3,'Snapshot Product',$4,'Snapshot test','physical',10000,'INR',10,'published')`,
    [ids.productId, ids.sellerUserId, category.rows[0].id, `snapshot-${ids.productId}`]
  );
  await db.query(
    `INSERT INTO orders(id,customer_id,status,total_paise,currency,payment_status,fulfilment_status)
     VALUES($1,$2,'pending',10000,'INR','pending','pending')`,
    [ids.orderId, ids.sellerUserId]
  );

  const item = await db.query(
    `INSERT INTO order_items(order_id,product_id,seller_id,quantity,unit_price_paise,commission_rate_percent,commission_paise,seller_payout_paise)
     VALUES($1,$2,$3,1,10000,10,1000,9000)
     RETURNING seller_snapshot`,
    [ids.orderId, ids.productId, ids.sellerUserId]
  );

  assert.equal(item.rowCount, 1);
  assert.equal(item.rows[0].seller_snapshot.display_name, 'Snapshot Seller');
  assert.equal(item.rows[0].seller_snapshot.legal_name, 'Snapshot Seller Legal');
  assert.equal(item.rows[0].seller_snapshot.seller_profile_id, ids.sellerProfileId);
  assert.equal(item.rows[0].seller_snapshot.seller_user_id, ids.sellerUserId);

  await db.query(
    `UPDATE seller_profiles SET display_name='Renamed Seller', principal_address='2 New Street' WHERE id=$1`,
    [ids.sellerProfileId]
  );
  const afterSellerEdit = await db.query('SELECT seller_snapshot FROM order_items WHERE order_id=$1', [ids.orderId]);
  assert.equal(afterSellerEdit.rows[0].seller_snapshot.display_name, 'Snapshot Seller');
  assert.equal(afterSellerEdit.rows[0].seller_snapshot.principal_address, '1 Snapshot Street');

  await db.query(
    `UPDATE order_items SET seller_id=$2, seller_snapshot='{"display_name":"tampered"}'::jsonb WHERE order_id=$1`,
    [ids.orderId, ids.sellerUserId]
  );
  const afterItemUpdate = await db.query('SELECT seller_id,seller_snapshot FROM order_items WHERE order_id=$1', [ids.orderId]);
  assert.equal(afterItemUpdate.rows[0].seller_id, ids.sellerUserId);
  assert.equal(afterItemUpdate.rows[0].seller_snapshot.display_name, 'Snapshot Seller');
});
