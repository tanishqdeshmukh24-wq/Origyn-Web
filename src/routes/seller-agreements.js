const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const AGREEMENT_KEY = 'seller_marketplace_terms';

function serializeVersion(row) {
  return {
    id: row.id,
    agreement_key: row.agreement_key,
    version: row.version,
    title: row.title,
    content: row.content,
    effective_at: row.effective_at,
    created_at: row.created_at,
  };
}

router.get('/current', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, agreement_key, version, title, content, effective_at, created_at
       FROM seller_agreement_versions
       WHERE agreement_key=$1 AND active=true
       LIMIT 1`,
      [AGREEMENT_KEY]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'No active seller agreement is available' });
    res.json({ agreement: serializeVersion(result.rows[0]) });
  } catch (error) { next(error); }
});

router.get('/status', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT v.id, v.version, v.title, v.effective_at,
              (a.id IS NOT NULL) AS accepted
       FROM seller_agreement_versions v
       LEFT JOIN seller_agreement_acceptances a
         ON a.agreement_version_id=v.id
        AND a.seller_profile_id=(SELECT id FROM seller_profiles WHERE user_id=$1)
       WHERE v.agreement_key=$2 AND v.active=true
       LIMIT 1`,
      [req.user.id, AGREEMENT_KEY]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'No active seller agreement is available' });
    res.json({ agreement: result.rows[0] });
  } catch (error) { next(error); }
});

router.post('/accept', authenticate, async (req, res, next) => {
  try {
    const seller = await pool.query(
      `SELECT id, verification_status, active FROM seller_profiles WHERE user_id=$1`,
      [req.user.id]
    );
    if (!seller.rowCount) return res.status(404).json({ error: 'Seller profile not found' });
    if (!seller.rows[0].active) return res.status(403).json({ error: 'Seller profile is inactive' });

    const agreement = await pool.query(
      `SELECT id, agreement_key, version, title, content, effective_at, created_at
       FROM seller_agreement_versions
       WHERE id=$1 AND agreement_key=$2 AND active=true`,
      [req.body?.agreement_version_id, AGREEMENT_KEY]
    );
    if (!agreement.rowCount) return res.status(400).json({ error: 'Active seller agreement version not found' });

    const result = await pool.query(
      `INSERT INTO seller_agreement_acceptances (seller_profile_id, agreement_version_id)
       VALUES ($1,$2)
       ON CONFLICT (seller_profile_id, agreement_version_id) DO NOTHING
       RETURNING id, accepted_at`,
      [seller.rows[0].id, agreement.rows[0].id]
    );

    res.status(result.rowCount ? 201 : 200).json({
      accepted: true,
      agreement: serializeVersion(agreement.rows[0]),
      acceptance: {
        id: result.rows[0]?.id || null,
        accepted_at: result.rows[0]?.accepted_at || null,
      },
    });
  } catch (error) {
    if (error.code === '22P02') return res.status(400).json({ error: 'Invalid agreement version id' });
    next(error);
  }
});

router.post('/versions', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const version = String(req.body?.version || '').trim();
    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    if (!version || !title || !content) {
      return res.status(400).json({ error: 'version, title and content are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE seller_agreement_versions
         SET active=false
         WHERE agreement_key=$1 AND active=true`,
        [AGREEMENT_KEY]
      );
      const result = await client.query(
        `INSERT INTO seller_agreement_versions
         (agreement_key, version, title, content, effective_at, active)
         VALUES ($1,$2,$3,$4,COALESCE($5,NOW()),true)
         RETURNING id, agreement_key, version, title, content, effective_at, created_at`,
        [AGREEMENT_KEY, version, title, content, req.body?.effective_at || null]
      );
      await client.query('COMMIT');
      res.status(201).json({ agreement: serializeVersion(result.rows[0]) });
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') return res.status(409).json({ error: 'Agreement version already exists' });
      throw error;
    } finally { client.release(); }
  } catch (error) { next(error); }
});

module.exports = router;
