'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {LoadTest}=require('../lib/load-test'),{advanceSimulation}=require('../lib/live-simulation');
const Wedding=require('../game/wedding-cycle'),Rollcall=require('../game/rollcall');
test('realistic test starts empty and brings guests in progressively with sparse gifts and takeovers',()=>{
 const load=new LoadTest();load.create({scenario:'realistic',guests:100,events:540,rate:3},null,true);
 try{
  assert.equal(Object.keys(load.room.state.users).length,0);
  for(let i=0;i<90;i++)load.apply(load.event(i));
  assert.ok(Object.keys(load.room.state.users).length<=30);assert.ok(load.room.counts.gift<=3);assert.ok(load.room.coverage.takeover<=1);
  for(let i=90;i<540;i++)load.apply(load.event(i));
  assert.equal(Object.keys(load.room.state.users).length,100);assert.ok(load.room.counts.gift<20);assert.equal(load.metrics().scoreMatches,true);
 }finally{load.close();}
});
test('one realistic scenario exercises attendance, character changes, food, gifts, roles, comments, likes and shares with exact scores',()=>{
 const load=new LoadTest();load.create({scenario:'realistic',guests:100,events:600,rate:10},null,true);
 try{
  for(let i=0;i<600;i++)load.apply(load.event(i));
  const report=load.metrics();assert.equal(report.processed,600);assert.equal(report.scoreMatches,true);
  for(const key of ['join','chat','like','share','gift'])assert.ok(report.counts[key]>0,key);
  for(const key of ['character','food','takeover','registration'])assert.ok(report.coverage[key]>0,key);
 }finally{load.close();}
});
test('comprehensive simulation never starts mini games and cancels any previously active mini game',()=>{
 const load=new LoadTest();load.create({scenario:'realistic',guests:100,events:1800,rate:10},null,true);
 const room=load.room,weddingConfig={...Wedding.defaults(),enabled:false},rollcallConfig={...Rollcall.defaults(),enabled:false};
 const run=(elapsed)=>advanceSimulation(room,elapsed,{weddingConfig,rollcallConfig,now:100000+elapsed});
 try{
  run(0);assert.equal(room.state.ceremony.phase,'welcome');assert.equal(room.coverage.wedding,1);
  run(60000);assert.equal(room.coverage.rollcall,0);assert.equal(room.state.rollcall,undefined);
  Rollcall.start(room.state,Rollcall.defaults(),200000);run(120000);assert.equal(room.state.rollcall.phase,'cancelled');assert.equal(room.coverage.tug,0);
  assert.equal(weddingConfig.enabled,false);assert.equal(rollcallConfig.enabled,false);
  room.status='running';load.stop();assert.equal(room.state.rollcall.phase,'cancelled');assert.equal(room.state.ceremony.phase,null);
 }finally{load.close();}
});
