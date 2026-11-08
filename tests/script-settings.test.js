'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {spawn}=require('node:child_process'),{once}=require('node:events'),WebSocket=require('ws');
const P=require('../game/mc-policy'),root=path.join(__dirname,'..');
test('editable script catalog validates templates, rotates custom wishes and honours disabled categories',()=>{
 const defaults=P.scriptDefaults();assert.ok(P.validateScripts(defaults).length>30);
 assert.throws(()=>P.validateScripts([{id:'a',event:'wish',text:'{unknown}'}]),/Biến/);
 assert.throws(()=>P.validateScripts([{id:'a',event:'hacked',text:'a'}]),/chọn mục/);
 assert.throws(()=>P.validateScripts([{id:'a',event:'wish',text:'a'},{id:'a',event:'gift',text:'b'}]),/trùng/);
 P.setScripts([{id:'a',event:'wish',text:'{ten} ơi, câu chúc một!',enabled:true},{id:'b',event:'wish',text:'Câu chúc hai!',enabled:true},{id:'c',event:'gift',text:'Cảm ơn {ten} gửi {qua}: {duyen} chỉ vàng.',enabled:true}]);
 const host=P.createHost();assert.equal(host.reply({id:'a',name:'Lan'},'chúc mừng','chucmung',1000).seq[0][1],'Lan ơi, câu chúc một!');
 assert.match(host.reply({id:'b',name:'Tuấn'},'chúc mừng','chucmung',2000).seq[0][1],/Tuấn.*Câu chúc hai/);
 assert.equal(host.observe({type:'join'},{id:'new',name:'Mới'},3000),null);
 assert.equal(host.idle([],3000),'');
 assert.match(P.giftMessage([{name:'Lan',giftName:'Hoa hồng',vnd:50000}]).spoken,/Lan.*5 chỉ vàng/);
 new vm.Script(fs.readFileSync(path.join(root,'game/control.js'),'utf8'));
});
test('saved scripts broadcast to game, persist across restart and reject stale or invalid writes',{timeout:20000},async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wedding-scripts-'));let proc,port;const sockets=[];
 t.after(()=>{for(const socket of sockets)socket.terminate();proc?.kill();});
 async function launch(){proc=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'0',GAME_NO_VOICE:'1',GAME_DATA_DIR:dir,TIKTOK_USER:''},stdio:['ignore','pipe','pipe'],windowsHide:true});port=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('startup timeout')),5000);proc.stdout.on('data',data=>{output+=data;const match=output.match(/localhost:(\d+)/);if(match){clearTimeout(timer);resolve(Number(match[1]));}});proc.on('error',reject);});}
 async function client(role){const socket=new WebSocket('ws://127.0.0.1:'+port);sockets.push(socket);const messages=[];socket.on('message',raw=>messages.push(JSON.parse(raw)));await once(socket,'open');socket.send(JSON.stringify({type:'hello',role}));return{socket,async next(predicate){for(let i=0;i<300;i++){const index=messages.findIndex(predicate);if(index>=0)return messages.splice(index,1)[0];await new Promise(r=>setTimeout(r,5));}throw Error('No expected script message');}};}
 await launch();const ctrl=await client('ctrl'),game=await client('game');const original=await ctrl.next(d=>d.type==='scripts');assert.equal(original.revision,0);
 await game.next(d=>d.type==='scripts');
 const rows=[{id:'custom-wish',event:'wish',text:'{ten} ơi, lời chúc vừa cập nhật!',enabled:true}];
 ctrl.socket.send(JSON.stringify({type:'saveScripts',revision:0,rows}));assert.deepEqual((await ctrl.next(d=>d.type==='scripts')).rows,rows);assert.equal((await game.next(d=>d.type==='scripts')).revision,1);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'scripts.json'),'utf8')).rows,rows);
 ctrl.socket.send(JSON.stringify({type:'saveScripts',revision:0,rows:[]}));assert.equal((await ctrl.next(d=>d.type==='scriptsConflict')).revision,1);
 ctrl.socket.send(JSON.stringify({type:'saveScripts',revision:1,rows:[{id:'bad',event:'wish',text:'{evil}',enabled:true}]}));assert.match((await ctrl.next(d=>d.type==='error')).message,/Biến/);
 for(const socket of sockets)socket.terminate();const ended=once(proc,'exit');proc.kill();await ended;await launch();
 const restored=await client('ctrl'),saved=await restored.next(d=>d.type==='scripts');assert.equal(saved.revision,1);assert.deepEqual(saved.rows,rows);
});
