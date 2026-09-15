const pool = require('../config/db');
const { uniqueSlug, toPaise, resolveCategory, replaceProductChildren } = require('../utils/product');

const PRODUCT_SELECT = `
SELECT p.id, p.publisher_id, p.category_id, p.name, p.slug, p.description, p.product_type,
       p.price_paise, p.currency, p.stock, p.status, p.metadata, p.ecosystem_status,
       p.created_at, p.updated_at,
       c.name AS category_name, c.slug AS category_slug,
       pub.display_name AS publisher_name, pub.slug AS publisher_slug,
       pub.verified AS publisher_verified, pub.origyn_member AS publisher_origyn_member,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('id', pi.id, 'url', pi.image_url, 'alt_text', pi.alt_text,
         'position', pi.position, 'is_primary', pi.is_primary) ORDER BY pi.position)
         FROM product_images pi WHERE pi.product_id = p.id), '[]'::jsonb) AS images,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('id', po.id, 'name', po.name, 'position', po.position,
         'values', COALESCE((SELECT jsonb_agg(pov.value ORDER BY pov.position) FROM product_option_values pov WHERE pov.option_id=po.id), '[]'::jsonb)) ORDER BY po.position)
         FROM product_options po WHERE po.product_id = p.id), '[]'::jsonb) AS options,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('id', pv.id, 'sku', pv.sku, 'name', pv.name,
         'price_paise', pv.price_paise, 'stock_mode', pv.stock_mode, 'stock_quantity', pv.stock_quantity,
         'is_available', pv.is_available, 'option_values', pv.option_values, 'position', pv.position) ORDER BY pv.position)
         FROM product_variants pv WHERE pv.product_id = p.id), '[]'::jsonb) AS variants,
       (SELECT to_jsonb(pi2) - 'id' - 'product_id' FROM product_inventory pi2 WHERE pi2.product_id=p.id) AS inventory,
       (SELECT to_jsonb(pd) - 'id' - 'product_id' FROM product_delivery pd WHERE pd.product_id=p.id) AS delivery,
       (SELECT to_jsonb(ps) - 'id' - 'product_id' FROM product_shipping ps WHERE ps.product_id=p.id) AS shipping,
       (SELECT to_jsonb(pp) - 'id' - 'product_id' FROM product_policies pp WHERE pp.product_id=p.id) AS policies
FROM products p
JOIN categories c ON c.id = p.category_id
LEFT JOIN publishers pub ON pub.id = p.publisher_id`;

async function getProduct(id, { includeUnpublished = false, publisherId = null, admin = false } = {}) {
  const params = [id];
  let visibility = `p.status = 'published'`;
  if (admin) visibility = 'TRUE';
  else if (includeUnpublished && publisherId) { params.push(publisherId); visibility = `(p.status = 'published' OR p.publisher_id = $2)`; }
  const result = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1 AND ${visibility}`, params);
  return result.rows[0] || null;
}

async function createProduct(user, body) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const categoryId = await resolveCategory(client, body);
    if (!categoryId) throw Object.assign(new Error('Category not found'), { status: 400 });
    const pricePaise = body.price_paise !== undefined ? Number(body.price_paise) : toPaise(body.price);
    const ecosystem = user.role === 'admin' && body.ecosystem_status ? body.ecosystem_status : (user.origyn_member ? 'origyn_member' : 'external');
    const result = await client.query(
      `INSERT INTO products(seller_id, publisher_id, category_id, name, slug, description, product_type,
         price_paise, currency, status, metadata, ecosystem_status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10::jsonb,$11) RETURNING id`,
      [user.id, user.publisher_id, categoryId, body.name.trim(), uniqueSlug(body.name), body.description || null,
       body.product_type, pricePaise ?? 0, String(body.currency || 'INR').toUpperCase(), JSON.stringify(body.metadata || {}), ecosystem]
    );
    await replaceProductChildren(client, result.rows[0].id, body);
    await client.query('COMMIT');
    return getProduct(result.rows[0].id, { includeUnpublished: true, publisherId: user.publisher_id });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function updateProduct(user, productId, body) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owned = await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE', [productId]);
    if (!owned.rowCount) throw Object.assign(new Error('Product not found'), { status: 404 });
    const product = owned.rows[0];
    if (user.role !== 'admin' && product.publisher_id !== user.publisher_id) throw Object.assign(new Error('You do not own this product'), { status: 403 });
    if (product.status === 'archived' && user.role !== 'admin') throw Object.assign(new Error('Archived products cannot be edited'), { status: 409 });

    let categoryId = product.category_id;
    if (body.category_id !== undefined || body.category_slug !== undefined) {
      categoryId = await resolveCategory(client, body);
      if (!categoryId) throw Object.assign(new Error('Category not found'), { status: 400 });
    }
    const pricePaise = body.price_paise !== undefined ? Number(body.price_paise) : (body.price !== undefined ? toPaise(body.price) : product.price_paise);
    const ecosystem = user.role === 'admin' && body.ecosystem_status ? body.ecosystem_status : product.ecosystem_status;
    await client.query(
      `UPDATE products SET category_id=$2, name=$3, description=$4, product_type=$5, price_paise=$6,
         currency=$7, metadata=$8::jsonb, ecosystem_status=$9, updated_at=NOW() WHERE id=$1`,
      [productId, categoryId, body.name ?? product.name, body.description ?? product.description,
       body.product_type ?? product.product_type, pricePaise, body.currency ? String(body.currency).toUpperCase() : product.currency,
       JSON.stringify(body.metadata ?? product.metadata ?? {}), ecosystem]
    );
    await replaceProductChildren(client, productId, body);
    await client.query('COMMIT');
    return getProduct(productId, { includeUnpublished: true, publisherId: user.publisher_id, admin: user.role === 'admin' });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function setStatus(user, productId, status) {
  const result = await pool.query(
    `UPDATE products SET status=$3, updated_at=NOW()
     WHERE id=$1 AND ($2::boolean OR publisher_id=$4) RETURNING id`,
    [productId, user.role === 'admin', status, user.publisher_id]
  );
  if (!result.rowCount) throw Object.assign(new Error('Product not found or not owned by publisher'), { status: 404 });
  return getProduct(productId, { includeUnpublished: true, publisherId: user.publisher_id, admin: user.role === 'admin' });
}

module.exports = { PRODUCT_SELECT, getProduct, createProduct, updateProduct, setStatus };
