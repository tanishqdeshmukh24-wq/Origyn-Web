document.addEventListener('DOMContentLoaded',()=>{
  const modal=document.querySelector('#product-modal');
  if(!modal)return;
  const info=modal.querySelector('.modal-info');
  let qty=1;
  const safe=s=>String(s||'').replace(/[<>&"]/g,'');

  function enhance(){
    if(!modal.classList.contains('open')||!info)return;
    const name=document.querySelector('#modal-name')?.textContent?.trim()||'';
    if(!name)return;

    let box=info.querySelector('.product-detail-enhanced');
    if(!box){
      box=document.createElement('div');
      box.className='product-detail-enhanced';
      const addButton=info.querySelector('#modal-add');
      if(addButton) addButton.insertAdjacentElement('beforebegin',box);
      else info.appendChild(box);
    }

    const card=[...document.querySelectorAll('.product-card')].find(c=>c.querySelector('h3')?.textContent.trim()===name);
    const save=card?.querySelector('[data-save]');
    const saved=save?.classList.contains('saved');

    box.innerHTML=`
      <div class="product-detail-price-row">
        <div class="product-detail-current-price">${safe(document.querySelector('#modal-price')?.textContent)}</div>
        <button type="button" class="product-save-detail ${saved?'saved':''}" aria-label="${saved?'Remove from saved':'Save product'}">${saved?'♥':'♡'}</button>
      </div>
      <div class="product-qty">
        <button type="button" data-qty="minus" aria-label="Decrease quantity">−</button>
        <span>${qty}</span>
        <button type="button" data-qty="plus" aria-label="Increase quantity">+</button>
      </div>
      <div class="product-shipping-note"><span>✓</span><div><strong>Ready to order</strong> Delivery estimates, stock and payment options will be connected through the Common API.</div></div>
      <div class="product-trust-line"><span>✓ Secure checkout</span><span>✓ Verified seller</span><span>✓ Easy returns</span></div>`;

    box.querySelector('[data-qty="minus"]').onclick=()=>{qty=Math.max(1,qty-1);enhance()};
    box.querySelector('[data-qty="plus"]').onclick=()=>{qty=Math.min(9,qty+1);enhance()};

    const addButton=info.querySelector('#modal-add');
    if(addButton){
      addButton.textContent=qty>1?`Add ${qty} items →`:'Add to cart →';
      addButton.dataset.detailQuantity=String(qty);
    }

    box.querySelector('.product-save-detail').onclick=()=>{if(save)save.click();requestAnimationFrame(enhance)};
  }

  new MutationObserver(()=>{
    if(modal.classList.contains('open')){
      qty=1;
      requestAnimationFrame(enhance);
    }
  }).observe(modal,{attributes:true,attributeFilter:['class']});

  modal.addEventListener('click',e=>{
    if(e.target.closest('#modal-add')) qty=1;
  });
});