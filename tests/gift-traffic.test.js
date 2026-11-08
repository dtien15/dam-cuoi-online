'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),GiftTraffic=require('../game/gift-traffic');
const flush=()=>new Promise(setImmediate),gift=id=>({gift:{id},round:1});
test('default browser timers retain the Window receiver instead of invoking native timers on GiftTraffic',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),scope={};vm.createContext(scope);
 vm.runInContext("let calls=0;function setTimeout(fn,ms){'use strict';if(this!==undefined&&this!==globalThis)throw Error('Illegal invocation');calls++;return 1;}function clearTimeout(id){'use strict';if(this!==undefined&&this!==globalThis)throw Error('Illegal invocation');calls--;}this.timerCalls=()=>calls;",scope);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../game/gift-traffic.js'),'utf8'),scope);
 const traffic=new scope.GiftTraffic({queue:[{gift:{id:'a'},readyAt:2500}],now:()=>0,run:async()=>{}});assert.doesNotThrow(()=>traffic.pump());assert.equal(scope.timerCalls(),1);assert.doesNotThrow(()=>traffic.pause());assert.equal(scope.timerCalls(),0);
});
test('a donor streak starts once only after 2.5 quiet seconds, preserving all twenty gifts',async()=>{
 const G=require('../game/gift-events'),queue=[],started=[];let now=0,serial=0;const timers=new Map();
 const traffic=new GiftTraffic({queue,now:()=>now,schedule:(fn,delay)=>{timers.set(++serial,{fn,at:now+delay});return serial;},cancel:id=>timers.delete(id),run:scene=>{started.push(scene);return Promise.resolve();}});
 for(let i=0;i<20;i++){now=i*200;const scene=G.enqueue(queue,{round:1,event:G.defaults().events[0],gift:{id:'Lan',name:'Lan',coins:1},amount:10000});scene.readyAt=now+2500;traffic.pump();assert.equal(started.length,0);assert.equal(timers.size,1,'only one wake-up timer for the queue');}
 now=6299;traffic.pump();assert.equal(started.length,0);now=6300;traffic.pump();assert.equal(started.length,1);assert.equal(started[0].gift.coins,20);assert.equal(started[0].amount,200000);assert.equal(started[0].event.coins,1,'twenty roses do not become a higher individual gift tier');assert.equal(timers.size,0);await flush();
});
test('pausing an event cancels debounce timers and resumes ready donors afterwards',()=>{let timers=0,started=0;const queue=[{...gift('a'),readyAt:2500}],traffic=new GiftTraffic({queue,now:()=>0,schedule:()=>{timers++;return 1;},cancel:()=>timers--,run:()=>{started++;}});traffic.pump();assert.equal(timers,1);traffic.pause();assert.equal(timers,0);traffic.pump();assert.equal(started,0);traffic.reset();});
test('four guests start immediately while thanks are queued independently of unfinished movement',async()=>{
 const queue=Array.from({length:7},(_,i)=>gift('g'+i)),moving=[],spoken=[],finish=[];
 const traffic=new GiftTraffic({queue,run:(scene,slot)=>{moving.push([scene.gift.id,slot]);return new Promise(resolve=>finish.push(resolve));},onStart:scene=>spoken.push(scene.gift.id)});
 traffic.pump();assert.equal(traffic.active.size,4);assert.equal(queue.length,3);assert.equal(spoken.length,4,'thanks do not wait for guests to return');assert.deepEqual(moving.map(g=>g[1]),[0,1,2,3]);finish[0]();await flush();assert.equal(traffic.active.size,4);assert.equal(moving[4][0],'g4');assert.equal(moving[4][1],0,'finished slot reused');finish.forEach(resolve=>resolve());await flush();finish.forEach(resolve=>resolve());await flush();assert.equal(traffic.active.size,0);assert.equal(spoken.length,7);
});
test('an exclusive event drains active guests and holds new donations until resumed',async()=>{
 const queue=[gift('first')],started=[],finish=[];const traffic=new GiftTraffic({queue,run:s=>{started.push(s.gift.id);return new Promise(resolve=>finish.push(resolve));}});traffic.pump();traffic.pause();queue.push(gift('during-event'));traffic.pump();let idle=false;const drained=traffic.idle().then(()=>idle=true);assert.equal(idle,false);finish[0]();await drained;await flush();assert.deepEqual(started,['first']);assert.equal(queue.length,1);traffic.resume();assert.deepEqual(started,['first','during-event']);finish[1]();await flush();
});
test('one donor never has overlapping puppets and stale completions cannot erase a new session',async()=>{
 const queue=[gift('same'),gift('same'),gift('other')],finish=[];const traffic=new GiftTraffic({queue,run:()=>new Promise(resolve=>finish.push(resolve))});traffic.pump();assert.equal(traffic.active.size,2);assert.equal(queue.length,1);traffic.reset();queue.push(gift('same'));traffic.pump();finish[0]();finish[1]();await flush();assert.equal(traffic.active.size,1,'old job cannot delete replacement with same donor ID');finish[2]();await flush();assert.equal(traffic.active.size,0);
});
test('several stage guests share one couple pose, restored after the last guest leaves',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),source=fs.readFileSync(path.join(__dirname,'../game/game.js'),'utf8');let count=0,cancelled=0;const el={animate(){count++;return{cancel(){cancelled++;}};}};const scope={giftStageGroup:null,rigs:{groom:{el},bride:{el}}};vm.createContext(scope);vm.runInContext(source.slice(source.indexOf('function enterGiftStage('),source.indexOf('function sharedGiftToast(')),scope);const a=scope.enterGiftStage(1),b=scope.enterGiftStage(1);assert.equal(a,b);assert.equal(count,2);scope.leaveGiftStage(a);assert.equal(cancelled,0);scope.leaveGiftStage(b);assert.equal(cancelled,2);assert.equal(scope.giftStageGroup,null);
});
