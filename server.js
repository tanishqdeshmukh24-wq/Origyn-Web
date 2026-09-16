const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const pool = require('./src/config/db');
const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const categoryRoutes = require('./src/routes/categories');
const publisherRoutes = require('./src/routes/publishers');
const meRoutes = require('./src/routes/me');
const sellerRoutes = require('./src/routes/seller');
const sellerPublicRoutes = require('./src/routes/seller-public');
const sellerAgreementRoutes = require('./src/routes/seller-agreements');
const payoutRoutes = require('./src/routes/payouts');
const cartRoutes = require('./src/routes/cart');
const wishlistRoutes = require('./src/routes/wishlist');
const reviewRoutes = require('./src/routes/reviews');
const orderRoutes = require('./src/routes/orders');
const paymentRoutes = require('./src/routes/payments');
const eventRoutes = require('./src/routes/events');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');

const app = express();
const allowedOrigins = String(process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500')
  .split(',').map(v => v.trim()).filter(Boolean);

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); callback(new Error('Origin not allowed by CORS')); } }));
app.use(express.json({ limit: '1mb' }));

const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false });
const commerceRateLimit = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false });
const sellerRateLimit = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
const webhookRateLimit = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false });
const payoutRateLimit = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false });

app.use('/api/auth', authRateLimit);
app.use('/api/seller', sellerRateLimit);
app.use('/api/seller-public', commerceRateLimit);
app.use('/api/seller-agreements', sellerRateLimit);
app.use('/api/payouts', payoutRateLimit);
app.use('/api/cart', commerceRateLimit);
app.use('/api/wishlist', commerceRateLimit);
app.use('/api/orders', commerceRateLimit);
app.use('/api/payments', commerceRateLimit);
app.use('/api/payments/webhooks', webhookRateLimit);
app.use('/api/commerce-events', commerceRateLimit);

app.get('/', (_req, res) => res.json({ message: 'Origyn backend is running!', version: '1.0' }));
app.get('/api/health', async (_req, res, next) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); } catch (error) { next(error); }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/publishers', publisherRoutes);
app.use('/api/me', meRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/seller-public', sellerPublicRoutes);
app.use('/api/seller-agreements', sellerAgreementRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api', commerceRateLimit, reviewRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/commerce-events', eventRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.status || (error.code === '22P02' ? 400 : 500);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : error.message });
});

const PORT = Number(process.env.PORT || 5000);
const server = app.listen(PORT, () => console.log(`Origyn backend running on port ${PORT}`));

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => { await pool.end(); process.exit(0); });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
