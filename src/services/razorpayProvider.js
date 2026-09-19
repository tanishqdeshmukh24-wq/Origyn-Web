const crypto = require('crypto');

const API_BASE = String(process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com/v1').replace(/\/$/, '');

function config() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!keyId || !keySecret) {
    const error = new Error('Razorpay credentials are not configured');
    error.status = 503;
    throw error;
  }
  return { keyId, keySecret };
}

async function razorpayRequest(path, options = {}) {
  const { keyId, keySecret } = config();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error(body?.error?.description || body?.error?.reason || 'Razorpay API request failed');
    error.status = response.status >= 500 ? 502 : 502;
    throw error;
  }
  return body;
}

async function createOrder({ amountPaise, currency, receipt, notes }) {
  const body = await razorpayRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: amountPaise,
      currency,
      receipt: String(receipt).slice(0, 40),
      notes
    })
  });
  if (!body?.id || Number(body.amount) !== Number(amountPaise) || String(body.currency).toUpperCase() !== String(currency).toUpperCase()) {
    const error = new Error('Razorpay returned an invalid order');
    error.status = 502;
    throw error;
  }
  return body;
}

async function fetchPayment(paymentId) {
  if (!paymentId || !/^pay_[A-Za-z0-9]+$/.test(String(paymentId))) {
    const error = new Error('Invalid Razorpay payment ID');
    error.status = 400;
    throw error;
  }
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' });
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const { keySecret } = config();
  const supplied = String(signature || '');
  if (!orderId || !paymentId || !/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

function verifyWebhookSignature(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!secret || !rawBody || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const supplied = String(signature);
  return supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

function eventToPayment(body) {
  const event = body?.event;
  const entity = body?.payload?.payment?.entity;
  if (!entity) return null;
  const statusMap = {
    'payment.authorized': 'authorized',
    'payment.captured': 'captured',
    'order.paid': 'captured',
    'payment.failed': 'failed'
  };
  const status = statusMap[event];
  if (!status || !entity.id || !entity.order_id) return null;
  return {
    status,
    provider_payment_id: entity.id,
    order_id: entity.order_id,
    amount_paise: entity.amount,
    currency: entity.currency,
    payload: body
  };
}

module.exports = {
  createOrder,
  fetchPayment,
  verifyPaymentSignature,
  verifyWebhookSignature,
  eventToPayment
};
