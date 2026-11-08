'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Requests=require('../game/guest-requests'),Rules=require('../game/rules');
const {applySessionEvent}=require('../lib/session-events');
test('gender requests respect self-identification, negatives and wedding-side commands',()=>{
 for(const text of ['đổi nam','đổi cho em nam','tôi là con trai','sao em là nam mà nhân vật nữ','tôi không phải nữ tôi là nam'])assert.equal(Requests.parse(text)?.gender,'male',text);
 for(const text of ['đổi nữ','em là nữ','chuyển nhân vật thành nữ'])assert.equal(Requests.parse(text)?.gender,'female',text);
 assert.equal(Requests.parse('nhà trai'),null);assert.equal(Requests.parse('nhà gái'),null);
 assert.equal(Requests.parse('sai giới tính').kind,'genderQuestion');
 assert.equal(Requests.parse('không ăn gà'),null);
});
test('gender preferences survive state restore and food requests respect cooldown without changing scores',()=>{
 const state=Rules.createState(100000);
 let event=applySessionEvent(state,{type:'chat',id:'a',name:'Lan',text:'đổi nữ'},100000);
 assert.equal(event.gender,'female');assert.equal(state.users.a.gender,'female');
 event=applySessionEvent(state,{type:'chat',id:'a',name:'Lan',text:'cho em gà'},101000);
 assert.equal(event.food,'gà');
 event=applySessionEvent(state,{type:'chat',id:'a',name:'Lan',text:'lên món'},102000);
 assert.equal(event.food,undefined);
 event=applySessionEvent(state,{type:'chat',id:'a',name:'Lan',text:'xôi'},117000);
 assert.equal(event.food,'xôi');assert.equal(state.total,0);
 assert.equal(Rules.migrateState(JSON.parse(JSON.stringify(state))).users.a.gender,'female');
});
test('MC confirms gender requests and asks for clarification instead of guessing',()=>{
 const host=require('../game/mc-policy').createHost(),u={id:'a',name:'Lan'};
 assert.match(host.reply(u,'đổi nữ',undefined,100000).seq[0][1],/nữ|chỉnh/);
 assert.match(host.reply(u,'sai giới tính',undefined,110000).seq[0][1],/nam hay nữ/);
});

test('live character requests select an archetype, copy a unique guest and preserve the seat and team',()=>{
 const state=Rules.createState(100000);
 const chat=(id,name,text,at)=>applySessionEvent(state,{type:'chat',id,name,text},at);
 chat('a','Tép iu','đổi thành cô giáo',100000);
 assert.equal(state.users.a.character,'aunt');
 const first=chat('b','Lan','đổi nhân vật giống người tên tép iu',101000);
 assert.equal(first.character,'aunt');assert.equal(first.gender,'female');
 const before={team:state.users.b.team,seat:state.users.b.seat,total:state.total};
 chat('b','Lan','đổi nhân vật khác cho mình',102000);
 assert.notEqual(state.users.b.character,'aunt');assert.equal(state.users.b.gender,'female');
 chat('b','Lan','đổi nv nam',103000);
 assert.equal(state.users.b.gender,'male');assert.equal(state.users.b.character,null);
 assert.deepEqual({team:state.users.b.team,seat:state.users.b.seat,total:state.total},before);
 assert.equal(Rules.migrateState(JSON.parse(JSON.stringify(state))).users.a.character,'aunt');
 const absent=chat('b','Lan','đổi giống người tên không tồn tại',104000);
 assert.ok(absent.characterResult.error);assert.equal(state.users.b.character,null);
 chat('c','Tép iu','chào',105000);
 assert.ok(chat('b','Lan','đổi giống người tên tép iu',106000).characterResult.error);
});

test('character commands accept natural wording while conversation and food stay separate',()=>{
 for(const [text,id]of [['đổi thành cô giáo','aunt'],['cho mình bé gái đi','teengirl'],['đổi nhân vật thành chú mặc vest nhé','uncle'],['đổi qua thầy giáo','uncle']])assert.equal(Requests.parse(text)?.character,id,text);
 assert.equal(Requests.parse('cô giáo đẹp quá'),null);
 assert.equal(Requests.parse('đừng đổi nhân vật'),null);
 assert.equal(Requests.parse('cho mình gà đi').kind,'food');
 assert.equal(Requests.parse('nhà gái'),null);
 const host=require('../game/mc-policy').createHost();
 const response=host.reply({id:'a',name:'Lan'},'đổi thành cô giáo',undefined,100000,{label:'cô giáo'});
 assert.match(response.seq[0][1],/cô giáo/);
});

test('only five formal guest identities remain, including explicit colorful presentation selection',()=>{
 assert.deepEqual(Object.keys(Requests.characters).sort(),['aunt','flashy','teenboy','teengirl','uncle']);
 for(const [text,key] of [['đổi thành thiếu niên','teenboy'],['đổi thành thiếu nữ','teengirl'],['đổi nữ trung niên','aunt'],['đổi nam trung niên','uncle'],['đổi nhân vật LGBT','flashy']])assert.equal(Requests.parse(text)?.character,key);
 assert.ok(['aunt','teengirl'].includes(Requests.characterFor({id:'old',character:'grandma',gender:'female'})));
 const guest={id:'color',character:'flashy',gender:'nonbinary'};
 assert.equal(Requests.resolve({kind:'randomCharacter'},guest,{}).character,'flashy');
});
