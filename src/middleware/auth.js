const pool = require('../config/db');
const { verifyAccessToken, hashToken } = require('../utils/security');

function bearerToken(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

async function authenticate(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const payload = verifyAccessToken(token);
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, p.id AS publisher_id,
              p.display_name AS publisher_name, p.verified AS publisher_verified,
              p.origyn_member
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN publishers p ON p.user_id = u.id
       WHERE s.id = $1 AND s.user_id = $2 AND s.token_hash = $3
         AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
      [payload.sid, payload.sub, hashToken(token)]
    );
    if (!result.rowCount) return res.status(401).json({ error: 'Session expired or revoked' });

    req.authToken = token;
    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
