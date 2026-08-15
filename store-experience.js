document.addEventListener('DOMContentLoaded',()=>{
  const style=document.createElement('style');
  style.textContent=`
    .review-preview{margin-top:28px;padding:20px 0 0;border-top:1px solid var(--line,#e8e2d9)}
    .review-preview strong{display:block;font-size:14px;letter-spacing:-.2px;margin-bottom:7px}
    .review-preview p{font-size:12px;color:#777;line-height:1.6;margin:0 0 12px}
    .review-preview button,.related-chips button{appearance:none;border:1px solid #ddd4c8;background:#fff;color:#29231e;border-radius:10px;padding:9px 13px;font-size:11px;font-weight:800;cursor:pointer;transition:all .2s ease}
    .review-preview button:hover,.related-chips button:hover{background:var(--accent,#ff6b35);border-color:var(--accent,#ff6b35);color:#fff;transform:translateY(-1px)}
    .related-preview{margin-top:24px;padding-top:20px;border-top:1px solid var(--line,#e8e2d9)}
    .related-title{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:12px}
    .related-title strong{font-size:13px}
    .related-title span{font-size:10px;color:#999}
    .related-chips{display:flex;gap:7px;flex-wrap:wrap}
    .related-chips button{background:#faf7f1}
    @media(max-width:650px){.review-preview{margin-top:20px}.related-title{display:block}.related-title span{display:block;margin-top:4px}.related-chips button{font-size:10px;padding:8px 10px}}
  `;
  document.head.appendChild(style);
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
      preview.innerHTML='<strong>What shoppers are saying</strong><p>Reviews will be collected from verified purchases once accounts and the common API are connected.</p><button type="button">View all reviews →</button>';
      rating.insertAdjacentElement('afterend',preview);
    }
    if(!info.querySelector('.related-preview')){
      const current=(document.querySelector('#modal-name')?.textContent||'').trim();
      const names=[...document.querySelectorAll('.product-card h3')].map(x=>x.textContent.trim()).filter(x=>x&&x!==current).slice(0,3);
      if(names.length){
        const related=document.createElement('div');
        related.className='related-preview';
        related.innerHTML='<div class="related-title"><strong>You may also like</strong><span>Based on this product</span></div><div class="related-chips">'+names.map(n=>'<button type="button" data-related="'+n.replace(/"/g,'&quot;')+'">'+n+'</button>').join('')+'</div>';
        info.appendChild(related);
        related.addEventListener('click',e=>{const b=e.target.closest('[data-related]');if(!b)return;const target=[...document.querySelectorAll('.product-card h3')].find(x=>x.textContent.trim()===b.dataset.related);if(target){modal.classList.remove('open');target.closest('.product-card')?.querySelector('[data-view]')?.click();}});
      }
    }
  };
  new MutationObserver(makeEnhancement).observe(modal,{attributes:true,attributeFilter:['class']});
});