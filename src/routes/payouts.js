const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { httpError } = require('../services/commerceService');

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BATCH_ITEMS = 100;
const ALLOWED_STATUS_TRANSITIONS = {
  eligible: new Set(['pending', 'on_hold', 'cancelled']),
  pending: new Set(['processing', 'on_hold', 'cancelled']),
  processing: new Set(['paid', 'failed', 'on_hold']),
  failed: new Set(['pending', 'cancelled']),
  on_hold: new Set(['pending', 'cancelled']),
  paid: new Set([]),
  cancelled: new Set([])
};

function requireUuid(value, field) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) throw httpError(`${field} must be a valid UUID`);
  return value;
}

function parseLimit(value, fallback = 20) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(1, Math.trunc(n))) : fallback;
}

function serializePayout(row) {
  return {
    id: row.id,
    seller_id: row.seller_id,
    seller_display_name: row.seller_display_name || null,
    currency: row.currency,
    amount_paise: Number(row.amount_paise),
    status: row.status,
    provider: row.provider || null,
    provider_payout_id: row.provider_payout_id || null,
    failure_code: row.failure_code || null,
    failure_reason: row.failure_reason || null,
    requested_at: row.requested_at,
    processed_at: row.processed_at,
    paid_at: row.paid_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function getSellerProfile(client, userId) {
  const result = await client.query(
    `SELECT id, user_id, seller_type, display_name, verification_status, active
       FROM seller_profiles
      WHERE user_id=$1
      LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

router.use(authenticate);

// Seller-facing balance and payout history. No other seller's financial data is exposed.
router.get('/me', async (req, res, next) => {
  try {
    const seller = await getSellerProfile(pool, req.user.id);
    if (!seller) return res.status(404).json({ error: 'Seller profile not found' });

    const [balances, payouts] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(CASE WHEN cl.status IN ('earned','partially_refunded')
               THEN GREATEST(cl.seller_payout_paise - cl.refunded_paise - cl.recoverable_paise, 0) ELSE 0 END), 0)::bigint AS available_paise,
           COALESCE(SUM(CASE WHEN cl.status IN ('pending') THEN cl.seller_payout_paise ELSE 0 END), 0)::bigint AS pending_paise,
           COALESCE(SUM(CASE WHEN cl.recoverable_paise > 0 THEN cl.recoverable_paise ELSE 0 END), 0)::bigint AS recoverable_paise
         FROM commission_ledger cl
         WHERE cl.seller_id=$1`,
        [req.user.id]
      ),
      pool.query(
        `SELECT sp.*, u.name AS seller_display_name
           FROM seller_payouts sp
           JOIN users u ON u.id=sp.seller_id
          WHERE sp.seller_id=$1
          ORDER BY sp.created_at DESC
          LIMIT $2`,
        [req.user.id, parseLimit(req.query.limit)]
      )
    ]);

    res.json({
      seller: { id: seller.id, display_name: seller.display_name, verification_status: seller.verification_status, active: seller.active },
      balance: {
        available_paise: Number(balances.rows[0].available_paise),
        pending_paise: Number(balances.rows[0].pending_paise),
        recoverable_paise: Number(balances.rows[0].recoverable_paise)
      },
      payouts: payouts.rows.map(serializePayout)
    });
  } catch (error) {
    next(error);
  }
});

// Seller can inspect one of their own payouts; admins can inspect any payout.
router.get('/:id', async (req, res, next) => {
  try {
    const payoutId = requireUuid(req.params.id, 'payout id');
    const result = await pool.query(
      `SELECT sp.*, u.name AS seller_display_name
         FROM seller_payouts sp
         JOIN users u ON u.id=sp.seller_id
        WHERE sp.id=$1
          AND ($2::text='admin' OR sp.seller_id=$3)
        LIMIT 1`,
      [payoutId, req.user.role, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Payout not found' });

    const items = await pool.query(
      `SELECT spi.id, spi.commission_ledger_id, spi.amount_paise,
              cl.order_id, cl.order_item_id, cl.gross_paise, cl.commission_paise,
              cl.refunded_paise, cl.recoverable_paise
         FROM seller_payout_items spi
         JOIN commission_ledger cl ON cl.id=spi.commission_ledger_id
        WHERE spi.payout_id=$1
        ORDER BY spi.created_at`,
      [payoutId]
    );

    res.json({ payout: serializePayout(result.rows[0]), items: items.rows.map(item => ({ ...item, amount_paise: Number(item.amount_paise), gross_paise: Number(item.gross_paise), commission_paise: Number(item.commission_paise), refunded_paise: Number(item.refunded_paise), recoverable_paise: Number(item.recoverable_paise) })) });
  } catch (error) {
    next(error);
  }
});

// Admin-only payout queue. This creates an internal payout obligation; it does not transfer money.
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT sp.*, u.name AS seller_display_name
         FROM seller_payouts sp
         JOIN users u ON u.id=sp.seller_id
        WHERE ($1::text IS NULL OR sp.status=$1)
        ORDER BY sp.created_at DESC
        LIMIT $2`,
      [req.query.status || null, parseLimit(req.query.limit)]
    );
    res.json({ payouts: result.rows.map(serializePayout) });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const sellerId = requireUuid(req.body?.seller_id, 'seller_id');
    const ledgerIds = Array.isArray(req.body?.commission_ledger_ids) ? req.body.commission_ledger_ids : [];
    if (!ledgerIds.length || ledgerIds.length > MAX_BATCH_ITEMS) {
      throw httpError(`commission_ledger_ids must contain 1 to ${MAX_BATCH_ITEMS} entries`);
    }
    ledgerIds.forEach((id, index) => requireUuid(id, `commission_ledger_ids[${index}]`));

    await client.query('BEGIN');
    const seller = await client.query(
      `SELECT sp.id, sp.verification_status, sp.active
         FROM seller_profiles sp
        WHERE sp.user_id=$1
        FOR UPDATE`,
      [sellerId]
    );
    if (!seller.rowCount) throw httpError('Seller profile not found', 404);
    if (seller.rows[0].verification_status !== 'verified' || !seller.rows[0].active) {
      throw httpError('Seller must be verified and active before payout creation', 409);
    }

    const ledger = await client.query(
      `SELECT id, seller_id, currency, seller_payout_paise, refunded_paise, recoverable_paise, status
         FROM commission_ledger
        WHERE id = ANY($1::uuid[])
        ORDER BY created_at, id
        FOR UPDATE`,
      [ledgerIds]
    );
    if (ledger.rowCount !== ledgerIds.length) throw httpError('One or more commission ledger entries were not found', 404);

    const first = ledger.rows[0];
    if (ledger.rows.some(row => row.seller_id !== sellerId)) throw httpError('All commission entries must belong to the requested seller', 409);
    if (ledger.rows.some(row => row.currency !== first.currency)) throw httpError('All payout entries must use the same currency', 409);
    if (ledger.rows.some(row => !['earned', 'partially_refunded'].includes(row.status))) throw httpError('Only earned, non-finalized commission entries can be paid out', 409);

    const amounts = ledger.rows.map(row => Number(row.seller_payout_paise) - Number(row.refunded_paise) - Number(row.recoverable_paise));
    if (amounts.some(amount => !Number.isSafeInteger(amount) || amount <= 0)) throw httpError('One or more commission entries has no payable balance', 409);
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    if (!Number.isSafeInteger(total) || total <= 0) throw httpError('Payout total is invalid', 409);

    const payout = await client.query(
      `INSERT INTO seller_payouts(seller_id,currency,amount_paise,status,requested_at)
       VALUES($1,$2,$3,'eligible',NOW())
       RETURNING *`,
      [sellerId, first.currency, total]
    );

    for (let i = 0; i < ledger.rows.length; i += 1) {
      await client.query(
        `INSERT INTO seller_payout_items(payout_id,commission_ledger_id,amount_paise)
         VALUES($1,$2,$3)`,
        [payout.rows[0].id, ledger.rows[i].id, amounts[i]]
      );
    }

    await client.query('COMMIT');
    const created = await pool.query(
      `SELECT sp.*, u.name AS seller_display_name
         FROM seller_payouts sp JOIN users u ON u.id=sp.seller_id WHERE sp.id=$1`,
      [payout.rows[0].id]
    );
    res.status(201).json({ payout: serializePayout(created.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

// Admin records lifecycle changes or an external provider's confirmed result.
// This route never calls a payment provider and therefore cannot move funds.
router.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const payoutId = requireUuid(req.params.id, 'payout id');
    const { status, provider, provider_payout_id, failure_code, failure_reason } = req.body || {};
    const result = await pool.query('SELECT * FROM seller_payouts WHERE id=$1 FOR UPDATE', [payoutId]);
    if (!result.rowCount) return res.status(404).json({ error: 'Payout not found' });
    const current = result.rows[0];
    if (!status || !ALLOWED_STATUS_TRANSITIONS[current.status]?.has(status)) {
      return res.status(409).json({ error: `Invalid payout status transition from ${current.status}` });
    }
    if (status === 'paid' && (!provider || !provider_payout_id)) {
      return res.status(400).json({ error: 'provider and provider_payout_id are required when marking a payout paid' });
    }

    const updated = await pool.query(
      `UPDATE seller_payouts
          SET status=$2,
              provider=COALESCE($3,provider),
              provider_payout_id=COALESCE($4,provider_payout_id),
              failure_code=COALESCE($5,failure_code),
              failure_reason=COALESCE($6,failure_reason),
              processed_at=CASE WHEN $2 IN ('processing','paid','failed') THEN COALESCE(processed_at,NOW()) ELSE processed_at END,
              paid_at=CASE WHEN $2='paid' THEN NOW() ELSE paid_at END
        WHERE id=$1
        RETURNING *`,
      [payoutId, status, provider || null, provider_payout_id || null, failure_code || null, failure_reason || null]
    );
    res.json({ payout: serializePayout(updated.rows[0]) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
