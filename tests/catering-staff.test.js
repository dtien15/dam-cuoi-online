'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const cast=require('../assets/characters/cute-v3/cast.json'),info=require('./webp-info');
test('male and female catering staff have two expressions and four full-body walking poses',()=>{
 for(const role of ['waiter','waitress']){
  const actor=cast[role],walk=actor.walk;assert.ok(actor.expression);assert.equal(walk.frames,4);assert.equal(walk.rows,2);
  const meta=info(fs.readFileSync('.'+walk.src));assert.equal(meta.alpha,true);assert.equal(meta.width,walk.w*4);assert.equal(meta.height,walk.h*2);
 }
 assert.notEqual(cast.waiter.walk.row,cast.waitress.walk.row);
 const source=fs.readFileSync('game/game.js','utf8');assert.match(source,/serviceSerial\+\+%2\?'waitress':'waiter'/);assert.match(source,/node.classList.remove\('is-walking'\)/);
});
test('wedding entrance uses a full aisle walk of at least ten seconds and prioritizes takeover interruption',()=>{
 const view=fs.readFileSync('game/wedding-cycle-view.js','utf8');assert.match(view,/Math.max\(16000/);assert.match(view,/YARD_Y=540/);assert.match(view,/followAisle/);
 assert.doesNotMatch(view,/interrupt\(\)\{cancel\(\);if\(job\)await job/);
});
