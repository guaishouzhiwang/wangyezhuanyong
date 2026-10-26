/* Small browser-local companion state; it never submits data to a server. */
(()=>{
 'use strict';const clamp=(v,min,max,fallback)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
 class HuixinCare{
  constructor(storage=null,now=Date.now()){
   if(!storage)try{storage=window.localStorage;}catch{}
   storage=storage||{getItem:()=>null,setItem:()=>{}};
   this.storage=storage;let saved={};try{saved=JSON.parse(storage.getItem('huixin-home-care')||'{}')||{};}catch{}
   this.data={bornAt:clamp(saved.bornAt,0,now,now),updatedAt:clamp(saved.updatedAt,0,now,now),mood:clamp(saved.mood,0,100,78),energy:clamp(saved.energy,0,100,90),interactions:Math.floor(clamp(saved.interactions,0,1000000,0)),pats:Math.floor(clamp(saved.pats,0,1000000,0))};this.refresh(now);this.save();
  }
  refresh(now=Date.now()){const units=Math.floor(Math.max(0,now-this.data.updatedAt)/300000);if(units){this.data.energy=Math.min(100,this.data.energy+Math.min(100,units));this.data.updatedAt=now;}}
  record(action,now=Date.now()){
   this.refresh(now);if(this.lastAction===action&&now-(this.lastAt||0)<350)return this.snapshot(now);this.lastAction=action;this.lastAt=now;this.data.interactions++;
   const effects={pat:[6,0],feed:[5,12],heart:[7,0],wave:[3,0],dance:[9,-8],think:[2,-2],cheer:[10,-6],sleep:[2,15],wake:[3,5],praise:[7,0],walk:[4,-3],follow:[5,-3]};const [m,e]=effects[action]||[1,0];this.data.mood=Math.max(0,Math.min(100,this.data.mood+m));this.data.energy=Math.max(0,Math.min(100,this.data.energy+e));if(action==='pat')this.data.pats++;
   this.save();return this.snapshot(now);
  }
  snapshot(now=Date.now()){this.refresh(now);return {...this.data,days:Math.max(1,Math.floor((now-this.data.bornAt)/86400000)+1)};}
  save(){try{this.storage.setItem('huixin-home-care',JSON.stringify(this.data));}catch{}}
 }
 window.HuixinCare=HuixinCare;
})();
