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
    if(input){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}
    const top=document.querySelector('#top-search');
    if(top)top.value='';
  };
  const browseProducts=()=>{
    resetSearch();
    // Store's wishlist handler owns savedView. If we are currently in Saved,
    // trigger the same control once to leave Saved mode, then position on cards.
    const wish=document.querySelector('#wishlist-open');
    if(wish&&typeof wish.click==='function')wish.click();
    setTimeout(()=>{
      // If the Store handler did not toggle the view, force the UI back to normal
      // through the public navigation control rather than relying on private state.
      const savedEmpty=document.querySelector('#browse-saved-products');
      if(savedEmpty) return;
      showProducts();
    },350);
  };

  document.querySelectorAll('.store-nav-links a').forEach(link=>{
    const href=link.getAttribute('href');
    if(href==='#store-grid'||href==='#discover')link.addEventListener('click',e=>{e.preventDefault();browseProducts();});
  });

  document.addEventListener('click',e=>{
    const category=e.target.closest('[data-category]');
    const filter=e.target.closest('.filter');
    const shop=e.target.closest('#shop-now');
    const browse=e.target.closest('[data-scroll="#discover"]');
    const saved=e.target.closest('#wishlist-open');
    const emptyBrowse=e.target.closest('#browse-saved-products');
    const similar=e.target.closest('.similar-cta');

    if(emptyBrowse){
      e.preventDefault();
      e.stopImmediatePropagation();
      browseProducts();
      return;
    }
    if(category||filter||shop||browse||saved)setTimeout(showProducts,260);
    if(similar)setTimeout(showProducts,320);
  },true);

  document.querySelectorAll('footer a[href="#home"],.store-page .logo[href="#home"]').forEach(link=>{
    link.addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});});
  });

  grid.style.scrollMarginTop=`${header()+18}px`;
  discover.style.scrollMarginTop=`${header()+18}px`;

  const cart=document.querySelector('#cart');
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&cart?.classList.contains('open'))cart.classList.remove('open');
  });

  document.querySelectorAll('.ecosystem-card').forEach(card=>{
    card.setAttribute('tabindex','0');
    card.setAttribute('role','button');
  });
});