const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { finalizeCapturedPayment, releaseOrderReservations, httpError } = require('../services/commerceService');
const razorpay = require('../services/razorpayProvider');
const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PROVIDER_LENGTH = 100;

function requireUuid(value, field) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) throw httpError(`${field} must be a valid UUID`);
  return value;
}

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

function configuredProvider() {
  const provider = String(process.env.PAYMENT_PROVIDER || '').trim();
  if (!provider || provider.length > MAX_PROVIDER_LENGTH) return null;
  return provider;
}


router.post('/orders/:orderId/verify', authenticate, async (req, res, next) => {
  try {
    if (configuredProvider() !== 'razorpay') return res.status(409).json({ error: 'Razorpay provider is not active' });
    const orderId = requireUuid(req.params.orderId, 'order id');
    const { razorpay_order_id: providerOrderId, razorpay_payment_id: providerPaymentId, razorpay_signature: signature } = req.body || {};
    if (!providerOrderId || !providerPaymentId || !signature) {
      return res.status(400).json({ error: 'Razorpay payment verification fields are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`
        SELECT p.*, o.payment_status, o.status AS order_status, o.customer_id
        FROM payments p
        JOIN orders o ON o.id = p.order_id
        WHERE p.order_id = $1 AND o.customer_id = $2
        FOR UPDATE OF p, o
      `, [orderId, req.user.id]);
      if (!result.rowCount) throw Object.assign(new Error('Order or payment not found'), { status: 404 });
      const payment = result.rows[0];
      const providerPayload = payment.provider_payload || {};
      if (payment.provider !== 'razorpay' || providerPayload.razorpay_order_id !== providerOrderId) {
        throw Object.assign(new Error('Razorpay order mismatch'), { status: 409 });
      }
      if (!razorpay.verifyPaymentSignature({ orderId: providerOrderId, paymentId: providerPaymentId, signature })) {
        throw Object.assign(new Error('Invalid Razorpay payment signature'), { status: 401 });
      }

      const remote = await razorpay.fetchPayment(providerPaymentId);
      if (!remote || remote.order_id !== providerOrderId ||
          Number(remote.amount) !== Number(payment.amount_paise) ||
          String(remote.currency).toUpperCase() !== String(payment.currency).toUpperCase()) {
        throw Object.assign(new Error('Razorpay payment details do not match the Origyn payment'), { status: 409 });
      }

      if (remote.status === 'captured') {
        await finalizeCapturedPayment(client, orderId, providerPaymentId, remote);
      } else if (remote.status === 'authorized') {
        await client.query(`
          UPDATE payments
          SET provider_payment_id = $1, status = 'authorized', provider_payload = COALESCE(provider_payload, '{}'::jsonb) || $2::jsonb, updated_at = NOW()
          WHERE id = $3
        `, [providerPaymentId, JSON.stringify(remote), payment.id]);
        await client.query(`
          UPDATE orders SET payment_status='authorized', updated_at=NOW() WHERE id=$1
        `, [orderId]);
      } else if (remote.status === 'failed') {
        await client.query(`
          UPDATE payments
          SET provider_payment_id = $1, status = 'failed', provider_payload = $2::jsonb, updated_at = NOW()
          WHERE id = $3
        `, [providerPaymentId, JSON.stringify(remote), payment.id]);
        await client.query(`
          UPDATE orders SET payment_status='failed', status='cancelled', fulfilment_status='cancelled', updated_at=NOW() WHERE id=$1
        `, [orderId]);
        await releaseOrderReservations(client, orderId, 'released');
      } else {
        throw Object.assign(new Error(`Unsupported Razorpay payment status: ${remote.status || 'unknown'}`), { status: 409 });
      }

      await client.query('COMMIT');
      return res.json({ ok: true, provider_payment_id: providerPaymentId });
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

router.post('/orders/:orderId/initiate', authenticate, async (req, res, next) => {
  try {
    const orderId = requireUuid(req.params.orderId, 'order id');
    const provider = configuredProvider();
    if (!provider) return res.status(503).json({ error: 'Payment provider is not configured' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const paymentResult = await client.query(`
        SELECT p.id, p.order_id, p.provider, p.amount_paise, p.currency, p.status,
               o.payment_status, o.status AS order_status, o.customer_id
        FROM payments p
        JOIN orders o ON o.id = p.order_id
        WHERE p.order_id = $1 AND o.customer_id = $2
        FOR UPDATE OF p, o
      `, [orderId, req.user.id]);

      if (!paymentResult.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Order or payment not found' });
      }

      const payment = paymentResult.rows[0];
      if (payment.payment_status !== 'pending' || payment.order_status !== 'pending' || !['pending', 'authorized'].includes(payment.status)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Payment is no longer pending' });
      }

      if (payment.provider !== 'pending-provider' && payment.provider !== provider) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Payment provider cannot be changed after initialization' });
      }

      const reservationResult = await client.query(
        `SELECT COUNT(*)::int AS expired_count
         FROM commerce_inventory_reservations
         WHERE order_id=$1 AND status='active' AND expires_at <= NOW()`,
        [orderId]
      );
      if (Number(reservationResult.rows[0].expired_count) > 0) {
        await releaseOrderReservations(client, orderId, 'expired');
        await client.query('COMMIT');
        return res.status(409).json({ error: 'Inventory reservation has expired; please create a new checkout' });
      }

      let providerPayload = null;
      let checkout = null;
      if (provider === 'razorpay') {
        const existingPayload = payment.provider_payload || {};
        let providerOrder = existingPayload.razorpay_order_id ? { id: existingPayload.razorpay_order_id } : null;
        if (!providerOrder) {
          providerOrder = await razorpay.createOrder({
            amountPaise: Number(payment.amount_paise),
            currency: String(payment.currency).toUpperCase(),
            receipt: `origyn-${payment.order_id}`,
            notes: { origyn_order_id: payment.order_id }
          });
        }
        providerPayload = { ...existingPayload, razorpay_order_id: providerOrder.id };
        checkout = {
          provider: 'razorpay',
          key_id: String(process.env.RAZORPAY_KEY_ID || '').trim(),
          razorpay_order_id: providerOrder.id,
          amount_paise: Number(payment.amount_paise),
          currency: String(payment.currency).toUpperCase()
        };
      }

      const updated = await client.query(`
        UPDATE payments
        SET provider = $1, status = 'pending',
            provider_payload = CASE WHEN $2::jsonb IS NULL THEN provider_payload ELSE $2::jsonb END,
            updated_at = NOW()
        WHERE id = $3
        RETURNING id, order_id, provider, amount_paise, currency, status, created_at
      `, [provider, providerPayload ? JSON.stringify(providerPayload) : null, payment.id]);

      await client.query('COMMIT');
      return res.status(201).json({ payment: updated.rows[0], checkout });
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

router.post('/webhooks/razorpay', async (req, res, next) => {
  try {
    if (configuredProvider() !== 'razorpay') return res.status(409).json({ error: 'Razorpay provider is not active' });
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: 'Razorpay webhook verification is not configured' });
    const signature = req.get('x-razorpay-signature') || '';
    if (!razorpay.verifyWebhookSignature(req.rawBody, signature, secret)) {
      return res.status(401).json({ error: 'Invalid Razorpay webhook signature' });
    }

    const event = razorpay.eventToPayment(req.body);
    if (!event) return res.status(400).json({ error: 'Unsupported or malformed Razorpay webhook' });
    const eventId = String(req.get('x-razorpay-event-id') || '').trim();
    if (eventId.length > 255) return res.status(400).json({ error: 'Invalid Razorpay event ID' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const paymentResult = await client.query(`
        SELECT p.*, o.id AS internal_order_id
        FROM payments p
        JOIN orders o ON o.id = p.order_id
        WHERE p.provider = 'razorpay'
          AND p.provider_payload->>'razorpay_order_id' = $1
        FOR UPDATE OF p, o
      `, [event.order_id]);
      if (!paymentResult.rowCount) throw Object.assign(new Error('Origyn payment for Razorpay order not found'), { status: 404 });
      const stored = paymentResult.rows[0];
      const storedPayload = stored.provider_payload || {};
      const processedEventIds = Array.isArray(storedPayload.razorpay_event_ids) ? storedPayload.razorpay_event_ids : [];
      if (eventId && processedEventIds.includes(eventId)) {
        await client.query('COMMIT');
        return res.json({ ok: true, duplicate: true });
      }

      if (Number(event.amount_paise) !== Number(stored.amount_paise) ||
          String(event.currency).toUpperCase() !== String(stored.currency).toUpperCase()) {
        throw Object.assign(new Error('Razorpay payment amount or currency mismatch'), { status: 409 });
      }
      if (stored.provider_payment_id && stored.provider_payment_id !== event.provider_payment_id) {
        throw Object.assign(new Error('Razorpay payment ID mismatch'), { status: 409 });
      }

      if (event.status === 'captured') {
        await finalizeCapturedPayment(client, stored.order_id, event.provider_payment_id, event.payload);
      } else if (event.status === 'authorized') {
        if (stored.status === 'pending' || stored.status === 'authorized') {
          await client.query(`
            UPDATE payments
            SET provider_payment_id=$1,status='authorized',provider_payload=$2::jsonb,updated_at=NOW()
            WHERE id=$3
          `, [event.provider_payment_id, JSON.stringify(event.payload), stored.id]);
          await client.query(`UPDATE orders SET payment_status='authorized',updated_at=NOW() WHERE id=$1`, [stored.order_id]);
        }
      } else if (event.status === 'failed') {
        if (['pending','authorized'].includes(stored.status)) {
          await client.query(`
            UPDATE payments
            SET provider_payment_id=$1,status='failed',provider_payload=$2::jsonb,updated_at=NOW()
            WHERE id=$3
          `, [event.provider_payment_id, JSON.stringify(event.payload), stored.id]);
          await client.query(`
            UPDATE orders SET payment_status='failed',status='cancelled',fulfilment_status='cancelled',updated_at=NOW()
            WHERE id=$1
          `, [stored.order_id]);
          await releaseOrderReservations(client, stored.order_id, 'released');
        }
      }

      if (eventId) {
        const refreshed = await client.query('SELECT provider_payload FROM payments WHERE id=$1 FOR UPDATE', [stored.id]);
        const currentPayload = refreshed.rows[0]?.provider_payload || {};
        const currentEventIds = Array.isArray(currentPayload.razorpay_event_ids) ? currentPayload.razorpay_event_ids : [];
        const nextEventIds = currentEventIds.includes(eventId) ? currentEventIds : [...currentEventIds, eventId].slice(-50);
        await client.query(
          `UPDATE payments SET provider_payload = $1::jsonb, updated_at=NOW() WHERE id=$2`,
          [JSON.stringify({ ...currentPayload, razorpay_event_ids: nextEventIds }), stored.id]
        );
      }

      await client.query('COMMIT');
      return res.json({ ok: true });
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
    if (!provider || provider.length > MAX_PROVIDER_LENGTH) return res.status(400).json({ error: 'Invalid payment provider' });
    const expectedProvider = configuredProvider();
    if (!expectedProvider) return res.status(503).json({ error: 'Payment provider is not configured' });
    if (provider !== expectedProvider) return res.status(409).json({ error: 'Payment provider mismatch' });

    const body = req.body || {};
    const {
      provider_payment_id,
      status,
      order_id,
      amount_paise,
      currency,
      provider_refund_id,
      refund_amount_paise
    } = body;
    const orderId = requireUuid(order_id, 'order id');

    if (!['authorized', 'captured', 'failed', 'cancelled', 'refunded', 'partially_refunded'].includes(status)) {
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
      const paymentResult = await client.query('SELECT * FROM payments WHERE order_id = $1 FOR UPDATE', [orderId]);
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
        partially_refunded: ['refunded', 'partially_refunded'],
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

        let refundId;
        if (existingRefund.rowCount) {
          const existing = existingRefund.rows[0];
          if (existing.payment_id !== stored.id) {
            throw Object.assign(new Error('Provider refund ID is already associated with another payment'), { status: 409 });
          }
          if (existing.status !== 'succeeded') {
            throw Object.assign(new Error('Provider refund ID is already associated with a non-succeeded refund'), { status: 409 });
          }
          if (refundAmount !== null && refundAmount !== Number(existing.amount_paise)) {
            throw Object.assign(new Error('Provider refund amount mismatch'), { status: 409 });
          }
          refundId = existing.id;
        } else {
          if (stored.status === 'refunded') {
            throw Object.assign(new Error('Payment is already fully refunded'), { status: 409 });
          }

          const totals = await client.query(
            `SELECT
               COALESCE(SUM(amount_paise) FILTER (WHERE status = 'succeeded'), 0) AS succeeded_paise,
               COALESCE(SUM(amount_paise) FILTER (WHERE status = 'pending'), 0) AS pending_paise
             FROM refunds WHERE payment_id = $1`,
            [stored.id]
          );
          const succeededBefore = Number(totals.rows[0].succeeded_paise || 0);
          const pendingBefore = Number(totals.rows[0].pending_paise || 0);
          const refundableRemaining = Number(stored.amount_paise) - succeededBefore;

          let amount = status === 'partially_refunded' ? refundAmount : refundAmount;
          let pendingMatches;

          if (status === 'refunded' && refundAmount === null) {
            const pendingResult = await client.query(
              `SELECT id, amount_paise FROM refunds
               WHERE payment_id = $1 AND status = 'pending'
               ORDER BY created_at ASC FOR UPDATE`,
              [stored.id]
            );
            if (pendingResult.rowCount > 1) {
              throw Object.assign(new Error('Multiple pending refunds exist; full refund webhook amount is required for reconciliation'), { status: 409 });
            }
            amount = pendingResult.rowCount === 1 ? Number(pendingResult.rows[0].amount_paise) : refundableRemaining;
            pendingMatches = pendingResult;
          } else {
            pendingMatches = await client.query(
              `SELECT id, amount_paise FROM refunds
               WHERE payment_id = $1 AND status = 'pending' AND amount_paise = $2
               ORDER BY created_at ASC FOR UPDATE`,
              [stored.id, amount]
            );
          }

          if (!Number.isSafeInteger(amount) || amount <= 0 || amount > refundableRemaining) {
            throw Object.assign(new Error('Invalid refund amount'), { status: 409 });
          }
          if (status === 'refunded' && succeededBefore + amount !== Number(stored.amount_paise)) {
            throw Object.assign(new Error('Full refund amount must equal the remaining refundable balance'), { status: 409 });
          }

          if (pendingMatches.rowCount === 1) {
            if (Number(pendingMatches.rows[0].amount_paise) !== amount) {
              throw Object.assign(new Error('Pending refund amount does not match provider refund amount'), { status: 409 });
            }
            refundId = pendingMatches.rows[0].id;
            await client.query(
              `UPDATE refunds
               SET status = 'succeeded', provider_refund_id = $1, provider_payload = $2::jsonb, updated_at = NOW()
               WHERE id = $3`,
              [providerRefundId, JSON.stringify(body), refundId]
            );
          } else if (pendingMatches.rowCount > 1) {
            throw Object.assign(new Error('Multiple pending refunds match this provider refund; manual reconciliation required'), { status: 409 });
          } else {
            const inserted = await client.query(
              `INSERT INTO refunds(payment_id, order_id, amount_paise, status, provider_refund_id, provider_payload)
               VALUES($1, $2, $3, 'succeeded', $4, $5::jsonb)
               RETURNING id`,
              [stored.id, orderId, amount, providerRefundId, JSON.stringify(body)]
            );
            refundId = inserted.rows[0].id;
          }
        }

        const totalsAfter = await client.query(
          `SELECT COALESCE(SUM(amount_paise) FILTER (WHERE status IN ('pending', 'succeeded')), 0) AS refunded_paise
           FROM refunds WHERE payment_id = $1`,
          [stored.id]
        );
        const cumulativeRefunded = Number(totalsAfter.rows[0].refunded_paise || 0);
        if (!Number.isSafeInteger(cumulativeRefunded) || cumulativeRefunded > Number(stored.amount_paise)) {
          throw Object.assign(new Error('Cumulative refunds exceed the original payment amount'), { status: 409 });
        }

        const newStatus = cumulativeRefunded === Number(stored.amount_paise) ? 'refunded' : 'partially_refunded';
        if (status === 'refunded' && cumulativeRefunded !== Number(stored.amount_paise)) {
          throw Object.assign(new Error('Full refund event is inconsistent with recorded refund totals'), { status: 409 });
        }

        await client.query(
          `UPDATE refunds
           SET provider_payload = COALESCE($1::jsonb, provider_payload), updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(body), refundId]
        );
        await client.query(
          `UPDATE payments
           SET provider = $1, provider_payment_id = COALESCE($2, provider_payment_id), status = $3,
               provider_payload = COALESCE(provider_payload, '{}'::jsonb) || $4::jsonb, updated_at = NOW()
           WHERE id = $5`,
          [provider, providerPaymentId || null, newStatus, JSON.stringify(body), stored.id]
        );
        await client.query(
          `UPDATE orders
           SET payment_status = $1,
               status = CASE WHEN $1 = 'refunded' THEN 'refunded' ELSE status END,
               fulfilment_status = CASE WHEN $1 = 'refunded' THEN 'refunded' ELSE fulfilment_status END,
               updated_at = NOW()
           WHERE id = $2`,
          [newStatus, orderId]
        );
      } else if (status === 'captured') {
        await finalizeCapturedPayment(client, orderId, providerPaymentId, body);
      } else {
        await client.query(
          `UPDATE payments
           SET provider = $1, provider_payment_id = COALESCE($2, provider_payment_id), status = $3,
               provider_payload = $4::jsonb, updated_at = NOW()
           WHERE id = $5`,
          [provider, providerPaymentId || null, status, JSON.stringify(body), stored.id]
        );
        const orderUpdate = status === 'failed' || status === 'cancelled';
        await client.query(
          `UPDATE orders
           SET payment_status = $1,
               status = CASE WHEN $3 THEN 'cancelled' ELSE status END,
               fulfilment_status = CASE WHEN $3 THEN 'cancelled' ELSE fulfilment_status END,
               updated_at = NOW()
           WHERE id = $2`,
          [status, orderId, orderUpdate]
        );
        if (orderUpdate) await releaseOrderReservations(client, orderId, 'released');
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
    const orderId = requireUuid(req.params.orderId, 'order id');
    const body = req.body || {};
    const amount = parsePaise(body.amount_paise);
    const reason = body.reason === undefined || body.reason === null ? null : String(body.reason).trim();
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
        [orderId]
      );
      if (!paymentResult.rowCount) throw Object.assign(new Error('Payment not found'), { status: 404 });

      const payment = paymentResult.rows[0];
      const remaining = Number(payment.amount_paise) - Number(payment.refunded_paise || 0);
      if (!['captured', 'partially_refunded'].includes(payment.status) || amount > remaining || !Number.isSafeInteger(remaining) || remaining <= 0) {
        throw Object.assign(new Error('Payment is not refundable for that amount'), { status: 409 });
      }

      const refund = await client.query(
        `INSERT INTO refunds(payment_id, order_id, amount_paise, reason, status)
         VALUES($1, $2, $3, $4, 'pending') RETURNING *`,
        [payment.id, orderId, amount, reason]
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
