const crypto = require('crypto');

const PRODUCT_TYPES = new Set(['physical', 'digital', 'software', 'ai_model', 'dataset', 'api', 'service', 'other']);
const DELIVERY_METHODS = new Set(['shipping', 'download', 'account', 'api', 'service']);
const ECOSYSTEM_STATUSES = new Set(['origyn_owned', 'origyn_member', 'external']);

function slugify(value) {
  return String(value || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uniqueSlug(name) {
  return `${slugify(name) || 'product'}-${crypto.randomBytes(4).toString('hex')}`;
}

function toPaise(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

function validateProductInput(body, { publishing = false } = {}) {
  const errors = [];
  if (!body || typeof body !== 'object') return ['Request body is required'];
  if (publishing || body.name !== undefined) {
    if (!String(body.name || '').trim()) errors.push('name is required');
  }
  if (publishing || body.description !== undefined) {
    if (!String(body.description || '').trim()) errors.push('description is required');
  }
  if (publishing || body.product_type !== undefined) {
    if (!PRODUCT_TYPES.has(body.product_type)) errors.push('product_type is invalid');
  }
  if (publishing || body.category_id !== undefined || body.category_slug !== undefined) {
    if (!body.category_id && !body.category_slug) errors.push('category_id or category_slug is required');
  }
  if (publishing || body.price !== undefined || body.price_paise !== undefined) {
    const paise = body.price_paise !== undefined ? Number(body.price_paise) : toPaise(body.price);
    if (!Number.isInteger(paise) || paise < 0) errors.push('price must be a non-negative amount');
  }
  if (body.delivery?.method && !DELIVERY_METHODS.has(body.delivery.method)) errors.push('delivery.method is invalid');
  if (body.ecosystem_status && !ECOSYSTEM_STATUSES.has(body.ecosystem_status)) errors.push('ecosystem_status is invalid');
  if (Array.isArray(body.images) && body.images.length > 6) errors.push('A maximum of 6 images is supported');
  if (Array.isArray(body.images)) {
    body.images.forEach((image, i) => { if (!image || !String(image.url || image.image_url || '').trim()) errors.push(`images[${i}].url is required`); });
  }
  if (body.inventory?.stock_mode === 'limited') {
    const q = Number(body.inventory.stock_quantity);
    if (!Number.isInteger(q) || q < 0) errors.push('inventory.stock_quantity must be a non-negative integer');
  }
  if (publishing) {
    if (!body.delivery?.method) errors.push('delivery.method is required before publishing');
    if (body.delivery?.method === 'shipping' && !String(body.shipping?.ships_from || '').trim()) errors.push('shipping.ships_from is required for shipped products');
    if (!body.policies?.seller_rights_confirmed) errors.push('seller rights must be confirmed before publishing');
  }
  return errors;
}

async function resolveCategory(client, body) {
  if (body.category_id) {
    const r = await client.query('SELECT id FROM categories WHERE id = $1', [body.category_id]);
    return r.rows[0]?.id || null;
  }
  if (body.category_slug) {
    const aliases = { home: 'home-living', beauty: 'beauty-personal-care', sports: 'sports-fitness', books: 'books-education', toys: 'toys-hobbies', jewellery: 'jewellery-accessories', kitchen: 'kitchen-appliances', art: 'art-collectibles', pets: 'pet-supplies', garden: 'garden-outdoor' };
    const slug = aliases[body.category_slug] || body.category_slug;
    const r = await client.query('SELECT id FROM categories WHERE slug = $1', [slug]);
    return r.rows[0]?.id || null;
  }
  return null;
}

async function replaceProductChildren(client, productId, body) {
  if (body.images !== undefined) {
    await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
    for (const [i, image] of (body.images || []).entries()) {
      await client.query(
        `INSERT INTO product_images(product_id, image_url, alt_text, position, is_primary)
         VALUES($1,$2,$3,$4,$5)`,
        [productId, image.url || image.image_url, image.alt_text || null, i, Boolean(image.is_primary || i === 0)]
      );
    }
  }

  if (body.options !== undefined) {
    await client.query('DELETE FROM product_options WHERE product_id = $1', [productId]);
    for (const [i, option] of (body.options || []).entries()) {
      const optionResult = await client.query(
        'INSERT INTO product_options(product_id, name, position) VALUES($1,$2,$3) RETURNING id',
        [productId, String(option.name || '').trim(), i]
      );
      for (const [j, value] of (option.values || []).entries()) {
        await client.query(
          'INSERT INTO product_option_values(option_id, value, position) VALUES($1,$2,$3)',
          [optionResult.rows[0].id, String(value).trim(), j]
        );
      }
    }
  }

  if (body.variants !== undefined) {
    await client.query('DELETE FROM product_variants WHERE product_id = $1', [productId]);
    for (const [i, variant] of (body.variants || []).entries()) {
      await client.query(
        `INSERT INTO product_variants(product_id, sku, name, price_paise, stock_mode, stock_quantity, is_available, option_values, position)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
        [productId, variant.sku || null, variant.name || null,
          variant.price_paise ?? (variant.price !== undefined ? toPaise(variant.price) : null),
          variant.stock_mode || 'limited', variant.stock_mode === 'unlimited' ? null : (variant.stock_quantity ?? 0),
          variant.is_available !== false, JSON.stringify(variant.option_values || {}), i]
      );
    }
  }

  if (body.inventory !== undefined) {
    const inv = body.inventory || {};
    await client.query(
      `INSERT INTO product_inventory(product_id, stock_mode, stock_quantity, is_available)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(product_id) DO UPDATE SET stock_mode=EXCLUDED.stock_mode, stock_quantity=EXCLUDED.stock_quantity,
         is_available=EXCLUDED.is_available, updated_at=NOW()`,
      [productId, inv.stock_mode || 'limited', inv.stock_mode === 'unlimited' ? null : (inv.stock_quantity ?? 0), inv.is_available !== false]
    );
  }

  if (body.delivery !== undefined) {
    const delivery = body.delivery || {};
    await client.query(
      `INSERT INTO product_delivery(product_id, method, fulfilment_note) VALUES($1,$2,$3)
       ON CONFLICT(product_id) DO UPDATE SET method=EXCLUDED.method, fulfilment_note=EXCLUDED.fulfilment_note`,
      [productId, delivery.method, delivery.fulfilment_note || delivery.note || null]
    );
    if (delivery.method !== 'shipping') await client.query('DELETE FROM product_shipping WHERE product_id = $1', [productId]);
  }

  if (body.shipping !== undefined && body.delivery?.method === 'shipping') {
    const shipping = body.shipping || {};
    await client.query(
      `INSERT INTO product_shipping(product_id, ships_from, processing_time, shipping_config) VALUES($1,$2,$3,$4::jsonb)
       ON CONFLICT(product_id) DO UPDATE SET ships_from=EXCLUDED.ships_from, processing_time=EXCLUDED.processing_time,
         shipping_config=EXCLUDED.shipping_config`,
      [productId, shipping.ships_from || null, shipping.processing_time || null, JSON.stringify(shipping.config || shipping.shipping_config || {})]
    );
  }

  if (body.policies !== undefined) {
    const p = body.policies || {};
    await client.query(
      `INSERT INTO product_policies(product_id, refund_policy, seller_rights_confirmed, custom_policy) VALUES($1,$2,$3,$4)
       ON CONFLICT(product_id) DO UPDATE SET refund_policy=EXCLUDED.refund_policy,
         seller_rights_confirmed=EXCLUDED.seller_rights_confirmed, custom_policy=EXCLUDED.custom_policy`,
      [productId, p.refund_policy || 'standard', Boolean(p.seller_rights_confirmed), p.custom_policy || null]
    );
  }
}

module.exports = { PRODUCT_TYPES, DELIVERY_METHODS, slugify, uniqueSlug, toPaise, validateProductInput, resolveCategory, replaceProductChildren };
