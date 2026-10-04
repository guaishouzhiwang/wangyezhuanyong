'use strict';
(()=>{
 const el=id=>document.getElementById(id),menu=el('pet-menu'),dialog=el('guestbook-dialog'),pet=el('huixin');
 let mounted=false,timer;
 const focusPet=()=>pet.shadowRoot?.querySelector('button')?.focus();
 for(const modal of [menu,dialog]){
  modal.querySelector('[data-close]').onclick=()=>modal.close();
  modal.addEventListener('click',e=>{if(e.target!==modal)return;const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();});
  modal.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))focusPet();});
 }
 pet.addEventListener('pet-activate',()=>{if(!menu.open&&!dialog.open)menu.showModal();});
 el('pet-wave').onclick=()=>{menu.close();pet.play('wave',1800);pet.say('我在这里，陪着你。');};
 function contact(){menu.close();el('commission-open').click();}
 el('pet-contact').onclick=contact;el('guest-contact').onclick=contact;
 const status=el('guest-status'),retry=el('guest-retry'),container=el('guest-comments');
 function unavailable(){status.hidden=false;status.textContent='留言区暂时未能连接，可重新加载，或点击下方链接前往 GitHub。';retry.hidden=false;}
 function mount(){
  if(mounted)return;mounted=true;status.hidden=false;status.textContent='正在连接留言区…';retry.hidden=true;
  const script=document.createElement('script');script.src='https://giscus.app/client.js';script.async=true;script.crossOrigin='anonymous';
  const config={repo:'guaishouzhiwang/wangyezhuanyong','repo-id':'R_kgDOU2UFtA',category:'Announcements','category-id':'DIC_kwDOU2UFtM4DHA2S',mapping:'specific',term:'慧欣主页 · 公开留言',strict:'1','reactions-enabled':'0','emit-metadata':'1','input-position':'bottom',theme:'transparent_dark',lang:'zh-CN'};
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
 function open(){menu.close();if(!dialog.open)dialog.showModal();mount();}
 el('guestbook-open').onclick=open;
 if(new URLSearchParams(location.search).has('giscus'))open();
})();

