document.addEventListener('DOMContentLoaded',()=>{
  const modal=document.querySelector('#product-modal');
  const card=modal?.querySelector('.modal-card');
  const close=modal?.querySelector('#modal-close');
  if(!modal||!card||!close)return;

  const apply=()=>{
    const values={
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
      'align-items':'center',
      'justify-content':'center',
      'z-index':'10000',
      transform:'none'
    };
    Object.entries(values).forEach(([property,value])=>close.style.setProperty(property,value,'important'));
  };

  apply();
  new MutationObserver(apply).observe(close,{attributes:true,attributeFilter:['style','class']});
  window.addEventListener('resize',apply,{passive:true});
});