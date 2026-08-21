const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { PRODUCT_SELECT } = require('../services/productService');

const router = express.Router();

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id,display_name,slug,bio,website_url,logo_url,verified,origyn_member,created_at,updated_at
       FROM publishers WHERE id=$1`, [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Publisher not found' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

router.get('/:id/products', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const page = Math.max(1, Number(req.query.page) || 1);
    const result = await pool.query(
      `${PRODUCT_SELECT} WHERE p.publisher_id=$1 AND p.status='published' ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
      [req.params.id, limit, (page - 1) * limit]
    );
    res.json({ data: result.rows, page, limit });
  } catch (error) { next(error); }
});

router.patch('/me/profile', authenticate, requireRole('publisher', 'seller'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await pool.query(
      `UPDATE publishers SET display_name=COALESCE($2,display_name), bio=COALESCE($3,bio),
       website_url=COALESCE($4,website_url), logo_url=COALESCE($5,logo_url), updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.user.publisher_id, b.display_name || null, b.bio ?? null, b.website_url ?? null, b.logo_url ?? null]
    );
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

module.exports = router;
