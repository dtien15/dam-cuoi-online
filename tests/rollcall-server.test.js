'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events'),WS=require('ws');
test('manual rollcall API persists settings, respects game authority and isolates sandbox and real scores',{timeout:20000},async t=>{
 const root=path.join(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'rollcall-')),sockets=[];for(const f of ['rollcall.js','rollcall-view.js','rollcall-control.js'])new Function(fs.readFileSync(path.join(root,'game',f),'utf8'));
 const proc=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'0',GAME_DATA_DIR:dir,GAME_NO_VOICE:'1',TIKTOK_USER:''},windowsHide:true,stdio:['ignore','pipe','pipe']});t.after(()=>{sockets.forEach(w=>w.terminate());proc.kill();});
 const port=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);proc.stdout.on('data',b=>{text+=b;const m=text.match(/localhost:(\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});proc.on('error',reject);});
 async function client(role,testSession,mute=false){const w=new WS('ws://127.0.0.1:'+port),messages=[];sockets.push(w);w.on('message',r=>messages.push(JSON.parse(r)));await once(w,'open');w.send(JSON.stringify({type:'hello',role,testSession,mute}));return{w,messages,next:async check=>{for(let i=0;i<800;i++){const index=messages.findIndex(check);if(index>=0)return messages.splice(index,1)[0];await new Promise(r=>setTimeout(r,5));}throw Error('packet timeout');}};}
 const ctrl=await client('ctrl'),game=await client('game'),muted=await client('game',undefined,true),config=(await ctrl.next(d=>d.type==='rollcallConfig')).config;
 assert.equal((await ctrl.next(d=>d.type==='state')).state.rollcall,null);config.duration=10;config.selectionSeconds=3;ctrl.w.send(JSON.stringify({type:'saveRollcall',config}));const saved=(await game.next(d=>d.type==='rollcallConfig'&&d.config.revision===1)).config;assert.equal(saved.duration,10);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'rollcall.json'),'utf8')).duration,10);ctrl.w.send(JSON.stringify({type:'saveRollcall',config}));assert.match((await ctrl.next(d=>d.type==='error')).message,/đã đổi/);
 ctrl.w.send(JSON.stringify({type:'sim',event:{type:'gift',id:'baseline',coins:2}}));await ctrl.next(d=>d.type==='liveBatch'&&d.state.total===20000);
 ctrl.w.send(JSON.stringify({type:'startRollcall'}));const preparing=(await ctrl.next(d=>d.type==='state'&&d.state.rollcall?.phase==='preparing')).state.rollcall;
 muted.w.send(JSON.stringify({type:'rollcallReady',id:preparing.id}));const probe=await client('ctrl');assert.equal((await probe.next(d=>d.type==='state')).state.rollcall.phase,'preparing','muted preview cannot start before an audible source');ctrl.w.send(JSON.stringify({type:'sim',event:{type:'chat',id:'b',text:'0'}}));await ctrl.next(d=>d.type==='liveBatch'&&d.state.rollcall?.people.bride===1);game.w.send(JSON.stringify({type:'rollcallReady',id:preparing.id}));await ctrl.next(d=>d.type==='state'&&d.state.rollcall?.selectionEndsAt);await new Promise(resolve=>setTimeout(resolve,3100));game.w.send(JSON.stringify({type:'rollcallKickoff',id:preparing.id}));await ctrl.next(d=>d.type==='state'&&d.state.rollcall?.phase==='active');
 for(const event of [{type:'chat',id:'a',text:'1'},{type:'chat',id:'a',text:'1'},{type:'chat',id:'b',text:'0'},{type:'gift',id:'a',coins:3},{type:'like',id:'b',count:10}])ctrl.w.send(JSON.stringify({type:'sim',event}));
 const counted=(await ctrl.next(d=>d.type==='liveBatch'&&d.state.rollcall?.scores.groom===30&&d.state.rollcall.scores.bride===10)).state;assert.equal(counted.total,20000);assert.equal(counted.likes,0);assert.equal(counted.receipts,1);assert.equal(counted.rollcall.participants,undefined);
 ctrl.w.send(JSON.stringify({type:'finishRollcall'}));const result=(await ctrl.next(d=>d.type==='state'&&d.state.rollcall?.phase==='result')).state;assert.equal(result.rollcall.winner,'groom');ctrl.w.send(JSON.stringify({type:'startRollcall'}));assert.match((await ctrl.next(d=>d.type==='error')).message,/đang chạy/);
 ctrl.w.send(JSON.stringify({type:'testRollcall'}));const report=(await ctrl.next(d=>d.type==='loadTest'&&d.report?.status==='ready')).report;const sandbox=await client('game',report.id);const testState=(await sandbox.next(d=>d.type==='state')).state;ctrl.w.send(JSON.stringify({type:'testEvent',event:{type:'chat',id:'test-a',text:'1'}}));await sandbox.next(d=>d.type==='liveBatch'&&d.state.rollcall?.people.groom===1);sandbox.w.send(JSON.stringify({type:'rollcallReady',id:testState.rollcall.id}));await sandbox.next(d=>d.type==='liveBatch'&&d.state.rollcall?.selectionEndsAt);await new Promise(resolve=>setTimeout(resolve,3100));sandbox.w.send(JSON.stringify({type:'rollcallKickoff',id:testState.rollcall.id}));await sandbox.next(d=>d.type==='liveBatch'&&d.state.rollcall?.phase==='active');
 for(const event of [{type:'chat',id:'test-a',text:'1'},{type:'gift',id:'test-a',coins:10},{type:'like',id:'test-a',count:20}])ctrl.w.send(JSON.stringify({type:'testEvent',event}));const testCount=(await sandbox.next(d=>d.type==='liveBatch'&&d.state.rollcall?.scores.groom===120)).state;assert.equal(testCount.total,0);assert.equal(testCount.likes,0);const liveProbe=await client('ctrl');const unchanged=(await liveProbe.next(d=>d.type==='state')).state;assert.equal(unchanged.total,20000);assert.equal(unchanged.rollcall.id,preparing.id);
 ctrl.w.send(JSON.stringify({type:'cancelRollcall',testSession:report.id}));await sandbox.next(d=>d.type==='liveBatch'&&d.state.rollcall?.phase==='cancelled');
 for(let i=0;i<36;i++)ctrl.w.send(JSON.stringify({type:'testEvent',event:{type:'chat',id:'hall_'+i,text:i%2?'nhà gái':'nhà trai'}}));
 await sandbox.next(d=>d.type==='liveBatch'&&d.state.guestCount===37);
 ctrl.w.send(JSON.stringify({type:'testRollcall',variant:'tug'}));
 const reused=(await sandbox.next(d=>d.type==='liveBatch'&&d.state.rollcall?.phase==='preparing'&&d.state.rollcall.id!==testState.rollcall.id)).state;
 assert.equal(reused.guestCount,37);
 assert.equal(reused.rollcall.config.variant,'tug');
 assert.match(reused.rollcall.config.intro,/Kéo co hai họ/);
 assert.deepEqual(reused.rollcall.people,{groom:19,bride:18});
 assert.deepEqual(reused.rollcall.scores,{groom:0,bride:0});
 ctrl.w.send(JSON.stringify({type:'saveRollcall',config:{...config,revision:1,enabled:false}}));
 const migrated=(await ctrl.next(d=>d.type==='rollcallConfig'&&d.config.revision===2)).config;
 assert.equal(migrated.enabled,undefined);
 ctrl.w.send(JSON.stringify({type:'cancelRollcall',testSession:report.id}));
 await sandbox.next(d=>d.type==='liveBatch'&&d.state.rollcall?.phase==='cancelled');
 ctrl.w.send(JSON.stringify({type:'testRollcall',variant:'tug'}));
 await sandbox.next(d=>d.type==='liveBatch'&&d.state.rollcall?.phase==='preparing');

});

