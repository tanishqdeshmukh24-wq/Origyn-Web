const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateProductInput } = require('../utils/product');
const { PRODUCT_SELECT, getProduct, createProduct, updateProduct, setStatus } = require('../services/productService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const params = [];
    const where = [`p.status='published'`];
    const add = (sql, value) => { params.push(value); where.push(sql.replace('?', `$${params.length}`)); };
    if (req.query.q) { params.push(`%${String(req.query.q).trim()}%`); where.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`); }
    if (req.query.category) { params.push(req.query.category); where.push(`(c.slug=$${params.length} OR c.id::text=$${params.length})`); }
    if (req.query.product_type) add('p.product_type=?', req.query.product_type);
    if (req.query.publisher_id) add('p.publisher_id=?::uuid', req.query.publisher_id);
    if (req.query.ecosystem_status) add('p.ecosystem_status=?', req.query.ecosystem_status);
    if (req.query.verified_publisher === 'true') where.push('pub.verified=TRUE');
    params.push(limit, (page - 1) * limit);
    const data = await pool.query(`${PRODUCT_SELECT} WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    const countParams = params.slice(0, -2);
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM products p JOIN categories c ON c.id=p.category_id LEFT JOIN publishers pub ON pub.id=p.publisher_id WHERE ${where.join(' AND ')}`, countParams);
    res.json({ data: data.rows, pagination: { page, limit, total: count.rows[0].total, pages: Math.ceil(count.rows[0].total / limit) } });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) { next(error); }
});

router.post('/', authenticate, requireRole('publisher', 'seller', 'admin'), async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && !req.user.publisher_id) return res.status(403).json({ error: 'Publisher profile required' });
    const errors = validateProductInput(req.body);
    if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
    const product = await createProduct(req.user, req.body);
    res.status(201).json(product);
  } catch (error) { next(error); }
});

router.patch('/:id', authenticate, requireRole('publisher', 'seller', 'admin'), async (req, res, next) => {
  try {
    const errors = validateProductInput(req.body);
    if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
    res.json(await updateProduct(req.user, req.params.id, req.body));
  } catch (error) { next(error); }
});

router.post('/:id/publish', authenticate, requireRole('publisher', 'seller', 'admin'), async (req, res, next) => {
  try {
    const product = await getProduct(req.params.id, { includeUnpublished: true, publisherId: req.user.publisher_id, admin: req.user.role === 'admin' });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const body = {
      ...product,
      category_id: product.category_id,
      delivery: product.delivery,
      shipping: product.shipping,
      inventory: product.inventory,
      policies: product.policies,
      images: product.images,
      options: product.options,
      variants: product.variants
    };
    const errors = validateProductInput(body, { publishing: true });
    if (errors.length) return res.status(400).json({ error: 'Product cannot be published', details: errors });
    res.json(await setStatus(req.user, req.params.id, 'published'));
  } catch (error) { next(error); }
});

router.post('/:id/archive', authenticate, requireRole('publisher', 'seller', 'admin'), async (req, res, next) => {
  try { res.json(await setStatus(req.user, req.params.id, 'archived')); }
  catch (error) { next(error); }
});

router.delete('/:id', authenticate, requireRole('publisher', 'seller', 'admin'), async (req, res, next) => {
  try {
    const product = await getProduct(req.params.id, { includeUnpublished: true, publisherId: req.user.publisher_id, admin: req.user.role === 'admin' });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.status === 'published') return res.status(409).json({ error: 'Published products must be archived instead of deleted' });
    const result = await pool.query(`DELETE FROM products WHERE id=$1 AND ($2::boolean OR publisher_id=$3) RETURNING id`, [req.params.id, req.user.role === 'admin', req.user.publisher_id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Product not found' });
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
