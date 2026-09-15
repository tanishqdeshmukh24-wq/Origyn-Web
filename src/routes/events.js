const express=require('express');
const pool=require('../config/db');
const {authenticate}=require('../middleware/auth');
const {recordEvent,httpError}=require('../services/commerceService');
const router=express.Router();
router.use(authenticate);
const allowed=new Set(['product_viewed','product_searched','category_interacted']);
const MAX_METADATA_BYTES=16*1024;
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalUuid(value,field){
  if(value===null||value===undefined||value==='') return null;
  if(typeof value!=='string'||!UUID_RE.test(value)) throw httpError(`${field} must be a valid UUID`);
  return value;
}

router.post('/',async(req,res,next)=>{
  try{
    const {event_type,product_id=null,category_id=null,metadata={}}=req.body;
    if(!allowed.has(event_type)) throw httpError('Unsupported client event');
    if(metadata===null||typeof metadata!=='object'||Array.isArray(metadata)) throw httpError('metadata must be an object');
    if(Buffer.byteLength(JSON.stringify(metadata),'utf8')>MAX_METADATA_BYTES) throw httpError('metadata is too large',413);

    const productId=optionalUuid(product_id,'product_id');
    const categoryId=optionalUuid(category_id,'category_id');

    if(event_type==='product_viewed'&&!productId) throw httpError('product_id is required for product_viewed');
    if(event_type==='category_interacted'&&!categoryId) throw httpError('category_id is required for category_interacted');

    if(productId){
      const product=await pool.query('SELECT id,status FROM products WHERE id=$1',[productId]);
      if(!product.rowCount) throw httpError('Product not found',404);
      if(event_type==='product_viewed'&&product.rows[0].status!=='published') throw httpError('Product is not available',409);
    }
    if(categoryId){
      const category=await pool.query('SELECT id FROM categories WHERE id=$1',[categoryId]);
      if(!category.rowCount) throw httpError('Category not found',404);
    }

    await recordEvent({userId:req.user.id,eventType:event_type,productId,categoryId,metadata});
    res.status(202).json({accepted:true});
  }catch(e){next(e);}
});

module.exports=router;
