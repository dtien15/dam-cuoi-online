'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events'),WS=require('ws');
test('wedding settings roundtrip, game acknowledgements and sandbox registration use the right session',{timeout:15000},async t=>{
 const root=path.join(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'wedding-cycle-')),sockets=[];
 const proc=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'0',GAME_DATA_DIR:dir,GAME_NO_VOICE:'1',TIKTOK_USER:''},windowsHide:true,stdio:['ignore','pipe','pipe']});
 t.after(()=>{sockets.forEach(w=>w.terminate());proc.kill();});
 const port=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);proc.stdout.on('data',b=>{text+=b;const m=text.match(/localhost:(\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});proc.on('error',reject);});
 async function client(role,testSession,mute=false){const w=new WS('ws://127.0.0.1:'+port),messages=[];sockets.push(w);w.on('message',r=>messages.push(JSON.parse(r)));await once(w,'open');w.send(JSON.stringify({type:'hello',role,testSession,mute}));return{w,next:async check=>{for(let i=0;i<800;i++){const index=messages.findIndex(check);if(index>=0)return messages.splice(index,1)[0];await new Promise(r=>setTimeout(r,5));}throw Error('packet timeout');}};}
 const ctrl=await client('ctrl'),cfg=(await ctrl.next(d=>d.type==='weddingConfig')).config;cfg.durations.entrance=20;cfg.scripts.show[0][0].text='Mời đội văn nghệ góp vui với {re} và {dau}!';ctrl.w.send(JSON.stringify({type:'saveWeddingConfig',config:cfg}));const saved=(await ctrl.next(d=>d.type==='weddingConfig')).config;assert.equal(saved.durations.entrance,20);assert.equal(saved.revision,1);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'wedding-cycle.json'))),saved);
 ctrl.w.send(JSON.stringify({type:'testWeddingCycle'}));const report=await ctrl.next(d=>d.type==='loadTest'&&d.report?.id);const game=await client('game',report.report.id),state=(await game.next(d=>d.type==='state')).state;assert.equal(state.ceremony.phase,'welcome');game.w.send(JSON.stringify({type:'weddingPhaseDone',key:state.ceremony.key}));
 await new Promise(r=>setTimeout(r,60));
 for(let i=0;i<20;i++)ctrl.w.send(JSON.stringify({type:'testEvent',event:{type:'gift',id:'a',name:'Khách 1',coins:1,unitCoins:1,giftName:'GG'}}));
 const updated=(await game.next(d=>d.type==='liveBatch'&&d.state.total===200000)).state;assert.equal(updated.ceremony.waiting.bride,0);assert.equal(updated.weddingRoles.bride.id,'a');assert.equal(updated.receipts,20);
 const live=await client('ctrl'),liveState=(await live.next(d=>d.type==='state')).state;assert.equal(liveState.total,0);assert.equal(liveState.ceremony.waiting.bride,0);
 ctrl.w.send(JSON.stringify({type:'saveWeddingConfig',config:cfg}));assert.match((await ctrl.next(d=>d.type==='error')).message,/đã đổi/);
});
