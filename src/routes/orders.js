const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkout, getOrder, recordEvent, httpError } = require('../services/commerceService');

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

function requireUuid(value, field) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw httpError(`${field} must be a valid UUID`);
  }
  return value;
}

function parseIdempotencyKey(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw httpError(`Idempotency-Key must be a string of at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`);
  }
  return value;
}

router.use(authenticate);

router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const key = parseIdempotencyKey(req.get('Idempotency-Key'));
    const body = req.body || {};
    await client.query('BEGIN');
    const order = await checkout(client, req.user.id, body.shipping_address, key);
    await client.query('COMMIT');
    if (order.__idempotentReplay) return res.status(200).json(order);
    await recordEvent({
      userId: req.user.id,
      eventType: 'order_created',
      orderId: order.id,
      metadata: { total_paise: order.total_paise }
    });
    res.status(201).json(order);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    const key = req.get('Idempotency-Key');
    if (e && e.code === '23505' && key) {
      try {
        const existing = await client.query(
          'SELECT id,status,total_paise,currency,payment_status,fulfilment_status,created_at,updated_at FROM orders WHERE customer_id=$1 AND idempotency_key=$2 LIMIT 1',
          [req.user.id, key]
        );
        if (existing.rowCount === 1) return res.status(200).json(existing.rows[0]);
      } catch (lookupError) {
        return next(lookupError);
      }
    }
    next(e);
  } finally {
    client.release();
  }
});

router.get('/', async (req, res, next) => {
  try {
    const rawLimit = Number(req.query.limit);
    const rawOffset = Number(req.query.offset);
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.trunc(rawLimit))) : 20;
    const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.trunc(rawOffset)) : 0;
    const r = await pool.query(
      `SELECT id,status,total_paise,currency,payment_status,fulfilment_status,created_at,updated_at
       FROM orders
       WHERE customer_id=$1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({ orders: r.rows });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const orderId = requireUuid(req.params.id, 'order id');
    const client = await pool.connect();
    try {
      const order = await getOrder(client, req.user.id, orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

module.exports = router;
