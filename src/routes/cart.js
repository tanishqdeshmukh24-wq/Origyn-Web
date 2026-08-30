const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { getProductForCommerce, currentUnitPrice, availability, recordEvent, httpError } = require('../services/commerceService');

const router = express.Router();
router.use(authenticate);

async function cartResponse(userId) {
  const result = await pool.query(`SELECT ci.id,ci.product_id,ci.variant_id,ci.quantity,ci.unit_price_paise,ci.product_snapshot,ci.variant_snapshot,ci.created_at,ci.updated_at,p.status FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.user_id=$1 ORDER BY ci.created_at`, [userId]);
  const total = result.rows.reduce((sum,x)=>sum+Number(x.unit_price_paise)*x.quantity,0);
  return { items: result.rows, total_paise: total, currency: 'INR' };
}
router.get('/', async (req,res,next)=>{try{res.json(await cartResponse(req.user.id));}catch(e){next(e);}});

router.post('/items', async (req,res,next)=>{
  const client=await pool.connect();
  try {
    const { product_id, variant_id=null, quantity=1 }=req.body;
    if(!product_id || !Number.isInteger(quantity) || quantity<1 || quantity>1000) throw httpError('product_id and a valid quantity are required');
    await client.query('BEGIN');
    const {product,variant}=await getProductForCommerce(client,product_id,variant_id,false);
    if(!availability(product,variant,quantity)) throw httpError('Insufficient inventory',409);
    const price=currentUnitPrice(product,variant);
    const snapshot={id:product.id,name:product.name,product_type:product.product_type,currency:product.currency,price_paise:price,image:product.primary_image};
    const result=await client.query(`INSERT INTO cart_items(user_id,product_id,variant_id,quantity,unit_price_paise,product_snapshot,variant_snapshot) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) ON CONFLICT (user_id,product_id,COALESCE(variant_id,'00000000-0000-0000-0000-000000000000'::uuid)) DO UPDATE SET quantity=cart_items.quantity+EXCLUDED.quantity,unit_price_paise=EXCLUDED.unit_price_paise,product_snapshot=EXCLUDED.product_snapshot,variant_snapshot=EXCLUDED.variant_snapshot,updated_at=NOW() RETURNING *`,[req.user.id,product_id,variant_id,quantity,price,JSON.stringify(snapshot),variant?JSON.stringify(variant):null]);
    await client.query('COMMIT');
    await recordEvent({userId:req.user.id,eventType:'cart_item_added',productId,categoryId:product.category_id,metadata:{quantity}});
    res.status(201).json(result.rows[0]);
  }catch(e){await client.query('ROLLBACK').catch(()=>{});next(e);}finally{client.release();}
});

router.patch('/items/:id', async(req,res,next)=>{try{const quantity=Number(req.body.quantity);if(!Number.isInteger(quantity)||quantity<1||quantity>1000)throw httpError('Quantity must be a positive integer');const client=await pool.connect();try{await client.query('BEGIN');const r=await client.query('SELECT ci.*,p.status,p.stock,p.product_type FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.id=$1 AND ci.user_id=$2 FOR UPDATE',[req.params.id,req.user.id]);if(!r.rowCount)throw httpError('Cart item not found',404);const {product,variant}=await getProductForCommerce(client,r.rows[0].product_id,r.rows[0].variant_id,false);if(!availability(product,variant,quantity))throw httpError('Insufficient inventory',409);const price=currentUnitPrice(product,variant);const u=await client.query('UPDATE cart_items SET quantity=$1,unit_price_paise=$2,updated_at=NOW() WHERE id=$3 AND user_id=$4 RETURNING *',[quantity,price,req.params.id,req.user.id]);await client.query('COMMIT');res.json(u.rows[0]);}catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}}catch(e){next(e);}});

router.delete('/items/:id',async(req,res,next)=>{try{const r=await pool.query('DELETE FROM cart_items WHERE id=$1 AND user_id=$2 RETURNING product_id',[req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({error:'Cart item not found'});await recordEvent({userId:req.user.id,eventType:'cart_item_removed',productId:r.rows[0].product_id});res.status(204).end();}catch(e){next(e);}});
router.delete('/',async(req,res,next)=>{try{await pool.query('DELETE FROM cart_items WHERE user_id=$1',[req.user.id]);res.status(204).end();}catch(e){next(e);}});
module.exports=router;
