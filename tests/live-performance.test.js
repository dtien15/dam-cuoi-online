'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {publicView,coalesceEvents}=require('../lib/live-view');
const RenderQueue=require('../game/live-render-queue');
test('a full standing hall replaces its lowest priority guest for a fresh gift while retaining gift and activity ranking',()=>{
 const state={users:{},round:1};for(let i=0;i<30;i++)state.users['u'+i]={id:'u'+i,seat:-1,team:i%2?'bride':'groom',last:100000,total:i*10000,chats:i};
 const before=publicView(state,100010);state.users.new={id:'new',seat:-1,team:'groom',last:100020,total:10000,lastGiftAt:100020,hallPriorityUntil:160020};
 const after=publicView(state,100030);assert.equal(after.waitingIds.length,30);assert.ok(after.users.new);assert.equal(Object.keys(state.users).length,31);
 assert.ok(!after.users.u0);assert.ok(before.users.u0);assert.ok(after.users.u28);
 state.users.u2.total=state.users.u4.total;state.users.u2.chats=100;
 const ranked=publicView(state,100040).waitingIds;assert.ok(ranked.indexOf('u2')<ranked.indexOf('u4'));
});
test('a recent donor outside the hall is pinned into the visible standing crowd even when it is full',()=>{
 const state={users:{},round:1};for(let i=0;i<100;i++)state.users['u'+i]={id:'u'+i,seat:-1,team:i%2?'bride':'groom',last:100000};
 state.users.u98.lastGiftAt=100001;state.users.u98.hallPriorityUntil=160001;
 const view=publicView(state,100010);assert.ok(view.users.u98);assert.ok(view.waitingIds.includes('u98'));
 assert.equal(view.waitingIds.length,30);assert.equal(view.waitingCount,100);
});
test('screens receive at most 54 guests while counts, totals and server history stay intact',()=>{
 const state={round:1,total:12340000,likes:100000,ledger:{old:{total:50000}},users:{}};
 for(let i=0;i<10000;i++)state.users['u'+i]={id:'u'+i,name:'Khách '+i,avatar:'https://example.com/avatar/'+i,team:i%2?"bride":"groom",seat:i<24?i:-1,last:1000,total:i*10000};
 const view=publicView(state,2000);assert.equal(Object.keys(view.users).length,54);assert.equal(view.guestCount,10000);assert.equal(view.waitingCount,9976);
 assert.equal(view.total,state.total);assert.equal(view.likes,state.likes);assert.equal(view.ledger,undefined);
 assert.equal(Object.keys(state.users).length,10000);assert.ok(state.ledger.old);
 assert.ok(JSON.stringify(view).length<JSON.stringify(state).length/100);
});
test('batch merging preserves every gift receipt and sums all likes, retaining latest comments',()=>{
 const events=[];for(let i=0;i<1000;i++)events.push({type:'like',id:'a',count:2},{type:'chat',id:'a',text:String(i)},{type:'gift',id:'a',coins:1,msgId:String(i)});
 const result=coalesceEvents(events);assert.equal(result.filter(e=>e.type==='gift').length,1000);
 assert.equal(result.find(e=>e.type==='like').count,2000);assert.equal(result.find(e=>e.type==='chat').text,'999');
});
test('render queue coalesces snapshots and spends bounded work per frame without losing gifts',()=>{
 const callbacks=[],received=[],synced=[],frameWork=[];let clock=0;
 const q=new RenderQueue({sync:s=>synced.push(s),event:e=>{received.push(e);clock+=1;},now:()=>clock,schedule:fn=>callbacks.push(fn),budget:4,onStats:s=>frameWork.push(s.ms)});
 q.push({round:1,revision:1},Array.from({length:3000},(_,i)=>({type:'gift',id:'u'+i,coins:5})));
 q.push({round:1,revision:2},Array.from({length:1000},()=>({type:'like',id:'a',count:1})));
 while(callbacks.length)callbacks.shift()();
 assert.equal(synced.length,1);assert.equal(synced[0].revision,2);assert.ok(frameWork.every(ms=>ms<=4));
 assert.equal(received.filter(e=>e.type==='gift').length,3000);assert.equal(received.filter(e=>e.type==='gift').reduce((sum,e)=>sum+e.coins,0),15000);
 assert.equal(received.find(e=>e.type==='like').count,1000);assert.equal(q.pending.size,0);assert.equal(q.lowKeys.size,0);
});
test('reset removes pending visuals from the previous wedding instead of replaying old gifts',()=>{
 const callbacks=[],events=[];const q=new RenderQueue({sync(){},event:e=>events.push(e),schedule:fn=>callbacks.push(fn)});
 q.push({round:1},[{type:'gift',id:'old'}]);q.push({round:2},[{type:'gift',id:'new'}]);while(callbacks.length)callbacks.shift()();assert.deepEqual(events.map(e=>e.id),['new']);
});

test('waiting area rotates within a fixed thirty visible guests and keeps both sides represented',()=>{const state={users:{},round:1};for(let i=0;i<40;i++)state.users['u'+i]={id:'u'+i,seat:-1,team:i%2?'bride':'groom',last:100000};const a=publicView(state,100000),b=publicView(state,110000);assert.equal(a.waitingCount,40);assert.equal(a.waitingIds.length,30);assert.equal(Object.values(a.users).filter(u=>u.team==='bride').length,15);assert.notDeepEqual(a.waitingIds,b.waitingIds);});
