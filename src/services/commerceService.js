const pool = require('../config/db');

const RESERVATION_MINUTES = 30;
const MAX_SAFE_PAISA = Number.MAX_SAFE_INTEGER;

function httpError(message, status = 400) { return Object.assign(new Error(message), { status }); }

function safePaise(value, field = 'amount') {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > MAX_SAFE_PAISA) throw httpError(`Invalid ${field}`);
  return n;
}

async function getProductForCommerce(client, productId, variantId = null, lock = false) {
  const suffix = lock ? ' FOR UPDATE' : '';
  const p = await client.query(`SELECT p.id,p.name,p.description,p.product_type,p.price_paise,p.currency,p.status,p.stock,p.seller_id,p.publisher_id,p.category_id,c.name AS category_name,c.slug AS category_slug,(SELECT jsonb_build_object('id',pi.id,'url',pi.image_url,'alt_text',pi.alt_text) FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.position LIMIT 1) AS primary_image FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=$1${suffix}`, [productId]);
  if (!p.rowCount) throw httpError('Product not found',404);
  const product=p.rows[0];
  if(product.status!=='published') throw httpError('Product is not available',409);
  let variant=null;
  if(variantId){
    const v=await client.query(`SELECT id,product_id,sku,name,price_paise,stock_mode,stock_quantity,is_available,option_values FROM product_variants WHERE id=$1 AND product_id=$2${lock?' FOR UPDATE':''}`,[variantId,productId]);
    if(!v.rowCount) throw httpError('Variant not found for product',400);
    variant=v.rows[0];
    if(!variant.is_available) throw httpError('Variant is unavailable',409);
  }
  return {product,variant};
}

function currentUnitPrice(product,variant){
  return safePaise(variant&&variant.price_paise!=null?variant.price_paise:product.price_paise,'product price');
}

function availability(product,variant,quantity){
  if(product.product_type!=='physical') return true;
  if(variant) return variant.stock_mode==='unlimited'||(variant.stock_quantity!=null&&Number(variant.stock_quantity)>=quantity);
  return product.stock==null||Number(product.stock)>=quantity;
}

function fulfilmentFor(product){
  if(product.product_type==='physical') return 'shipping';
  if(product.product_type==='service') return 'service';
  if(product.product_type==='api'||product.product_type==='software') return 'account';
  return 'download';
}

async function recordEvent({userId,eventType,productId=null,categoryId=null,orderId=null,metadata={}}){
  try{await pool.query('INSERT INTO commerce_events(user_id,event_type,product_id,category_id,order_id,metadata) VALUES($1,$2,$3,$4,$5,$6::jsonb)',[userId||null,eventType,productId,categoryId,orderId,JSON.stringify(metadata)]);}catch(error){console.error('Commerce event error:',error.message);}
}

function validateShippingAddress(address) {
  if(!address||typeof address!=='object'||Array.isArray(address)) throw httpError('Shipping address is required for physical products',400);
  const required=['name','address_line1','city','state','postal_code','country'];
  for(const field of required){
    if(typeof address[field]!=='string'||!address[field].trim()) throw httpError(`Shipping address ${field} is required`,400);
    if(address[field].trim().length>200) throw httpError(`Shipping address ${field} is too long`,400);
  }
  if(address.country.trim().length!==2) throw httpError('Shipping address country must be a 2-letter code',400);
  return {
    name:address.name.trim(), address_line1:address.address_line1.trim(), address_line2:typeof address.address_line2==='string'?address.address_line2.trim():undefined,
    city:address.city.trim(), state:address.state.trim(), postal_code:address.postal_code.trim(), country:address.country.trim().toUpperCase()
  };
}

async function activeReservedQuantity(client, productId, variantId, excludeReservationId=null) {
  await client.query(
    `UPDATE commerce_inventory_reservations
     SET status='expired', updated_at=NOW()
     WHERE product_id=$1 AND variant_id IS NOT DISTINCT FROM $2
       AND status='active' AND expires_at <= NOW()`,
    [productId, variantId]
  );
  const result=await client.query(
    `SELECT COALESCE(SUM(quantity),0) AS reserved_quantity
     FROM commerce_inventory_reservations
     WHERE product_id=$1 AND variant_id IS NOT DISTINCT FROM $2
       AND status='active' AND expires_at > NOW()
       AND ($3::uuid IS NULL OR id <> $3)`,
    [productId, variantId, excludeReservationId]
  );
  return Number(result.rows[0].reserved_quantity||0);
}

async function ensureInventoryAvailable(client, product, variant, quantity) {
  if(product.product_type!=='physical') return;
  if(variant){
    if(variant.stock_mode==='unlimited') return;
    const stock=Number(variant.stock_quantity);
    const reserved=await activeReservedQuantity(client,product.id,variant.id);
    if(!Number.isSafeInteger(stock)||stock-reserved<quantity) throw httpError(`Insufficient inventory for ${product.name}`,409);
    return;
  }
  if(product.stock==null) return;
  const stock=Number(product.stock);
  const reserved=await activeReservedQuantity(client,product.id,null);
  if(!Number.isSafeInteger(stock)||stock-reserved<quantity) throw httpError(`Insufficient inventory for ${product.name}`,409);
}

async function reserveInventory(client, orderId, orderItemId, product, variant, quantity) {
  if(product.product_type!=='physical') return;
  if(variant&&variant.stock_mode==='unlimited') return;
  if(!variant&&product.stock==null) return;
  await client.query(
    `INSERT INTO commerce_inventory_reservations(order_id,order_item_id,product_id,variant_id,quantity,expires_at)
     VALUES($1,$2,$3,$4,$5,NOW()+($6 * INTERVAL '1 minute'))`,
    [orderId,orderItemId,product.id,variant?.id||null,quantity,RESERVATION_MINUTES]
  );
}

async function releaseOrderReservations(client, orderId, finalStatus='released') {
  await client.query(
    `UPDATE commerce_inventory_reservations
     SET status=$1, updated_at=NOW()
     WHERE order_id=$2 AND status='active'`,
    [finalStatus,orderId]
  );
}

async function checkout(client,userId,shippingAddress,idempotencyKey){
  if(idempotencyKey){
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`${userId}:${idempotencyKey}`]);
    const existing=await client.query('SELECT id FROM orders WHERE customer_id=$1 AND idempotency_key=$2',[userId,idempotencyKey]);
    if(existing.rowCount){
      const order=await getOrder(client,userId,existing.rows[0].id);
      Object.defineProperty(order,'__idempotentReplay',{value:true,enumerable:false});
      return order;
    }
  }
  const cart=await client.query('SELECT * FROM cart_items WHERE user_id=$1 ORDER BY created_at FOR UPDATE',[userId]);
  if(!cart.rowCount) throw httpError('Cart is empty',400);
  let total=0,currency=null,needsShipping=false;
  const prepared=[];
  for(const item of cart.rows){
    const quantity=Number(item.quantity);
    if(!Number.isSafeInteger(quantity)||quantity<=0||quantity>100) throw httpError('Invalid cart quantity',400);
    const {product,variant}=await getProductForCommerce(client,item.product_id,item.variant_id,true);
    await ensureInventoryAvailable(client,product,variant,quantity);
    const price=currentUnitPrice(product,variant);
    if(currency===null) currency=product.currency;
    if(currency!==product.currency) throw httpError('Cart contains products with different currencies',409);
    const lineTotal=price*quantity;
    if(!Number.isSafeInteger(lineTotal)||lineTotal<0) throw httpError('Order total exceeds supported monetary range',400);
    total+=lineTotal;
    if(!Number.isSafeInteger(total)||total>MAX_SAFE_PAISA) throw httpError('Order total exceeds supported monetary range',400);
    if(product.product_type==='physical') needsShipping=true;
    prepared.push({item,product,variant,price,quantity,fulfilment:fulfilmentFor(product)});
  }
  const normalizedShipping=needsShipping?validateShippingAddress(shippingAddress):null;
  const orderResult=await client.query(`INSERT INTO orders(customer_id,status,total_paise,currency,payment_status,fulfilment_status,shipping_address,idempotency_key) VALUES($1,'pending',$2,$3,'pending',$4,$5,$6) RETURNING id`,[userId,total,currency||'INR',needsShipping?'pending':'not_required',needsShipping?JSON.stringify(normalizedShipping):null,idempotencyKey||null]);
  const orderId=orderResult.rows[0].id;
  for(const x of prepared){
    const commission=await client.query(`SELECT COALESCE((SELECT rate_percent FROM commission_rules WHERE category_id=$1 AND product_type=$2 AND active=TRUE LIMIT 1),(SELECT rate_percent FROM commission_rules WHERE category_id=$1 AND product_type IS NULL AND active=TRUE LIMIT 1),0) AS rate`,[x.product.category_id,x.product.product_type]);
    const rate=Number(commission.rows[0].rate||0);
    const gross=x.price*x.quantity;
    if(!Number.isFinite(rate)||rate<0||rate>100||!Number.isSafeInteger(gross)) throw httpError('Invalid commerce pricing configuration',500);
    const commissionPaise=Math.round(gross*rate/100);
    if(!Number.isSafeInteger(commissionPaise)||commissionPaise<0||commissionPaise>gross) throw httpError('Invalid commerce commission configuration',500);
    const snapshot={id:x.product.id,name:x.product.name,description:x.product.description,product_type:x.product.product_type,currency:x.product.currency,price_paise:x.price,category_id:x.product.category_id,category_name:x.product.category_name,image:x.product.primary_image};
    const variantSnapshot=x.variant?{id:x.variant.id,sku:x.variant.sku,name:x.variant.name,price_paise:x.variant.price_paise!=null?safePaise(x.variant.price_paise,'variant price'):null,option_values:x.variant.option_values}:null;
    const itemResult=await client.query(`INSERT INTO order_items(order_id,product_id,seller_id,variant_id,quantity,unit_price_paise,commission_rate_percent,commission_paise,seller_payout_paise,product_snapshot,variant_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb) RETURNING id`,[orderId,x.product.id,x.product.seller_id,x.variant?.id||null,x.quantity,x.price,rate,commissionPaise,gross-commissionPaise,JSON.stringify(snapshot),variantSnapshot?JSON.stringify(variantSnapshot):null]);
    await reserveInventory(client,orderId,itemResult.rows[0].id,x.product,x.variant,x.quantity);
  }
  await client.query('DELETE FROM cart_items WHERE user_id=$1',[userId]);
  await client.query('INSERT INTO payments(order_id,user_id,provider,amount_paise,currency,status) VALUES($1,$2,$3,$4,$5,$6)',[orderId,userId,process.env.PAYMENT_PROVIDER||'pending-provider',total,currency||'INR','pending']);
  return getOrder(client,userId,orderId);
}

async function finalizeCapturedPayment(client,orderId,providerPaymentId=null,providerPayload={}){
  const orderResult=await client.query('SELECT id,customer_id,status,payment_status,fulfilment_status,total_paise FROM orders WHERE id=$1 FOR UPDATE',[orderId]);
  if(!orderResult.rowCount) throw httpError('Order not found',404);
  const order=orderResult.rows[0];
  const paymentResult=await client.query('SELECT id,status,amount_paise FROM payments WHERE order_id=$1 FOR UPDATE',[orderId]);
  if(!paymentResult.rowCount) throw httpError('Payment not found',404);
  const payment=paymentResult.rows[0];
  if(payment.status==='captured'||order.payment_status==='paid') return {alreadyFinalized:true};
  if(!['pending','authorized'].includes(payment.status)||!['pending','authorized'].includes(order.payment_status)) throw httpError('Payment cannot be captured from its current state',409);
  if(Number(payment.amount_paise)!==Number(order.total_paise)) throw httpError('Payment amount does not match order total',409);

  const items=await client.query(`SELECT oi.id,oi.product_id,oi.variant_id,oi.quantity,p.product_type,p.stock,v.stock_mode,v.stock_quantity FROM order_items oi JOIN products p ON p.id=oi.product_id LEFT JOIN product_variants v ON v.id=oi.variant_id WHERE oi.order_id=$1 ORDER BY oi.id`,[orderId]);
  for(const item of items.rows){
    if(item.product_type!=='physical'){
      await client.query(`INSERT INTO entitlements(customer_id,product_id,order_item_id,access_data) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT (order_item_id) DO NOTHING`,[order.customer_id,item.product_id,item.id,JSON.stringify({fulfilment:fulfilmentFor(item)})]);
      continue;
    }

    const reservationResult=await client.query('SELECT id,status,quantity,expires_at,variant_id FROM commerce_inventory_reservations WHERE order_item_id=$1 FOR UPDATE',[item.id]);
    const reservation=reservationResult.rows[0]||null;
    if(reservation&&reservation.status==='active'&&new Date(reservation.expires_at)<=new Date()){
      await client.query("UPDATE commerce_inventory_reservations SET status='expired',updated_at=NOW() WHERE id=$1",[reservation.id]);
      reservation.status='expired';
    }

    if(item.variant_id&&item.stock_mode!=='unlimited'){
      const variant=await client.query('SELECT stock_quantity FROM product_variants WHERE id=$1 FOR UPDATE',[item.variant_id]);
      if(!variant.rowCount) throw httpError(`Variant not found for order item ${item.product_id}`,409);
      const stock=Number(variant.rows[0].stock_quantity);
      const competingReserved=await activeReservedQuantity(client,item.product_id,item.variant_id,reservation?.id||null);
      if(!Number.isSafeInteger(stock)||stock-competingReserved<item.quantity) throw httpError(`Insufficient available inventory for order item ${item.product_id}`,409);
      const updated=await client.query('UPDATE product_variants SET stock_quantity=stock_quantity-$2 WHERE id=$1 AND stock_quantity >= $2',[item.variant_id,item.quantity]);
      if(!updated.rowCount) throw httpError(`Insufficient inventory for order item ${item.product_id}`,409);
    }else if(!item.variant_id&&item.stock!=null){
      const product=await client.query('SELECT stock FROM products WHERE id=$1 FOR UPDATE',[item.product_id]);
      if(!product.rowCount) throw httpError(`Product not found for order item ${item.product_id}`,409);
      const stock=Number(product.rows[0].stock);
      const competingReserved=await activeReservedQuantity(client,item.product_id,null,reservation?.id||null);
      if(!Number.isSafeInteger(stock)||stock-competingReserved<item.quantity) throw httpError(`Insufficient available inventory for order item ${item.product_id}`,409);
      const updated=await client.query('UPDATE products SET stock=stock-$2 WHERE id=$1 AND stock >= $2',[item.product_id,item.quantity]);
      if(!updated.rowCount) throw httpError(`Insufficient inventory for order item ${item.product_id}`,409);
    }
    if(reservation&&['active','expired'].includes(reservation.status)){
      await client.query("UPDATE commerce_inventory_reservations SET status='consumed',updated_at=NOW() WHERE id=$1",[reservation.id]);
    }
  }
  await client.query(`UPDATE payments SET status='captured',provider_payment_id=COALESCE($1,provider_payment_id),provider_payload=$2::jsonb,updated_at=NOW() WHERE id=$3`,[providerPaymentId,JSON.stringify(providerPayload),payment.id]);
  const fulfilmentStatus=items.rows.some(x=>x.product_type==='physical')?'pending':'completed';
  await client.query(`UPDATE orders SET payment_status='paid',status=CASE WHEN status='pending' THEN 'confirmed' ELSE status END,fulfilment_status=$1,updated_at=NOW() WHERE id=$2`,[fulfilmentStatus,orderId]);
  return {alreadyFinalized:false};
}

async function getOrder(client,userId,orderId){
  const order=await client.query('SELECT id,customer_id,status,total_paise,currency,payment_status,fulfilment_status,shipping_address,created_at,updated_at FROM orders WHERE id=$1 AND customer_id=$2',[orderId,userId]);
  if(!order.rowCount) return null;
  const items=await client.query('SELECT id,product_id,variant_id,quantity,unit_price_paise,commission_rate_percent,product_snapshot,variant_snapshot FROM order_items WHERE order_id=$1 ORDER BY id',[orderId]);
  const payment=await client.query('SELECT id,provider,provider_payment_id,amount_paise,currency,status,created_at,updated_at FROM payments WHERE order_id=$1',[orderId]);
  return {...order.rows[0],items:items.rows,payment:payment.rows[0]||null};
}

module.exports={httpError,getProductForCommerce,currentUnitPrice,availability,fulfilmentFor,recordEvent,checkout,finalizeCapturedPayment,getOrder,releaseOrderReservations};
