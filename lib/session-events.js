'use strict';
const Rules=require('../game/rules'),Party=require('../game/party-engine'),Rollcall=require('../game/rollcall');
const GiftEvents=require('../game/gift-events');
const GuestRequests=require('../game/guest-requests');
const WeddingCycle=require('../game/wedding-cycle');
function deferSteal(state,event,giftConfig){
 const rule=GiftEvents.roleGifts.find(group=>GiftEvents.matches(giftConfig,group.role,event));if(!rule)return false;
 const c=WeddingCycle.ensure(state);
 // Mỗi vai giữ người mới nhất, giống khi nhiều người cùng cướp một vai trong lễ.
 (c.deferredSteals??={})[rule.role]={id:event.id,name:event.name,avatar:event.avatar||'',giftName:event.giftName,unitCoins:event.unitCoins||event.coins};
 return true;
}
function releaseDeferredSteals(state,now=Date.now(),giftConfig){
 const c=state.ceremony;if(!c||c.cancelling)return[];
 if(c.deferredCancel){
  const held=c.deferredCancel;delete c.deferredCancel;
  const event={type:'gift',...held,coins:0,at:now,deferredSteal:true};
  if(state.users[held.id]&&WeddingCycle.cancelWedding(state,event,now,true))return[event];
 }
 const waiting=c.deferredSteals;if(!waiting)return[];
 delete c.deferredSteals;const events=[];
 for(const steal of Object.values(waiting)){
  if(!state.users[steal.id])continue;
  // coins:0 vì quà đã được tính điểm lúc tặng; sự kiện này chỉ để đổi vai và diễn cảnh đá.
  const event={type:'gift',...steal,coins:0,at:now,deferredSteal:true};
  GiftEvents.applyRoleGift(state,event,giftConfig);
  if(!event.weddingRole)continue;
  WeddingCycle.apply(state,event,now,null);events.push(event);
 }
 return events;
}
function applySessionEvent(state,raw,now=Date.now(),giftConfig){
 Rollcall.tick(state.rollcall,now);
 const isolated=!!raw&&Rollcall.captures(state.rollcall,raw,now);
 const event=Rules.applyEvent(state,raw,now,{eventOnly:isolated});if(!event)return null;
 event.at=now;
 const guest=state.users[event.id];
 event.avatar ||=guest.avatar;
 if(event.type==='chat'){
  const request=GuestRequests.parse(event.text);
  if(request?.kind==='gender'){guest.gender=request.gender;guest.character=null;event.gender=request.gender;event.character=null;}
  if(['character','randomCharacter','copyCharacter'].includes(request?.kind)){
   const result=GuestRequests.resolve(request,guest,state.users);
   event.characterResult=result;
   if(result&&!result.error){guest.character=result.character;guest.gender=result.gender;guest.characterChanges=(guest.characterChanges||0)+1;event.character=result.character;event.gender=result.gender;}
  }
  if(request?.kind==='food'&&now-(guest.lastFoodAt||0)>=15000){
   guest.lastFoodAt=now;
   event.food=request.food;
  }
 }
 Rollcall.apply(state.rollcall,event,guest.team,now);
 // Đang mini game thì quà cướp vai vẫn tính điểm, còn cảnh đá được giữ lại tới khi hết trò.
 const gift=event.type==='gift',cancelGift=gift&&GiftEvents.matches(giftConfig,'cancel',event),playing=Rollcall.live(state.rollcall);
 if(cancelGift){
  if(playing){const c=WeddingCycle.ensure(state);if(c.phase)c.deferredCancel={id:event.id,name:event.name,avatar:event.avatar||'',giftName:event.giftName,unitCoins:event.unitCoins||event.coins};}
  else WeddingCycle.cancelWedding(state,event,now);
 }
 const deferred=gift&&!cancelGift&&(playing||!!state.ceremony?.cancelling)&&deferSteal(state,event,giftConfig);
 if(isolated)event.rollcallId=state.rollcall.id;
 else {if(!deferred)GiftEvents.applyRoleGift(state,event,giftConfig);
  const registration=event.type==='gift'?WeddingCycle.joinGifts.find(group=>GiftEvents.matches(giftConfig,'signup-'+group.role,event))||null:null;
  WeddingCycle.apply(state,event,now,registration);}
 // Contest gifts and likes refresh attendance without triggering regular like effects.
 Party.onEvent(state,isolated?{...event,type:'chat',text:''}:event,now);
 return event;
}
module.exports={applySessionEvent,releaseDeferredSteals};
