'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {VieNeuSpeech}=require('../lib/vieneu-speech');
function fixture(t,respond){let writes=0;const service=new VieNeuSpeech({root:'.',spawnWorker:()=>{const p=new EventEmitter();p.stdout=new EventEmitter();p.stderr=new EventEmitter();p.stdin=new EventEmitter();p.kill=()=>{};p.stdin.write=line=>{writes++;respond(p,JSON.parse(line));};queueMicrotask(()=>p.stdout.emit('data',Buffer.from('READY\t[{"id":"Trúc Ly","name":"Trúc Ly","gender":"F"},{"id":"Minh Quân","name":"Minh Quân","gender":"M"}]\n')));return p;}});t.after(()=>service.close());return{service,writes:()=>writes};}
const chunk=Buffer.alloc(9600,1);
test('VieNeu streams PCM chunks locally and reports completion',async t=>{
 const {service,writes}=fixture(t,(p,job)=>{if(job.type==='speak'){p.stdout.emit('data',Buffer.from(`CHUNK\t${job.id}\t${chunk.toString('base64')}\nDONE\t${job.id}\t0.35\n`));}});const received=[];
 assert.equal((await service.inventory()).find(v=>v.gender==='F').name,'Trúc Ly');const result=await service.stream('Xin chào Lan',{voice:'Trúc Ly',onChunk:pcm=>received.push(pcm)});assert.equal(result.duration,.35);assert.equal(received[0].length,9600);assert.equal(writes(),1);
});
test('VieNeu rejects voices not in the local preset list and expired requests',async t=>{
 const {service,writes}=fixture(t,()=>{});await service.inventory();await assert.rejects(service.stream('test',{voice:'missing'}),/không tìm thấy/i);await assert.rejects(service.stream('test',{voice:'Trúc Ly',deadline:Date.now()-1}),/expired/i);assert.equal(writes(),0);
});
test('aborting current speech sends a cancel and the worker can continue',async t=>{
 const {service,writes}=fixture(t,(p,job)=>{if(job.type==='cancel')queueMicrotask(()=>p.stdout.emit('data',Buffer.from(`DONE\t${job.id}\t0\n`)));});await service.inventory();const ctl=new AbortController();const old=assert.rejects(service.stream('old',{voice:'Trúc Ly',signal:ctl.signal}),/cancelled/i);await new Promise(resolve=>setImmediate(resolve));ctl.abort();await old;assert.equal(writes(),2);
});
test('worker startup failure rejects queued speech without retry loops',async t=>{
 const service=new VieNeuSpeech({root:'.',spawnWorker:()=>{const p=new EventEmitter();p.stdout=new EventEmitter();p.stderr=new EventEmitter();p.stdin=new EventEmitter();p.kill=()=>{};queueMicrotask(()=>p.emit('error',new Error('Python unavailable')));return p;}});t.after(()=>service.close());await assert.rejects(service.inventory(),/Python unavailable/);await assert.rejects(service.stream('x',{voice:'Trúc Ly'}),/Python unavailable/);assert.equal(service.queue.length,0);
});
test('game uses streamed local VieNeu voices and no legacy/cloud speech',()=>{
 const fs=require('node:fs'),path=require('node:path');for(const file of ['game/game.js','game/control.html','server.js']){const s=fs.readFileSync(path.join(__dirname,'..',file),'utf8');assert.doesNotMatch(s,/Hoài My|HoaiMy|edge_worker|assets\/voices\/|nameSpeech|liveSpeech|SAPI|windows-local/);}assert.match(fs.readFileSync(path.join(__dirname,'../server.js'),'utf8'),/pcm_s16le/);assert.match(fs.readFileSync(path.join(__dirname,'../game/game.js'),'utf8'),/PcmSpeechPlayer/);
});
test('a failed worker is respawned after a pause instead of muting speech for good',async t=>{
 let spawns=0;const service=new VieNeuSpeech({root:'.',spawnWorker:()=>{spawns++;const p=new EventEmitter();p.stdout=new EventEmitter();p.stderr=new EventEmitter();p.stdin=new EventEmitter();p.kill=()=>{};p.stdin.write=()=>{};queueMicrotask(()=>p.stdout.emit('data',Buffer.from('READY\t[{"id":"Trúc Ly","name":"Trúc Ly","gender":"F"}]\n')));return p;}});t.after(()=>service.close());
 await service.inventory();service.fail(new Error('stuck'));await assert.rejects(service.inventory(),/stuck/);
 service.retryAt=Date.now()-1;await service.inventory();assert.equal(spawns,2);assert.equal(service.status.ready,true);assert.equal(service.failures,0);
});
