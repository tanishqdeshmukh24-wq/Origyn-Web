document.addEventListener('DOMContentLoaded',()=>{
  const grid=document.querySelector('#store-grid');
  if(!grid)return;
  const header=()=>document.querySelector('.store-header')?.offsetHeight||0;
  const showProducts=()=>{
    const target=grid.querySelector('.product-card')||grid.querySelector('.search-empty-state')||grid;
    const y=target.getBoundingClientRect().top+window.scrollY-header()-16;
    window.scrollTo({top:Math.max(0,y),behavior:'smooth'});
  };

  // Navigation should land where the user can immediately see products,
  // not on the large marketplace heading.
  document.querySelectorAll('.store-nav-links a[href="#discover"]').forEach(link=>{
    link.href='#store-grid';
    link.addEventListener('click',e=>{
      e.preventDefault();
      showProducts();
    });
  });

  // Existing store controls still perform their filtering/saved-state work.
  // After that work finishes, move the viewport to the actual result cards.
  document.addEventListener('click',e=>{
    const category=e.target.closest('[data-category]');
    const filter=e.target.closest('.filter');
    const shop=e.target.closest('#shop-now');
    const browse=e.target.closest('[data-scroll="#discover"]');
    const saved=e.target.closest('#wishlist-open');
    if(category||filter||shop||browse||saved){
      setTimeout(showProducts,180);
    }
  },true);

  // Keep the grid from hiding under the sticky header for keyboard/hash navigation.
  grid.style.scrollMarginTop=`${header()+18}px`;
});