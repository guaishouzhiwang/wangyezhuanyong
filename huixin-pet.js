/* 慧欣网页宠物 · 原生 Web Component · 无依赖 */
(() => {
  'use strict';
  if (customElements.get('huixin-pet')) return;
  const scriptURL = document.currentScript?.src || document.baseURI;
  const defaultSprite = new URL('huixin-spritesheet.webp', scriptURL).href;
  const states = {idle:[0,6], right:[1,8], left:[2,8], wave:[3,4], jump:[4,5], sad:[5,8], waiting:[6,6], thinking:[7,6], review:[8,6]};
  class HuixinPet extends HTMLElement {
    static get observedAttributes() { return ['size','fps','follow-mouse','src']; }
    constructor() {
      super();
      this.attachShadow({mode:'open'}).innerHTML = `
        <style>
          :host{position:fixed;left:0;top:0;display:block;z-index:2147483000;width:160px;height:174px;contain:layout style;pointer-events:auto;color:#44333c;font:13px/1.5 system-ui,sans-serif}
          :host([hidden]){display:none!important}
          button{all:unset;display:block;width:100%;height:100%;cursor:grab;touch-action:none;border-radius:24px;-webkit-tap-highlight-color:transparent}
          button:active{cursor:grabbing}button:focus-visible{outline:2px solid #d77899;outline-offset:3px}
          canvas{display:block;width:100%;height:100%;pointer-events:none}
          .bubble{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);width:max-content;max-width:min(190px,75vw);padding:10px 14px;background:#fffafc;border:1px solid #f0dce4;border-radius:16px 16px 16px 4px;box-shadow:0 5px 24px #58334512;text-align:center;pointer-events:none;opacity:0;transition:opacity .2s}
          .bubble.show{opacity:1} .error{font-size:12px;color:#8a3946;text-align:center}
          @media(prefers-reduced-motion:reduce){.bubble{transition:none}}
        </style>
        <div class="bubble" role="status" aria-live="polite"></div>
        <button type="button" aria-label="慧欣：点击挥手，拖动移动；方向键移动，Escape 恢复位置"><canvas width="384" height="416" aria-hidden="true"></canvas></button>`;
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
        this.suppressClick=this.drag.moved; this.drag=null;
        this.button.releasePointerCapture(e.pointerId);
      },{signal});
      this.button.addEventListener('pointercancel',()=>{this.drag=null;this.suppressClick=true;},{signal});
      this.button.addEventListener('lostpointercapture',()=>{this.drag=null;},{signal});
      this.button.addEventListener('click',()=>{
        if(this.suppressClick){this.suppressClick=false;return;}
        this.play('wave',1800);this.say('我在这里，陪着你。');
      },{signal});
      this.button.addEventListener('keydown',e=>{
        const moves={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]};
        if(moves[e.key]){e.preventDefault();this.pos.x+=moves[e.key][0];this.pos.y+=moves[e.key][1];this.clamp();}
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
      this.fps=Math.max(4,Math.min(24,Number(this.getAttribute('fps'))||12));
      this.h=this.size*208/192;this.style.width=this.size+'px';this.style.height=this.h+'px';
    }
    load(){
      const img=new Image();this.img=img;this.ready=false;this.lastKey='';
      img.onload=()=>{if(this.img!==img)return;if(img.width!==1536||img.height!==2288){this.say('素材尺寸不正确');return;}this.ready=true;this.dispatchEvent(new CustomEvent('pet-ready'));};
      img.onerror=()=>{if(this.img===img){this.say('慧欣的图片没有加载成功');this.dispatchEvent(new CustomEvent('pet-error'));}};
      img.src=this.getAttribute('src')||defaultSprite;
    }
    resetPosition(){this.pos={x:innerWidth-this.size-36,y:innerHeight-this.h-26};this.clamp();}
    clamp(){this.pos.x=Math.max(0,Math.min(innerWidth-this.size,this.pos.x));this.pos.y=Math.max(0,Math.min(innerHeight-this.h,this.pos.y));this.style.transform=`translate3d(${this.pos.x}px,${this.pos.y}px,0)`;}
    move(e){
      if(e.pointerType!=='touch')this.mouse={x:e.clientX,y:e.clientY};
      if(!this.drag||this.drag.id!==e.pointerId)return;
      const d=this.drag, dx=e.clientX-d.x,dy=e.clientY-d.y;
      if(Math.hypot(dx,dy)>5)d.moved=true;
      if(d.moved){this.dragDirection=e.movementX<0?'left':e.movementX>0?'right':this.dragDirection||'right';this.pos={x:d.px+dx,y:d.py+dy};this.clamp();}
    }
    play(state='wave',duration=2000){
      if(!states[state])throw new Error('未知动作：'+state);
      this.state=state;this.started=performance.now();this.until=this.started+Math.max(100,Number(duration)||2000);
      this.dispatchEvent(new CustomEvent('pet-action',{detail:{state}}));
    }
    say(text,duration=2400){this.bubble.textContent=String(text);this.bubble.classList.add('show');clearTimeout(this.bubbleTimer);this.bubbleTimer=setTimeout(()=>this.bubble.classList.remove('show'),duration);}
    start(){if(!this.raf&&!document.hidden)this.raf=requestAnimationFrame(t=>this.tick(t));}
    tick(t){
      this.raf=null;
      if(this.ready&&!this.hidden){
        let row=0,col=0,mode='idle';
        if(this.drag?.moved)mode=this.dragDirection||'right';
        else if(t<this.until)mode=this.state;
        else if(this.hover)mode='review';
        else if(this.mouse&&this.getAttribute('follow-mouse')!=='false')mode='look';
        if(mode==='look'){
          const dx=this.mouse.x-(this.pos.x+this.size/2),dy=this.mouse.y-(this.pos.y+this.h*.30);
          if(Math.hypot(dx,dy)>12){
            const angle=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;
            const difference=((angle-this.gaze*22.5+540)%360)-180;
            if(Math.abs(difference)>14)this.gaze=Math.round(angle/22.5)%16;
            row=9+Math.floor(this.gaze/8);col=this.gaze%8;
          }
        }else{
          if(this.animationMode!==mode){this.animationMode=mode;this.animationStart=t;}
          const st=states[mode];row=st[0];
          const origin=mode===this.state&&t<this.until?this.started:this.animationStart;
          col=this.reduced.matches?0:Math.floor((t-origin)*this.fps/1000)%st[1];
        }
        const key=row+':'+col;
        if(this.lastKey!==key){
          // Replace a whole opaque pose atomically. Alpha crossfades make the
          // overlapping sprite fade at every transition and cause visible flicker.
          this.frame={row,col};this.lastKey=key;
          this.ctx.globalAlpha=1;
          this.ctx.clearRect(0,0,384,416);
          this.ctx.drawImage(this.img,col*192,row*208,192,208,0,0,384,416);
        }
        this.dataset.state=mode;this.dataset.direction=mode==='look'?String(this.gaze*22.5):'';
      }
      this.start();
    }
  }
  customElements.define('huixin-pet',HuixinPet);
})();
