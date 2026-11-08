'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../game/game.js'),'utf8'),G=require('../game/gift-events'),Traffic=require('../game/gift-traffic'),flush=()=>new Promise(setImmediate);
test('ground-level envelope guests walk together while MC thank-you audio is still preparing',async()=>{
 const walking=[],queue=Array.from({length:4},(_,i)=>({round:1,event:G.defaults().events[0],gift:{id:'g'+i,name:'Khách '+i,coins:1},amount:10000}));
 const scope={giftSceneQueue:queue,giftSpeechQueue:[],giftStreak:0,speechGeneration:1,GiftTraffic:Traffic,GiftEvents:G,waitGiftSpeechStart:()=>{throw Error('ground walks must not wait for MC');},playGiftScene:async scene=>walking.push(scene.gift.id),console};vm.createContext(scope);
 vm.runInContext(source.slice(source.indexOf('const giftTraffic=new GiftTraffic('),source.indexOf('\nconst mc=',source.indexOf('const giftTraffic=')))+';this.traffic=giftTraffic;',scope);
 scope.traffic.pump();assert.equal(walking.length,4);assert.equal(scope.giftSpeechQueue.length,4);await flush();assert.equal(scope.traffic.active.size,0);
});
test('special stage guests wait for their introduction and cancel on session change',async()=>{
 for(const cancel of [false,true]){
  const waits=[],walking=[],queue=Array.from({length:4},(_,i)=>({round:1,event:{...G.defaults().events[0],action:'stage'},gift:{id:'guest'+i,name:'Khách '+i,coins:1},amount:10000}));
  const scope={giftSceneQueue:queue,giftSpeechQueue:[],giftStreak:0,speechGeneration:1,GiftTraffic:Traffic,GiftEvents:G,sleepScene:()=>new Promise(resolve=>waits.push(resolve)),playGiftScene:async scene=>walking.push(scene.gift.id),console};vm.createContext(scope);
  vm.runInContext(source.slice(source.indexOf('async function waitGiftSpeechStart('),source.indexOf('function enterGiftStage(')),scope);
  vm.runInContext(source.slice(source.indexOf('const giftTraffic=new GiftTraffic('),source.indexOf('\nconst mc=',source.indexOf('const giftTraffic=')))+';this.traffic=giftTraffic;',scope);
  scope.traffic.pump();assert.equal(scope.giftSpeechQueue.length,4);assert.equal(scope.traffic.active.size,4);assert.equal(walking.length,0,'no puppet is created while preparing voice');
  if(cancel)scope.speechGeneration++;else for(const scene of scope.giftSpeechQueue)scene.acks.forEach(ack=>ack.started=true);
  waits.splice(0).forEach(resolve=>resolve());await flush();assert.equal(walking.length,cancel?0:4);assert.equal(scope.traffic.active.size,0);
 }
});
test('a still-running donation streak does not silence ordinary MC replies',async()=>{
 const stop=Error('test stop');let ticks=0,spoken=0;const scope={sleep:async()=>{if(++ticks>3)throw stop;},rigs:{mc:{}},wsUp:true,Rollcall:require('../game/rollcall'),cycleState:null,cycleVoiceQueue:[],WeddingCycle:require('../game/wedding-cycle'),WeddingCycleView:{busy:false},rollcallState:null,rollcallExclusive:false,rollcallIntroId:null,rollcallResults:new Set(),heartState:null,heartConfig:{enabled:true},heartLocal:0,heartReserved:false,giftStreak:0,giftSceneQueue:[{readyAt:Date.now()+2500}],giftSpeechQueue:[],giftTraffic:{active:new Map(),pump(){}},S:{soundOn:true},audioBlocked:false,mc:{gifts:[],queue:[{kind:'comment',createdAt:Date.now(),expiresAt:Infinity,seq:[['mc','Chào Lan!']]}],current:null},MCPolicy:require('../game/mc-policy'),host:{busy:()=>false,social:()=>null},lastInteractionAt:Date.now(),idleAt:Date.now(),speechGeneration:1,say:async()=>{spoken++;},$:()=>({classList:{remove(){},contains(){return false;}}})};vm.createContext(scope);vm.runInContext(source.slice(source.indexOf('async function mcLoop(){'),source.indexOf('function queueReply(')),scope);await assert.rejects(scope.mcLoop(),e=>e===stop);assert.equal(spoken,1);
});
