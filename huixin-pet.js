/* HuiXin: bounded motion, action chains, pointer gestures and idle behaviour. */
(()=>{
 'use strict';if(customElements.get('huixin-pet'))return;
 const base=document.currentScript?.src||document.baseURI;
 const rows={idle:[0,6],right:[1,8],left:[2,8],wave:[3,4],jump:[4,5],sad:[5,8],waiting:[6,6],thinking:[7,6],review:[8,6]};
 const durations={wave:1800,pat:1400,feed:2000,dance:2000,heart:1600,think:1600,cheer:1200,sleep:1100,wake:900,praise:1600};
 class HuixinPet extends HTMLElement{
  static get observedAttributes(){return ['size','fps','follow-mouse','src','motion-speed','auto-idle'];}
  constructor(){
   super();this.attachShadow({mode:'open'}).innerHTML=`<style>
   :host{position:fixed;left:0;top:0;display:block;z-index:2147483000;width:160px;height:174px;contain:layout style;pointer-events:auto;color:#44333c;font:13px/1.5 system-ui,sans-serif}:host([hidden]){display:none!important}
   button{all:unset;position:relative;display:block;width:100%;height:100%;cursor:grab;touch-action:none;user-select:none;border-radius:24px;-webkit-tap-highlight-color:transparent}button:active{cursor:grabbing}button:focus-visible{outline:2px solid #d77899;outline-offset:3px}
   canvas{display:block;width:100%;height:100%;pointer-events:none}.hint{position:absolute;top:100%;left:0;width:100%;box-sizing:border-box;text-align:center;padding:6px 3px;border:1px solid #f0dce466;border-radius:12px;background:#261b2aeb;color:#f8d9e6;font:11px/1.4 system-ui,sans-serif;pointer-events:none;white-space:normal}
   .bubble{box-sizing:border-box;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);width:max-content;max-width:min(200px,75vw);padding:10px 14px;background:#fffafc;border:1px solid #f0dce4;border-radius:16px 16px 16px 4px;box-shadow:0 5px 24px #58334512;text-align:center;pointer-events:none;opacity:0;transition:opacity .2s}.bubble.show{opacity:1}@media(prefers-reduced-motion:reduce){.bubble{transition:none}}
   </style><div class="bubble" role="status" aria-live="polite"></div><button type="button" aria-label="慧欣：点击打开菜单，拖动移动；方向键移动，Escape 恢复位置" aria-haspopup="dialog"><canvas aria-hidden="true"></canvas><span class="hint">点我 · 留言与互动 ♡</span></button>`;
   this.button=this.shadowRoot.querySelector('button');this.canvas=this.shadowRoot.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.bubble=this.shadowRoot.querySelector('.bubble');
   this.pos={x:0,y:0};this.keys=new Set();this.state='idle';this.started=0;this.until=0;this.duration=0;this.actionToken=0;this.autoIndex=0;this.autoAt=performance.now()+35000;this.frameTimes=[];this.walkOrigin=0;
  }
  connectedCallback(){
   this.abort=new AbortController();const signal=this.abort.signal;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.configure();this.resetPosition();this.load();
   window.addEventListener('pointermove',e=>this.move(e),{signal,passive:true});
   window.addEventListener('pointerdown',e=>{this.lastPointer={x:e.clientX,y:e.clientY,type:e.pointerType};if(e.pointerType==='touch'&&this.travel?.kind==='follow'&&!e.composedPath().includes(this)&&!e.target.closest?.('a,button,input,select,dialog')){this.mouse={x:e.clientX,y:e.clientY};this.human();}},{signal,passive:true});
   document.addEventListener('pointerleave',()=>{this.mouse=null;},{signal});
   window.addEventListener('resize',()=>{this.clamp();},{signal});
   window.addEventListener('blur',()=>{this.cancelPress();this.mouse=null;this.hover=false;this.stopTravel();},{signal});
   this.button.addEventListener('pointerenter',()=>{this.hover=true;},{signal});this.button.addEventListener('pointerleave',()=>{this.hover=false;},{signal});
   this.button.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;this.human();this.stopTravel();this.suppressClick=false;const t=performance.now();
    this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,px:this.pos.x,py:this.pos.y,lastX:e.clientX,lastY:e.clientY,lastT:t,vx:0,vy:0,moved:false,longPressed:false};this.button.setPointerCapture(e.pointerId);
    clearTimeout(this.holdTimer);this.holdTimer=setTimeout(()=>{if(this.drag&&!this.drag.moved){this.drag.longPressed=true;this.perform('pat');}},450);
   },{signal});
   this.button.addEventListener('pointerup',e=>{
    if(this.drag?.id!==e.pointerId)return;clearTimeout(this.holdTimer);const d=this.drag;this.suppressClick=d.moved||d.longPressed;this.drag=null;
    if(this.button.hasPointerCapture?.(e.pointerId))this.button.releasePointerCapture(e.pointerId);
    if(d.moved){const t=performance.now();this.glide={vx:Math.max(-.65,Math.min(.65,d.vx)),vy:Math.max(-.4,Math.min(.4,d.vy)),started:t};this.lastMotionAt=t;this.coastUntil=t+180;this.commitPosition();}
   },{signal});
   this.button.addEventListener('pointercancel',()=>{this.cancelPress();this.suppressClick=true;this.stopTravel();},{signal});
   this.button.addEventListener('lostpointercapture',()=>{if(this.drag)this.cancelPress();},{signal});
   this.button.addEventListener('contextmenu',e=>{e.preventDefault();if(this.drag||e.pointerType==='touch')return;this.human();this.dispatchEvent(new CustomEvent('pet-activate',{bubbles:true,composed:true}));},{signal});
   this.button.addEventListener('click',()=>{if(this.suppressClick){this.suppressClick=false;return;}this.human();this.dispatchEvent(new CustomEvent('pet-activate',{bubbles:true,composed:true}));},{signal});
   this.button.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();if(this.menuOpen){this.dispatchEvent(new CustomEvent('pet-menu-close'));return;}this.stopTravel();this.until=0;this.sleeping=false;this.resetPosition();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();this.human();
    if(!this.keys.size){this.stopTravel();this.walkOrigin=performance.now();this.lastMotionAt=this.walkOrigin;this.until=0;this.sleeping=false;}
    this.keys.add(e.key);this.moveDirection=e.key==='ArrowLeft'?'left':e.key==='ArrowRight'?'right':this.moveDirection||'right';this.coastUntil=performance.now()+120;
   },{signal});
   window.addEventListener('keyup',e=>{if(this.keys.delete(e.key)&&!this.keys.size)this.commitPosition();},{signal});
   document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(this.raf);this.raf=0;this.cancelPress();this.stopTravel();}else{this.lastMotionAt=performance.now();this.nextRenderAt=0;this.start();}},{signal});this.start();
  }
  disconnectedCallback(){this.abort?.abort();clearTimeout(this.holdTimer);clearTimeout(this.bubbleTimer);cancelAnimationFrame(this.raf);this.raf=0;this.motion?.dispose?.();}
  attributeChangedCallback(name,old,value){if(old===value)return;if(name==='src'&&this.isConnected)this.load();else{this.configure();if(this.isConnected)this.clamp();}}
  configure(){
   this.size=Math.max(80,Math.min(280,Number(this.getAttribute('size'))||160));this.h=this.size*208/192;this.fps=Math.max(30,Math.min(120,Number(this.getAttribute('fps'))||120));const oldSpeed=this.motionSpeed||1;this.motionSpeed=Math.max(.6,Math.min(1.4,Number(this.getAttribute('motion-speed'))||1));if(oldSpeed!==this.motionSpeed&&this.duration){const now=performance.now();if(now<this.until){this.started=now-(now-this.started)*oldSpeed/this.motionSpeed;this.until=this.sleeping?Infinity:this.started+this.duration/this.motionSpeed;}this.walkOrigin=now-(now-this.walkOrigin)*oldSpeed/this.motionSpeed;}this.autoIdle=this.getAttribute('auto-idle')!=='false';
   this.style.width=this.size+'px';this.style.height=this.h+'px';const ratio=Math.min(2,Math.max(1,window.devicePixelRatio||1)),w=Math.ceil(this.size*ratio),h=Math.ceil(this.h*ratio);
   if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.nextRenderAt=0;}
  }
  load(){
   const image=new Image();this.img=image;this.ready=false;this.motion?.dispose?.();this.motion=null;
   image.onload=()=>{if(this.img!==image)return;if(image.width!==1536||image.height!==2288){this.say('素材尺寸不正确');return;}this.motion=new window.HuixinMotion(image);const motion=this.motion;delete this.dataset.motionFallback;motion.ready.then(()=>{if(innerWidth>=700&&this.motion===motion){const prime=()=>{if(this.motion===motion)motion.ensureAction('wave').catch(()=>{});};if(window.requestIdleCallback)window.requestIdleCallback(prime,{timeout:2500});else setTimeout(prime,1200);}},()=>{if(this.motion===motion)this.dataset.motionFallback='true';});this.ready=true;this.dispatchEvent(new CustomEvent('pet-ready'));};
   image.onerror=()=>{if(this.img===image){this.say('慧欣的图片没有加载成功');this.dispatchEvent(new CustomEvent('pet-error'));}};image.src=this.getAttribute('src')||new URL('huixin-spritesheet.webp',base).href;
  }
  bounds(){const width=document.documentElement?.clientWidth||innerWidth;return {minX:8,maxX:Math.max(8,width-this.size-8),minY:8,maxY:Math.max(8,innerHeight-this.h-42)};}
  resetPosition(){this.stopTravel();this.pos={x:innerWidth-this.size-36,y:innerHeight-this.h-100};this.clamp();}
  clamp(){const b=this.bounds();this.pos.x=Math.max(b.minX,Math.min(b.maxX,this.pos.x));this.pos.y=Math.max(b.minY,Math.min(b.maxY,this.pos.y));this.style.transform=`translate3d(${this.pos.x}px,${this.pos.y}px,0)`;this.alignBubble();}
  human(){const t=performance.now();this.autoAt=t+35000;if(this.automatic){this.until=0;this.actionToken++;this.automatic=false;}}
  cancelPress(){clearTimeout(this.holdTimer);this.drag=null;}
  setCovered(open){this.covered=open;if(open){cancelAnimationFrame(this.raf);this.raf=0;this.stopTravel();}else{this.lastMotionAt=performance.now();this.nextRenderAt=0;this.start();}}
  setMenuOpen(open){this.menuOpen=open;if(open){this.cancelPress();this.stopTravel();this.human();}}
  move(e){
   if(e.pointerType!=='touch')this.mouse={x:e.clientX,y:e.clientY};this.human();
   if(this.drag?.id===e.pointerId){
    const d=this.drag,dx=e.clientX-d.x,dy=e.clientY-d.y,t=performance.now(),dt=Math.max(8,t-d.lastT);
    if(!d.moved&&Math.hypot(dx,dy)>5){d.moved=true;clearTimeout(this.holdTimer);this.until=0;this.sleeping=false;this.walkOrigin=t;}
    if(d.moved){const travel=d.px+dx-this.pos.x;this.moveDirection=travel<0?'left':travel>0?'right':this.moveDirection||'right';d.vx=d.vx*.45+(e.clientX-d.lastX)/dt*.55;d.vy=d.vy*.45+(e.clientY-d.lastY)/dt*.55;this.pos={x:d.px+dx,y:d.py+dy};this.clamp();}
    d.lastX=e.clientX;d.lastY=e.clientY;d.lastT=t;
   }
   this.render(performance.now());
  }
  commitPosition(){this.dispatchEvent(new CustomEvent('pet-moved',{detail:{x:this.pos.x,y:this.pos.y}}));}
  stopTravel(){if(this.actionLoading){this.actionLoading=null;this.actionToken++;}const was=this.travel||this.glide||this.keys.size;this.travel=null;this.glide=null;this.keys.clear();this.moving=false;this.coastUntil=0;if(was){this.commitPosition();this.dispatchEvent(new CustomEvent('pet-travel',{detail:{active:false}}));}}
  walkTo(x,y){this.human();this.stopTravel();this.until=0;this.sleeping=false;const b=this.bounds(),t=performance.now();this.travel={kind:'walk',x:Math.max(b.minX,Math.min(b.maxX,x)),y:Math.max(b.minY,Math.min(b.maxY,y)),until:t+12000};this.walkOrigin=t;this.lastMotionAt=t;this.dispatchEvent(new CustomEvent('pet-travel',{detail:{active:true}}));}
  wander(){
   const b=this.bounds();let min=b.minX,max=b.maxX,y=this.pos.y;const links=document.querySelector('.destinations')?.getBoundingClientRect();
   if(links){if(innerWidth>=900&&links.right+this.size+40<innerWidth)min=Math.max(min,links.right+20);else y=Math.min(y,Math.max(b.minY,links.top-this.h-24));}
   const distance=Math.min(130,Math.max(55,(max-min)*.55)),target=this.pos.x>(min+max)/2?this.pos.x-distance:this.pos.x+distance;this.walkTo(Math.max(min,Math.min(max,target)),y);
  }
  follow(){this.human();this.stopTravel();this.until=0;this.sleeping=false;const t=performance.now();if(this.lastPointer?.type==='touch')this.mouse={x:this.lastPointer.x,y:this.lastPointer.y};if(!this.mouse){this.wander();return;}this.travel={kind:'follow',until:t+18000};this.walkOrigin=t;this.lastMotionAt=t;this.dispatchEvent(new CustomEvent('pet-travel',{detail:{active:true}}));}
  updateTravel(t){
   const dt=Math.min(100,Math.max(0,t-(this.lastMotionAt??t)));this.lastMotionAt=t;this.moving=false;
   if(this.drag)return;
   if(this.keys.size){const dx=(this.keys.has('ArrowRight')?1:0)-(this.keys.has('ArrowLeft')?1:0),dy=(this.keys.has('ArrowDown')?1:0)-(this.keys.has('ArrowUp')?1:0),length=Math.hypot(dx,dy)||1;this.pos.x+=dx/length*dt*.16;this.pos.y+=dy/length*dt*.16;this.moveDirection=dx<0?'left':dx>0?'right':this.moveDirection||'right';this.moving=!!(dx||dy);this.clamp();return;}
   if(this.glide){const g=this.glide,decay=Math.exp(-dt/115),x=this.pos.x,y=this.pos.y;this.pos.x+=g.vx*115*(1-decay);this.pos.y+=g.vy*115*(1-decay);g.vx*=decay;g.vy*=decay;this.clamp();if(this.pos.x!==x)this.moveDirection=this.pos.x<x?'left':'right';this.moving=Math.hypot(this.pos.x-x,this.pos.y-y)>.15;if(Math.hypot(g.vx,g.vy)<.015||t-g.started>650){this.glide=null;this.commitPosition();}return;}
   if(!this.travel)return;const travel=this.travel;if(t>travel.until||this.menuOpen){this.stopTravel();return;}
   const b=this.bounds();let x=travel.x,y=travel.y;
   if(travel.kind==='follow'){if(!this.mouse){this.stopTravel();return;}const side=this.mouse.x>innerWidth/2?-1:1;x=Math.max(b.minX,Math.min(b.maxX,this.mouse.x+side*(this.size*.6+35)-this.size/2));y=Math.max(b.minY,Math.min(b.maxY,this.mouse.y-this.h*.55+35));}
   const dx=x-this.pos.x,dy=y-this.pos.y,d=Math.hypot(dx,dy);if(d<2){if(travel.kind==='walk')this.stopTravel();return;}
   const step=Math.min(d,dt*(travel.kind==='follow'?.14:.075));this.pos.x+=dx/d*step;this.pos.y+=dy/d*step;this.moveDirection=dx<0?'left':'right';this.moving=step>.05;this.clamp();
  }
  play(state='wave',duration=durations[state]||1800,automatic=false){
   if(!rows[state]&&!Object.hasOwn(durations,state))throw Error('未知动作：'+state);this.stopTravel();this.gazeAngle=0;this.state=state;this.started=performance.now();this.duration=Math.max(200,Number(duration)||1800);this.until=state==='sleep'?Infinity:this.started+this.duration/this.motionSpeed;this.sleeping=state==='sleep';this.automatic=automatic;const token=++this.actionToken;
   const asset=state==='wake'?'sleep':state==='praise'?'heart':state;
   if(!this.reduced.matches&&this.motion?.supportsAction(asset)&&!this.motion.hasAction(asset)){
    this.actionLoading=token;this.until=0;this.sleeping=false;
    this.motion.ensureAction(asset).then(()=>{
     if(this.isConnected&&token===this.actionToken&&this.actionLoading===token){this.actionLoading=null;this.started=performance.now();this.sleeping=state==='sleep';this.until=this.sleeping?Infinity:this.started+this.duration/this.motionSpeed;}
    }).catch(()=>{if(token===this.actionToken){this.actionLoading=null;this.dataset.actionError=asset;this.say('慧欣的图片没有加载成功');}});
   }
   this.dispatchEvent(new CustomEvent('pet-action',{detail:{state}}));
  }
  perform(action){this.human();if(action==='sleep'&&this.sleeping)action='wake';if(action==='walk')this.wander();else if(action==='follow')this.follow();else this.play(action,durations[action]||1800);this.dispatchEvent(new CustomEvent('pet-interaction',{detail:{action}}));}
  alignBubble(){if(!this.bubble)return;const width=document.documentElement?.clientWidth||innerWidth;this.bubble.style.left=(Math.max(112,Math.min(width-112,this.pos.x+this.size/2))-this.pos.x)+'px';this.bubble.style.bottom=this.pos.y<90?'auto':'100%';this.bubble.style.top=this.pos.y<90?'calc(100% + 34px)':'auto';}
  say(text,duration=3200){this.alignBubble();this.bubble.textContent=String(text);this.bubble.classList.add('show');clearTimeout(this.bubbleTimer);this.bubbleTimer=setTimeout(()=>this.bubble.classList.remove('show'),duration);}
  start(){if(!this.raf&&!document.hidden&&!this.covered)this.raf=requestAnimationFrame(t=>this.tick(t));}
  tick(t){this.raf=0;this.updateTravel(t);if(this.autoIdle&&!this.reduced.matches&&!this.menuOpen&&!this.drag&&!this.travel&&!this.keys.size&&!this.sleeping&&t>=this.autoAt&&t>=this.until){const actions=['think','wave','heart'];this.autoAt=t+45000;const action=actions[this.autoIndex++%actions.length];this.play(action,durations[action],true);}this.render(t);this.start();}
  render(t){
   if(!this.ready||this.hidden||this.covered)return;const interval=1000/this.fps;if(this.nextRenderAt&&t+.5<this.nextRenderAt)return;this.nextRenderAt=t+interval-((t-(this.nextRenderAt||t))%interval);
   const dt=Math.min(120,Math.max(0,t-(this.lastRender??t)));this.lastRender=t;
   const physicalWalk=!!(this.drag?.moved||this.moving||this.keys.size||t<(this.coastUntil||0)),scriptWalk=!physicalWalk&&t<this.until&&['left','right'].includes(this.state),walking=physicalWalk||scriptWalk,active=!walking&&t<this.until,mode=walking?(scriptWalk?this.state:this.moveDirection||'right'):active?this.state:'idle';
   const elapsed=Math.max(0,(t-(walking?(scriptWalk?this.started:this.walkOrigin):active?this.started:0))/1000)*this.motionSpeed,progress=active?Math.min(1,elapsed/(this.duration/1000)):0;
   const smooth=this.reduced.matches?0:1;let row=0,col=0,tween=null,rotation=0,dx=0,dy=-Math.sin(t/1800)*.65*smooth,sy=1+Math.sin(t/1800)*.006*smooth;
   if(walking){this.gazeAngle=mode==='left'?270:90;row=rows[mode][0];const phase=this.reduced.matches?0:(elapsed/.85*8)%8;col=Math.floor(phase);tween=phase-col;dy-=Math.abs(Math.sin(elapsed*Math.PI*2/.85))*1.2*smooth;rotation=Math.sin(elapsed*Math.PI*2/.85)*.012*smooth;}
   else if(active){
    const fallback={wave:[3,Math.min(3,Math.floor(progress*4))],pat:[8,5],feed:[6,Math.min(5,Math.floor(progress*6))],dance:[6,1],heart:[8,5],praise:[8,5],think:[7,Math.min(5,Math.floor(progress*6))],cheer:[4,Math.min(4,Math.floor(progress*5))],sleep:[5,4],wake:[0,0]};[row,col]=fallback[mode]||[rows[mode]?.[0]||0,0];
    const envelope=Math.min(1,elapsed/.35,(1-progress)*5);rotation=Math.sin(elapsed*Math.PI/(mode==='dance'?1.2:2))*(mode==='dance'?.055:.018)*Math.max(0,envelope)*smooth;if(mode==='pat')sy-=Math.sin(elapsed*Math.PI/1.5)**2*.012*smooth;
   }else{
    const blink=this.reduced.matches?0:t%6200;col=blink>5920&&blink<6070?3:blink>5850&&blink<6130?2:0;
    if(this.mouse&&this.getAttribute('follow-mouse')!=='false'){
     const mx=this.mouse.x-(this.pos.x+this.size/2),my=this.mouse.y-(this.pos.y+this.h*.3);
     if(Math.hypot(mx,my)>12){const angle=(Math.atan2(mx,-my)*180/Math.PI+360)%360;if(this.gazeAngle===undefined)this.gazeAngle=angle;const diff=((angle-this.gazeAngle+540)%360)-180;this.gazeAngle=(this.gazeAngle+diff*(this.reduced.matches?1:1-Math.exp(-dt/95))+360)%360;const direction=this.gazeAngle/22.5,index=Math.floor(direction);row=9+Math.floor(index/8);col=index%8;tween=direction-index;this.dataset.direction=String(Math.round(this.gazeAngle*10)/10);}
     rotation=Math.max(-.025,Math.min(.025,mx/8000))*smooth;dx=Math.max(-1.1,Math.min(1.1,mx/250))*smooth;
    }else if(this.hover)rotation=Math.sin(t/2800)*.025*smooth;
   }
   if(active&&!this.reduced.matches&&this.motion?.hasAction(mode==='wake'?'sleep':mode==='praise'?'heart':mode)){rotation=0;dy=0;sy=1;}
   const ctx=this.ctx;ctx.setTransform(this.canvas.width/384,0,0,this.canvas.height/416,0,0);ctx.clearRect(0,0,384,416);ctx.save();ctx.globalAlpha=.16;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(192,394,47,7,0,0,Math.PI*2);ctx.fill();ctx.restore();ctx.globalAlpha=1;ctx.save();ctx.translate(192+dx*2,374+dy*2);ctx.rotate(rotation);ctx.scale(1,sy);
   let chained=false;
   if(walking&&!this.reduced.matches&&this.motion){
    if(!this.motion.hasAction('walk')&&!this.motion.pending.has('walk'))this.motion.ensureAction('walk').catch(()=>{});
    chained=this.motion.drawAction(ctx,'walk',(elapsed/.85)%1,mode==='left');
   }
   if(active&&!this.reduced.matches&&this.motion){const asset=mode==='wake'?'sleep':mode==='praise'?'heart':mode;chained=this.motion.drawAction(ctx,asset,mode==='wake'?1-progress:progress);}
   if(!chained){if(tween!==null&&this.motion)this.motion.draw(ctx,row,col,tween);else ctx.drawImage(this.img,col*192,row*208,192,208,-192,-374,384,416);}ctx.restore();
   if(active&&smooth&&['pat','heart','praise','feed','sleep','dance','think','cheer'].includes(mode)){
    ctx.save();ctx.textAlign='center';ctx.fillStyle='#ed87ad';
    if(mode==='feed'&&!chained){
     const bite=Math.max(0,Math.min(1,(progress-.18)/.5)),ease=bite*bite*(3-2*bite),x=286-94*ease,y=285-113*ease-32*Math.sin(bite*Math.PI);ctx.globalAlpha=progress>.76?Math.max(0,1-(progress-.76)/.15):1;ctx.font='32px sans-serif';ctx.fillText('🍪',x,y);
     if(bite>.75){ctx.fillStyle='#edbd88';for(let i=0;i<5;i++){ctx.globalAlpha=Math.max(0,1-(progress-.68)*3);ctx.fillRect(175+i*8,184+(progress-.68)*80+i%2*8,3,3);}}
    }else if(mode==='cheer'){
     const burst=Math.max(0,Math.min(1,(progress-.2)/.6));ctx.fillStyle='#ffd99d';ctx.font='24px sans-serif';ctx.globalAlpha=Math.sin(burst*Math.PI);for(let i=0;i<7;i++){const angle=i*Math.PI*2/7;ctx.fillText('✦',192+Math.cos(angle)*burst*140,160+Math.sin(angle)*burst*100);}
    }else{
     const glyph=mode==='sleep'?'z':mode==='dance'?'♪':mode==='think'?'·':'♥';ctx.font=mode==='think'?'36px sans-serif':'24px sans-serif';for(let i=0;i<3;i++){const phase=(elapsed/3+i/3)%1;ctx.globalAlpha=Math.sin(phase*Math.PI)*.9;ctx.fillText(glyph,68+i*115+Math.sin(phase*Math.PI*2)*8,145-phase*85);}
    }
    ctx.restore();ctx.globalAlpha=1;
   }
   if(mode!=='idle'||!this.mouse||this.getAttribute('follow-mouse')==='false')this.dataset.direction='';
   this.frameTimes.push(t);while(this.frameTimes.length>2&&this.frameTimes[0]<t-1000)this.frameTimes.shift();if(this.frameTimes.length>3)this.dataset.measuredFps=String(Math.round((this.frameTimes.length-1)*1000/(t-this.frameTimes[0])));
   this.dataset.state=mode;this.dataset.pose=row+':'+col;this.dataset.tween=tween===null?'':tween.toFixed(3);this.dataset.actionFrame=chained?String(this.motion.lastActionFrame):'';this.dataset.renderFps=String(this.fps);this.dataset.sleeping=String(!!this.sleeping);
  }
 }
 customElements.define('huixin-pet',HuixinPet);
})();
