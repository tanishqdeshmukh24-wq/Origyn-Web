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
    .store-page .search-no-result{grid-column:1/-1!important;padding:48px 24px!important;text-align:center!important;border:1px solid #e8dfd4!important;border-radius:20px!important;background:linear-gradient(135deg,#fff,#faf7f1)!important}
    .store-page .search-no-result .search-no-icon{font-size:30px!important;margin-bottom:12px!important}
    .store-page .search-no-result h3{margin:0 0 8px!important;font-size:20px!important}
    .store-page .search-no-result p{margin:0 auto 16px!important;max-width:520px!important;color:#777!important;line-height:1.6!important}
    .store-page .search-suggestion{display:inline-flex!important;align-items:center!important;gap:7px!important;border:1px solid #ffb28f!important;background:#fff3ec!important;color:#d65327!important;border-radius:999px!important;padding:9px 14px!important;font-weight:800!important;cursor:pointer!important}
  `;
  document.head.appendChild(style);

  const searchNames=['NeuraVision AI','RoboArm X1','DevFlow','VisionCore','Founder Studio Hoodie','Creator Desk Kit','CloudForge','GamePad Nova','SmartSense Home','Motion Kit','DriveDock','Everyday Carry','AI & Digital','Technology','Hardware','Software','Fashion','Home','Gaming','Sports','Automotive'];
  const distance=(a,b)=>{a=a.toLowerCase();b=b.toLowerCase();const row=[...Array(b.length+1)].map((_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=a[i-1]===b[j-1]?prev+0:Math.min(row[j]+1,row[j-1]+1,prev+1);prev=old}}return row[b.length]};
  const suggestionFor=q=>{if(!q)return null;let best=null,bestScore=Infinity;searchNames.forEach(name=>{const n=name.toLowerCase();const d=distance(q,n);const threshold=q.length<=4?1:Math.max(2,Math.floor(q.length*.4));if(d<=threshold&&d<bestScore){best=name;bestScore=d}});return best};
  const showSearchState=()=>{
    const grid=document.querySelector('#store-grid');
    const input=document.querySelector('#store-search');
    if(!grid||!input||!input.value.trim())return;
    const q=input.value.trim();
    const hasProducts=!!grid.querySelector('.product-card');
    if(hasProducts)return;
    const suggestion=suggestionFor(q);
    const empty=grid.querySelector('.saved-empty');
    if(empty){
      empty.classList.add('search-no-result');
      empty.innerHTML=`<div class="search-no-icon">⌕</div><h3>No products found</h3><p>We couldn't find anything for <strong>“${q.replace(/[<>&]/g,'')}</strong>”. Try a different product, category, or check the spelling.</p>${suggestion?`<button type="button" class="search-suggestion" data-search-suggestion="${suggestion}">Did you mean <strong>${suggestion}</strong>?</button>`:''}`;
    }
    requestAnimationFrame(()=>{const y=grid.getBoundingClientRect().top+window.scrollY-24;window.scrollTo({top:Math.max(0,y),behavior:'smooth'})});
  };
  document.addEventListener('input',e=>{if(e.target.matches('#top-search,#store-search'))setTimeout(showSearchState,190)});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-search-suggestion]');if(!b)return;const value=b.dataset.searchSuggestion;const input=document.querySelector('#store-search');if(input){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))}});
});