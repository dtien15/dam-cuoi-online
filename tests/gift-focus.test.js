'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const GiftFocus=require('../game/gift-focus');
test('close-up waits until a donor has a real visible position instead of zooming to a fallback point',()=>{
 let visible=false,started=0;const f=new GiftFocus({ready:()=>visible,start:()=>started++});
 f.enqueue({id:'outside'},10000,1000);f.tick(1000);assert.equal(started,0);assert.equal(f.queue.length,1);
 visible=true;f.tick(1200);assert.equal(started,1);assert.equal(f.active.user.id,'outside');
});
test('camera centers on a donor by transforming the whole world and never exposes empty canvas edges',()=>{
 for(const [x,y]of [[50,600],[540,1200],[1020,1800]]){
  const c=GiftFocus.camera(x,y);assert.equal(c.zoom,3.6);
  assert.ok(c.x<=0&&c.x+1080*c.zoom>=1080);assert.ok(c.y<=0&&c.y+1920*c.zoom>=1920);
 }
 const c=GiftFocus.camera(540,1200);assert.equal(540*c.zoom+c.x,540);assert.equal(1200*c.zoom+c.y,960);
 const fs=require('node:fs'),source=fs.readFileSync('game/game.js','utf8');
 assert.doesNotMatch(source,/source\.cloneNode/);assert.match(source,/GiftFocus\.camera\(x,y-75\)/);
});
test('gift close-ups coalesce combos and animate their combined amount without starting duplicate scenes',()=>{
 const starts=[],ends=[],f=new GiftFocus({start:i=>starts.push(i.user.id),end:i=>ends.push(i.user.id)});
 f.enqueue({id:'a',name:'Lan'},10000,1000);f.tick(1000);f.enqueue({id:'a',name:'Lan'},40000,1100);
 assert.equal(f.active.amount,50000);assert.deepEqual(starts,['a']);assert.equal(f.queue.length,0);
 const before=f.active.shown;f.tick(1200);assert.ok(f.active.shown>before&&f.active.shown<=50000);
 f.tick(4000);assert.deepEqual(ends,['a']);assert.equal(f.active,null);
});
test('crowded gift scenes stay bounded and prioritize larger pending gifts while expiring stale visuals',()=>{
 const f=new GiftFocus();for(let i=1;i<=30;i++)f.enqueue({id:String(i)},i*10000,1000);
 assert.equal(f.queue.length,6);f.tick(1100);assert.equal(f.active.user.id,'30');
 f.tick(1200,true);assert.equal(f.active,null);f.tick(10000);assert.equal(f.queue.length,0);assert.equal(f.active,null);
});
test('session resets and performance interruptions always clean up the close-up',()=>{
 let cleaned=0;const f=new GiftFocus({end:()=>cleaned++});f.enqueue({id:'a'},10000,0);f.tick(0);f.clear();
 assert.equal(cleaned,1);assert.equal(f.active,null);assert.equal(f.queue.length,0);
 f.enqueue({id:'b'},10000,10);f.tick(10);f.tick(20,true);assert.equal(cleaned,2);
});
