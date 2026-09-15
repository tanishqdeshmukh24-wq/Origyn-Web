document.addEventListener('DOMContentLoaded',()=>{
  const modal=document.querySelector('#product-modal');
  const card=modal?.querySelector('.modal-card');
  const close=modal?.querySelector('#modal-close');
  if(!modal||!card||!close)return;

  const apply=()=>{
    Object.assign(close.style,{
      position:'absolute',
      top:'14px',
      right:'14px',
      left:'auto',
      bottom:'auto',
      float:'none',
      width:'42px',
      height:'42px',
      margin:'0',
      padding:'0',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      zIndex:'10000',
      transform:'none'
    });
  };

  apply();
  new MutationObserver(apply).observe(close,{attributes:true,attributeFilter:['style','class']});
  window.addEventListener('resize',apply,{passive:true});
});