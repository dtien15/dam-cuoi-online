'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const cast=require('../assets/characters/cute-v3/cast.json'),info=require('./webp-info');
test('MC stays centered while introducing the procession and repeated snapshots cannot teleport the waiting couple',async()=>{
 const classes=()=>({add(){},remove(){},toggle(){}}),rigs=Object.fromEntries(['groom','bride','mc'].map(role=>[role,{el:{style:{},classList:classes(),dataset:{},animate(){throw Error('Must wait for MC introduction');}}}]));
 let finishSpeech;const speech=new Promise(resolve=>finishSpeech=resolve),window={};
 vm.runInNewContext(fs.readFileSync('game/wedding-cycle-view.js','utf8'),{window,Date,setTimeout,setInterval,clearInterval,Promise,console,WeddingCycle:require('../game/wedding-cycle')});
 const view=window.WeddingCycleView;view.init({stage:{classList:classes(),dataset:{}},rigs,lock(){},roleName:r=>r,spokenName:r=>r,config:()=>null,hold(){},quiet(){},speak:()=>speech,done(){}});
 const state={ceremony:{key:'entrance-test',number:1,phase:'entrance',endsAt:Date.now()+12000,config:{durations:{entrance:12}}}};
 view.sync(state);assert.equal(rigs.mc.el.style.translate,'210px 0');assert.match(rigs.bride.el.style.translate,/540px/);assert.match(rigs.groom.el.style.translate,/540px/);
 view.sync(state);view.sync(state);assert.equal(rigs.mc.el.style.translate,'210px 0');assert.match(rigs.bride.el.style.translate,/540px/);
 view.sync({ceremony:null});finishSpeech();await new Promise(setImmediate);
});
test('bride and groom have separate complete front/back four-frame walk rows',()=>{
 for(const role of ['bride','groom']){
  const w=cast[role].walk,meta=info(fs.readFileSync('.'+w.src));
  assert.equal(meta.alpha,true);assert.equal(w.frames,4);assert.notEqual(w.row,w.backRow);
  assert.equal(w.w*w.frames,meta.width);assert.equal(w.h*w.rows,meta.height);
  assert.ok(w.backRow<w.rows);
 }
 assert.match(cast.bride.sprite.src,/bride-gown/);
});
test('ceremony completes without leaving walking gait active',async()=>{
 let now=0;const moves=[],done=[];
 const classes=()=>{const set=new Set();return{add(...s){s.forEach(v=>set.add(v));},remove(...s){s.forEach(v=>set.delete(v));},toggle(k,v){v?set.add(k):set.delete(k);},contains:k=>set.has(k)};};
 const rigs=Object.fromEntries(['bride','groom'].map(role=>[role,{el:{style:{},classList:classes(),dataset:{},animate(frames){moves.push({role,direction:this.dataset.walkDirection,walking:this.classList.contains('is-walking'),frames});return{finished:Promise.resolve(),cancel(){}};}}}]));
 const window={};vm.runInNewContext(fs.readFileSync('game/wedding-cycle-view.js','utf8'),{window,Date:{now:()=>now+=10000},setTimeout,setInterval:()=>0,clearInterval,Promise,console,WeddingCycle:require('../game/wedding-cycle')});
 rigs.mc={el:{style:{}}};const view=window.WeddingCycleView;
 view.init({stage:{classList:classes(),dataset:{}},rigs,tables:[{y:1000}],roleName:r=>r,spokenName:r=>r,config:()=>null,hold(){},quiet(){},applause:async()=>{},lock(){},speak:async()=>{},heart:async()=>{},zo:async()=>{},fireworks:()=>()=>{},spark(){},done:key=>done.push(key)});
 view.sync({ceremony:{key:'walk1',number:1,phase:'ceremony',config:{}}});
 await new Promise(setImmediate);
 assert.equal(moves.length,0);
 assert.ok(moves.every(m=>m.walking));assert.deepEqual(done,['walk1']);
 for(const rig of [rigs.bride,rigs.groom]){assert.equal(rig.el.classList.contains('is-walking'),false);assert.equal(rig.el.dataset.walkDirection,undefined);}
});

test('the couple waits in the part of the frame TikTok does not cover, so a steal during the welcome is visible',()=>{
 const y=720+Number(/YARD_Y=(\d+)/.exec(fs.readFileSync('game/wedding-cycle-view.js','utf8'))[1]);
 assert.ok(y<=1330,'đôi cưới đứng ở y='+y+', dưới 1330 bị giao diện TikTok che');
});
