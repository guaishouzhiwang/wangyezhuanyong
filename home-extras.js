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
 // Keep native opening; delay closing until the exit animation finishes.
 const content=document.getElementById('updates-content'),backdrop=document.getElementById('updates-backdrop');
 let closing=false,motionId=0,animations=[];
 const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function cancelAnimations(){animations.forEach(animation=>animation.cancel());animations=[];}
 function animateSidebar(show){
  const transform=getComputedStyle(content).transform,opacity=getComputedStyle(backdrop).opacity;
  cancelAnimations();
  const options={duration:show?320:240,easing:show?'cubic-bezier(.22,1,.36,1)':'cubic-bezier(.4,0,.8,.2)',fill:'both'};
  animations=[content.animate([{transform},{transform:show?'translateX(0)':'translateX(100%)'}],options),backdrop.animate([{opacity},{opacity:show?1:0}],options)];
  return Promise.all(animations.map(animation=>animation.finished.catch(()=>{})));
 }
 drawer.addEventListener('toggle',()=>{schedule();if(drawer.open)close.focus();else{motionId++;closing=false;drawer.classList.remove('is-closing');cancelAnimations();open.focus();}});
 function closeDrawer(){
  if(!drawer.open||closing)return;
  if(reducedMotion()||typeof content.animate!=='function'){drawer.open=false;return;}
  closing=true;drawer.classList.add('is-closing');const id=++motionId;
  animateSidebar(false).then(()=>{if(id!==motionId)return;drawer.open=false;closing=false;drawer.classList.remove('is-closing');cancelAnimations();});
 }
 open.addEventListener('click',event=>{
  if(!drawer.open)return;event.preventDefault();
  if(closing){motionId++;closing=false;drawer.classList.remove('is-closing');if(reducedMotion())cancelAnimations();else animateSidebar(true);close.focus();}
  else closeDrawer();
 });
 close.addEventListener('click',closeDrawer);
 document.getElementById('updates-backdrop').addEventListener('click',closeDrawer);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drawer.open){event.preventDefault();closeDrawer();}});
 sync();
})();
