'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
test('gift walks retain every waiting donor, coalesce repeat gifts and clear on a new wedding',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../game/game.js'),'utf8');
 const animations=[];let textEffects=0;
 const node=()=>({style:{width:'146px',height:'146px'},classList:{add(){},remove(){}},querySelector(){return {style:{}};},remove(){},animate(){let reject;const animation={finished:new Promise((res,rej)=>{reject=rej;}),cancel(){reject(new Error('cancelled'));}};animations.push(animation);return animation;}});
 const box=node();box.appendChild=()=>{};box.replaceChildren=()=>{};
 const context={giftFocus:{clear(){}},HallLayout:require('../game/hall-layout'),Date,Map,Set,Math,spriteType:()=>0,clearTimeout(){},later(){return 1;},visualTimers:new Set(),makeGuest:node,$:()=>box,guestEls:new Map(),findGuestElement:()=>null,waitingSpot:()=>({x:540,y:1700,width:130}),fmt:String,floatText:()=>textEffects++};
 context.clearFoodDeliveries=()=>{};vm.createContext(context);vm.runInContext('let round=1,FAST=1;',context);
 vm.runInContext(source.slice(source.indexOf('const walkJobs'),source.indexOf('function renderBoards')),context);
 vm.runInContext('globalThis.inspect=()=>({walking,pending:walkWaiting.length,jobs:walkJobs.size,amount:walkJobs.get("a")?.amount});',context);
 context.requestWalk({id:'a',name:'A',seat:0},10000);context.requestWalk({id:'a',name:'A',seat:0},50000);assert.equal(context.inspect().amount,60000);
 for(let i=0;i<100;i++)context.requestWalk({id:'u'+i,name:'Guest',seat:i%72},10000);
 const active=context.inspect();assert.equal(active.walking,4);assert.equal(active.pending,97);assert.equal(active.jobs,101);assert.equal(textEffects,0);
 vm.runInContext('round=2;clearWalks();',context);await Promise.resolve();await Promise.resolve();assert.equal(context.inspect().walking,0);assert.equal(context.inspect().pending,0);assert.equal(context.inspect().jobs,0);
});
test('new table and guest atlas have real WebP alpha',()=>{
 for(const key of ['props/banquet_table.webp','characters/park-dance.webp']){const bytes=fs.readFileSync(path.join(__dirname,'../assets',key));assert.equal(require('./webp-info')(bytes).alpha,true);}
});
