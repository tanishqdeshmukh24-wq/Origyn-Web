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
const analyticsRoutes = require('./src/routes/analytics');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');

const app = express();
const allowedOrigins = String(process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500')
  .split(',').map(v => v.trim()).filter(Boolean);

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); callback(new Error('Origin not allowed by CORS')); } }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/', (_req, res) => res.json({ message: 'Origyn backend is running!', version: '1.0' }));
app.get('/api/health', async (_req, res, next) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); } catch (error) { next(error); }
});

// Legacy compatibility only. New marketplace integrations must use /api/products.
app.get('/api/technologies', async (_req, res, next) => {
  try { const result = await pool.query('SELECT * FROM technologies ORDER BY id DESC'); res.json(result.rows); }
  catch (error) { next(error); }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/publishers', publisherRoutes);
app.use('/api/me', meRoutes);
app.use('/api/analytics', analyticsRoutes);

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
