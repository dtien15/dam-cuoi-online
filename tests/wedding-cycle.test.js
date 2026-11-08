'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../game/wedding-cycle'),R=require('../game/rules'),{applySessionEvent:apply}=require('../lib/session-events'),P=require('../game/party-engine');
const config=C.defaults(),now=1000000;
function fixture(){const s=R.createState(now);C.tick(s,config,now);return s;}
function event(s,id,type,extra={},at=now+100){return apply(s,{id,name:'Khách '+id,type,...extra},at);}
test('GG and TikTok fill empty roles immediately, then register waiting guests; roses only deliver envelopes',()=>{
 const s=fixture();const rose=event(s,'rose','gift',{coins:1,giftName:'Rose'});assert.equal(rose.ceremonyRegistration,undefined);assert.deepEqual(s.weddingRoles,{});
 const bride=event(s,'a','gift',{coins:1,giftName:'GG'});assert.equal(bride.ceremonyRegistration.immediate,true);assert.equal(s.weddingRoles.bride.id,'a');assert.equal(s.users.a.seat,-1);
 event(s,'b','gift',{coins:1,giftName:'TikTok'});assert.equal(s.weddingRoles.groom.id,'b');
 const waiting=event(s,'c','gift',{coins:1,giftName:'GG'});assert.equal(waiting.ceremonyRegistration.accepted,true);assert.equal(waiting.weddingRole,undefined);assert.equal(s.ceremony.queues.bride[0].id,'c');
 const steal=event(s,'d','gift',{coins:5,giftName:'Finger Heart'});assert.equal(steal.weddingRole.role,'groom');assert.equal(s.weddingRoles.groom.id,'d');
});
test('six-scene wedding welcomes guests for twenty seconds and thanks both families for sixty seconds without clearing scores',()=>{
 const s=fixture();assert.deepEqual(C.phases,['welcome','entrance','ceremony','cake','show','thanks']);
 assert.equal(config.durations.welcome,20);assert.equal(config.durations.thanks,60);
 event(s,'a','gift',{coins:1,giftName:'TikTok'});const total=s.total;
 for(const phase of C.phases){assert.equal(s.ceremony.phase,phase);s.ceremony.ack=true;C.tick(s,config,s.ceremony.endsAt,true);}
 assert.equal(s.ceremony.phase,'welcome');assert.equal(s.total,total);assert.ok(s.users.a);
});
test('takeovers pause and resume the remaining time in every wedding scene',()=>{
 for(const phase of C.phases){const s=fixture();s.ceremony.phase=phase;s.ceremony.endsAt=now+20000;
  C.holdTakeover(s,now+5000);assert.equal(C.tick(s,config,now+21000),false);
  C.resumeTakeover(s,now+22000);assert.equal(s.ceremony.phase,phase);assert.equal(s.ceremony.endsAt,now+37000);
 }
});
test('only spectators in the aisle close to the moving couple blur and recover outside that area',()=>{
 assert.equal(C.shouldBlurAisle(540,1500,[1450,1450]),true);
 assert.equal(C.shouldBlurAisle(200,1500,[1450,1450]),false);
 assert.equal(C.shouldBlurAisle(540,1000,[1450,1450]),false);
 assert.equal(C.shouldBlurAisle(710,1500,[1450,1450]),false);
});
test('specific one-coin gifts register one FIFO slot per account, quantities do not repeat weddings',()=>{
 const s=fixture();s.weddingRoles={bride:{id:'occupied-b'},groom:{id:'occupied-g'}};for(let i=0;i<30;i++)event(s,'a','gift',{coins:10,unitCoins:1,giftName:'GG'});
 event(s,'b','gift',{coins:1,giftName:'GG'});event(s,'c','gift',{coins:1,giftName:'TikTok'});
 assert.deepEqual(s.ceremony.queues.bride.map(x=>x.id),['a','b']);assert.equal(s.ceremony.queues.groom.length,1);
 const total=s.total;for(const phase of C.phases){s.ceremony.ack=true;C.tick(s,config,s.ceremony.endsAt+1,true);}
 assert.equal(s.weddingRoles.bride.id,'a');assert.equal(s.weddingRoles.groom.id,'c');assert.equal(s.total,total);P.tick(s,now+61000);assert.equal(s.users.a.seat,-1);
});
test('normal gifts do not join queue; fallback respects known gender, interaction and cooldown',()=>{
 const s=fixture();event(s,'female','chat',{text:'tôi là nữ'});s.users.female.gender='female';event(s,'male','like',{count:50});s.users.male.gender='male';event(s,'quiet','join');
 event(s,'other','gift',{coins:1,giftName:'Ice Cream'});assert.equal(s.ceremony.queues.bride.length,0);
 for(let i=0;i<C.phases.length;i++){for(const u of Object.values(s.users)){u.last=s.ceremony.endsAt;u.weddingActivity={at:u.last,score:5};}C.tick(s,config,s.ceremony.endsAt+1);}
 assert.equal(s.weddingRoles.bride.id,'female');assert.equal(s.weddingRoles.groom.id,'male');
 for(let i=0;i<C.phases.length;i++){for(const u of Object.values(s.users)){u.last=s.ceremony.endsAt;u.weddingActivity={at:u.last,score:5};}C.tick(s,config,s.ceremony.endsAt+1);}
 assert.equal(s.users.female.lastWedding,2);assert.ok(!Object.values(s.weddingRoles).some(u=>u.id==='female'));
});
test('screen acknowledgement waits for MC, stale acknowledgement cannot skip current phase; headless advances',()=>{
 const s=fixture(),end=s.ceremony.endsAt;assert.equal(C.tick(s,config,end,true),false);s.ceremony.ack=true;assert.equal(C.tick(s,config,end-1,true),false);assert.equal(C.tick(s,config,end,true),true);assert.equal(s.ceremony.phase,'entrance');assert.equal(s.ceremony.ack,false);assert.equal(C.tick(s,config,s.ceremony.endsAt+15001,true),true);
});
test('stealing keeps ceremony, one guest cannot occupy both roles, and animation has time to finish',()=>{
 const s=fixture(),key=s.ceremony.key;const e=event(s,'steal','gift',{coins:5,giftName:'Finger Heart'});assert.equal(e.weddingRole.role,'groom');assert.equal(s.ceremony.key,key);assert.equal(s.weddingRoles.groom.id,'steal');const second=event(s,'steal','gift',{coins:5,giftName:'Peach'});assert.equal(second.weddingRole,undefined);assert.equal(s.weddingRoles.bride,undefined);
});
test('per-cycle effects reset, configuration persists and resetting session clears ceremony and roles',()=>{
 const s=fixture();event(s,'a','like',{count:100});assert.equal(s.ceremony.celebration,1);const restored=R.migrateState(JSON.parse(JSON.stringify(s)));assert.equal(restored.ceremony.number,1);
 for(let i=0;i<C.phases.length;i++){for(const u of Object.values(s.users)){u.last=s.ceremony.endsAt;u.weddingActivity={at:u.last,score:5};}C.tick(s,config,s.ceremony.endsAt+1);}assert.equal(s.ceremony.lastCelebration,0);event(s,'a','like',{count:100},s.ceremony.startedAt+1);assert.equal(s.ceremony.celebration,1);
 R.resetWedding(s);assert.equal(s.ceremony,undefined);C.tick(s,config);assert.equal(s.ceremony.number,1);assert.deepEqual(s.weddingRoles,{});
 assert.throws(()=>C.validate({...config,durations:{...config.durations,show:7}}));
});
