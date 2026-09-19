const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Client } = require('pg');

let db;
const ids = {};

async function cleanup() {
  if (!db) return;
  await db.query('DELETE FROM commission_ledger WHERE order_item_id=$1', [ids.orderItemId]).catch(() => {});
  await db.query('DELETE FROM payments WHERE order_id=$1', [ids.orderId]).catch(() => {});
  await db.query('DELETE FROM order_items WHERE id=$1', [ids.orderItemId]).catch(() => {});
  await db.query('DELETE FROM orders WHERE id=$1', [ids.orderId]).catch(() => {});
  await db.query('DELETE FROM seller_profiles WHERE id=$1', [ids.sellerProfileId]).catch(() => {});
  await db.query('DELETE FROM products WHERE id=$1', [ids.productId]).catch(() => {});
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

test('commission ledger records checkout values and becomes earned on capture', async () => {
  ids.sellerUserId = crypto.randomUUID();
  ids.sellerProfileId = crypto.randomUUID();
  ids.orderId = crypto.randomUUID();
  ids.productId = crypto.randomUUID();
  ids.orderItemId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();

  const category = await db.query("SELECT id FROM categories WHERE slug='technology' LIMIT 1");
  assert.equal(category.rowCount, 1);

  await db.query(
    `INSERT INTO users(id,email,name,role) VALUES($1,$2,$3,'seller')`,
    [ids.sellerUserId, `${ids.sellerUserId}@example.test`, 'Ledger Seller']
  );
  await db.query(
    `INSERT INTO seller_profiles(id,user_id,seller_type,legal_name,display_name,country_code,principal_address,customer_care_email,verification_status,verified_at)
     VALUES($1,$2,'external','Ledger Seller Legal','Ledger Seller','IN','Ledger Street','care@example.test','verified',NOW())`,
    [ids.sellerProfileId, ids.sellerUserId]
  );
  await db.query(
    `INSERT INTO products(id,seller_id,category_id,name,slug,description,product_type,price_paise,currency,stock,status)
     VALUES($1,$2,$3,'Ledger Product',$4,'Ledger test','physical',25000,'INR',10,'published')`,
    [ids.productId, ids.sellerUserId, category.rows[0].id, `ledger-${ids.productId}`]
  );
  await db.query(
    `INSERT INTO orders(id,customer_id,status,total_paise,currency,payment_status,fulfilment_status)
     VALUES($1,$2,'pending',25000,'INR','pending','pending')`,
    [ids.orderId, ids.sellerUserId]
  );

  await db.query(
    `INSERT INTO order_items(id,order_id,product_id,seller_id,quantity,unit_price_paise,commission_rate_percent,commission_paise,seller_payout_paise)
     VALUES($1,$2,$3,$4,1,25000,10,2500,22500)`,
    [ids.orderItemId, ids.orderId, ids.productId, ids.sellerUserId]
  );

  const pending = await db.query(
    'SELECT order_id,order_item_id,seller_id,gross_paise,commission_rate_percent,commission_paise,seller_payout_paise,status,earned_at FROM commission_ledger WHERE order_item_id=$1',
    [ids.orderItemId]
  );
  assert.equal(pending.rowCount, 1);
  assert.equal(pending.rows[0].gross_paise, '25000');
  assert.equal(pending.rows[0].commission_rate_percent, '10.00');
  assert.equal(pending.rows[0].commission_paise, '2500');
  assert.equal(pending.rows[0].seller_payout_paise, '22500');
  assert.equal(pending.rows[0].status, 'pending');
  assert.equal(pending.rows[0].earned_at, null);

  await db.query(
    `INSERT INTO payments(id,order_id,user_id,provider,amount_paise,currency,status)
     VALUES($1,$2,$3,'ledger-test',25000,'INR','pending')`,
    [paymentId, ids.orderId, ids.sellerUserId]
  );
  await db.query(`UPDATE payments SET status='captured' WHERE id=$1`, [paymentId]);

  const earned = await db.query(
    'SELECT status,earned_at,commission_paise FROM commission_ledger WHERE order_item_id=$1',
    [ids.orderItemId]
  );
  assert.equal(earned.rows[0].status, 'earned');
  assert.ok(earned.rows[0].earned_at);
  assert.equal(earned.rows[0].commission_paise, '2500');

  await db.query(`UPDATE payments SET status='captured' WHERE id=$1`, [paymentId]);
  const replay = await db.query('SELECT COUNT(*)::int AS count FROM commission_ledger WHERE order_item_id=$1', [ids.orderItemId]);
  assert.equal(replay.rows[0].count, 1);
});
