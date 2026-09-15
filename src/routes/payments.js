const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { finalizeCapturedPayment } = require('../services/commerceService');
const router = express.Router();

function parsePaise(value) {
  if (value === undefined || value === null || !/^\d+$/.test(String(value))) return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) return null;
  return n;
}

function parseProviderId(value, field) {
  if (value === undefined || value === null) return null;
  const valueString = String(value);
  if (!valueString || valueString.length > 255) {
    const error = new Error(`${field} must be at most 255 characters`);
    error.status = 400;
    throw error;
  }
  return valueString;
}

router.post('/orders/:orderId/initiate', authenticate, async (req, res, next) => {
  try {
    const provider = String(process.env.PAYMENT_PROVIDER || 'pending-provider').trim();
    if (!provider || provider.length > 100) {
      return res.status(503).json({ error: 'Payment provider is not configured' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const paymentResult = await client.query(`
        SELECT p.id, p.order_id, p.provider, p.amount_paise, p.currency, p.status,
               o.payment_status, o.customer_id
        FROM payments p
        JOIN orders o ON o.id = p.order_id
        WHERE p.order_id = $1 AND o.customer_id = $2
        FOR UPDATE OF p, o
      `, [req.params.orderId, req.user.id]);

      if (!paymentResult.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Order or payment not found' });
      }

      const payment = paymentResult.rows[0];
      if (payment.payment_status !== 'pending' || !['pending', 'authorized'].includes(payment.status)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Payment is no longer pending' });
      }

      if (payment.provider !== 'pending-provider' && payment.provider !== provider) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Payment provider cannot be changed after initialization' });
      }

      const updated = await client.query(`
        UPDATE payments
        SET provider = $1, status = 'pending', updated_at = NOW()
        WHERE id = $2
        RETURNING id, order_id, provider, amount_paise, currency, status, created_at
      `, [provider, payment.id]);

      await client.query('COMMIT');
      return res.status(201).json({ payment: updated.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

router.post('/webhooks/:provider', async (req, res, next) => {
  try {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: 'Payment webhook verification is not configured' });

    const supplied = req.get('x-origyn-webhook-secret') || '';
    const ok = supplied.length === secret.length
      && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
    if (!ok) return res.status(401).json({ error: 'Invalid webhook credentials' });

    const provider = String(req.params.provider || '').trim();
    if (!provider || provider.length > 100) return res.status(400).json({ error: 'Invalid payment provider' });

    const {
      provider_payment_id,
      status,
      order_id,
      amount_paise,
      currency,
      provider_refund_id,
      refund_amount_paise
    } = req.body;

    if (!order_id || !['authorized', 'captured', 'failed', 'cancelled', 'refunded', 'partially_refunded'].includes(status)) {
      return res.status(400).json({ error: 'Invalid payment event' });
    }

    const providerPaymentId = parseProviderId(provider_payment_id, 'provider_payment_id');
    const providerRefundId = parseProviderId(provider_refund_id, 'provider_refund_id');

    if (['captured', 'refunded', 'partially_refunded'].includes(status) && !providerPaymentId) {
      return res.status(400).json({ error: 'provider_payment_id is required for this payment event' });
    }
    if (amount_paise !== undefined && parsePaise(amount_paise) === null) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }
    if (currency !== undefined && !/^[A-Za-z]{3}$/.test(String(currency))) {
      return res.status(400).json({ error: 'Invalid payment currency' });
    }
    if (['refunded', 'partially_refunded'].includes(status) && !providerRefundId) {
      return res.status(400).json({ error: 'provider_refund_id is required for refund events' });
    }

    const refundAmount = refund_amount_paise === undefined ? null : parsePaise(refund_amount_paise);
    if (refund_amount_paise !== undefined && refundAmount === null) {
      return res.status(400).json({ error: 'Invalid refund amount' });
    }
    if (status === 'partially_refunded' && (!refundAmount || refundAmount <= 0)) {
      return res.status(400).json({ error: 'refund_amount_paise is required for partial refunds' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const paymentResult = await client.query('SELECT * FROM payments WHERE order_id = $1 FOR UPDATE', [order_id]);
      if (!paymentResult.rowCount) throw Object.assign(new Error('Payment not found'), { status: 404 });

      const stored = paymentResult.rows[0];
      if (stored.provider !== provider && stored.provider !== 'pending-provider') {
        throw Object.assign(new Error('Payment provider mismatch'), { status: 409 });
      }
      if (parsePaise(amount_paise) !== null && parsePaise(amount_paise) !== Number(stored.amount_paise)) {
        throw Object.assign(new Error('Payment amount mismatch'), { status: 409 });
      }
      if (currency !== undefined && String(currency).toUpperCase() !== String(stored.currency).toUpperCase()) {
        throw Object.assign(new Error('Payment currency mismatch'), { status: 409 });
      }
      if (providerPaymentId && stored.provider_payment_id && stored.provider_payment_id !== providerPaymentId) {
        throw Object.assign(new Error('Provider payment ID mismatch'), { status: 409 });
      }
      if (providerPaymentId) {
        const duplicate = await client.query(
          'SELECT id FROM payments WHERE provider = $1 AND provider_payment_id = $2 AND id <> $3 LIMIT 1',
          [provider, providerPaymentId, stored.id]
        );
        if (duplicate.rowCount) {
          throw Object.assign(new Error('Provider payment ID is already associated with another payment'), { status: 409 });
        }
      }

      const allowed = {
        pending: ['authorized', 'captured', 'failed', 'cancelled'],
        authorized: ['captured', 'failed', 'cancelled'],
        captured: ['refunded', 'partially_refunded'],
        partially_refunded: ['refunded'],
        failed: [],
        cancelled: [],
        refunded: []
      };
      const sameState = stored.status === status;
      if (!sameState && !allowed[stored.status]?.includes(status)) {
        throw Object.assign(new Error(`Invalid payment state transition: ${stored.status} -> ${status}`), { status: 409 });
      }

      if (['refunded', 'partially_refunded'].includes(status)) {
        const existingRefund = await client.query(
          'SELECT id, payment_id, status, amount_paise FROM refunds WHERE provider_refund_id = $1 LIMIT 1',
          [providerRefundId]
        );

        if (existingRefund.rowCount) {
          if (existingRefund.rows[0].payment_id !== stored.id) {
            throw Object.assign(new Error('Provider refund ID is already associated with another payment'), { status: 409 });
          }
        } else {
          if (stored.status === 'refunded') {
            throw Object.assign(new Error('Payment is already fully refunded'), { status: 409 });
          }

          const totals = await client.query(
            `SELECT COALESCE(SUM(amount_paise) FILTER (WHERE status IN ('pending', 'succeeded')), 0) AS refunded_paise
             FROM refunds WHERE payment_id = $1`,
            [stored.id]
          );
          const remaining = Number(stored.amount_paise) - Number(totals.rows[0].refunded_paise || 0);
          const amount = status === 'partially_refunded' ? refundAmount : remaining;
          if (!Number.isSafeInteger(amount) || amount <= 0 || amount > remaining) {
            throw Object.assign(new Error('Invalid refund amount'), { status: 409 });
          }

          // If an admin already created a pending refund for exactly this provider refund amount,
          // reconcile it instead of creating a second monetary refund record.
          const pendingMatches = await client.query(
            `SELECT id FROM refunds
             WHERE payment_id = $1 AND status = 'pending' AND amount_paise = $2
             ORDER BY created_at ASC FOR UPDATE`,
            [stored.id, amount]
          );

          if (pendingMatches.rowCount === 1) {
            await client.query(
              `UPDATE refunds
               SET status = 'succeeded', provider_refund_id = $1, provider_payload = $2::jsonb, updated_at = NOW()
               WHERE id = $3`,
              [providerRefundId, JSON.stringify(req.body), pendingMatches.rows[0].id]
            );
          } else if (pendingMatches.rowCount > 1) {
            throw Object.assign(new Error('Multiple pending refunds match this provider refund; manual reconciliation required'), { status: 409 });
          } else {
            await client.query(
              `INSERT INTO refunds(payment_id, order_id, amount_paise, status, provider_refund_id, provider_payload)
               VALUES($1, $2, $3, 'succeeded', $4, $5::jsonb)`,
              [stored.id, order_id, amount, providerRefundId, JSON.stringify(req.body)]
            );
          }
        }

        const newStatus = status === 'refunded' ? 'refunded' : 'partially_refunded';
        await client.query(
          `UPDATE payments
           SET provider = $1, provider_payment_id = COALESCE($2, provider_payment_id), status = $3,
               provider_payload = $4::jsonb, updated_at = NOW()
           WHERE id = $5`,
          [provider, providerPaymentId || null, newStatus, JSON.stringify(req.body), stored.id]
        );
        await client.query(
          `UPDATE orders
           SET payment_status = $1,
               status = CASE WHEN $1 = 'refunded' THEN 'refunded' ELSE status END,
               fulfilment_status = CASE WHEN $1 = 'refunded' THEN 'refunded' ELSE fulfilment_status END,
               updated_at = NOW()
           WHERE id = $2`,
          [newStatus, order_id]
        );
      } else if (status === 'captured') {
        await finalizeCapturedPayment(client, order_id, providerPaymentId, req.body);
      } else {
        await client.query(
          `UPDATE payments
           SET provider = $1, provider_payment_id = COALESCE($2, provider_payment_id), status = $3,
               provider_payload = $4::jsonb, updated_at = NOW()
           WHERE id = $5`,
          [provider, providerPaymentId || null, status, JSON.stringify(req.body), stored.id]
        );
        await client.query(
          `UPDATE orders
           SET payment_status = $1,
               status = CASE WHEN $1 = 'failed' AND status = 'pending' THEN 'cancelled' ELSE status END,
               updated_at = NOW()
           WHERE id = $2`,
          [status, order_id]
        );
      }

      await client.query('COMMIT');
      res.json({ ok: true });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

router.post('/orders/:orderId/refunds', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const amount = parsePaise(req.body.amount_paise);
    const reason = req.body.reason === undefined || req.body.reason === null ? null : String(req.body.reason).trim();
    if (amount === null || amount <= 0) return res.status(400).json({ error: 'amount_paise must be a positive integer' });
    if (reason && reason.length > 1000) return res.status(400).json({ error: 'reason must be at most 1000 characters' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const paymentResult = await client.query(
        `SELECT p.id, p.amount_paise, p.status,
                COALESCE((SELECT SUM(r.amount_paise) FROM refunds r
                          WHERE r.payment_id = p.id AND r.status IN ('pending', 'succeeded')), 0) AS refunded_paise
         FROM payments p
         WHERE p.order_id = $1
         FOR UPDATE`,
        [req.params.orderId]
      );
      if (!paymentResult.rowCount) throw Object.assign(new Error('Payment not found'), { status: 404 });

      const payment = paymentResult.rows[0];
      const remaining = Number(payment.amount_paise) - Number(payment.refunded_paise || 0);
      if (payment.status !== 'captured' || amount > remaining) {
        throw Object.assign(new Error('Payment is not refundable for that amount'), { status: 409 });
      }

      const refund = await client.query(
        `INSERT INTO refunds(payment_id, order_id, amount_paise, reason, status)
         VALUES($1, $2, $3, $4, 'pending') RETURNING *`,
        [payment.id, req.params.orderId, amount, reason]
      );
      await client.query('COMMIT');
      res.status(201).json(refund.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
