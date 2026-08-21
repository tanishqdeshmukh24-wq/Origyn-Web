const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { hashPassword, verifyPassword, signAccessToken, hashToken, sessionExpiry } = require('../utils/security');
const { slugify } = require('../utils/product');

const router = express.Router();

function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim()); }
function validPassword(password) { return typeof password === 'string' && password.length >= 10 && /[A-Za-z]/.test(password) && /\d/.test(password); }

router.post('/register', async (req, res, next) => {
  const { email, password, name, role = 'customer', publisher } = req.body || {};
  if (!validEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (!String(name || '').trim()) return res.status(400).json({ error: 'Name is required' });
  if (!validPassword(password)) return res.status(400).json({ error: 'Password must be at least 10 characters and contain letters and numbers' });
  if (!['customer', 'publisher'].includes(role)) return res.status(400).json({ error: 'role must be customer or publisher' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await hashPassword(password);
    const userResult = await client.query(
      `INSERT INTO users(email,name,role,password_hash) VALUES($1,$2,$3,$4)
       RETURNING id,email,name,role,created_at`,
      [String(email).trim().toLowerCase(), String(name).trim(), role, passwordHash]
    );
    const user = userResult.rows[0];
    let publisherRow = null;
    if (role === 'publisher') {
      const displayName = String(publisher?.display_name || name).trim();
      const base = slugify(displayName) || 'publisher';
      const slug = `${base}-${crypto.randomBytes(3).toString('hex')}`;
      const pr = await client.query(
        `INSERT INTO publishers(user_id,display_name,slug,bio,website_url,logo_url)
         VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [user.id, displayName, slug, publisher?.bio || null, publisher?.website_url || null, publisher?.logo_url || null]
      );
      publisherRow = pr.rows[0];
    }
    const sessionId = crypto.randomUUID();
    const token = signAccessToken(user, sessionId);
    await client.query(
      `INSERT INTO auth_sessions(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,$4)`,
      [sessionId, user.id, hashToken(token), sessionExpiry()]
    );
    await client.query('COMMIT');
    res.status(201).json({ token, user: { ...user, publisher: publisherRow } });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    next(error);
  } finally { client.release(); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password;
    const result = await pool.query(
      `SELECT u.*, p.id AS publisher_id, p.display_name AS publisher_name, p.verified AS publisher_verified,
              p.origyn_member
       FROM users u LEFT JOIN publishers p ON p.user_id=u.id WHERE u.email=$1`, [email]
    );
    const user = result.rows[0];
    if (!user?.password_hash || !(await verifyPassword(password || '', user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const sessionId = crypto.randomUUID();
    const token = signAccessToken(user, sessionId);
    await pool.query('INSERT INTO auth_sessions(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,$4)',
      [sessionId, user.id, hashToken(token), sessionExpiry()]);
    delete user.password_hash;
    res.json({ token, user });
  } catch (error) { next(error); }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await pool.query('UPDATE auth_sessions SET revoked_at=NOW() WHERE token_hash=$1', [hashToken(req.authToken)]);
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get('/me', authenticate, async (req, res) => res.json({ user: req.user }));

module.exports = router;
