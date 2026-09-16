const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const SELLER_TYPES = new Set(['origyn', 'external']);
const VERIFICATION_STATUSES = new Set(['pending', 'verified', 'suspended', 'rejected']);

function text(value, max = 500) {
  const valueText = String(value ?? '').trim();
  return valueText ? valueText.slice(0, max) : null;
}

function requiredText(value, field, max = 300) {
  const valueText = text(value, max);
  if (!valueText) {
    const error = new Error(`${field} is required`);
    error.status = 400;
    throw error;
  }
  return valueText;
}

function validateCountry(value) {
  const country = String(value || 'IN').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    const error = new Error('country_code must be a 2-letter ISO country code');
    error.status = 400;
    throw error;
  }
  return country;
}

function serializeSeller(row, { privateFields = false } = {}) {
  if (!row) return null;
  const seller = {
    id: row.id,
    user_id: row.user_id,
    seller_type: row.seller_type,
    legal_name: row.legal_name,
    display_name: row.display_name,
    country_code: row.country_code,
    principal_address: row.principal_address,
    website_url: row.website_url,
    customer_care_email: row.customer_care_email,
    customer_care_phone: row.customer_care_phone,
    grievance_officer_name: row.grievance_officer_name,
    grievance_officer_email: row.grievance_officer_email,
    grievance_officer_phone: row.grievance_officer_phone,
    verification_status: row.verification_status,
    verified_at: row.verified_at,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (privateFields) {
    seller.gstin = row.gstin;
    seller.pan = row.pan;
  }
  return seller;
}

async function getOwnSeller(userId) {
  const result = await pool.query('SELECT * FROM seller_profiles WHERE user_id=$1', [userId]);
  return result.rows[0] || null;
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const seller = await getOwnSeller(req.user.id);
    if (!seller) return res.status(404).json({ error: 'Seller profile not found' });
    res.json({ seller: serializeSeller(seller, { privateFields: true }) });
  } catch (error) { next(error); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const existing = await getOwnSeller(req.user.id);
    if (existing) return res.status(409).json({ error: 'Seller profile already exists' });

    const sellerType = String(req.body?.seller_type || 'external').trim().toLowerCase();
    if (!SELLER_TYPES.has(sellerType)) return res.status(400).json({ error: 'seller_type must be external or origyn' });
    if (sellerType === 'origyn' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can create an Origyn-owned seller profile' });
    }

    const legalName = requiredText(req.body?.legal_name, 'legal_name');
    const displayName = requiredText(req.body?.display_name, 'display_name');
    const countryCode = validateCountry(req.body?.country_code);
    const websiteUrl = text(req.body?.website_url, 500);
    const customerCareEmail = text(req.body?.customer_care_email, 320);
    const customerCarePhone = text(req.body?.customer_care_phone, 50);
    const grievanceOfficerName = text(req.body?.grievance_officer_name, 200);
    const grievanceOfficerEmail = text(req.body?.grievance_officer_email, 320);
    const grievanceOfficerPhone = text(req.body?.grievance_officer_phone, 50);
    const principalAddress = text(req.body?.principal_address, 1000);
    const gstin = text(req.body?.gstin, 32)?.toUpperCase();
    const pan = text(req.body?.pan, 32)?.toUpperCase();

    const result = await pool.query(
      `INSERT INTO seller_profiles
       (user_id, seller_type, legal_name, display_name, country_code, principal_address,
        website_url, customer_care_email, customer_care_phone, grievance_officer_name,
        grievance_officer_email, grievance_officer_phone, gstin, pan)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [req.user.id, sellerType, legalName, displayName, countryCode, principalAddress,
       websiteUrl, customerCareEmail, customerCarePhone, grievanceOfficerName,
       grievanceOfficerEmail, grievanceOfficerPhone, gstin, pan]
    );

    res.status(201).json({ seller: serializeSeller(result.rows[0], { privateFields: true }) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Seller profile already exists' });
    next(error);
  }
});

router.patch('/', authenticate, async (req, res, next) => {
  try {
    const current = await getOwnSeller(req.user.id);
    if (!current) return res.status(404).json({ error: 'Seller profile not found' });
    if (current.verification_status === 'verified') {
      return res.status(409).json({ error: 'Verified seller profiles require an administrative update workflow' });
    }

    const legalName = req.body?.legal_name === undefined ? current.legal_name : requiredText(req.body.legal_name, 'legal_name');
    const displayName = req.body?.display_name === undefined ? current.display_name : requiredText(req.body.display_name, 'display_name');
    const countryCode = req.body?.country_code === undefined ? current.country_code : validateCountry(req.body.country_code);
    const values = {
      legalName,
      displayName,
      countryCode,
      principalAddress: req.body?.principal_address === undefined ? current.principal_address : text(req.body.principal_address, 1000),
      websiteUrl: req.body?.website_url === undefined ? current.website_url : text(req.body.website_url, 500),
      customerCareEmail: req.body?.customer_care_email === undefined ? current.customer_care_email : text(req.body.customer_care_email, 320),
      customerCarePhone: req.body?.customer_care_phone === undefined ? current.customer_care_phone : text(req.body.customer_care_phone, 50),
      grievanceOfficerName: req.body?.grievance_officer_name === undefined ? current.grievance_officer_name : text(req.body.grievance_officer_name, 200),
      grievanceOfficerEmail: req.body?.grievance_officer_email === undefined ? current.grievance_officer_email : text(req.body.grievance_officer_email, 320),
      grievanceOfficerPhone: req.body?.grievance_officer_phone === undefined ? current.grievance_officer_phone : text(req.body.grievance_officer_phone, 50),
      gstin: req.body?.gstin === undefined ? current.gstin : text(req.body.gstin, 32)?.toUpperCase(),
      pan: req.body?.pan === undefined ? current.pan : text(req.body.pan, 32)?.toUpperCase(),
    };

    const result = await pool.query(
      `UPDATE seller_profiles SET
       legal_name=$1, display_name=$2, country_code=$3, principal_address=$4,
       website_url=$5, customer_care_email=$6, customer_care_phone=$7,
       grievance_officer_name=$8, grievance_officer_email=$9, grievance_officer_phone=$10,
       gstin=$11, pan=$12, verification_status='pending', verified_at=NULL
       WHERE user_id=$13 RETURNING *`,
      [values.legalName, values.displayName, values.countryCode, values.principalAddress,
       values.websiteUrl, values.customerCareEmail, values.customerCarePhone,
       values.grievanceOfficerName, values.grievanceOfficerEmail, values.grievanceOfficerPhone,
       values.gstin, values.pan, req.user.id]
    );

    res.json({ seller: serializeSeller(result.rows[0], { privateFields: true }) });
  } catch (error) { next(error); }
});

router.post('/:id/verify', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const status = String(req.body?.verification_status || 'verified').trim().toLowerCase();
    if (!VERIFICATION_STATUSES.has(status) || status === 'pending') {
      return res.status(400).json({ error: 'verification_status must be verified, suspended, or rejected' });
    }

    const result = await pool.query(
      `UPDATE seller_profiles
       SET verification_status=$1,
           verified_at=CASE WHEN $1='verified' THEN NOW() ELSE NULL END
       WHERE id=$2
       RETURNING *`,
      [status, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Seller profile not found' });
    res.json({ seller: serializeSeller(result.rows[0], { privateFields: true }) });
  } catch (error) { next(error); }
});

module.exports = router;
