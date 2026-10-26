/* Precomputed spatial in-between frames: no runtime morphing or alpha fades. */
(()=>{
 'use strict';const base=document.currentScript.src;const actionLayout={"wave":{"frames":225,"rows":15,"width":144,"height":156,"columns":16},"pat":{"frames":193,"rows":13,"width":144,"height":156,"columns":16},"feed":{"frames":193,"rows":13,"width":144,"height":156,"columns":16},"heart":{"frames":193,"rows":13,"width":144,"height":156,"columns":16},"think":{"frames":193,"rows":13,"width":144,"height":156,"columns":16},"cheer":{"frames":193,"rows":13,"width":144,"height":156,"columns":16},"dance":{"frames":193,"rows":13,"width":144,"height":156,"columns":16},"sleep":{"frames":97,"rows":7,"width":144,"height":156,"columns":16}};
 class HuixinMotion{
  constructor(image){
   this.image=image;this.atlases={};this.actions=new Map();this.pending=new Map();this.cacheLimit=innerWidth<700?1:3;this.baseImages=[];
   this.ready=Promise.all(['right','left','look'].map(async name=>{
    const atlas=new Image();this.baseImages.push(atlas);const url=new URL('huixin-'+name+'-frames.webp',base);url.search='v=20261014-clean';atlas.src=url.href;await atlas.decode();
    if(atlas.width!==2048||atlas.height!==(name==='look'?2224:1112))throw Error('Invalid motion frames');this.atlases[name]=atlas;
   })).then(()=>this);
  }
  supportsAction(name){return Object.hasOwn(actionLayout,name);}
  hasAction(name){return this.actions.has(name);}
  ensureAction(name){
   if(!this.supportsAction(name)||this.disposed)return Promise.reject(Error('Unknown or disposed action'));
   if(this.actions.has(name))return Promise.resolve(this.actions.get(name));if(this.pending.has(name))return this.pending.get(name);
   const promise=(async()=>{const image=new Image(),url=new URL('huixin-action-'+name+'.webp',base);url.search='v=20261026';image.src=url.href;await image.decode();const layout=actionLayout[name];if(this.disposed){image.removeAttribute('src');throw Error('Disposed action');}if(image.width!==layout.width*layout.columns||image.height!==layout.height*layout.rows)throw Error('Invalid action frames');this.actions.set(name,image);while(this.actions.size>this.cacheLimit){const key=this.actions.keys().next().value;if(key===name)break;this.actions.get(key).removeAttribute('src');this.actions.delete(key);}return image;})();
   this.pending.set(name,promise);promise.then(()=>this.pending.delete(name),()=>this.pending.delete(name));return promise;
  }
  drawAction(ctx,name,progress){
   const image=this.actions.get(name),layout=actionLayout[name];if(!image||!layout)return false;
   this.actions.delete(name);this.actions.set(name,image);const index=Math.min(layout.frames-1,Math.floor(Math.max(0,Math.min(1,progress))*(layout.frames-1)));this.lastActionFrame=index;
   ctx.drawImage(image,index%layout.columns*layout.width,Math.floor(index/layout.columns)*layout.height,layout.width,layout.height,-192,-374,384,416);return true;
  }
  dispose(){this.disposed=true;for(const image of this.baseImages)image.removeAttribute('src');for(const image of this.actions.values())image.removeAttribute('src');this.actions.clear();}
  draw(ctx,row,col,fraction){
   const name=row>=9?'look':row===1?'right':'left',atlas=this.atlases[name];
   if(!atlas){ctx.drawImage(this.image,col*192,row*208,192,208,-192,-374,384,416);return false;}
   const index=row>=9?(row-9)*8+col:col,step=Math.max(0,Math.min(15,Math.floor(fraction*16)));
   ctx.drawImage(atlas,step*128,index*139,128,139,-192,-374,384,416);return false;
  }
 }
 window.HuixinMotion=HuixinMotion;
})();
