'use strict';
(function(root){
 class GiftFocus{
  static camera(x,y,zoom=3.6){
   const bound=(value,min,max)=>Math.max(min,Math.min(max,value));
   return{zoom,x:bound(540-x*zoom,1080*(1-zoom),0),y:bound(960-y*zoom,1920*(1-zoom),0)};
  }
  constructor(callbacks={}){this.callbacks=callbacks;this.queue=[];this.active=null;}
  enqueue(user,amount,now=Date.now()){
   if(!Number.isFinite(amount)||amount<=0)return;
   if(this.active?.user.id===user.id){this.active.amount+=amount;this.active.until=Math.min(this.active.started+4500,now+1800);return;}
   const queued=this.queue.find(item=>item.user.id===user.id);
   if(queued){queued.amount+=amount;queued.user={...user};queued.at=now;}
   else this.queue.push({user:{...user},amount,at:now});
   this.queue.sort((a,b)=>b.amount-a.amount||a.at-b.at);this.queue.length=Math.min(6,this.queue.length);
  }
  tick(now=Date.now(),blocked=false){
   this.queue=this.queue.filter(item=>now-item.at<8000);
   if(blocked){if(this.active)this.finish();return;}
   if(this.active&&now>=this.active.until)this.finish();
   if(!this.active&&this.queue.length){
    const index=this.queue.findIndex(item=>!this.callbacks.ready||this.callbacks.ready(item.user));
    if(index>=0){this.active={...this.queue.splice(index,1)[0],started:now,until:now+2300,shown:0};this.callbacks.start?.(this.active);}
   }
   if(this.active){const a=this.active;a.shown+=(a.amount-a.shown)*.32;if(a.amount-a.shown<1)a.shown=a.amount;this.callbacks.update?.(a);}
  }
  finish(){this.callbacks.end?.(this.active);this.active=null;}
  clear(){this.queue=[];if(this.active)this.finish();}
 }
 if(typeof module!=='undefined')module.exports=GiftFocus;else root.GiftFocus=GiftFocus;
})(globalThis);
