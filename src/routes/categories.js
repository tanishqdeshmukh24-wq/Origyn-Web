const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT id,name,slug,parent_id,is_featured FROM categories ORDER BY is_featured DESC,name ASC');
    res.json(result.rows);
  } catch (error) { next(error); }
});

module.exports = router;
