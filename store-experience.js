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