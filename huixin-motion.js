/* Precomputed spatial in-between frames: no runtime morphing or alpha fades. */
(()=>{
 'use strict';
/* Same drawn poses, continuous spatial interpolation, one opaque silhouette. */
/* Same drawn poses, continuous spatial interpolation, one opaque silhouette. */
/* Same drawn poses, continuous spatial interpolation, one opaque silhouette. */
class HuixinFastActions{
 constructor(payload){
  this.payload=payload;this.available=false;
  this.ready=this.load();
 }
 async load(){
  if(!this.payload){
   const script=document.getElementById('huixin-action-bundle');
   if(!script||script.dataset.failed)throw Error('Action bundle unavailable');
   this.payload=await new Promise((resolve,reject)=>{
    script.addEventListener('load',()=>window.HuixinActionAssets?resolve(window.HuixinActionAssets):reject(Error('Invalid action bundle')),{once:true});
    script.addEventListener('error',()=>reject(Error('Action bundle unavailable')),{once:true});
   });
  }
  this.layout=this.payload.layout;this.keys=new Image();this.keys.src=this.payload.keys;
  await this.keys.decode();if(this.disposed)throw Error('Disposed actions');
  this.available=true;
  try{
   this.fields=new Image();this.fields.src=this.payload.flows;await this.fields.decode();if(this.disposed)throw Error('Disposed actions');
   this.initGL();
  }catch(error){this.gpu=false;}
  return this;
 }
 initGL(){
  this.canvas=document.createElement('canvas');this.canvas.width=this.layout.width;this.canvas.height=this.layout.height;
  const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});
  if(!gl)throw Error('WebGL unavailable');this.gl=gl;
  if(this.keys.width>gl.getParameter(gl.MAX_TEXTURE_SIZE)||this.keys.height>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw Error('Texture size unavailable');
  const vertex=`attribute vec2 p;varying highp vec2 uv;void main(){uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0.,1.);}`;
  const fragment=`precision highp float;
   varying highp vec2 uv;uniform sampler2D keys;uniform sampler2D fields;
   uniform vec2 keySize;uniform vec2 fieldSize;uniform vec2 tileSize;uniform vec2 flowSize;
   uniform vec2 keyOrigin;uniform vec2 flowOrigin;uniform float fraction;uniform float backward;
   void main(){
    vec2 fieldPoint=clamp(uv*flowSize,vec2(.5),flowSize-vec2(.5));
    vec4 flow=(texture2D(fields,(flowOrigin+fieldPoint)/fieldSize)*255.-128.)*.25;
    vec2 delta=backward>.5?flow.ba:flow.rg;
    vec2 point=uv*tileSize-fraction*delta;
    if(point.x<0.||point.y<0.||point.x>=tileSize.x||point.y>=tileSize.y){gl_FragColor=vec4(0.);return;}
    gl_FragColor=texture2D(keys,(keyOrigin+clamp(point,vec2(.5),tileSize-vec2(.5)))/keySize);
   }`;
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
  this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('Motion shader link failed');
  gl.useProgram(this.program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const p=gl.getAttribLocation(this.program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  this.uniforms={};for(const name of ['keys','fields','keySize','fieldSize','tileSize','flowSize','keyOrigin','flowOrigin','fraction','backward'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
  this.textures=[];
  for(const [unit,image,premultiply] of [[0,this.keys,true],[1,this.fields,false]]){
   const texture=gl.createTexture();this.textures.push(texture);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,premultiply);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  }
  const u=this.uniforms,l=this.layout;gl.uniform1i(u.keys,0);gl.uniform1i(u.fields,1);
  gl.uniform2f(u.keySize,this.keys.width,this.keys.height);gl.uniform2f(u.fieldSize,this.fields.width,this.fields.height);
  gl.uniform2f(u.tileSize,l.width,l.height);gl.uniform2f(u.flowSize,l.flowWidth,l.flowHeight);
  gl.viewport(0,0,l.width,l.height);gl.disable(gl.BLEND);this.gpu=true;
  this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.gpu=false;});
 }
 draw(ctx,name,progress,mirror=false){
  const meta=this.layout?.actions[name];if(!this.available||!meta)return false;
  const l=this.layout,total=meta.keys.length-1,u=Math.max(0,Math.min(1,progress))*total;
  const segment=Math.min(total-1,Math.floor(u)),t=u-segment,backward=t>=.5;
  const index=meta.keys[segment+(backward?1:0)];
  ctx.save();if(mirror)ctx.scale(-1,1);
  if(this.gpu){
   const gl=this.gl,uniform=this.uniforms,field=meta.flowStart+segment;
   gl.useProgram(this.program);gl.uniform2f(uniform.keyOrigin,index%l.columns*l.width,Math.floor(index/l.columns)*l.height);
   gl.uniform2f(uniform.flowOrigin,field%l.flowColumns*l.flowWidth,Math.floor(field/l.flowColumns)*l.flowHeight);
   gl.uniform1f(uniform.fraction,backward?1-t:t);gl.uniform1f(uniform.backward,backward?1:0);
   gl.drawArrays(gl.TRIANGLE_STRIP,0,4);ctx.drawImage(this.canvas,-192,-374,384,416);
  }else ctx.drawImage(this.keys,index%l.columns*l.width,Math.floor(index/l.columns)*l.height,l.width,l.height,-192,-374,384,416);
  ctx.restore();this.lastKey=index;return true;
 }
 dispose(){this.disposed=true;this.available=false;if(this.gl){for(const texture of this.textures||[])this.gl.deleteTexture(texture);this.gl.deleteProgram(this.program);}this.keys?.removeAttribute('src');this.fields?.removeAttribute('src');}
}

 const base=document.currentScript.src;const actionLayout={"wave":{"frames":217,"rows":14,"width":160,"height":174,"columns":16},"pat":{"frames":169,"rows":11,"width":160,"height":174,"columns":16},"feed":{"frames":241,"rows":16,"width":160,"height":174,"columns":16},"heart":{"frames":193,"rows":13,"width":160,"height":174,"columns":16},"think":{"frames":193,"rows":13,"width":160,"height":174,"columns":16},"cheer":{"frames":145,"rows":10,"width":160,"height":174,"columns":16},"dance":{"frames":241,"rows":16,"width":160,"height":174,"columns":16},"sleep":{"frames":133,"rows":9,"width":160,"height":174,"columns":16},"walk":{"frames":102,"rows":7,"width":160,"height":174,"columns":16}};
 class HuixinMotion{
  constructor(image){
   this.image=image;this.atlases={};this.actions=new Map();this.pending=new Map();this.cacheLimit=innerWidth<700?2:4;this.baseImages=[];
   this.fast=new HuixinFastActions(window.HuixinActionAssets);
   this.ready=this.fast.ready.catch(()=>this).then(()=>this);
   this.legacyPending=new Map();
  }
  supportsAction(name){return Object.hasOwn(actionLayout,name);}
  hasAction(name){return !!(this.fast.available&&this.fast.gpu)||this.actions.has(name);}
  ensureAction(name){
   if(!this.supportsAction(name)||this.disposed)return Promise.reject(Error('Unknown or disposed action'));
   if(this.fast.available&&this.fast.gpu)return Promise.resolve(this.fast);
   if(this.actions.has(name))return Promise.resolve(this.actions.get(name));if(this.pending.has(name))return this.pending.get(name);
   const promise=(async()=>{await this.fast.ready.catch(()=>{});if(this.disposed)throw Error('Disposed action');if(this.fast.available&&this.fast.gpu)return this.fast;const image=new Image();image.fetchPriority='high';const url=new URL('huixin-action-'+name+'.webp',base);url.search='v=20261027-drawn';image.src=url.href;await image.decode();const layout=actionLayout[name];if(this.disposed){image.removeAttribute('src');throw Error('Disposed action');}if(image.width!==layout.width*layout.columns||image.height!==layout.height*layout.rows)throw Error('Invalid action frames');this.actions.set(name,image);while(this.actions.size>this.cacheLimit){const key=this.actions.keys().next().value;if(key===name)break;this.actions.get(key).removeAttribute('src');this.actions.delete(key);}return image;})();
   this.pending.set(name,promise);promise.then(()=>this.pending.delete(name),()=>this.pending.delete(name));return promise;
  }
  drawAction(ctx,name,progress,mirror=false){
   const image=this.actions.get(name),layout=actionLayout[name];if(!layout)return false;
   if(!image&&this.fast.draw(ctx,name,progress,mirror)){this.lastActionFrame=Math.floor(Math.max(0,Math.min(1,progress))*(layout.frames-1));this.lastRenderer=this.fast.gpu?'gpu':'keyframes';return true;}
   if(!image)return false;this.lastRenderer='atlas';
   this.actions.delete(name);this.actions.set(name,image);const index=Math.min(layout.frames-1,Math.floor(Math.max(0,Math.min(1,progress))*(layout.frames-1)));this.lastActionFrame=index;
   ctx.save();if(mirror)ctx.scale(-1,1);ctx.drawImage(image,index%layout.columns*layout.width,Math.floor(index/layout.columns)*layout.height,layout.width,layout.height,-192,-374,384,416);ctx.restore();return true;
  }
  dispose(){this.disposed=true;this.fast.dispose();for(const image of this.baseImages)image.removeAttribute('src');for(const image of this.actions.values())image.removeAttribute('src');this.actions.clear();}
  ensureLegacy(name){
   if(this.atlases[name]||this.legacyPending.has(name)||this.disposed)return;
   const image=new Image();image.fetchPriority='low';this.baseImages.push(image);const url=new URL('huixin-'+name+'-frames.webp',base);url.search='v=20261014-clean';image.src=url.href;
   this.legacyPending.set(name,image.decode().then(()=>{if(!this.disposed)this.atlases[name]=image;},()=>{}));
  }
  draw(ctx,row,col,fraction){
   const name=row>=9?'look':row===1?'right':'left',atlas=this.atlases[name];
   if(!atlas){this.ensureLegacy(name);ctx.drawImage(this.image,col*192,row*208,192,208,-192,-374,384,416);return false;}
   const index=row>=9?(row-9)*8+col:col,step=Math.max(0,Math.min(15,Math.floor(fraction*16)));
   ctx.drawImage(atlas,step*128,index*139,128,139,-192,-374,384,416);return false;
  }
 }
 window.HuixinMotion=HuixinMotion;
})();
