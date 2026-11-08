'use strict';
(function(root){
 class LiveRenderQueue{
  constructor({sync,event,schedule=fn=>root.requestAnimationFrame(fn),now=()=>performance.now(),budget=4,maxPerFrame=80,onStats=()=>{}}){Object.assign(this,{sync,event,schedule,now,budget,maxPerFrame,onStats});this.pending=new Map();this.lowKeys=new Map();this.serial=0;this.scheduled=false;this.latest=null;this.round=null;}
  push(state,events=[]){
   if(state){if(this.round!==state.round){this.clear();this.round=state.round;}this.latest=state;}
   for(const event of events){
    const key=['like','join','chat'].includes(event.type)?event.type+'|'+event.id:null;
    const index=key?this.lowKeys.get(key):undefined;
    if(index!==undefined&&this.pending.has(index)){const old=this.pending.get(index);this.pending.set(index,event.type==='like'?{...event,count:old.count+event.count}:event);}
    else{const index=++this.serial;this.pending.set(index,event);if(key)this.lowKeys.set(key,index);}
   }
   this.request();
  }
  request(){if(this.scheduled)return;this.scheduled=true;this.schedule(()=>this.flush());}
  flush(){
   this.scheduled=false;const started=this.now();let processed=0;
   if(this.latest){const state=this.latest;this.latest=null;this.sync(state,this.pending.values());}
   while(this.pending.size&&processed<this.maxPerFrame&&this.now()-started<this.budget){
    const [id,event]=this.pending.entries().next().value;this.pending.delete(id);
    const key=event.type+'|'+event.id;if(this.lowKeys.get(key)===id)this.lowKeys.delete(key);
    this.event(event);processed++;
   }
   this.onStats({pending:this.pending.size,ms:this.now()-started});
   if(this.latest||this.pending.size)this.request();
  }
  clear(){this.latest=null;this.pending.clear();this.lowKeys.clear();}
 }
 if(typeof module!=='undefined')module.exports=LiveRenderQueue;else root.LiveRenderQueue=LiveRenderQueue;
})(globalThis);
