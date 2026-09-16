const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Client } = require('pg');

let db;
const ids = {};

async function cleanup() {
  if (!db) return;
  await db.query('DELETE FROM seller_payout_items WHERE commission_ledger_id=$1', [ids.ledgerId]).catch(() => {});
  await db.query('DELETE FROM seller_payouts WHERE id=$1', [ids.payoutId]).catch(() => {});
  await db.query('DELETE FROM commission_refund_allocations WHERE commission_ledger_id=$1', [ids.ledgerId]).catch(() => {});
  await db.query('DELETE FROM refunds WHERE id=$1', [ids.refundId]).catch(() => {});
  await db.query('DELETE FROM payments WHERE id=$1', [ids.paymentId]).catch(() => {});
  await db.query('DELETE FROM commission_ledger WHERE id=$1', [ids.ledgerId]).catch(() => {});
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

test('payout allocation excludes refunded seller earnings and records recoverable balance', async () => {
  ids.sellerUserId = crypto.randomUUID();
  ids.sellerProfileId = crypto.randomUUID();
  ids.orderId = crypto.randomUUID();
  ids.productId = crypto.randomUUID();
  ids.orderItemId = crypto.randomUUID();
  ids.paymentId = crypto.randomUUID();
  ids.refundId = crypto.randomUUID();
  ids.payoutId = crypto.randomUUID();

  const category = await db.query("SELECT id FROM categories WHERE slug='technology' LIMIT 1");
  assert.equal(category.rowCount, 1);

  await db.query(`INSERT INTO users(id,email,name,role) VALUES($1,$2,$3,'seller')`, [ids.sellerUserId, `${ids.sellerUserId}@example.test`, 'Payout Seller']);
  await db.query(
    `INSERT INTO seller_profiles(id,user_id,seller_type,legal_name,display_name,country_code,principal_address,customer_care_email,verification_status,verified_at)
     VALUES($1,$2,'external','Payout Seller Legal','Payout Seller','IN','Payout Street','care@example.test','verified',NOW())`,
    [ids.sellerProfileId, ids.sellerUserId]
  );
  await db.query(
    `INSERT INTO products(id,seller_id,category_id,name,slug,description,product_type,price_paise,currency,stock,status)
     VALUES($1,$2,$3,'Payout Product',$4,'Payout test','physical',25000,'INR',10,'published')`,
    [ids.productId, ids.sellerUserId, category.rows[0].id, `payout-${ids.productId}`]
  );
  await db.query(
    `INSERT INTO orders(id,customer_id,status,total_paise,currency,payment_status,fulfilment_status)
     VALUES($1,$2,'confirmed',25000,'INR','paid','processing')`,
    [ids.orderId, ids.sellerUserId]
  );
  await db.query(
    `INSERT INTO order_items(id,order_id,product_id,seller_id,quantity,unit_price_paise,commission_rate_percent,commission_paise,seller_payout_paise)
     VALUES($1,$2,$3,$4,1,25000,10,2500,22500)`,
    [ids.orderItemId, ids.orderId, ids.productId, ids.sellerUserId]
  );

  await db.query(
    `INSERT INTO payments(id,order_id,user_id,provider,amount_paise,currency,status)
     VALUES($1,$2,$3,'payout-test',25000,'INR','captured')`,
    [ids.paymentId, ids.orderId, ids.sellerUserId]
  );

  const ledgerResult = await db.query(
    `SELECT id,status FROM commission_ledger WHERE order_item_id=$1`,
    [ids.orderItemId]
  );
  assert.equal(ledgerResult.rowCount, 1);
  assert.equal(ledgerResult.rows[0].status, 'earned');
  ids.ledgerId = ledgerResult.rows[0].id;

  await db.query(
    `INSERT INTO seller_payouts(id,seller_id,currency,amount_paise,status,requested_at)
     VALUES($1,$2,'INR',22500,'paid',NOW())`,
    [ids.payoutId, ids.sellerUserId]
  );
  await db.query(
    `UPDATE seller_payouts SET provider='test-provider',provider_payout_id=$2,paid_at=NOW() WHERE id=$1`,
    [ids.payoutId, `payout-${ids.payoutId}`]
  );
  await db.query(
    `INSERT INTO seller_payout_items(payout_id,commission_ledger_id,amount_paise) VALUES($1,$2,22500)`,
    [ids.payoutId, ids.ledgerId]
  );

  await db.query(
    `INSERT INTO refunds(id,payment_id,order_id,amount_paise,status)
     VALUES($1,$2,$3,10000,'pending')`,
    [ids.refundId, ids.paymentId, ids.orderId]
  );
  await db.query(`UPDATE refunds SET status='succeeded' WHERE id=$1`, [ids.refundId]);

  const ledger = await db.query(
    `SELECT status,refunded_paise,recoverable_paise FROM commission_ledger WHERE id=$1`,
    [ids.ledgerId]
  );
  assert.equal(ledger.rows[0].status, 'partially_refunded');
  assert.equal(ledger.rows[0].refunded_paise, '10000');
  assert.equal(ledger.rows[0].recoverable_paise, '10000');

  const payout = await db.query(`SELECT amount_paise,status,paid_at FROM seller_payouts WHERE id=$1`, [ids.payoutId]);
  assert.equal(payout.rows[0].amount_paise, '22500');
  assert.equal(payout.rows[0].status, 'paid');
  assert.ok(payout.rows[0].paid_at);

  const allocation = await db.query(`SELECT amount_paise FROM commission_refund_allocations WHERE refund_id=$1`, [ids.refundId]);
  assert.equal(allocation.rows[0].amount_paise, '10000');
});