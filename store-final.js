document.addEventListener('DOMContentLoaded',()=>{
  const goToProducts=(filter=null)=>{
    const discover=document.querySelector('#discover');
    if(!discover)return;
    if(filter){
      const button=[...document.querySelectorAll('.filter')].find(b=>b.dataset.filter===filter);
      if(button)button.click();
      else discover.scrollIntoView({behavior:'smooth',block:'start'});
    }else{
      discover.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(()=>document.querySelector('#store-grid .product-card')?.scrollIntoView({behavior:'smooth',block:'start'}),450);
    }
  };
  document.addEventListener('click',e=>{
    const browse=e.target.closest('#browse-saved-products');
    if(browse){
      e.preventDefault();
      const clear=document.querySelector('#clear-search');
      if(clear)clear.click();
      document.querySelector('#wishlist-open')?.classList.remove('active');
      goToProducts();
      return;
    }
    const shop=e.target.closest('#shop-now');
    if(shop){e.preventDefault();goToProducts();return;}
    const scroll=e.target.closest('[data-scroll]');
    if(scroll){
      const target=document.querySelector(scroll.dataset.scroll);
      if(target?.id==='discover'){e.preventDefault();goToProducts();}
    }
  });

  // Make ecosystem cards genuine product entry points instead of decorative blocks.
  const eco=document.querySelector('#ecosystem-grid');
  if(eco){
    eco.addEventListener('click',e=>{
      const card=e.target.closest('.ecosystem-card');
      if(!card)return;
      const name=card.querySelector('h3')?.textContent.trim();
      const product=[...document.querySelectorAll('#store-grid .product-card')].find(c=>c.querySelector('h3')?.textContent.trim()===name);
      const view=product?.querySelector('[data-view]');
      if(view)view.click();
      else goToProducts();
    });
    eco.querySelectorAll('.ecosystem-card').forEach(c=>{c.setAttribute('role','button');c.setAttribute('tabindex','0')});
  }

  // Category and technology CTAs should land on visible product cards, not the section title.
  document.addEventListener('click',e=>{
    const cat=e.target.closest('[data-category]');
    if(!cat)return;
    e.preventDefault();
    const value=cat.dataset.category;
    const filter=[...document.querySelectorAll('.filter')].find(b=>b.dataset.filter===value);
    if(filter)filter.click();
    setTimeout(()=>document.querySelector('#store-grid .product-card')?.scrollIntoView({behavior:'smooth',block:'start'}),400);
  });

  // Keep the lower store sections feeling intentional and interactive.
  const cards=document.querySelectorAll('.category-grid button');
  cards.forEach(card=>card.setAttribute('aria-label',`Browse ${card.dataset.category}`));
});