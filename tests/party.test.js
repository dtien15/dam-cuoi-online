'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../game/rules'),P=require('../game/party-engine');
function fixture(){const s=R.createState(1000);P.ensure(s);return s;}
function event(s,id,type,now,extra={}){const e=R.applyEvent(s,{id,name:'Khách '+id,type,...extra},now);P.onEvent(s,e,now);return s.users[id];}
test('an outside donor replaces exactly the lowest-priority diner on the same side without deleting attendance',()=>{
 const s=fixture();for(let i=0;i<24;i++){event(s,'p'+i,'chat',1000);s.users['p'+i].chats=100+i;}
 const donor=event(s,'donor','gift',2000,{coins:1});
 assert.ok(donor.seat>=0);assert.equal(s.users.p0.seat,-1);assert.ok(s.users.p0);
 const seated=Object.values(s.users).filter(u=>u.seat>=0);assert.equal(seated.length,24);assert.equal(new Set(seated.map(u=>u.seat)).size,24);
 P.tick(s,3000);assert.equal(s.users.p0.seat,-1);assert.equal(s.users.donor.total,10000);
});
test('donors enter an available seat and otherwise receive standing-hall priority without changing their side',()=>{
 const s=fixture();const donor=event(s,'new','gift',1000,{coins:1});assert.ok(donor.seat>=0);assert.equal(donor.hallPriorityUntil,61000);
 const team=donor.team;for(let i=0;i<60;i++)event(s,'g'+i,'chat',1100);
 const waiting=event(s,'outside','gift',1200,{coins:1});assert.ok(waiting.seat>=0);assert.equal(waiting.hallPriorityUntil,61200);
 assert.equal(s.users.new.team,team);assert.ok(s.users.new.seat>=0);
});
test('each side has 12 seats, inactive guests yield on that side and history remains',()=>{
 const s=fixture();for(let i=0;i<24;i++)event(s,String(i),'chat',1000);
 for(const u of Object.values(s.users))assert.equal(Math.floor(u.seat/6)%2,u.team==='bride'?1:0);
 const donor=event(s,'0','gift',1100,{coins:5});const oldSeat=donor.seat;
 event(s,'new','chat',2000);assert.equal(s.users.new.seat,-1);
 event(s,'new','chat',182001);assert.ok(s.users.new.seat>=0);assert.equal(donor.seat,oldSeat);
 assert.equal(donor.total,50000);assert.equal(s.total,50000);
 assert.equal(new Set(Object.values(s.users).filter(u=>u.seat>=0).map(u=>u.seat)).size,24);
});

test('choosing a side moves guests and top six donors get each front VIP table',()=>{
 const s=fixture();
 for(let i=0;i<11;i++){event(s,'g'+i,'chat',1000,{text:'nha trai'});event(s,'b'+i,'chat',1000,{text:'nha gai'});}
 for(let i=0;i<8;i++){event(s,'g'+i,'gift',2000,{coins:i+1});event(s,'b'+i,'gift',2000,{coins:i+1});}
 P.seating(s,20000);
 for(const team of ['groom','bride']){
  const donors=Object.values(s.users).filter(u=>u.team===team&&u.total).sort((a,b)=>b.total-a.total);
  assert.ok(donors.slice(0,6).every(u=>Math.floor(u.seat/6)===(team==='groom'?0:1)));
  assert.ok(donors.slice(6).every(u=>u.seat>=12));
 }
 event(s,'g7','chat',21000,{text:'nha gai'});assert.equal(s.users.g7.team,'bride');assert.equal(Math.floor(s.users.g7.seat/6)%2,1);
 const seats=Object.values(s.users).map(u=>u.seat);P.seating(s,21001);assert.deepEqual(Object.values(s.users).map(u=>u.seat),seats);
});

test('a full hall with a thousand waiting guests handles each event quickly',()=>{
 const s=fixture();for(let i=0;i<1000;i++)event(s,'w'+i,'chat',1000);
 assert.equal(Object.values(s.users).filter(u=>u.seat>=0).length,24);
 const started=process.hrtime.bigint();for(let i=0;i<100;i++)event(s,'w'+(i*7%1000),'like',2000,{count:3});
 const perEvent=Number(process.hrtime.bigint()-started)/1e6/100;assert.ok(perEvent<5,`onEvent took ${perEvent.toFixed(2)}ms`);
 const idle=event(s,'w0','chat',2000).seat;event(s,'late','chat',190000);assert.ok(s.users.late.seat>=0,'idle guests still yield their seat');assert.ok(idle>=0);
});
test('newcomers take free seats immediately and can change sides',()=>{
 const s=fixture();event(s,'quiet','join',1000);assert.ok(s.users.quiet.seat>=0);P.seating(s,2000);assert.ok(s.users.quiet.seat>=0);
 event(s,'quiet','chat',3000,{text:'nhà gái'});assert.equal(s.users.quiet.team,'bride');assert.equal(Math.floor(s.users.quiet.seat/6)%2,1);
 event(s,'fan','join',1000);event(s,'fan','like',4000,{count:1});assert.ok(s.users.fan.seat>=0);
 assert.equal(P.pruneUsers(s,1000+P.FORGET_AFTER),0,'seated guests are kept');event(s,'ghost','join',5000);assert.equal(P.pruneUsers(s,65000),0,'new arrivals seated at free tables are kept');
});
test('a seated guest who leaves the live yields the seat to an active newcomer',()=>{
 const s=fixture();for(let i=0;i<24;i++)event(s,'g'+i,'chat',1000);
 const side=s.users.g0.team==='bride'?'nhà gái':'nhà trai';event(s,'new','chat',80000,{text:side});assert.equal(s.users.new.seat,-1,'full hall, nobody has left yet');
 for(let i=1;i<24;i++)event(s,'g'+i,'like',150000,{count:1});
 event(s,'new','chat',181001,{text:side});assert.ok(s.users.new.seat>=0);assert.equal(s.users.g0.seat,-1);
});
test('donors who left move to the ledger, stay on the leaderboard and come back with their gifts',()=>{
 const s=fixture();for(let i=0;i<24;i++)event(s,'g'+i,'chat',1000);
 event(s,'rich','gift',2000,{coins:9});assert.ok(s.users.rich.seat>=0);const team=s.users.rich.team;
 for(let i=0;i<24;i++)event(s,'g'+i,'like',2000+P.FORGET_AFTER,{count:1});
 s.party.queue=[];s.party.active=null; // the race cheer that rich just won is not under test here
 P.pruneUsers(s,2001+P.FORGET_AFTER);assert.ok(!s.users.rich);assert.equal(s.ledger.rich.total,90000);assert.equal(s.topDonors[0].id,'rich');assert.equal(s.total,90000);
 event(s,'rich','chat',3000+P.FORGET_AFTER,{text:'hello'});assert.equal(s.users.rich.total,90000);assert.equal(s.users.rich.team,team);assert.ok(!s.ledger.rich);
 event(s,'rich','gift',3001+P.FORGET_AFTER,{coins:1});assert.equal(s.topDonors[0].total,100000);assert.equal(s.teamMoney[team],100000);
});
