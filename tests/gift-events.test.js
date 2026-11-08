'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../game/gift-events');
test('either selected gift triggers the same role after settings migration',()=>{
 const config=G.defaults();
 const gifts=G.catalog.filter(gift=>gift.coins===5&&gift.name!=='Finger Heart').slice(0,2);
 config.giftSelections.bride=gifts.map(gift=>gift.id);
 const saved=G.migrate(JSON.parse(JSON.stringify(G.validate(config))));
 for(const gift of gifts){
  const event={type:'gift',id:'guest',name:'Lan',giftName:gift.name,unitCoins:5,coins:15};
  G.applyRoleGift({},event,saved);
  assert.equal(event.weddingRole?.role,'bride');
 }
 const normalize=require('../lib/tiktok-events').createGiftNormalizer();
 for(const [giftName,price,expected] of [[gifts[0].name,5,'bride'],[gifts[1].name,5,'bride'],['Rose',5,undefined],[gifts[0].name,1,undefined]]){
  const event=normalize({user:{id:'guest',nickname:'Lan'},gift:{name:giftName,diamondCount:price,type:1},repeatCount:5,repeatEnd:true});
  G.applyRoleGift({},event,saved);
  assert.equal(event.weddingRole?.role,expected);
 }
 config.giftSelections.bride.push(G.catalog.find(gift=>gift.coins===10).id);
 assert.throws(()=>G.validate(config),/cùng giá/);
});
test('stealing the bride replaces only the groom and stealing the groom replaces only the bride',()=>{
 const state={users:{a:{seat:1},b:{seat:2}},weddingRoles:{bride:{id:'oldBride',name:'Lan'},groom:{id:'oldGroom',name:'Minh'}}};
 const a={type:'gift',id:'a',name:'An',coins:5,giftName:'Finger Heart'};G.applyRoleGift(state,a);
 assert.equal(a.weddingRole.role,'groom');assert.equal(state.weddingRoles.groom.id,'a');assert.equal(state.weddingRoles.bride.id,'oldBride');
 const b={type:'gift',id:'b',name:'Hoa',coins:5,giftName:'Peach'};G.applyRoleGift(state,b);
 assert.equal(b.weddingRole.role,'bride');assert.equal(state.weddingRoles.bride.id,'b');assert.equal(state.weddingRoles.groom.id,'a');
 const lines=G.defaults().roleLines;assert.match(lines.groom,/cướp dâu.*Chú rể cũ/);assert.match(lines.bride,/cướp rể.*Cô dâu cũ/);
});
test('short thanks batch keeps every name and exact chỉ vàng amount without using the retired script tab',()=>{const c=G.defaults(),queue=['Lan','Minh','Hoa','Tuấn'].map((name,i)=>({gift:{id:name,name,coins:i+1},event:c.events[0],acks:[{started:false}]}));const message=G.thanksBatch(queue);assert.equal(message.batch.length,4);assert.equal(queue.length,0);for(const [i,name]of ['Lan','Minh','Hoa','Tuấn'].entries())assert.match(message.spoken,new RegExp(name+' gửi '+(i+1)+' chỉ vàng'));assert.ok(message.spoken.length<=180);assert.doesNotMatch(message.spoken,/duyên lành/);});
test('one donor receives a brief event thank-you and pending speech merges without dropping acknowledgements',()=>{const c=G.defaults(),q=[];for(let i=0;i<2;i++)G.enqueue(q,{round:1,event:c.events[0],gift:{id:'a',name:'Lan',coins:1},amount:10000,acks:[{started:false}]});const m=G.thanksBatch(q);assert.equal(m.batch[0].acks.length,2);assert.match(m.spoken,/Cảm ơn Lan đã gửi 2 chỉ vàng/);assert.ok(m.spoken.length<60);});
test('retired paid dance tier is absent and generic gifts use ground envelope delivery',()=>{
 const config=G.defaults();
 for(const coins of [1,2,3,4,5,6,9,10,20,100])assert.equal(G.choose(config,coins).action,'envelope');
 assert.equal(config.events.some(event=>[5,10].includes(event.coins)),false);
 const gift={name:'Lan',coins:2,giftName:'Hoa hồng'};
 const lines=new Set([G.speech(config.events[0],gift),G.speech(config.events[0],gift)]);
 assert.equal(lines.size,2);
 assert.ok([...lines].every(line=>line.includes('Lan')));
});
test('invalid actions, duplicate thresholds and unsafe board limits cannot be saved',()=>{for(const mutate of [c=>c.events[0].action='unknown',c=>c.events.push({...c.events[0],id:'duplicate'}),c=>c.board.height=5000,c=>c.events[0].line='{unknown}']){const c=G.defaults();mutate(c);assert.throws(()=>G.validate(c));}assert.equal(G.validate(G.defaults()).events.length,1);});
test('pending donor gifts merge without losing score and retain the highest individual tier',()=>{const q=[],c=G.defaults();for(const coins of [1,5,1])G.enqueue(q,{round:1,event:G.choose(c,coins),gift:{id:'a',name:'Lan',coins},amount:coins*10000});assert.equal(q.length,1);assert.equal(q[0].amount,70000);assert.equal(q[0].gift.coins,7);assert.equal(q[0].event.action,'envelope');G.enqueue(q,{round:1,event:c.events[0],gift:{id:'b',coins:1},amount:10000});assert.equal(q.length,2);});
test('gift settings persist, broadcast, reject stale saves and test only in sandbox',{timeout:10000},async t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process'),WS=require('ws'),{once}=require('node:events');const root=path.join(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'gift-events-'));
 for(const file of ['game.js','gift-events.js','gift-control.js'])new Function(fs.readFileSync(path.join(root,'game',file),'utf8'));
 const proc=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'0',GAME_DATA_DIR:dir,GAME_NO_VOICE:'1',TIKTOK_USER:''},windowsHide:true,stdio:['ignore','pipe','pipe']});const sockets=[];t.after(()=>{sockets.forEach(w=>w.terminate());proc.kill();});
 const port=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);proc.stdout.on('data',chunk=>{text+=chunk;const m=text.match(/localhost:(\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});proc.on('error',reject);});
 async function client(role){const w=new WS('ws://127.0.0.1:'+port),messages=[];sockets.push(w);w.on('message',raw=>messages.push(JSON.parse(raw)));await once(w,'open');w.send(JSON.stringify({type:'hello',role}));return{w,messages,async next(check){for(let i=0;i<500;i++){const n=messages.findIndex(check);if(n>=0)return messages.splice(n,1)[0];await new Promise(r=>setTimeout(r,5));}throw Error('timeout');}};}
 const ctrl=await client('ctrl'),game=await client('game'),initial=(await ctrl.next(d=>d.type==='giftEvents')).config;await game.next(d=>d.type==='giftEvents');initial.board.height=250;initial.events[0].iconImage="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1kAAAAASUVORK5CYII=";
 ctrl.w.send(JSON.stringify({type:'saveGiftEvents',config:initial}));const updated=(await game.next(d=>d.type==='giftEvents')).config;assert.equal(updated.events[0].iconImage,initial.events[0].iconImage);assert.equal(updated.revision,1);assert.equal(updated.board.height,250);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'gift-events.json'),'utf8')).board.height,250);
 ctrl.w.send(JSON.stringify({type:'saveGiftEvents',config:initial}));assert.match((await ctrl.next(d=>d.type==='error')).message,/cửa sổ khác/);
 ctrl.w.send(JSON.stringify({type:'testGiftScene',id:'envelope'}));const report=(await ctrl.next(d=>d.type==='loadTest'&&d.report?.processed===1)).report;assert.equal(report.actualDuyen,1);assert.equal(game.messages.filter(d=>d.type==='liveBatch').length,0);
 const preview=await client('game');preview.w.send(JSON.stringify({type:'hello',role:'game',testSession:report.id}));await preview.next(d=>d.type==='state'&&d.state);
 for(const [role,giftName] of [['groom','Finger Heart'],['bride','Peach']]){
  ctrl.w.send(JSON.stringify({type:'testGiftScene',role}));
  const frame=await preview.next(d=>d.type==='liveBatch'&&d.events?.some(e=>e.weddingRole?.role===role));
  const gift=frame.events.find(e=>e.weddingRole?.role===role);
  assert.equal(gift.giftName,giftName);assert.match(gift.name,/^Khách \d+$/);
 }
 assert.equal(game.messages.filter(d=>d.type==='liveBatch').length,0);
});

test('gift icon uploads preserve old emoji and reject external or oversized images',()=>{const config=G.defaults();config.events[0].iconImage='data:image/webp;base64,UklGRg==';assert.equal(G.validate(config).events[0].iconImage,config.events[0].iconImage);for(const bad of ['https://example.com/icon.png','data:image/svg+xml;base64,YQ==','data:image/png;base64,'+'A'.repeat(6001)]){config.events[0].iconImage=bad;assert.throws(()=>G.validate(config));}});

test('retired small gift actions migrate to envelope delivery while unsupported actions are rejected',()=>{const c=G.defaults();delete c.version;c.events[0].action='chair';assert.equal(G.migrate(c).events[0].action,'envelope');assert.throws(()=>G.validate(c));});

test('gift payload image and board image remain independent and migrate without losing custom icons',()=>{const c=G.defaults();c.events[0].iconImage='data:image/webp;base64,UklGRg==';c.events[0].giftImage='data:image/png;base64,YQ==';const validated=G.validate(c);assert.notEqual(validated.events[0].giftImage,validated.events[0].iconImage);const legacy={...c,version:undefined,events:c.events.slice(0,2)};const migrated=G.migrate(legacy);assert.equal(migrated.events.length,1);assert.equal(migrated.events[0].giftImage,c.events[0].giftImage);c.events[0].giftImage='https://example.com/a.png';assert.throws(()=>G.validate(c));});

