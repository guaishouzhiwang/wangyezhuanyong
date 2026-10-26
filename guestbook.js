'use strict';
(()=>{
 const el=id=>document.getElementById(id),menu=el('pet-menu'),dialog=el('guestbook-dialog'),pet=el('huixin');
 let mounted=false,timer;
 const coverObserver=new MutationObserver(()=>pet.setCovered(!!document.querySelector('dialog[open]')));for(const modal of [dialog,el('commission-dialog')])coverObserver.observe(modal,{attributes:true,attributeFilter:['open']});
 el('guest-jump-bottom').onclick=()=>dialog.scrollTo({top:dialog.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 el('guest-jump-top').onclick=()=>dialog.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 const focusPet=()=>pet.shadowRoot?.querySelector('button')?.focus();
 for(const modal of [dialog]){
  modal.querySelector('[data-close]').onclick=()=>modal.close();
  modal.addEventListener('click',e=>{if(e.target!==modal)return;const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();});
  modal.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))focusPet();});
 }
 function closeMenu(){menu.hidePopover();}
 function positionMenu(){
  const r=pet.getBoundingClientRect(),w=menu.offsetWidth,h=menu.offsetHeight,width=document.documentElement.clientWidth||innerWidth;let left=r.left+r.width/2-w/2,top=r.top-h-14;
  if(top<12&&r.left-w-16>=12){left=r.left-w-16;top=r.top+r.height/2-h/2;}
  menu.style.left=Math.max(12,Math.min(width-w-12,left))+'px';menu.style.top=Math.max(12,Math.min(innerHeight-h-12,top))+'px';
 }
 pet.addEventListener('pet-menu-close',closeMenu);
 menu.querySelector('[data-close]').onclick=closeMenu;
 pet.addEventListener('pet-activate',()=>{if(dialog.open)return;if(menu.matches(':popover-open'))closeMenu();else{menu.showPopover();positionMenu();}});
 window.addEventListener('resize',()=>{if(menu.matches(':popover-open'))positionMenu();});
 window.addEventListener('huixin-language-change',()=>{if(menu.matches(':popover-open'))positionMenu();});
 const care=new window.HuixinCare();
 function updateCare(){const info=care.snapshot();el('care-mood').value=Math.round(info.mood);el('care-energy').value=Math.round(info.energy);el('care-mood-meter').value=info.mood;el('care-energy-meter').value=info.energy;el('care-days').value=info.days;el('care-count').value=info.interactions;el('pet-sleep').textContent=pet.sleeping?'☀ 醒醒啦':'☾ 休息一下';}
 const reactions={wave:'我在这里，陪着你。',pat:'摸摸头，好开心呀。',feed:'谢谢你的饼干，甜甜的！',heart:'送你一颗小心心 ♡',dance:'一起慢慢摇摆吧 ♪',think:'让我认真想一想，再陪你继续。',cheer:'把今天的小星星送给你 ✦',sleep:'休息一会儿，我会陪着你。',wake:'休息好啦，我们继续吧。',walk:'一起走一小段，换个心情。',follow:'我会慢慢跟着你，移动鼠标试试看。'};
 const praise=['你已经很努力了，记得也夸夸自己。','能坚持自己的喜欢，本身就很了不起。','今天的你，也值得被温柔对待。'];let praiseIndex=0;
 pet.addEventListener('pet-interaction',event=>{const action=event.detail.action,info=care.record(action);let message=action==='praise'?praise[praiseIndex++%praise.length]:action==='pat'&&info.pats>2?'又来摸摸头啦，慧欣记得你 ♡':reactions[action];if(action==='follow'&&pet.lastPointer?.type==='touch')message='点一下空白处，我会慢慢走过去。';if(message)pet.say(message,3800);updateCare();});
 menu.addEventListener('toggle',event=>{pet.setMenuOpen(event.newState==='open');if(event.newState==='open')updateCare();});
 menu.querySelectorAll('[data-pet-action]').forEach(button=>button.onclick=()=>{closeMenu();pet.perform(button.dataset.petAction);focusPet();});
 el('pet-wave').onclick=()=>{closeMenu();pet.perform('wave');focusPet();};
 updateCare();setInterval(updateCare,60000);
 function contact(){closeMenu();el('commission-open').click();}
 el('guest-contact').onclick=contact;
 const status=el('guest-status'),retry=el('guest-retry'),container=el('guest-comments');
 function unavailable(){status.hidden=false;status.textContent='留言区暂时未能连接，可重新加载，或点击下方链接前往 GitHub。';retry.hidden=false;}
 function mount(){
  if(mounted)return;mounted=true;status.hidden=false;status.textContent='正在连接留言区…';retry.hidden=true;
  const script=document.createElement('script');script.src='https://giscus.app/client.js';script.async=true;script.crossOrigin='anonymous';
  const config={repo:'guaishouzhiwang/wangyezhuanyong','repo-id':'R_kgDOU2UFtA',category:'Announcements','category-id':'DIC_kwDOU2UFtM4DHA2S',mapping:'specific',term:'慧欣主页 · 公开留言',strict:'1','reactions-enabled':'0','emit-metadata':'1','input-position':'bottom',theme:'transparent_dark',lang:window.HuixinI18n?.language??'zh-CN'};
  if(!config['category-id']){mounted=false;status.textContent='留言区正在准备中，尚未开放发送。';return;}
  Object.entries(config).forEach(([key,value])=>script.setAttribute('data-'+key,value));
  script.onerror=()=>{clearTimeout(timer);unavailable();};container.append(script);timer=setTimeout(unavailable,20000);
 }
 window.addEventListener('message',e=>{
  const frame=container.querySelector('iframe');
  if(e.origin!=='https://giscus.app'||!frame||e.source!==frame.contentWindow||!e.data?.giscus)return;
  if(e.data.giscus.error){clearTimeout(timer);if(/discussion not found/i.test(e.data.giscus.error)){status.hidden=true;retry.hidden=true;}else unavailable();return;}
  if(e.data.giscus.resizeHeight||e.data.giscus.discussion){clearTimeout(timer);status.hidden=true;retry.hidden=true;}
 });
 retry.onclick=()=>{clearTimeout(timer);container.replaceChildren();mounted=false;mount();};
 function open(){closeMenu();if(!dialog.open)dialog.showModal();mount();}
 el('guestbook-open').onclick=open;
 if(new URLSearchParams(location.search).has('giscus'))open();
})();

