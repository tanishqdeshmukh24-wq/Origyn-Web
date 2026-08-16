document.addEventListener('DOMContentLoaded',()=>{
  const grid=document.querySelector('#store-grid');
  const discover=document.querySelector('#discover');
  const headerEl=document.querySelector('.store-header');
  if(!grid||!discover)return;
  const header=()=>headerEl?.offsetHeight||0;
  const showProducts=()=>{
    const target=grid.querySelector('.product-card')||grid.querySelector('.search-empty-state')||grid;
    const y=target.getBoundingClientRect().top+window.scrollY-header()-18;
    window.scrollTo({top:Math.max(0,y),behavior:'smooth'});
  };
  const resetSearch=()=>{
    const input=document.querySelector('#store-search');
    if(input&&input.value){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}
    const top=document.querySelector('#top-search');
    if(top)top.value='';
  };
  const goToProducts=()=>{resetSearch();setTimeout(showProducts,80)};

  document.querySelectorAll('.store-nav-links a').forEach(link=>{
    const href=link.getAttribute('href');
    if(href==='#store-grid'||href==='#discover'){
      link.addEventListener('click',e=>{e.preventDefault();goToProducts();});
    }
  });

  document.addEventListener('click',e=>{
    const category=e.target.closest('[data-category]');
    const filter=e.target.closest('.filter');
    const shop=e.target.closest('#shop-now');
    const browse=e.target.closest('[data-scroll="#discover"]');
    const saved=e.target.closest('#wishlist-open');
    const emptyBrowse=e.target.closest('#browse-saved-products');
    const similar=e.target.closest('.similar-cta');
    const related=e.target.closest('.related-product-name');

    if(emptyBrowse){
      e.preventDefault();
      const wish=document.querySelector('#wishlist-open');
      if(wish) wish.dataset.returning='1';
      resetSearch();
      setTimeout(()=>{
        // The main Store script owns savedView; clicking Saved again restores normal browsing.
        if(wish) wish.click();
        setTimeout(showProducts,120);
      },60);
      return;
    }
    if(category||filter||shop||browse||saved){setTimeout(showProducts,260);}
    if(similar){setTimeout(showProducts,320);}
    if(related){setTimeout(()=>document.querySelector('#product-modal')?.classList.add('open'),20);}
  },true);

  document.querySelectorAll('footer a[href="#home"],.store-page .logo[href="#home"]').forEach(link=>{
    link.addEventListener('click',e=>{
      e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});
    });
  });

  // Prevent hash navigation from landing beneath the sticky header.
  grid.style.scrollMarginTop=`${header()+18}px`;
  discover.style.scrollMarginTop=`${header()+18}px`;

  // Ensure the cart is closed with Escape and never leaves the page locked.
  const cart=document.querySelector('#cart');
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&cart?.classList.contains('open'))cart.classList.remove('open');
  });

  // External/decorative controls should never appear clickable without behavior.
  document.querySelectorAll('.ecosystem-card').forEach(card=>{
    card.setAttribute('tabindex','0');
    card.setAttribute('role','button');
  });
});