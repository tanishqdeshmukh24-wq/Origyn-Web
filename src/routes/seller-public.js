const express = require('express');
const pool = require('../config/db');

const router = express.Router();

function serializePublicSeller(row) {
  if (!row) return null;
  return {
    id: row.id,
    seller_type: row.seller_type,
    display_name: row.display_name,
    country_code: row.country_code,
    principal_address: row.principal_address,
    website_url: row.website_url,
    customer_care_email: row.customer_care_email,
    customer_care_phone: row.customer_care_phone,
    grievance_officer_name: row.grievance_officer_name,
    grievance_officer_email: row.grievance_officer_email,
    grievance_officer_phone: row.grievance_officer_phone,
  };
}

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, seller_type, display_name, country_code, principal_address,
              website_url, customer_care_email, customer_care_phone,
              grievance_officer_name, grievance_officer_email, grievance_officer_phone
       FROM seller_profiles
       WHERE id=$1 AND active=true AND verification_status='verified'`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Seller not found' });
    res.json({ seller: serializePublicSeller(result.rows[0]) });
  } catch (error) {
    if (error.code === '22P02') return res.status(400).json({ error: 'Invalid seller id' });
    next(error);
  }
});

module.exports = router;
