'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {LoadTest,validateOptions}=require('../lib/load-test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process'),{once}=require('node:events'),WS=require('ws');
test('load options reject invalid or unbounded stress and live guard blocks generation',()=>{
 assert.throws(()=>validateOptions({events:1000000}),/events/);assert.throws(()=>validateOptions({rate:9999}),/rate/);assert.throws(()=>validateOptions({scenario:'invalid'}),/Loại/);
 const load=new LoadTest({allowed:()=>false});assert.throws(()=>load.create(),/TikTok/);assert.throws(()=>load.inject({type:'like'}),/TikTok/);
});
test('manual test points are exact, clear affects only the sandbox, and stop cancels generation',async()=>{
 const load=new LoadTest();const owner={};load.inject({type:'gift',id:'a',name:'Lan',coins:5},owner);
 assert.equal(load.metrics().actualDuyen,5);assert.equal(load.metrics().expectedDuyen,5);
 load.clear(owner);assert.equal(load.metrics().actualDuyen,0);
 load.create({guests:50,events:20000,rate:100,scenario:'gift'},owner);load.stop();const count=load.metrics().processed;
 await new Promise(resolve=>setTimeout(resolve,60));assert.equal(load.metrics().processed,count);assert.equal(load.metrics().status,'stopped');load.close();
});
test('test room traffic stays separate from live sockets and live data stays out of the test room',{timeout:15000},async t=>{
 const root=path.join(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'wedding-load-'));
 const proc=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'0',GAME_DATA_DIR:dir,GAME_NO_VOICE:'1',TIKTOK_USER:''},windowsHide:true,stdio:['ignore','pipe','pipe']});const sockets=[];
 t.after(()=>{for(const s of sockets)s.terminate();proc.kill();});
 const port=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);proc.stdout.on('data',data=>{text+=data;const m=text.match(/localhost:(\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]));}});proc.on('error',reject);});
 async function client(role,testSession){const ws=new WS('ws://127.0.0.1:'+port),messages=[];sockets.push(ws);ws.on('message',raw=>messages.push(JSON.parse(raw)));await once(ws,'open');ws.send(JSON.stringify({type:'hello',role,testSession}));return{ws,messages,async next(check){for(let i=0;i<500;i++){const n=messages.findIndex(check);if(n>=0)return messages.splice(n,1)[0];await new Promise(r=>setTimeout(r,5));}throw Error('message timeout');}};}
 const ctrl=await client('ctrl'),live=await client('game');await ctrl.next(d=>d.type==='state');await live.next(d=>d.type==='state');
 ctrl.ws.send(JSON.stringify({type:'testStart',options:{guests:50,events:100,rate:500,scenario:'gift'}}));
 const started=await ctrl.next(d=>d.type==='loadTest'&&d.report?.status==='running'),room=await client('game',started.report.id);
 const initial=await room.next(d=>d.type==='state');assert.equal(initial.state.guestCount,50);
 const completed=(await ctrl.next(d=>d.type==='loadTest'&&d.report?.status==='completed')).report;
 assert.equal(completed.processed,100);assert.equal(completed.actualDuyen,300);assert.equal(completed.scoreMatches,true);
 assert.equal(live.messages.filter(d=>d.type==='liveBatch').length,0);
 ctrl.ws.send(JSON.stringify({type:'sim',event:{type:'gift',id:'real',name:'Khách thật',coins:2}}));
 const actual=await live.next(d=>d.type==='liveBatch');assert.equal(actual.state.total,20000);assert.equal(actual.state.guestCount,1);
 assert.ok(room.messages.filter(d=>d.type==='liveBatch').every(d=>d.state.guestCount===50));
 ctrl.ws.send(JSON.stringify({type:'testStart',options:{guests:10,events:20000,rate:10,scenario:'mixed'}}));await ctrl.next(d=>d.type==='loadTest'&&d.report?.status==='running');
 const watcher=await client('ctrl');await watcher.next(d=>d.type==='loadTest'&&d.report?.status==='running');ctrl.ws.close();
 const stopped=(await watcher.next(d=>d.type==='loadTest'&&d.report?.status==='stopped')).report;assert.match(stopped.reason,/mất kết nối/);
});
