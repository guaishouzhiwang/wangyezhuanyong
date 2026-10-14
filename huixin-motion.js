/* Precomputed spatial in-between frames: no runtime morphing or alpha fades. */
(()=>{
 'use strict';const base=document.currentScript.src;
 class HuixinMotion{
  constructor(image){
   this.image=image;this.atlases={};
   this.ready=Promise.all(['right','left','look'].map(async name=>{
    const atlas=new Image();atlas.src=new URL('huixin-'+name+'-frames.webp',base).href;await atlas.decode();
    if(atlas.width!==2048||atlas.height!==(name==='look'?2224:1112))throw Error('Invalid motion frames');this.atlases[name]=atlas;
   })).then(()=>this);
  }
  draw(ctx,row,col,fraction){
   const name=row>=9?'look':row===1?'right':'left',atlas=this.atlases[name];
   if(!atlas){ctx.drawImage(this.image,col*192,row*208,192,208,-192,-374,384,416);return false;}
   const index=row>=9?(row-9)*8+col:col,step=Math.max(0,Math.min(15,Math.floor(fraction*16)));
   ctx.drawImage(atlas,step*128,index*139,128,139,-192,-374,384,416);return false;
  }
 }
 window.HuixinMotion=HuixinMotion;
})();
