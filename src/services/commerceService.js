const pool = require('../config/db');

function httpError(message, status = 400) { return Object.assign(new Error(message), { status }); }

async function getProductForCommerce(client, productId, variantId = null, lock = false) {
  const suffix = lock ? ' FOR UPDATE' : '';
  const p = await client.query(`
    SELECT p.id, p.name, p.description, p.product_type, p.price_paise, p.currency, p.status,
           p.stock, p.seller_id, p.publisher_id, p.category_id,
           c.name AS category_name, c.slug AS category_slug,
           (SELECT jsonb_build_object('id', pi.id, 'url', pi.image_url, 'alt_text', pi.alt_text)
              FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.position LIMIT 1) AS primary_image
    FROM products p JOIN categories c ON c.id=p.category_id
    WHERE p.id=$1${suffix}`, [productId]);
  if (!p.rowCount) throw httpError('Product not found', 404);
  const product = p.rows[0];
  if (product.status !== 'published') throw httpError('Product is not available', 409);

  let variant = null;
  if (variantId) {
    const v = await client.query(`SELECT id, product_id, sku, name, price_paise, stock_mode, stock_quantity, is_available, option_values FROM product_variants WHERE id=$1 AND product_id=$2${lock ? ' FOR UPDATE' : ''}`, [variantId, productId]);
    if (!v.rowCount) throw httpError('Variant not found for product', 400);
    variant = v.rows[0];
    if (!variant.is_available) throw httpError('Variant is unavailable', 409);
  }
  return { product, variant };
}

function currentUnitPrice(product, variant) {
  return variant && variant.price_paise != null ? Number(variant.price_paise) : Number(product.price_paise);
}

function availability(product, variant, quantity) {
  if (product.product_type !== 'physical') return true;
  if (variant) return variant.stock_mode === 'unlimited' || Number(variant.stock_quantity) >= quantity;
  return product.stock == null || Number(product.stock) >= quantity;
}

function fulfilmentFor(product) {
  if (product.product_type === 'physical') return 'shipping';
  if (product.product_type === 'service') return 'service';
  if (product.product_type === 'api' || product.product_type === 'software') return 'account';
  return 'download';
}

async function recordEvent({ userId, eventType, productId = null, categoryId = null, orderId = null, metadata = {} }) {
  try {
    await pool.query(`INSERT INTO commerce_events(user_id,event_type,product_id,category_id,order_id,metadata) VALUES($1,$2,$3,$4,$5,$6::jsonb)`, [userId || null, eventType, productId, categoryId, orderId, JSON.stringify(metadata)]);
  } catch (error) { console.error('Commerce event error:', error.message); }
}

async function checkout(client, userId, shippingAddress, idempotencyKey) {
  if (idempotencyKey) {
    const existing = await client.query('SELECT id FROM orders WHERE customer_id=$1 AND idempotency_key=$2', [userId, idempotencyKey]);
    if (existing.rowCount) return getOrder(client, userId, existing.rows[0].id);
  }

  const cart = await client.query('SELECT * FROM cart_items WHERE user_id=$1 ORDER BY created_at FOR UPDATE', [userId]);
  if (!cart.rowCount) throw httpError('Cart is empty', 400);

  let total = 0;
  let currency = 'INR';
  const prepared = [];
  let needsShipping = false;

  for (const item of cart.rows) {
    const { product, variant } = await getProductForCommerce(client, item.product_id, item.variant_id, true);
    if (!availability(product, variant, item.quantity)) throw httpError(`Insufficient inventory for ${product.name}`, 409);
    const price = currentUnitPrice(product, variant);
    currency = product.currency;
    total += price * item.quantity;
    if (product.product_type === 'physical') needsShipping = true;
    prepared.push({ item, product, variant, price, fulfilment: fulfilmentFor(product) });
  }
  if (needsShipping && (!shippingAddress || typeof shippingAddress !== 'object')) throw httpError('Shipping address is required for physical products', 400);

  const orderResult = await client.query(`INSERT INTO orders(customer_id,status,total_paise,currency,payment_status,fulfilment_status,shipping_address,idempotency_key) VALUES($1,'pending',$2,$3,'pending',$4,$5,$6) RETURNING id`, [userId,total,currency,needsShipping?'pending':'not_required',needsShipping?JSON.stringify(shippingAddress):null,idempotencyKey || null]);
  const orderId = orderResult.rows[0].id;

  for (const x of prepared) {
    const commission = await client.query(`SELECT COALESCE((SELECT rate_percent FROM commission_rules WHERE category_id=$1 AND product_type=$2 AND active=TRUE LIMIT 1),(SELECT rate_percent FROM commission_rules WHERE category_id=$1 AND product_type IS NULL AND active=TRUE LIMIT 1),0) AS rate`, [x.product.category_id,x.product.product_type]);
    const rate = Number(commission.rows[0].rate || 0);
    const gross = x.price * x.item.quantity;
    const commissionPaise = Math.round(gross * rate / 100);
    const snapshot = { id:x.product.id, name:x.product.name, description:x.product.description, product_type:x.product.product_type, currency:x.product.currency, price_paise:x.price, category_id:x.product.category_id, category_name:x.product.category_name, image:x.product.primary_image };
    const variantSnapshot = x.variant ? { id:x.variant.id, sku:x.variant.sku, name:x.variant.name, price_paise:x.variant.price_paise, option_values:x.variant.option_values } : null;
    const inserted = await client.query(`INSERT INTO order_items(order_id,product_id,seller_id,variant_id,quantity,unit_price_paise,commission_rate_percent,commission_paise,seller_payout_paise,product_snapshot,variant_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb) RETURNING id`, [orderId,x.product.id,x.product.seller_id,x.variant?.id || null,x.item.quantity,x.price,rate,commissionPaise,gross-commissionPaise,JSON.stringify(snapshot),variantSnapshot?JSON.stringify(variantSnapshot):null]);
    if (x.product.product_type !== 'physical') {
      await client.query(`INSERT INTO entitlements(customer_id,product_id,order_item_id,access_data) VALUES($1,$2,$3,$4::jsonb)`, [userId,x.product.id,inserted.rows[0].id,JSON.stringify({ fulfilment:x.fulfilment })]);
    }
    if (x.product.product_type === 'physical') {
      if (x.variant && x.variant.stock_mode !== 'unlimited') await client.query('UPDATE product_variants SET stock_quantity=stock_quantity-$2 WHERE id=$1 AND stock_quantity >= $2', [x.variant.id,x.item.quantity]);
      else if (!x.variant && x.product.stock != null) await client.query('UPDATE products SET stock=stock-$2 WHERE id=$1 AND stock >= $2', [x.product.id,x.item.quantity]);
    }
  }
  await client.query('DELETE FROM cart_items WHERE user_id=$1', [userId]);
  await client.query('INSERT INTO payments(order_id,user_id,provider,amount_paise,currency,status) VALUES($1,$2,$3,$4,$5,$6)', [orderId,userId,'pending-provider',total,currency,'pending']);
  return getOrder(client,userId,orderId);
}

async function getOrder(client, userId, orderId) {
  const order = await client.query('SELECT id,customer_id,status,total_paise,currency,payment_status,fulfilment_status,shipping_address,created_at,updated_at FROM orders WHERE id=$1 AND customer_id=$2', [orderId,userId]);
  if (!order.rowCount) return null;
  const items = await client.query('SELECT id,product_id,variant_id,quantity,unit_price_paise,commission_rate_percent,product_snapshot,variant_snapshot FROM order_items WHERE order_id=$1 ORDER BY id', [orderId]);
  const payment = await client.query('SELECT id,provider,provider_payment_id,amount_paise,currency,status,created_at,updated_at FROM payments WHERE order_id=$1', [orderId]);
  return { ...order.rows[0], items: items.rows, payment: payment.rows[0] || null };
}

module.exports = { httpError, getProductForCommerce, currentUnitPrice, availability, fulfilmentFor, recordEvent, checkout, getOrder };
