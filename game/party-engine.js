 'use strict';
// Seating and guest retention only. Wedding scenes are retired until the next update.
const CAPACITY=24;
const FORGET_AFTER=10*60000;
const engagement=u=>(u.chats||0)*3+(u.partyLikes||0)/20+(u.partyShares||0)*5;
const comparePriority=(a,b)=>(b.total||0)-(a.total||0)||engagement(b)-engagement(a)||(b.last||0)-(a.last||0);

function ensure(s){
 if(!s.party||s.party.mode!==4){
  s.party={mode:4,queue:[],active:null};
  for(const u of Object.values(s.users)){u.seat=-1;u.joined??=u.last;}
 }
 return s.party;
}
function protectedIds(s,now){return new Set(Object.values(s.users).filter(u=>u.walkUntil>now).map(u=>u.id));}
const lastSeen=u=>Math.max(u.last||0,u.joined||0,u.lastArrival||0);
const visibleWaiting=(u,now)=>lastSeen(u)>0&&now-lastSeen(u)<FORGET_AFTER;
function seating(s,now){place(s,now);return s.party;}
// Returns whether any guest changed seat.
function place(s,now){
  let moved=false;const p=ensure(s),protectedUsers=protectedIds(s,now),used=new Set(),users=Object.values(s.users);
  const onStage=new Set(Object.values(s.weddingRoles||{}).map(holder=>holder.id));
  const side=u=>u.team==='bride'?1:0;
  const sideOf=seat=>Math.floor(seat/6)%2;
  const belongs=(u,seat)=>sideOf(seat)===side(u);
  // Guests waiting for their toast keep their seat, even if they switch sides or go quiet, so the paid toast is never lost.
  const queued=new Set();for(const q of p.queue)if(q.kind==='toast')for(const id of q.ids)queued.add(id);
  for(const u of users){
    if(onStage.has(u.id)||!Number.isInteger(u.seat)||u.seat<0||u.seat>=CAPACITY||used.has(u.seat)||(!belongs(u,u.seat)&&!protectedUsers.has(u.id)&&!queued.has(u.id))){if(u.seat!==-1)moved=true;u.seat=-1;}
    else used.add(u.seat);
  }
  const waiting=users.filter(u=>!onStage.has(u.id)&&u.seat<0&&visibleWaiting(u,now)&&lastSeen(u)>(u.yieldedAt||0));
  if(waiting.length){
    // Free seats and idle guests who may yield, per side, computed once (seated newcomers are active, so the pools only shrink).
    const free=[[],[]],yielders=[[],[]];
    for(let i=0;i<CAPACITY;i++)if(!used.has(i))free[sideOf(i)].push(i);
    for(const v of users)if(v.seat>=0&&now-(v.seatedAt||0)>=60000&&!protectedUsers.has(v.id)&&!queued.has(v.id)&&now-lastSeen(v)>=(v.total?180000:90000))yielders[sideOf(v.seat)].push(v);
    for(const list of yielders)list.sort((a,b)=>a.last-b.last||a.total-b.total);
    waiting.sort((a,b)=>comparePriority(a,b)||(a.joined-b.joined)||a.id.localeCompare(b.id));
    for(const u of waiting){
      const k=side(u);let seat;
      if(free[k].length)seat=free[k].shift();
      else{
       let old=yielders[k].shift();
       if(!old&&u.total>0&&u.hallPriorityUntil>now){
        // Admit a donor over the lowest-ranked seated guest, preserving active paid scenes.
        old=users.filter(v=>v.seat>=0&&sideOf(v.seat)===k&&!protectedUsers.has(v.id)&&!queued.has(v.id)&&comparePriority(u,v)<0).sort(comparePriority).at(-1);
       }
       if(!old)continue;seat=old.seat;old.seat=-1;old.yieldedAt=now;
      }
      u.seat=seat;u.seatedAt=now;used.add(seat);moved=true;
    }
  }
  // Reserve each front table for that side's six highest seated donors.
  for(const team of ['groom','bride']){
    const first=team==='groom'?0:6,slots=Array.from({length:6},(_,i)=>first+i);
    const guests=users.filter(u=>u.team===team&&u.seat>=0&&belongs(u,u.seat));
    const ranked=guests.filter(u=>u.total>0).sort((a,b)=>b.total-a.total||a.joined-b.joined||a.id.localeCompare(b.id)).slice(0,6);
    const vipIds=new Set(ranked.map(u=>u.id));
    for(const donor of ranked){
      if(slots.includes(donor.seat)||protectedUsers.has(donor.id))continue;
      const target=slots.find(seat=>!guests.some(u=>u.seat===seat))??slots.find(seat=>guests.some(u=>u.seat===seat&&!vipIds.has(u.id)&&!protectedUsers.has(u.id)));
      if(target===undefined)continue;
      const displaced=guests.find(u=>u.seat===target),old=donor.seat;
      donor.seat=target;if(displaced)displaced.seat=old;moved=true;
    }
  }
  return moved;
}
function pruneUsers(s,now=Date.now()){
  const p=ensure(s),keep=protectedIds(s,now);for(const q of p.queue)for(const id of q.ids)keep.add(id);
  let removed=0;
  for(const [id,u] of Object.entries(s.users)){
    const gone=!visibleWaiting(u,now);
    if(u.seat>=0||!gone||keep.has(id))continue;
    if(u.total>0){s.ledger??={};s.ledger[id]={id,name:u.name,avatar:u.avatar||'',gender:u.gender,character:u.character,characterChanges:u.characterChanges,lastWedding:u.lastWedding,lastTakeover:u.lastTakeover,team:u.team,total:u.total,gifts:u.gifts,joined:u.joined};s.ledgerRev=(s.ledgerRev||0)+1;}
    delete s.users[id];removed++;
  }
  return removed;
}

function onEvent(s,e,now=Date.now()){ensure(s);const attendee=s.users[e.id];if(e.type==='like')attendee.partyLikes=(attendee.partyLikes||0)+Math.max(0,Number(e.count)||0);if(e.type==='share')attendee.partyShares=(attendee.partyShares||0)+1;if(e.type==='gift'){const user=s.users[e.id];user.walkUntil=now+12000;user.lastGiftAt=now;user.hallPriorityUntil=now+60000;}place(s,now);}
function tick(s,now=Date.now()){return place(s,now);}
module.exports={CAPACITY,visibleWaiting,ensure,seating,onEvent,tick,pruneUsers,FORGET_AFTER,comparePriority,engagement};
