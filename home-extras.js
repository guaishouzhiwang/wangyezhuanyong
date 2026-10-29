(()=>{
 'use strict';
 const toggle=document.getElementById('scene-auto'),drawer=document.getElementById('updates-drawer'),open=document.getElementById('updates-open'),close=document.getElementById('updates-close');
 let enabled=true,timer,generation=0;
 try{enabled=localStorage.getItem('huixin-home-scene-auto')!=='false';}catch{}
 function schedule(){clearTimeout(timer);const id=++generation;if(!enabled||document.hidden||drawer.open)return;timer=setTimeout(()=>advance(id),20000);}
 async function advance(id){
  if(id!==generation||!enabled||document.hidden||drawer.open)return;
  const buttons=[...document.querySelectorAll('[data-scene]')],index=buttons.findIndex(button=>button.classList.contains('selected'));
  try{await window.setScene(buttons[(index+1)%buttons.length].dataset.scene,()=>id===generation&&enabled&&!document.hidden&&!drawer.open);}finally{if(id===generation)schedule();}
 }
 function sync(){toggle.checked=enabled;schedule();}
 toggle.addEventListener('change',()=>{enabled=toggle.checked;try{localStorage.setItem('huixin-home-scene-auto',String(enabled));}catch{}sync();});
 document.getElementById('scenes').addEventListener('click',event=>{if(event.target.closest('[data-scene]'))schedule();});
 document.addEventListener('visibilitychange',schedule);
 open.addEventListener('click',()=>{drawer.showModal();open.setAttribute('aria-expanded','true');schedule();close.focus();});
 drawer.addEventListener('close',()=>{open.setAttribute('aria-expanded','false');open.focus();schedule();});
 close.addEventListener('click',()=>drawer.close());
 drawer.addEventListener('click',event=>{if(event.target!==drawer)return;const r=drawer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)drawer.close();});
 sync();
})();
