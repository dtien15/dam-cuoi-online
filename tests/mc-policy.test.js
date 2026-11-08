'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../game/mc-policy');
test('FIFO retains normal comments and only trims overloaded comments',()=>{
 const items=Array.from({length:25},(_,i)=>P.item('cmt.chao',[],1000+i));
 const gift={kind:'gift',createdAt:900,expiresAt:Infinity};
 const result=P.prune([gift,...items],6000);assert.equal(result.length,21);assert.equal(result[0],gift);assert.equal(result[1],items[5]);
 assert.equal(P.prune(items,62000).length,0);
});
test('incoming events never interrupt a spoken line',()=>{
 for(const kind of ['ambient','comment','gift','scene','chant'])assert.equal(P.interrupt({kind,prio:1,preparing:true},{kind:'gift',prio:20}),false);
});
test('a burst of 300 gifts is summarized once with exact amount and receipt count', () => {
  const gifts=Array.from({length:300},(_,i)=>({name:'Khách '+i,vnd:50000,receipts:1}));
  const msg=P.giftMessage(gifts); assert.equal(msg.amount,15000000); assert.equal(msg.count,300);
  assert.match(msg.spoken,/Khách 0, Khách 1, Khách 2/); assert.match(msg.caption,/296 khách nữa/); assert.ok(msg.caption.length<200);
});

