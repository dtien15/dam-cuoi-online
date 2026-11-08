'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),A=require('../game/ambient-effects');
test('ambient hearts and fireworks stay within the scene with a fixed particle budget',()=>{
 for(const value of [0,.1,.5,.9,.999999]){
  const h=A.heart(()=>value),b=A.burst(()=>value);
  assert.ok(h.x>=3&&h.x<=97);assert.ok(h.duration>=18&&h.duration<=34);
  assert.ok(h.phase>=0&&h.phase<1);assert.ok(h.size>=35&&h.size<=68);
  assert.ok(b.x>=8&&b.x<=92&&b.y>=14&&b.y<=88);assert.equal(b.particles,22);
  assert.ok(b.radius>=160&&b.radius<=260);
 }
 const source=fs.readFileSync('game/ambient-effects.js','utf8'),css=fs.readFileSync('game/style.css','utf8');
 assert.match(source,/while\(fire.children.length>2\)/);
 assert.match(source,/visibilitychange/);assert.match(source,/motion.matches/);
 assert.match(css,/ambient-camera-drift 38s/);assert.match(css,/prefers-reduced-motion:reduce\)\{#ambient-camera/);
});
