const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { PRODUCT_SELECT } = require('../services/productService');

const router = express.Router();

router.get('/products', authenticate, requireRole('publisher', 'seller', 'admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const params = [];
    const where = [];
    if (req.user.role !== 'admin') { params.push(req.user.publisher_id); where.push(`p.publisher_id=$${params.length}`); }
    if (req.query.status) { params.push(req.query.status); where.push(`p.status=$${params.length}`); }
    params.push(limit, (page - 1) * limit);
    const result = await pool.query(`${PRODUCT_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY p.updated_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    res.json({ data: result.rows, page, limit });
  } catch (error) { next(error); }
});

module.exports = router;
