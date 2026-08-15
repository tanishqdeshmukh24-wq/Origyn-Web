document.addEventListener('DOMContentLoaded',()=>{
  const modal=document.querySelector('#product-modal');
  if(!modal) return;
  const info=modal.querySelector('.modal-info');
  const makeEnhancement=()=>{
    if(!modal.classList.contains('open')||!info) return;
    let rating=info.querySelector('.modal-rating');
    if(!rating) return;
    if(!info.querySelector('.review-preview')){
      const preview=document.createElement('div');
      preview.className='review-preview';
      preview.innerHTML='<strong>What shoppers are saying</strong><p>Reviews will be collected from verified purchases once accounts and the common API are connected.</p><button type="button" class="review-cta">View all reviews <span>→</span></button>';
      rating.insertAdjacentElement('afterend',preview);
    }
    if(!info.querySelector('.related-preview')){
      const current=(document.querySelector('#modal-name')?.textContent||'').trim();
      const names=[...document.querySelectorAll('.product-card h3')].map(x=>x.textContent.trim()).filter(x=>x&&x!==current).slice(0,3);
      if(names.length){
        const related=document.createElement('div');
        related.className='related-preview';
        related.innerHTML='<div class="related-title"><strong>You may also like</strong><span>Based on this product</span></div><div class="related-chips">'+names.map(n=>'<button type="button" class="related-product-name" data-related="'+n.replace(/"/g,'&quot;')+'"><span>'+n+'</span><b>→</b></button>').join('')+'</div><button type="button" class="similar-cta">View similar products <span>→</span></button>';
        info.appendChild(related);
        related.addEventListener('click',e=>{const b=e.target.closest('[data-related]');if(!b)return;const target=[...document.querySelectorAll('.product-card h3')].find(x=>x.textContent.trim()===b.dataset.related);if(target){modal.classList.remove('open');target.closest('.product-card')?.querySelector('[data-view]')?.click();}});
        related.querySelector('.similar-cta').addEventListener('click',()=>{modal.classList.remove('open');document.querySelector('#discover')?.scrollIntoView({behavior:'smooth',block:'start'});});
      }
    }
  };
  new MutationObserver(makeEnhancement).observe(modal,{attributes:true,attributeFilter:['class']});
  const style=document.createElement('style');
  style.textContent=`
    .store-page .review-cta,.store-page .similar-cta{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;min-height:42px!important;padding:11px 17px!important;border:1px solid #d8cfc3!important;border-radius:12px!important;background:#fff!important;color:#222!important;font:900 11px/1 inherit!important;letter-spacing:.2px!important;cursor:pointer!important;box-sizing:border-box!important;transition:all .2s ease!important}
    .store-page .review-cta:hover,.store-page .similar-cta:hover{background:#ff6b35!important;border-color:#ff6b35!important;color:#fff!important;transform:translateY(-2px)!important;box-shadow:0 10px 24px rgba(255,107,53,.20)!important}
    .store-page .review-cta span,.store-page .similar-cta span{font-size:15px!important;line-height:1!important}
    .store-page .similar-cta{width:100%!important;margin-top:14px!important}
    .store-page .related-chips{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;margin-bottom:14px!important}
    .store-page .related-product-name{width:100%!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;min-height:48px!important;padding:10px 13px!important;border:1px solid #e2d9ce!important;border-radius:13px!important;background:linear-gradient(135deg,#fff,#faf7f1)!important;color:#24201b!important;font:800 12px/1.2 inherit!important;text-align:left!important;cursor:pointer!important;box-sizing:border-box!important;transition:transform .2s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease!important}
    .store-page .related-product-name span{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
    .store-page .related-product-name b{font-size:15px!important;flex:0 0 auto!important;font-weight:900!important;opacity:.55!important}
    .store-page .related-product-name:hover{transform:translateX(3px)!important;border-color:#ff6b35!important;background:#fff0e5!important;color:#d65327!important;box-shadow:0 8px 20px rgba(80,50,20,.08)!important}
    .store-page .related-product-name:hover b{opacity:1!important}
  `;
  document.head.appendChild(style);
});