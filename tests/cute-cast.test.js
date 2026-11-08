'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const info=require('./webp-info');
test('all five guest identities have four complete walking frames on one bounded WebP sheet',()=>{
 const cast=read('assets/characters/cute-v3/cast.json');
 const keys=['teenboy','teengirl','aunt','uncle','flashy'];
 for(const [row,key]of keys.entries()){
  const walk=cast[key].walk;assert.equal(walk.frames,4);assert.equal(walk.row,row);
  for(let col=0;col<walk.frames;col++)verify({...walk,x:col*walk.w,y:row*walk.h});
 }
 const css=fs.readFileSync(path.join(root,'game/style.css'),'utf8');
 assert.match(css,/guest-walk-frames/);assert.match(css,/runner\.is-walking/);
 assert.match(css,/38%\{--guest-walking:0\}/);
});
function verify(frame){
 const bytes=fs.readFileSync(path.join(root,frame.src.slice(1))),meta=info(bytes);
 assert.equal(meta.alpha,true,frame.src);assert.equal(meta.width,frame.sheetWidth);assert.equal(meta.height,frame.sheetHeight);
 assert.ok(frame.x>=0&&frame.y>=0&&frame.w>0&&frame.h>0&&frame.x+frame.w<=meta.width&&frame.y+frame.h<=meta.height,frame.src);
}
test('cute cast has matching normal/alternate head viewports for all guests, couple, MC and waiter',()=>{
 const cast=read('assets/characters/cute-v3/cast.json');assert.equal(Object.keys(cast).length,10);
 for(const [key,spec]of Object.entries(cast)){
  verify(spec.sprite);verify(spec.expression.sprite);
  assert.equal(spec.sprite.w,spec.expression.sprite.w,key);assert.equal(spec.sprite.h,spec.expression.sprite.h,key);
  assert.equal(spec.sprite.src,spec.expression.sprite.src,'two head frames share one decoded texture');
  assert.notEqual(spec.sprite.x,spec.expression.sprite.x);assert.equal(spec.expression.mode,'whole-frame');
 }
 const guestTextures=new Set(Object.entries(cast).filter(([k])=>!['waiter','waitress'].includes(k)).map(([,v])=>v.sprite.src));assert.equal(guestTextures.size,3);
});
test('every heart event uses three registered cute frames and active views reference the new art',()=>{
 const scenes=read('assets/events/cute-v3/scenes.json').scenes;
 assert.deepEqual(Object.keys(scenes).sort(),['banquet','cake','cheek','entrance','fireworks','kiss','rings','toast']);
 for(const frames of Object.values(scenes)){assert.equal(frames.length,3);for(const frame of frames){verify(frame);assert.match(frame.src,/cute-v3/);}assert.equal(new Set(frames.map(f=>f.h)).size,1);}
 for(const file of ['game/game.js','game/rollcall-view.js','game/rollcall.css','game/heart-scenes.js','game/style.css']){
  const source=fs.readFileSync(path.join(root,file),'utf8');if(!file.endsWith('style.css'))assert.match(source,/cute-v3/);
  assert.doesNotMatch(source,/\/assets\/characters\/funny-v2\/|\/assets\/events\/hearts\/ceremony|\/assets\/events\/rollcall\/reactions/);
 }
});
