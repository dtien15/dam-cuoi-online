'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Rules=require('../game/rules');
test('live overview tracks receipts and wishes, attendance differs from merely watching, reset clears totals',()=>{
 const s=Rules.createState();const join=Rules.applyEvent(s,{type:'join',id:'a',name:'Lan'},1000);assert.equal(join.firstAttendance,false);
 const entry=Rules.applyEvent(s,{type:'chat',id:'a',name:'Lan',text:'chúc hai bạn hạnh phúc'},2000);assert.equal(entry.firstAttendance,true);assert.equal(s.wishes,1);
 assert.equal(Rules.applyEvent(s,{type:'chat',id:'a',name:'Lan',text:'nhà gái'},3000).firstAttendance,false);
 Rules.applyEvent(s,{type:'gift',id:'a',name:'Lan',coins:5},4000);assert.equal(s.receipts,1);assert.equal(s.total,50000);
 const restored=Rules.migrateState(s);assert.equal(restored.receipts,1);assert.equal(restored.wishes,1);Rules.resetWedding(restored);assert.equal(restored.receipts,0);assert.equal(restored.wishes,0);
});
