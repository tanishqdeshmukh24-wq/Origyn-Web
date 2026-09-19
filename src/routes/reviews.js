const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { recordEvent, httpError } = require('../services/commerceService');

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value, field) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw httpError(`${field} must be a valid UUID`);
  }
  return value;
}

function parseReviewInput(body) {
  const rating = body.rating === undefined ? undefined : Number(body.rating);
  const text = body.review_text === undefined ? undefined : String(body.review_text).trim();

  if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw httpError('Rating must be an integer from 1 to 5');
  }
  if (text !== undefined && (text.length < 1 || text.length > 5000)) {
    throw httpError('review_text must be 1-5000 characters');
  }

  return { rating, text };
}

router.get('/products/:id/reviews', async (req, res, next) => {
  try {
    const productId = requireUuid(req.params.id, 'product id');
    const product = await pool.query(
      'SELECT id, category_id FROM products WHERE id=$1 AND status=$2',
      [productId, 'published']
    );
    if (!product.rowCount) throw httpError('Product not found', 404);

    const reviews = await pool.query(
      `SELECT r.id, r.user_id, r.product_id, r.rating, r.review_text,
              r.verified_purchase, r.created_at, r.updated_at,
              u.name AS user_name
       FROM product_reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId]
    );

    const rating = await pool.query(
      `SELECT COUNT(*)::int AS total_count,
              COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average,
              COUNT(*) FILTER (WHERE rating=5)::int AS five,
              COUNT(*) FILTER (WHERE rating=4)::int AS four,
              COUNT(*) FILTER (WHERE rating=3)::int AS three,
              COUNT(*) FILTER (WHERE rating=2)::int AS two,
              COUNT(*) FILTER (WHERE rating=1)::int AS one
       FROM product_reviews
       WHERE product_id = $1`,
      [productId]
    );

    res.json({ reviews: reviews.rows, rating: rating.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.post('/products/:id/reviews', authenticate, async (req, res, next) => {
  try {
    const productId = requireUuid(req.params.id, 'product id');
    const { rating, text } = parseReviewInput(req.body || {});
    if (rating === undefined || text === undefined) {
      throw httpError('rating and review_text are required');
    }

    const product = await pool.query(
      'SELECT id, category_id FROM products WHERE id=$1 AND status=$2',
      [productId, 'published']
    );
    if (!product.rowCount) throw httpError('Product not found', 404);

    // Verified-purchase status is derived entirely from server-side order/payment state.
    const purchase = await pool.query(
      `SELECT 1
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.customer_id = $1
         AND oi.product_id = $2
         AND o.payment_status IN ('paid', 'refunded', 'partially_refunded')
       LIMIT 1`,
      [req.user.id, productId]
    );
    const verifiedPurchase = purchase.rowCount > 0;

    const existing = await pool.query(
      'SELECT id FROM product_reviews WHERE user_id=$1 AND product_id=$2',
      [req.user.id, productId]
    );

    const review = await pool.query(
      `INSERT INTO product_reviews
         (user_id, product_id, rating, review_text, verified_purchase)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET
         rating = EXCLUDED.rating,
         review_text = EXCLUDED.review_text,
         verified_purchase = EXCLUDED.verified_purchase,
         updated_at = NOW()
       RETURNING *`,
      [req.user.id, productId, rating, text, verifiedPurchase]
    );

    await recordEvent({
      userId: req.user.id,
      eventType: 'product_rated',
      productId,
      categoryId: product.rows[0].category_id,
      metadata: { rating, action: existing.rowCount ? 'updated' : 'created' }
    });

    res.status(existing.rowCount ? 200 : 201).json(review.rows[0]);
  } catch (e) {
    next(e);
  }
});

router.patch('/reviews/:id', authenticate, async (req, res, next) => {
  try {
    const reviewId = requireUuid(req.params.id, 'review id');
    const { rating, text } = parseReviewInput(req.body || {});
    if (rating === undefined && text === undefined) {
      throw httpError('At least one of rating or review_text is required');
    }

    const current = await pool.query(
      `SELECT r.id, r.product_id, p.category_id
       FROM product_reviews r
       JOIN products p ON p.id = r.product_id
       WHERE r.id=$1 AND r.user_id=$2 AND p.status=$3`,
      [reviewId, req.user.id, 'published']
    );
    if (!current.rowCount) throw httpError('Review not found', 404);

    // Recompute verification during edits so the flag never relies on stale client state.
    const purchase = await pool.query(
      `SELECT 1
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.customer_id=$1
         AND oi.product_id=$2
         AND o.payment_status IN ('paid', 'refunded', 'partially_refunded')
       LIMIT 1`,
      [req.user.id, current.rows[0].product_id]
    );

    const updated = await pool.query(
      `UPDATE product_reviews
       SET rating=COALESCE($1, rating),
           review_text=COALESCE($2, review_text),
           verified_purchase=$3,
           updated_at=NOW()
       WHERE id=$4 AND user_id=$5
       RETURNING *`,
      [rating, text, purchase.rowCount > 0, reviewId, req.user.id]
    );

    await recordEvent({
      userId: req.user.id,
      eventType: 'product_rated',
      productId: current.rows[0].product_id,
      categoryId: current.rows[0].category_id,
      metadata: { rating: updated.rows[0].rating, action: 'updated' }
    });

    res.json(updated.rows[0]);
  } catch (e) {
    next(e);
  }
});

router.delete('/reviews/:id', authenticate, async (req, res, next) => {
  try {
    const reviewId = requireUuid(req.params.id, 'review id');
    const review = await pool.query(
      `DELETE FROM product_reviews
       WHERE id=$1 AND user_id=$2
       RETURNING id`,
      [reviewId, req.user.id]
    );
    if (!review.rowCount) return res.status(404).json({ error: 'Review not found' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
