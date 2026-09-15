const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('publisher', 'seller', 'admin'));

function rangeStart(value) {
  const range = String(value || 'all').toLowerCase();
  if (range === '7d') return "NOW() - INTERVAL '7 days'";
  if (range === '30d') return "NOW() - INTERVAL '30 days'";
  if (range === '90d') return "NOW() - INTERVAL '90 days'";
  if (range === '365d') return "NOW() - INTERVAL '365 days'";
  return null;
}

function ownerClause(user, alias = 'p') {
  if (user.role === 'admin') return { sql: 'TRUE', params: [] };
  return { sql: `${alias}.publisher_id = $1`, params: [user.publisher_id] };
}

router.get('/publisher', async (req, res, next) => {
  try {
    const start = rangeStart(req.query.range);
    const owner = ownerClause(req.user);
    const params = [...owner.params];
    const time = start ? `AND o.created_at >= ${start}` : '';

    const productCount = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE p.status='published')::int AS published,
              COUNT(*) FILTER (WHERE p.status='draft')::int AS drafts,
              COUNT(*) FILTER (WHERE p.status='archived')::int AS archived
       FROM products p
       WHERE ${owner.sql}`,
      params
    );

    const sales = await pool.query(
      `SELECT
         COUNT(DISTINCT o.id)::int AS orders,
         COALESCE(SUM(oi.quantity),0)::int AS units_sold,
         COALESCE(SUM(oi.unit_price_paise * oi.quantity),0)::bigint AS gross_sales_paise,
         COALESCE(SUM(oi.commission_paise),0)::bigint AS commission_paise,
         COALESCE(SUM(oi.seller_payout_paise),0)::bigint AS seller_payout_paise
       FROM order_items oi
       JOIN products p ON p.id=oi.product_id
       JOIN orders o ON o.id=oi.order_id
       WHERE ${owner.sql.replace('p.', 'p.')} 
         AND o.status IN ('paid','confirmed','processing','shipped','delivered','fulfilled','completed')
         ${time}`,
      params
    );

    const topProducts = await pool.query(
      `SELECT p.id, p.name, p.status,
              COALESCE(SUM(oi.quantity),0)::int AS units_sold,
              COALESCE(SUM(oi.unit_price_paise * oi.quantity),0)::bigint AS gross_sales_paise,
              COUNT(DISTINCT o.id)::int AS orders
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id=p.id
       LEFT JOIN orders o ON o.id=oi.order_id
          AND o.status IN ('paid','confirmed','processing','shipped','delivered','fulfilled','completed')
          ${start ? `AND o.created_at >= ${start}` : ''}
       WHERE ${owner.sql}
       GROUP BY p.id, p.name, p.status
       ORDER BY gross_sales_paise DESC, units_sold DESC, p.updated_at DESC
       LIMIT 10`,
      params
    );

    const recentOrders = await pool.query(
      `SELECT o.id, o.status, o.total_paise, o.currency, o.created_at,
              COUNT(oi.id)::int AS line_items,
              COALESCE(SUM(oi.quantity),0)::int AS units
       FROM orders o
       JOIN order_items oi ON oi.order_id=o.id
       JOIN products p ON p.id=oi.product_id
       WHERE ${owner.sql} ${time}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 10`,
      params
    );

    let engagement = {
      product_views: 0,
      saved_products: 0,
      review_count: 0,
      average_rating: 0
    };

    const commerceEventsExists = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema='public' AND table_name='commerce_events'
       ) AS exists`
    );

    if (commerceEventsExists.rows[0].exists) {
      const events = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE e.event_type='product_viewed')::int AS product_views,
           COUNT(*) FILTER (WHERE e.event_type='product_saved')::int AS saved_products
         FROM commerce_events e
         JOIN products p ON p.id=e.product_id
         WHERE ${owner.sql}
           ${start ? `AND e.occurred_at >= ${start}` : ''}`,
        params
      );
      engagement.product_views = events.rows[0].product_views;
      engagement.saved_products = events.rows[0].saved_products;
    }

    const reviewsExists = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema='public' AND table_name='product_reviews'
       ) AS exists`
    );

    if (reviewsExists.rows[0].exists) {
      const reviews = await pool.query(
        `SELECT COUNT(*)::int AS review_count,
                COALESCE(ROUND(AVG(r.rating)::numeric,2),0) AS average_rating
         FROM product_reviews r
         JOIN products p ON p.id=r.product_id
         WHERE ${owner.sql}
           ${start ? `AND r.created_at >= ${start}` : ''}`,
        params
      );
      engagement.review_count = reviews.rows[0].review_count;
      engagement.average_rating = Number(reviews.rows[0].average_rating || 0);
    }

    res.json({
      range: req.query.range || 'all',
      publisher_id: req.user.publisher_id || null,
      products: productCount.rows[0],
      sales: sales.rows[0],
      engagement,
      top_products: topProducts.rows,
      recent_orders: recentOrders.rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
