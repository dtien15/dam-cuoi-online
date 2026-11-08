'use strict';
const {comparePriority,visibleWaiting}=require('../game/party-engine');
const HallLayout=require('../game/hall-layout');
const Rollcall=require('../game/rollcall');
const WeddingCycle=require('../game/wedding-cycle');
// The authoritative session stays on the server. Screens need seats, not the full guest archive.
function publicView(state,now=Date.now()){
 const users={},waiting=[[],[]];let guestCount=0,waitingCount=0;
 const teamCounts={groom:0,bride:0};
 const onStage=new Set(Object.values(state.weddingRoles||{}).map(holder=>holder.id));
 for(const user of Object.values(state.users)){
  guestCount++;
  teamCounts[user.team==='bride'?'bride':'groom']++;
  if(onStage.has(user.id))continue;
  if(Number.isInteger(user.seat)&&user.seat>=0&&user.seat<HallLayout.capacity)users[user.id]=user;
  else if(visibleWaiting(user,now)){waitingCount++;waiting[user.team==='bride'?1:0].push(user);}
 }
 const waitingIds=[];
 for(const group of waiting){
  const priority=group.filter(u=>u.hallPriorityUntil>now).sort((a,b)=>b.lastGiftAt-a.lastGiftAt||b.total-a.total).slice(0,1);
  const pinned=new Set(priority.map(u=>u.id)),rest=group.filter(u=>!pinned.has(u.id));
  const start=Math.floor(now/10000)%Math.max(1,rest.length),chosen=[...priority];
  const ranked=rest.slice(start).concat(rest.slice(0,start)).sort(comparePriority);
  for(let i=0;i<Math.min(15-priority.length,rest.length);i++)chosen.push(ranked[i]);
  for(const user of chosen){users[user.id]=user;waitingIds.push(user.id);}
 }

 return{...state,ceremony:WeddingCycle.view(state),rollcall:Rollcall.view(state.rollcall,now),ledger:undefined,users,guestCount,teamCounts,waitingCount,waitingIds};
}
// Merge tiny repetitive packets; gift packets are kept verbatim so every receipt stays accounted for.
function coalesceEvents(events){
 const out=[],positions=new Map();
 for(const event of events){
  if(!['like','join','chat'].includes(event.type)){out.push(event);continue;}
  const key=event.type+'|'+event.id,index=positions.get(key);
  if(index===undefined){positions.set(key,out.length);out.push({...event});}
  else if(event.type==='like')out[index]={...event,count:out[index].count+event.count};
  else out[index]={...event};
 }
 return out;
}
module.exports={publicView,coalesceEvents};
