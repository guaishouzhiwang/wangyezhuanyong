/* 慧欣网页宠物 · 原生 Web Component · 无依赖 */
(() => {
  'use strict';
  if (customElements.get('huixin-pet')) return;
  const scriptURL = document.currentScript?.src || document.baseURI;
  const defaultSprite = new URL('huixin-spritesheet.webp', scriptURL).href;
  const states = {idle:[0,6], right:[1,8], left:[2,8], wave:[3,4], jump:[4,5], sad:[5,8], waiting:[6,6], thinking:[7,6], review:[8,6]};
  class HuixinPet extends HTMLElement {
    static get observedAttributes() { return ['size','fps','follow-mouse','src','motion-speed']; }
    constructor() {
      super();
      this.attachShadow({mode:'open'}).innerHTML = `
        <style>
          :host{position:fixed;left:0;top:0;display:block;z-index:2147483000;width:160px;height:174px;contain:layout style;pointer-events:auto;color:#44333c;font:13px/1.5 system-ui,sans-serif}
          :host([hidden]){display:none!important}
          button{all:unset;position:relative;display:block;width:100%;height:100%;cursor:grab;touch-action:none;border-radius:24px;-webkit-tap-highlight-color:transparent}
          button:active{cursor:grabbing}button:focus-visible{outline:2px solid #d77899;outline-offset:3px}
          .hint{position:absolute;top:100%;left:0;width:100%;box-sizing:border-box;text-align:center;padding:6px 2px;border:1px solid #f0dce466;border-radius:12px;background:#261b2aeb;color:#f8d9e6;font:12px/1.4 system-ui,sans-serif;pointer-events:none;white-space:nowrap}
          .motion-layer{position:absolute;inset:0;transform-origin:50% 90%}.motion-layer[hidden]{display:none}
          canvas{display:block;width:100%;height:100%;pointer-events:none}
          .bubble{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);width:max-content;max-width:min(190px,75vw);padding:10px 14px;background:#fffafc;border:1px solid #f0dce4;border-radius:16px 16px 16px 4px;box-shadow:0 5px 24px #58334512;text-align:center;pointer-events:none;opacity:0;transition:opacity .2s}
          .bubble.show{opacity:1} .error{font-size:12px;color:#8a3946;text-align:center}
          @media(prefers-reduced-motion:reduce){.bubble{transition:none}}
        </style>
        <div class="bubble" role="status" aria-live="polite"></div>
        <button type="button" aria-label="慧欣：点击打开菜单，拖动移动；方向键移动，Escape 恢复位置" aria-haspopup="dialog"><canvas width="384" height="416" aria-hidden="true"></canvas><span class="hint">点我 · 留言与互动 ♡</span></button>`;
      this.button=this.shadowRoot.querySelector('button');
      this.canvas=this.shadowRoot.querySelector('canvas');
      this.ctx=this.canvas.getContext('2d');
      this.bubble=this.shadowRoot.querySelector('.bubble');
      this.pos={x:0,y:0}; this.mouse=null; this.hover=false; this.drag=null;
      this.state='idle'; this.started=0; this.until=0; this.gaze=0;
      this.ready=false; this.lastKey=''; this.frame=null; this.animationMode=''; this.animationStart=0;
    }
    connectedCallback() {
      this.abort=new AbortController(); const signal=this.abort.signal;
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
      this.configure(); this.resetPosition(); this.load();
      window.addEventListener('pointermove',e=>this.move(e),{signal,passive:true});
      document.addEventListener('pointerleave',()=>{this.mouse=null;},{signal});
      window.addEventListener('blur',()=>{this.mouse=null;this.drag=null;this.hover=false;},{signal});
      window.addEventListener('resize',()=>this.clamp(),{signal});
      this.button.addEventListener('pointerenter',()=>{this.hover=true;this.hoverStart=performance.now();},{signal});
      this.button.addEventListener('pointerleave',()=>{this.hover=false;},{signal});
      this.button.addEventListener('pointerdown',e=>{
        if(e.button!==0)return;
        this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,px:this.pos.x,py:this.pos.y,moved:false};
        this.button.setPointerCapture(e.pointerId);
      },{signal});
      this.button.addEventListener('pointerup',e=>{
        if(this.drag?.id!==e.pointerId)return;
        this.suppressClick=this.drag.moved;if(this.drag.moved)this.play(this.dragDirection||'right',450); this.drag=null;
        this.button.releasePointerCapture(e.pointerId);
      },{signal});
      this.button.addEventListener('pointercancel',()=>{this.drag=null;this.suppressClick=true;},{signal});
      this.button.addEventListener('lostpointercapture',()=>{this.drag=null;},{signal});
      this.button.addEventListener('click',()=>{
        if(this.suppressClick){this.suppressClick=false;return;}
        this.dispatchEvent(new CustomEvent('pet-activate',{bubbles:true,composed:true}));
      },{signal});
      this.button.addEventListener('keydown',e=>{
        const moves={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]};
        if(moves[e.key]){e.preventDefault();this.pos.x+=moves[e.key][0];this.pos.y+=moves[e.key][1];this.clamp();if(e.key==='ArrowLeft'||e.key==='ArrowRight')this.play(e.key==='ArrowLeft'?'left':'right',700);}
        if(e.key==='Escape'){this.resetPosition();this.until=0;}
      },{signal});
      document.addEventListener('visibilitychange',()=>{
        if(document.hidden){cancelAnimationFrame(this.raf);this.raf=null;}
        else this.start();
      },{signal});
      this.start();
    }
    disconnectedCallback(){this.abort?.abort();cancelAnimationFrame(this.raf);this.raf=null;clearTimeout(this.bubbleTimer);}
    attributeChangedCallback(name,old,value){if(old===value)return;if(name==='src'&&this.isConnected)this.load();else{this.configure();if(this.isConnected)this.clamp();}}
    configure(){
      this.size=Math.max(80,Math.min(280,Number(this.getAttribute('size'))||160));
      this.fps=Math.max(30,Math.min(60,Number(this.getAttribute('fps'))||60));
      this.motionSpeed=Math.max(.6,Math.min(1.4,Number(this.getAttribute('motion-speed'))||1));
      this.h=this.size*208/192;this.style.width=this.size+'px';this.style.height=this.h+'px';
    }
    load(){
      const img=new Image();this.img=img;this.ready=false;this.lastKey='';
      img.onload=()=>{if(this.img!==img)return;if(img.width!==1536||img.height!==2288){this.say('素材尺寸不正确');return;}this.motion=new window.HuixinMotion(img);this.motion.ready.catch(()=>{this.dataset.motionFallback='true';});this.ready=true;this.dispatchEvent(new CustomEvent('pet-ready'));};
      img.onerror=()=>{if(this.img===img){this.say('慧欣的图片没有加载成功');this.dispatchEvent(new CustomEvent('pet-error'));}};
      img.src=this.getAttribute('src')||defaultSprite;
    }
    resetPosition(){this.pos={x:innerWidth-this.size-36,y:innerHeight-this.h-26};this.clamp();}
    clamp(){this.pos.x=Math.max(0,Math.min(innerWidth-this.size,this.pos.x));this.pos.y=Math.max(0,Math.min(innerHeight-this.h,this.pos.y));this.style.transform=`translate3d(${this.pos.x}px,${this.pos.y}px,0)`;}
    move(e){
      if(e.pointerType!=='touch')this.mouse={x:e.clientX,y:e.clientY};
      if(!this.drag||this.drag.id!==e.pointerId){this.render(performance.now());return;}
      const d=this.drag, dx=e.clientX-d.x,dy=e.clientY-d.y;
      if(Math.hypot(dx,dy)>5)d.moved=true;
      if(d.moved){const travel=d.px+dx-this.pos.x;this.dragDirection=travel<0?'left':travel>0?'right':this.dragDirection||'right';this.pos={x:d.px+dx,y:d.py+dy};this.clamp();}
      this.render(performance.now());
    }
    play(state='wave',duration=4200){
      if(!states[state]&&!['dance','pat','feed','sleep','heart'].includes(state))throw new Error('未知动作：'+state);
      this.state=state;this.started=performance.now();this.until=this.started+Math.max(100,Number(duration)||4200);
      this.dispatchEvent(new CustomEvent('pet-action',{detail:{state}}));
    }
    say(text,duration=2400){this.bubble.textContent=String(text);this.bubble.classList.add('show');clearTimeout(this.bubbleTimer);this.bubbleTimer=setTimeout(()=>this.bubble.classList.remove('show'),duration);}
    start(){if(!this.raf&&!document.hidden)this.raf=requestAnimationFrame(t=>this.tick(t));}
    tick(t){this.raf=null;this.render(t);this.start();}
    render(t){
      if(this.ready&&!this.hidden&&(!this.lastRender||t-this.lastRender>=1000/this.fps-1)){
        const delta=Math.min(64,t-(this.lastRender||t));this.lastRender=t;
        const active=t<this.until,mode=this.drag?.moved?(this.dragDirection||'right'):active?this.state:this.hover?'review':'idle';
        const elapsed=(t-(active?this.started:0))/1000*this.motionSpeed;
        const envelope=active?Math.min(1,(t-this.started)/350,(this.until-t)/500):1;
        const smooth=this.reduced.matches?0:Math.max(0,envelope);
        let row=0,col=0,rotation=0,dy=0,dx=0,sx=1,sy=1,tween=null;
        const breath=Math.sin(t/1000*Math.PI/2.8)*smooth;
        sy=1+breath*.006;dy=-breath*.65;
        if(mode==='left'||mode==='right'){
          row=states[mode][0];
          const phase=this.reduced.matches?0:(elapsed/1.8*8)%8;
          col=Math.floor(phase);tween=phase-col;
          const step=Math.sin(elapsed*Math.PI*2/1.6)*smooth;
          dy-=Math.abs(step)*1.8;rotation=step*.018;
          this.stride=step;
        }
        else if(mode==='wave'){row=3;col=1;rotation=Math.sin(elapsed*Math.PI/1.1)*.045*smooth;}
        else if(mode==='dance'){row=6;col=1;rotation=Math.sin(elapsed*Math.PI/1.4)*.085*smooth;dx=Math.sin(elapsed*Math.PI/1.4)*5*smooth;dy-=Math.pow(Math.sin(elapsed*Math.PI/1.4),2)*3*smooth;}
        else if(mode==='pat'){row=8;col=5;sy-=Math.pow(Math.sin(elapsed*Math.PI/1.6),2)*.025*smooth;rotation=Math.sin(elapsed*Math.PI/2)*.025*smooth;}
        else if(mode==='feed'){row=6;col=0;sy+=Math.sin(elapsed*Math.PI/1.5)*.012*smooth;rotation=Math.sin(elapsed*Math.PI/1.5)*.022*smooth;}
        else if(mode==='sleep'){row=5;col=4;sy=1+breath*.01;rotation=.025*smooth;}
        else if(mode==='heart'){row=8;col=5;rotation=Math.sin(elapsed*Math.PI/2.2)*.025*smooth;}
        else if(mode==='review'){row=8;col=1;rotation=Math.sin(t/2400)*.025*smooth;}
        else if(active&&states[mode]){row=states[mode][0];col=Math.floor(elapsed*2)%states[mode][1];}
        else {
          // A brief natural blink, separate from the slower continuous breathing.
          const blink=this.reduced.matches?0:t%6200;col=blink>5920&&blink<6070?3:blink>5850&&blink<6130?2:0;
          if(this.mouse&&this.getAttribute('follow-mouse')!=='false'){
            const mx=this.mouse.x-(this.pos.x+this.size/2),my=this.mouse.y-(this.pos.y+this.h*.3);
            if(Math.hypot(mx,my)>12){
              const angle=(Math.atan2(mx,-my)*180/Math.PI+360)%360;
              if(this.gazeAngle===undefined)this.gazeAngle=angle;
              const difference=((angle-this.gazeAngle+540)%360)-180;
              this.gazeAngle=(this.gazeAngle+difference*(this.reduced.matches?1:1-Math.exp(-delta/110))+360)%360;
              const direction=this.gazeAngle/22.5,index=Math.floor(direction);
              row=9+Math.floor(index/8);col=index%8;tween=direction-index;
              this.dataset.direction=String(Math.round(this.gazeAngle*10)/10);
            }
            rotation=Math.max(-.025,Math.min(.025,mx/8000))*smooth;
            dx=Math.max(-1.3,Math.min(1.3,mx/220))*smooth;
            dy+=Math.max(-.8,Math.min(.8,my/400))*smooth;
          }
        }
        const ctx=this.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,384,416);ctx.globalAlpha=1;
        ctx.save();ctx.translate(192+dx*2,374+dy*2);ctx.rotate(rotation);ctx.scale(sx,sy);
        if(tween!==null&&this.motion)this.motion.draw(ctx,row,col,tween);
        else ctx.drawImage(this.img,col*192,row*208,192,208,-192,-374,384,416);
        ctx.restore();

        if(active&&smooth&&['pat','heart','feed','sleep','dance'].includes(mode)){
          const glyph=mode==='sleep'?'z':mode==='feed'?'🍪':mode==='dance'?'♪':'♥';
          ctx.save();ctx.font=mode==='feed'?'32px sans-serif':'25px sans-serif';ctx.fillStyle='#ed87ad';ctx.textAlign='center';
          for(let i=0;i<3;i++){const phase=(elapsed/2.8+i/3)%1;ctx.globalAlpha=Math.sin(phase*Math.PI)*smooth;ctx.fillText(glyph,70+i*115+Math.sin(phase*Math.PI*2)*8,145-phase*85);}
          ctx.restore();ctx.globalAlpha=1;
        }
        if(!this.mouse||this.getAttribute('follow-mouse')==='false'||mode!=='idle')this.dataset.direction='';
        this.renderCount=(this.renderCount||0)+1;if(!this.measureStart)this.measureStart=t;if(t-this.measureStart>=1000){this.dataset.measuredFps=String(Math.round(this.renderCount*1000/(t-this.measureStart)));this.renderCount=0;this.measureStart=t;}
        this.frame={row,col};this.dataset.pose=String(row)+':'+String(col);this.dataset.tween=tween===null?'':String(tween.toFixed(3));this.dataset.state=mode;this.dataset.renderFps=String(this.fps);
      }
    }
  }
  customElements.define('huixin-pet',HuixinPet);
})();
