'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const WebSocket = require('ws');
const R = require('../game/rules');
const ROOT = path.resolve(__dirname, '..');
const gift = (coins, id = 'guest') => ({ type: 'gift', id, name: 'Khách', coins });

test('1 xu = 10k; 5 xu = 50k; no tier cap or rounding', () => {
  for (const n of [1, 5, 10, 100, 500, 1000, 5000, 10000]) assert.equal(R.coinsToVnd(n), n * 10000);
  for (const n of [0, -1, 1.5, NaN, Infinity, '5', null]) assert.throws(() => R.coinsToVnd(n));
});
test('combo and separate gifts produce equal scores', () => {
  const a = R.createState(10000), b = R.createState(10000);
  for (let i = 0; i < 10; i++) R.applyEvent(a, gift(1), 11000);
  R.applyEvent(b, gift(10), 11000);
  assert.equal(a.total, 100000); assert.equal(a.total, b.total); assert.deepEqual(a.teamMoney, b.teamMoney);
});
test('team changes after a gift transfer the donor total without changing the wedding total', () => {
  const s = R.createState(10000);
  R.applyEvent(s, { type: 'chat', id: 'a', name: 'A', text: 'nhà gái' }, 11000);
  R.applyEvent(s, gift(5, 'a'), 12000);
  R.applyEvent(s, { type: 'chat', id: 'a', name: 'A', text: 'nhà trai' }, 13000);
  R.applyEvent(s, gift(1, 'a'), 14000);
  assert.equal(s.users.a.team, 'groom'); assert.equal(s.teamMoney.groom, 60000); assert.equal(s.teamMoney.bride,0); assert.equal(s.total, s.teamMoney.groom + s.teamMoney.bride);
});
test('reset clears the continuous wedding without retaining an old scripted event', () => {
  const state=R.createState(10000); R.applyEvent(state,gift(5),11000); state.event={id:'dien'};const round=state.round;
  R.resetWedding(state,15000,()=>0);assert.equal(state.round,round+1);assert.equal(state.total,0);assert.equal(state.likes,0);assert.deepEqual(state.users,{});assert.equal('event' in state,false);
});
test('migration preserves the wedding ledger and removes every former event and timer', () => {
  const state=R.migrateState({version:1,round:8,users:{a:{id:'a',total:50000}},total:50000,teamMoney:{groom:50000,bride:0},couple:['A','B'],phase:3,phaseEnd:123,event:{id:'dien'}});
  assert.equal(state.version,2);assert.equal(state.total,50000);assert.equal(state.round,8);assert.equal(state.users.a.total,50000);assert.equal('phase' in state,false);assert.equal('event' in state,false);assert.equal(R.startEvent,undefined);
});

test('invalid events and prototype keys cannot corrupt state', () => {
  const s = R.createState(10000);
  for (const e of [gift(-1), gift(1.5), gift(1, '__proto__'), gift(1, 'constructor'), { type: 'like', id: 'a', count: -1 }]) assert.equal(R.applyEvent(s, e), null);
  assert.equal(s.total, 0); assert.equal(Object.keys(s.users).length, 0);
});
test('stress 300 events preserve every gift and exact totals', () => {
  const s = R.createState(10000); let expected = 0;
  for (let i = 0; i < 300; i++) { const e = i % 5 === 0 ? gift(5, 'u' + i % 40) : { type: 'like', id: 'u' + i % 40, name: 'A', count: 5 }; R.applyEvent(s, e, 11000 + i); if (e.type === 'gift') expected += 50000; }
  assert.equal(s.total, expected); assert.equal(s.total, s.teamMoney.groom + s.teamMoney.bride); assert.equal(Object.values(s.users).reduce((sum, u) => sum + u.total, 0), s.total);
});
test('all shipped frontend scripts compile and entry points resolve; no meme tags', () => {
  for (const file of fs.readdirSync(path.join(ROOT,'game')).filter(f=>f.endsWith('.js'))) new vm.Script(fs.readFileSync(path.join(ROOT, 'game', file), 'utf8'));
  const html = fs.readFileSync(path.join(ROOT, 'game/control.html'), 'utf8'); for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  for(const page of ['control.html','index.html'])for(const match of fs.readFileSync(path.join(ROOT,'game',page),'utf8').matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g))assert.ok(fs.existsSync(path.join(ROOT,'game',match[1])),match[1]);
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'game/lines.js'), 'utf8'), /\[sfx:/);
});

test('HTTP + WebSocket: shared scores, reconnect, removed event commands, reset and disk restore', { timeout: 20000 }, async t => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'wedding-test-'));
  let proc, port;
  const clients = [];
  async function launch() {
    proc = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: '0', TIKTOK_USER: '', GAME_NO_VOICE:'1', GAME_DATA_DIR: data }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; const failures = [];
    proc.stderr.on('data', d => failures.push(d.toString()));
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('startup timeout: ' + output + failures.join(''))), 5000); proc.stdout.on('data', d => { output += d; const m = output.match(/localhost:(\d+)/); if (m && Number(m[1])) { port = Number(m[1]); clearTimeout(timer); resolve(); } }); proc.on('exit', () => { clearTimeout(timer); reject(new Error('server exited: ' + output + failures.join(''))); }); });
  }
  const connect = async role => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`); clients.push(ws); const queue = []; ws.on('message', raw => queue.push(JSON.parse(raw))); await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', role }));
    const next = async predicate => { const deadline = Date.now() + 4000; while (Date.now() < deadline) { const i = queue.findIndex(predicate); if (i >= 0) return queue.splice(i, 1)[0]; await new Promise(r => setTimeout(r, 10)); } throw new Error('message timeout: ' + JSON.stringify(queue).slice(0, 300)); };
    return { ws, next, send: d => ws.send(JSON.stringify(d)) };
  };
  t.after(() => { clients.forEach(ws => ws.terminate()); proc?.kill(); fs.rmSync(data, { recursive: true, force: true }); });
  await launch();
  const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json(); assert.equal(health.voice, 'vieneu-local-onnx');
  assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status, 200); assert.equal((await fetch(`http://127.0.0.1:${port}/tts`)).status, 400);
  const musicResponse=await fetch(`http://127.0.0.1:${port}/assets/music/playlist/piano-music.mp3`);assert.equal(musicResponse.status,200);assert.equal(musicResponse.headers.get('content-type'),'audio/mpeg');
  const ctrl = await connect('ctrl'), game = await connect('game'); await ctrl.next(d => d.type === 'state'); await game.next(d => d.type === 'state');
  ctrl.send({type:'cmd',name:'musicvol',value:0});await ctrl.next(d=>d.type==='ui'&&d.ui.musicvol===0);
  const remembered=await connect('ctrl');assert.equal((await remembered.next(d=>d.type==='ui')).ui.musicvol,0);
  ctrl.send({ type: 'sim', event: gift(1) }); ctrl.send({ type: 'sim', event: gift(5) });
  const result = await ctrl.next(d => d.type === 'liveBatch' && d.state.total === 60000); const mirror = await game.next(d => d.type === 'liveBatch' && d.state.total === 60000); assert.deepEqual(result.state, mirror.state);
  const reload = await connect('game'); assert.equal((await reload.next(d => d.type === 'state')).state.total, 60000);
  game.send({ type: 'cmd', name: 'reset' }); await new Promise(r => setTimeout(r, 100)); const check = await connect('game'); assert.equal((await check.next(d => d.type === 'state')).state.total, 60000);
  ctrl.send({type:'cmd',name:'event',id:'dien'});ctrl.send({type:'cmd',name:'phase',i:3});
  const unchanged=await connect('game'); const clean=(await unchanged.next(d=>d.type==='state')).state;
  assert.equal(clean.total,60000);assert.equal('event' in clean,false);assert.equal('phase' in clean,false);
  ctrl.send({ type: 'cmd', name: 'reset' }); const reset = await ctrl.next(d => d.type === 'state' && d.state.total === 0 && !d.state.event); assert.deepEqual(reset.state.users, {});
  ctrl.send({ type: 'sim', event: gift(5) }); await ctrl.next(d => d.type === 'liveBatch' && d.state.total === 50000);
  await new Promise(r => setTimeout(r, 1200)); const disk = JSON.parse(fs.readFileSync(path.join(data, 'cache/session.json'))); assert.equal(disk.total, 50000);
  clients.forEach(ws => ws.terminate()); const exited = once(proc, 'exit'); proc.kill(); await exited; await launch();
  const restored = await connect('game'); assert.equal((await restored.next(d => d.type === 'state')).state.total, 50000);
});

test('TikTok gift streak: ignore intermediate packets, deduplicate final packet, multiply exact coins', () => {
  const normalize = require('../lib/tiktok-events').createGiftNormalizer();
  const packet = { user: { userId: '123', nickname: 'Lan' }, giftId: 'rose', groupId: 'group1', giftDetails: { giftType: 1, diamondCount: 1, giftName: 'Rose' }, repeatCount: 5, repeatEnd: 0 };
  assert.equal(normalize(packet), null); assert.equal(normalize({ ...packet, repeatEnd: '0' }), null);
  const event = normalize({ ...packet, repeatEnd: 1 }); assert.equal(event.coins, 5); assert.equal(R.coinsToVnd(event.coins), 50000);
  assert.equal(normalize({ ...packet, repeatEnd: true }), null);
  assert.equal(normalize({ ...packet, groupId: 'group2', repeatEnd: true }).coins, 5);
});
test('TikTok normal gifts: exact price, missing price rejected, zero group does not merge different messages', () => {
  const normalize = require('../lib/tiktok-events').createGiftNormalizer();
  const packet = { user: { userId: '123' }, groupId: '0', giftDetails: { giftType: 0, diamondCount: 5 }, repeatCount: 1, common: { msgId: 'a' } };
  assert.equal(normalize(packet).coins, 5); assert.equal(normalize(packet), null);
  assert.equal(normalize({ ...packet, common: { msgId: 'b' } }).coins, 5);
  assert.equal(normalize({ ...packet, giftDetails: {} }), null);
});
test('MC combines gifts without dropping a donor or changing scores', () => {
  const result = require('../game/mc-policy').giftMessage([{name:'Lan',vnd:10000,receipts:1},{name:'Tuấn',vnd:50000,receipts:1}]);
  assert.match(result.caption,/Lan/); assert.match(result.caption,/Tuấn/); assert.equal(result.amount,60000); assert.equal(result.count,2);
});

test('hall has 24 unique seats, a clear center aisle and a route to the gift box', () => {
  const hall=require('../game/hall-layout');assert.equal(hall.tables.length,4);assert.equal(hall.capacity,24);assert.equal(new Set(hall.seats.map(seat=>seat.id)).size,24);
  for(const seat of hall.seats){assert.ok(seat.x<410||seat.x>670);assert.ok(seat.y<1900&&seat.y>800);const route=hall.route(seat);assert.deepEqual(route[0],{x:seat.x,y:seat.y});assert.deepEqual(route.at(-1),hall.giftBox.deposit);}
});

test('latest five gift receipts survive reload independently of donor ranking',()=>{
 const Rules=require('../game/rules');const s=Rules.createState();for(let i=0;i<7;i++)Rules.applyEvent(s,{type:'gift',id:'donor'+i,name:'Khách '+i,coins:i+1},1000+i);
 assert.equal(s.recentGifts.length,5);assert.equal(s.recentGifts[0].id,'donor6');assert.equal(s.recentGifts[4].id,'donor2');assert.equal(s.recentGifts[0].amount,70000);assert.deepEqual(Rules.migrateState(s).recentGifts,s.recentGifts);
});
