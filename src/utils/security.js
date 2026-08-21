const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const PASSWORD_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

async function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signAccessToken(user, sessionId) {
  return jwt.sign(
    { sub: user.id, role: user.role, sid: sessionId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d', issuer: 'origyn-api', audience: 'origyn-web' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'origyn-api',
    audience: 'origyn-web'
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sessionExpiry() {
  const days = Math.max(1, Number(process.env.SESSION_DAYS || 7));
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

module.exports = { hashPassword, verifyPassword, signAccessToken, verifyAccessToken, hashToken, sessionExpiry };
