'use strict';
(function(root){
 class GiftTraffic{
  constructor({queue,limit=4,run,onStart=()=>{},onError=()=>{},now=()=>Date.now(),schedule=(fn,delay)=>setTimeout(fn,delay),cancel=id=>clearTimeout(id)}){Object.assign(this,{queue,limit,run,onStart,onError,now,schedule,cancel});this.active=new Map();this.paused=false;this.waiters=[];this.timer=null;}
  pump(){if(this.timer!==null){this.cancel(this.timer);this.timer=null;}if(this.paused||[...this.active.values()].some(ticket=>ticket.scene.event?.exclusive))return;while(this.active.size<this.limit){const index=this.queue.findIndex(scene=>!this.active.has(scene.gift.id)&&(!scene.readyAt||scene.readyAt<=this.now()));if(index<0){const future=this.queue.filter(s=>!this.active.has(s.gift.id)&&s.readyAt>this.now());if(future.length)this.timer=this.schedule(()=>{this.timer=null;this.pump();},Math.max(1,Math.min(...future.map(s=>s.readyAt))-this.now()));return;}if(this.queue[index].event?.exclusive&&this.active.size)return;const scene=this.queue.splice(index,1)[0],used=new Set([...this.active.values()].map(t=>t.slot));let slot=0;while(used.has(slot))slot++;const ticket={scene,slot};this.active.set(scene.gift.id,ticket);
   let work;try{this.onStart(scene);work=this.run(scene,slot);}catch(error){this.onError(error);}
   Promise.resolve(work).catch(this.onError).finally(()=>{if(this.active.get(scene.gift.id)!==ticket)return;this.active.delete(scene.gift.id);if(!this.active.size)this.waiters.splice(0).forEach(resolve=>resolve());this.pump();});if(scene.event?.exclusive)return;
  }}
  pause(){this.paused=true;if(this.timer!==null){this.cancel(this.timer);this.timer=null;}}
  resume(){this.paused=false;this.pump();}
  idle(){return this.active.size?new Promise(resolve=>this.waiters.push(resolve)):Promise.resolve();}
  reset(){if(this.timer!==null){this.cancel(this.timer);this.timer=null;}this.queue.length=0;this.active.clear();this.paused=false;this.waiters.splice(0).forEach(resolve=>resolve());}
 }
 if(typeof module!=='undefined')module.exports=GiftTraffic;else root.GiftTraffic=GiftTraffic;
})(typeof globalThis!=='undefined'?globalThis:this);
