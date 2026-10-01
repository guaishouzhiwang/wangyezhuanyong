'use strict';
const $=id=>document.getElementById(id);
const scenes={'huixin-chibi':['晴窗慧欣 · Q版','Q版粉发慧欣坐在阳光洒落的红沙发右侧','75% center'],'huixin-anime':['晴窗慧欣 · 正常版','正常比例粉发慧欣在明亮窗边微笑','75% center'],crimson:['绯色夜语','红色绣花服饰的银发角色，身后是灯火与夜景','60% 40%'],silver:['银色午后','银发角色在明亮的大厅中端着茶杯','75% center'],tea:['一盏闲时','戴眼镜的狐耳角色坐在扶手椅上喝茶','75% center'],crown:['王座星辉','戴着王冠的角色坐在王座上','75% center']};
const read=(k,f)=>{try{return localStorage.getItem('huixin-home-'+k)??f;}catch{return f;}};
const save=(k,v)=>{try{localStorage.setItem('huixin-home-'+k,String(v));}catch{}};
let loading=0,noticeTimer;
function notice(t){$('notice').textContent=t;$('notice').classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').classList.remove('show'),2500);}
async function setScene(key){
 if(!scenes[key])return;
 const request=++loading,img=new Image();img.src=''+key+(['silver','tea','crown'].includes(key)?'-wide':'')+'.webp';
 try{await img.decode();}catch{if(request===loading)notice('这幅背景暂时没有加载成功');return;}
 if(request!==loading)return;
 $('wallpaper').src=img.src;$('wallpaper').alt=scenes[key][1];$('wallpaper').style.objectPosition=scenes[key][2];
 $('art-label').textContent=scenes[key][0];$('art-number').textContent=String([...document.querySelectorAll('[data-scene]')].findIndex(b=>b.dataset.scene===key)+1).padStart(2,'0')+' / '+String(Object.keys(scenes).length).padStart(2,'0');
 document.querySelectorAll('[data-scene]').forEach(b=>{b.classList.toggle('selected',b.dataset.scene===key);b.setAttribute('aria-pressed',String(b.dataset.scene===key));});save('scene',key);
}
document.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>setScene(b.dataset.scene)));
const remembered=read('scene','crimson');if(scenes[remembered]&&remembered!=='crimson')setScene(remembered);else save('scene','crimson');
function panel(open){$('settings').hidden=!open;$('pet-settings').setAttribute('aria-expanded',String(open));if(open)$('close-settings').focus();}
$('pet-settings').onclick=()=>panel($('settings').hidden);
$('close-settings').onclick=()=>{panel(false);$('pet-settings').focus();};
function clean(enabled){document.body.classList.toggle('clean-view',enabled);$('restore').hidden=!enabled;$('clean').setAttribute('aria-pressed',String(enabled));panel(false);(enabled?$('restore'):$('clean')).focus();}
$('clean').onclick=()=>clean(true);$('restore').onclick=()=>clean(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.body.classList.contains('clean-view'))clean(false);else if(!$('settings').hidden){panel(false);$('pet-settings').focus();}}});
customElements.whenDefined('huixin-pet').then(()=>{
 const pet=$('huixin');
 const home=()=>{pet.pos={x:Math.max(0,innerWidth-pet.size-(innerWidth<700?14:46)),y:Math.max(90,innerHeight-pet.h-(innerWidth<700?240:164))};pet.clamp();};
 pet.resetPosition=home;
 const size=Number(read('size',innerWidth<700?'105':'140'));pet.setAttribute('size',String(size));$('pet-size').value=pet.size;$('size-value').value=pet.size;
 const fps=Number(read('fps','10'));pet.setAttribute('fps',String(fps));$('pet-speed').value=pet.fps;$('speed-value').value=pet.fps;
 pet.hidden=read('visible','true')!=='true';$('pet-visible').checked=!pet.hidden;
 pet.setAttribute('follow-mouse',read('follow','true'));$('pet-follow').checked=pet.getAttribute('follow-mouse')!=='false';
 home();
 $('pet-visible').onchange=e=>{pet.hidden=!e.target.checked;save('visible',e.target.checked);};
 $('pet-follow').onchange=e=>{pet.setAttribute('follow-mouse',String(e.target.checked));save('follow',e.target.checked);};
 for(const [id,attr,key,out] of [['pet-size','size','size','size-value'],['pet-speed','fps','fps','speed-value']])$(id).oninput=e=>{pet.setAttribute(attr,e.target.value);$(out).value=e.target.value;save(key,e.target.value);};
 $('greet').onclick=()=>{pet.hidden=false;$('pet-visible').checked=true;save('visible',true);pet.play('wave',1800);pet.say('欢迎来到我的小世界。');};
 $('home').onclick=()=>{pet.hidden=false;$('pet-visible').checked=true;save('visible',true);home();pet.say('慧欣回来啦。');};
 pet.addEventListener('pet-error',()=>notice('慧欣暂时没能加载，刷新页面再试试。'));
});

// First successful GitHub Pages deployment, a fixed epoch shared by all visitors.
const siteStartedAt=Date.parse('2026-10-01T18:20:34+08:00');
const beijingFormatter=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function updateSiteClock(){
 const now=new Date();
 $('beijing-clock').textContent=beijingFormatter.format(now);
 $('beijing-clock').dateTime=now.toISOString();
 const elapsed=Math.max(0,Math.floor((now.getTime()-siteStartedAt)/1000));
 const days=Math.floor(elapsed/86400),hours=Math.floor(elapsed%86400/3600),minutes=Math.floor(elapsed%3600/60),seconds=elapsed%60;
 $('site-uptime').textContent=days+'天 '+String(hours).padStart(2,'0')+'时 '+String(minutes).padStart(2,'0')+'分 '+String(seconds).padStart(2,'0')+'秒';
}
updateSiteClock();
setInterval(updateSiteClock,1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateSiteClock();});
