'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../game/rules'),P=require('../game/party-engine'),MC=require('../game/mc-policy');
test('old wedding scenes clear on migration and live interactions never recreate them',()=>{
 const s=R.createState(1000);s.party={mode:3,active:{kind:'toast'},queue:[{kind:'music'}],battle:{groom:100}};
 P.ensure(s);assert.equal(s.party.active,null);assert.deepEqual(s.party.queue,[]);assert.equal(s.party.battle,undefined);
 for(const [type,extra]of [['chat',{text:'1'}],['like',{count:100000}],['gift',{coins:1000}],['share',{}]]){
  const e=R.applyEvent(s,{id:'a',name:'Lan',type,...extra},2000);P.onEvent(s,e,2000);
 }
 P.tick(s,1000000);assert.equal(s.party.active,null);assert.deepEqual(s.party.queue,[]);assert.equal(s.total,10000000);
 R.resetWedding(s,2000000);assert.equal(P.ensure(s).mode,4);assert.equal(s.total,0);
});
test('spoken gift backlog retains at most twelve donors, highest first, and expires old speech only',()=>{
 const gifts=Array.from({length:1000},(_,i)=>({id:String(i),name:'Khách '+i,vnd:(i+1)*10000,at:1000}));
 MC.trimGifts(gifts,1100);assert.equal(gifts.length,12);assert.equal(gifts[0].vnd,10000000);
 assert.deepEqual(MC.takeGifts(gifts,1200).map(g=>g.id),['999','998','997']);assert.equal(gifts.length,9);
 MC.trimGifts(gifts,30000);assert.equal(gifts.length,0);
});


