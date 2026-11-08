'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../game/mc-policy');

test('quiet room teaches supported commands without asking for gifts',()=>{
 const rows=P.scriptDefaults().filter(r=>r.event==='idle');
 const text=rows.map(r=>r.text).join(' ');
 assert.match(text,/gõ nhà trai hoặc nhà gái/i);
 assert.match(text,/đổi nam hoặc đổi nữ/);
 const Requests=require('../game/guest-requests');
 for(const command of ['đổi nam','đổi nữ','đổi thành cô áo dài xanh','đổi thành thiếu nữ','cho em gà','cho em xôi'])assert.ok(Requests.parse(command),command);
 assert.doesNotMatch(text,/tặng quà|thả tim|gửi chỉ vàng/i);
});
test('quiet room welcomes actual names, avoids repeated greetings and replies conversationally',()=>{
 const h=P.createHost(),u={id:'lan',name:'Lan',last:1000};
 assert.match(h.observe({type:'join'},u,1000).seq[0][1],/Lan.*nhà trai hay nhà gái/);
 assert.equal(h.observe({type:'join'},u,10000),null);
 assert.match(h.reply(u,'xin chào','chao',11000).seq[0][1],/Lan.*thơ hay.*chuyện vui/);
 assert.equal(h.reply(u,'xin chào','chao',12000),null);
 assert.match(h.reply(u,'gần bếp',null,18000).seq[0][1],/kinh nghiệm đi ăn cỗ/);
 assert.equal(h.reply(u,'1',null,25000),null);
});
test('busy room suppresses welcome floods and generic chatter while retaining addressed questions',()=>{
 const h=P.createHost();for(let i=0;i<20;i++)h.observe({type:'chat'},{id:String(i),name:'Khách '+i},1000+i);
 assert.equal(h.busy(1100),true);
 assert.equal(h.observe({type:'join'},{id:'new',name:'Mới'},1200),null);
 assert.equal(h.reply({id:'a',name:'A'},'đang xem đây',null,1300),null);
 assert.match(h.reply({id:'b',name:'B'},'MC đâu rồi','mc',1400).seq[0][1],/B ơi/);
});
test('social thanks batch names, put shares before likes and do not thank every tiny like packet',()=>{
 const h=P.createHost();h.observe({type:'like',count:1},{id:'a',name:'Lan'},1000);assert.equal(h.social(1100),null);
 h.observe({type:'like',count:19},{id:'a',name:'Lan'},1200);h.observe({type:'share'},{id:'b',name:'Tuấn'},1300);
 assert.match(h.social(1400).seq[0][1],/Tuấn.*chia sẻ/);assert.match(h.social(1500).seq[0][1],/tim.*Lan/);assert.equal(h.social(1600),null);
});
test('gift thanks are brief and use exact chỉ vàng points, even for one coin',()=>{
 for(const [coins,points]of [[1,1],[10,10]]){
  const m=P.giftMessage([{name:'Lan',giftName:'Hoa hồng',vnd:coins*10000,receipts:1}]);
  assert.match(m.spoken,new RegExp('Lan đã gửi '+points+' chỉ vàng'));
  assert.doesNotMatch(m.spoken,/nghìn|triệu|đồng|10k/);
 }
});
test('three long donor names survive the speech endpoint character budget',()=>{
 const gifts=Array.from({length:3},(_,i)=>({name:String(i)+'a'.repeat(79),giftName:'b'.repeat(80),vnd:10000,receipts:1}));
 const m=P.giftMessage(gifts);assert.ok(m.spoken.length<400);
 for(const g of gifts)assert.ok(m.spoken.includes(P.spokenName(g.name)));
});
test('wedding wishes rotate twelve replies across guests, keeping names and avoiding immediate repeats',()=>{
 const host=P.createHost(),lines=[];
 for(let i=0;i<13;i++){
  const name='Khách '+i;
  const reply=host.reply({id:String(i),name},'chúc mừng','chucmung',1000+i*7000);
  assert.ok(reply.seq[0][1].includes(name));assert.ok(reply.seq[0][1].length<85);
  lines.push(reply.seq[0][1].replace(name,'{ten}'));
 }
 assert.equal(new Set(lines.slice(0,12)).size,12);assert.equal(lines[12],lines[0]);
});
