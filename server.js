'use strict';
const http = require('node:http');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { WebSocketServer } = require('ws');
const Rules = require('./game/rules');
const Identity=require('./game/identity');
const Party = require('./game/party-engine');
const Rollcall=require('./game/rollcall');
const {applySessionEvent,releaseDeferredSteals}=require('./lib/session-events');
const { createGiftNormalizer,normalizeInteraction } = require('./lib/tiktok-events');
const ROOT = __dirname, PORT = Number(process.env.PORT || 3000);
const CODE_VERSION=require('./lib/code-version').codeVersion(__dirname);
const DATA_DIR = process.env.GAME_DATA_DIR || ROOT;
const SETTINGS = path.join(DATA_DIR, 'settings.json');
const SESSION = path.join(DATA_DIR, 'cache', 'session.json');
const readJSON = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };
function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2)); fs.renameSync(file + '.tmp', file);
}
let settings = readJSON(SETTINGS, {});
const ScriptPolicy=require('./game/mc-policy');
const SCRIPT_FILE=path.join(DATA_DIR,'scripts.json');
const savedScripts=readJSON(SCRIPT_FILE,null);
let scriptRows=ScriptPolicy.scriptDefaults(),scriptRevision=0;
try{if(savedScripts){scriptRows=ScriptPolicy.validateScripts(savedScripts.rows);scriptRevision=Number(savedScripts.revision)||0;}}catch(e){console.error('Không đọc được kịch bản:',e.message);}
const GiftEvents=require('./game/gift-events');
const GIFT_EVENTS_FILE=path.join(DATA_DIR,'gift-events.json');
let giftEvents=GiftEvents.defaults();try{const stored=readJSON(GIFT_EVENTS_FILE,null);if(stored)giftEvents=GiftEvents.migrate(stored);}catch(e){console.error(e.message);}
const giftEventsSnapshot=()=>({type:'giftEvents',config:giftEvents});
const WeddingCycle=require('./game/wedding-cycle');
const CYCLE_FILE=path.join(DATA_DIR,'wedding-cycle.json');
let weddingConfig=WeddingCycle.defaults();try{const stored=readJSON(CYCLE_FILE,null);if(stored)weddingConfig=WeddingCycle.validate(stored);}catch(e){console.error(e.message);}
const weddingSnapshot=()=>({type:'weddingConfig',config:weddingConfig});
const HeartEvents=require('./game/heart-events');
const HEART_FILE=path.join(DATA_DIR,'heart-events.json');
let heartEvents=HeartEvents.defaults();try{const stored=readJSON(HEART_FILE,null);if(stored)heartEvents=HeartEvents.validate(stored);}catch(e){console.error(e.message);}
const Playlist=require('./game/playlist');
const PLAYLIST_FILE=path.join(DATA_DIR,'playlist.json');
// Bài thêm mới nằm cùng thư mục với các bài có sẵn; khi kiểm thử có thể tách riêng.
const SHIPPED_MUSIC=path.join(ROOT,'assets','music','playlist'),MUSIC_DIR=process.env.GAME_PLAYLIST_DIR||SHIPPED_MUSIC;
let playlist=Playlist.defaults();try{const stored=readJSON(PLAYLIST_FILE,null);if(stored)playlist=Playlist.validate(stored);}catch(e){console.error(e.message);}
const playlistSnapshot=()=>({type:'playlist',...playlist});
const MAX_MUSIC_BYTES=40*1024*1024;
const heartSnapshot=()=>({type:'heartEvents',config:heartEvents});
const ROLLCALL_FILE=path.join(DATA_DIR,'rollcall.json');
let rollcallConfig=Rollcall.defaults();try{const c=readJSON(ROLLCALL_FILE,null);if(c)rollcallConfig=Rollcall.validate(c);}catch(e){console.error(e.message);}
const rollcallSnapshot=()=>({type:'rollcallConfig',config:rollcallConfig});
const scriptsSnapshot=()=>({type:'scripts',rows:scriptRows,revision:scriptRevision});
let ui = { sound: settings.ui?.sound ?? true, rate: settings.ui?.rate ?? 1, readcmt: settings.ui?.readcmt ?? true, hint: settings.ui?.hint ?? true, music: settings.ui?.music ?? true, musicvol: settings.ui?.musicvol ?? .22,voice_mc:settings.ui?.voice_mc||'Trúc Ly',voice_bride:settings.ui?.voice_bride||'Ngọc Huyền',voice_groom:settings.ui?.voice_groom||'Hải Đăng' };
const persistSettings = () => { try { writeJSON(SETTINGS, { user: tt.user, ui }); } catch (e) { console.error('Không lưu được cài đặt:', e.message); } };
for(const [name,value]of Object.entries(ScriptPolicy.runtime)){const saved=Number(settings.ui?.[name]),[min,max]=ScriptPolicy.runtimeLimits[name];ui[name]=Number.isFinite(saved)?Math.max(min,Math.min(max,Math.round(saved))):value;}
let state = Rules.migrateState(readJSON(SESSION, null));
HeartEvents.sync(state,heartEvents);Rollcall.restore(state);WeddingCycle.ensure(state);
Party.ensure(state).syncSpeech=process.env.GAME_NO_VOICE!=='1'; Party.pruneUsers(state, Date.now()); Party.seating(state, Date.now());
let dirty = true;
// The session is saved every second during a live: compact JSON, the rarely changing ledger re-serialized only when it changes,
// and the disk write done off the event loop. shutdown() uses the synchronous path so nothing is lost on exit.
let ledgerCache = { ledger: null, rev: -1, json: '{}' }, saving = false, closing = false;
function sessionText() {
  const ledger = state.ledger || {}, rev = state.ledgerRev || 0;
  if (ledgerCache.ledger !== ledger || ledgerCache.rev !== rev) ledgerCache = { ledger, rev, json: JSON.stringify(ledger) };
  return JSON.stringify({ ...state, ledger: undefined, savedAt: Date.now() }).slice(0, -1) + ',"ledger":' + ledgerCache.json + '}';
}
function persistSession() {
  if (!dirty || saving || closing) return;
  let text; try { text = sessionText(); } catch (e) { return console.error('Không lưu được phiên:', e.message); }
  dirty = false; saving = true;
  fs.promises.mkdir(path.dirname(SESSION), { recursive: true }).then(() => fs.promises.writeFile(SESSION + '.tmp', text)).then(() => { if (!closing) return fs.promises.rename(SESSION + '.tmp', SESSION); })
    .catch(e => { dirty = true; console.error('Không lưu được phiên:', e.message); }).finally(() => { saving = false; });
}
function persistSessionSync() {
  closing = true;
  try { fs.mkdirSync(path.dirname(SESSION), { recursive: true }); fs.writeFileSync(SESSION + '.final', sessionText()); fs.renameSync(SESSION + '.final', SESSION); dirty = false; } catch (e) { console.error('Không lưu được phiên:', e.message); }
}

const {VieNeuSpeech}=require('./lib/vieneu-speech');
const speechService=process.env.GAME_NO_VOICE==='1'?{voices:[],status:{engine:'disabled-test',ready:false},inventory:async()=>[],stream:async()=>{throw new Error('Speech disabled for test');},close(){}}:new VieNeuSpeech({root:ROOT});
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp':'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => {
  let url, p;
  try { url = new URL(req.url, 'http://localhost'); p = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end('invalid URL'); }
if (p === '/favicon.ico') { res.writeHead(204); return res.end(); }
  if (p === '/health') { res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true,voice:'vieneu-local-onnx',code:CODE_VERSION,live:tt.live,round:state.round,speech:speechService.status})); }
  if (p === '/voices') {res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({engine:'vieneu-local-onnx',voices:await speechService.inventory()}));}
  if (p === '/tts') {
    const text=(url.searchParams.get('t')||'').trim().slice(0,400),rate=Math.min(1.5,Math.max(.7,Number(url.searchParams.get('r'))||1)),voice=url.searchParams.get('voice')||'Trúc Ly';
    if(!text){res.writeHead(400);return res.end('missing text');}
    const ctl=new AbortController();res.on('close',()=>{if(!res.writableEnded)ctl.abort();});let sent=false;
    try{const patience=url.searchParams.get('wait')==='long'?30000:5000,until=Math.min(Date.now()+patience,Number(url.searchParams.get('until'))||Date.now()+patience);await speechService.stream(text,{voice,signal:ctl.signal,deadline:until,onChunk:pcm=>{if(res.destroyed)return;if(!sent){res.writeHead(200,{'Content-Type':'application/octet-stream','X-Audio-Format':'pcm_s16le;rate=48000;channels=1','X-Playback-Rate':String(rate),'X-Engine':'vieneu-local-onnx','Cache-Control':'no-store'});sent=true;}res.write(pcm);}});if(!res.destroyed){if(!sent){res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8'});return res.end('VieNeu không tạo được âm thanh.');}res.end();}}
    catch(e){if(!res.destroyed){if(!sent){res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8'});res.end(e.message);}else res.destroy(e);}}return;
  }
  if (p === '/playlist/upload') {
    const refuse=(code,message)=>{if(!res.headersSent){res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8',Connection:'close'});res.end(message);}};
    if(req.method!=='POST')return refuse(405,'Chỉ nhận POST.');
    const host=String(req.headers.host||'');
    if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||req.headers.origin!=='http://'+host)return refuse(403,'Chỉ thêm nhạc từ bảng điều khiển trên máy này.');
    if(playlist.tracks.length>=50)return refuse(400,'Danh sách nhạc tối đa 50 bài.');
    const chunks=[];let size=0,tooLarge=false;
    req.on('data',chunk=>{size+=chunk.length;if(size>MAX_MUSIC_BYTES){tooLarge=true;chunks.length=0;return;}if(!tooLarge)chunks.push(chunk);});
    req.on('error',()=>{});
    req.on('end',async()=>{
     if(tooLarge)return refuse(413,'Tệp nhạc tối đa 40 MB.');
     const bytes=Buffer.concat(chunks);
     if(!Playlist.looksLikeMp3(bytes))return refuse(400,'Tệp này không phải MP3.');
     try{
      const id='nhac-'+crypto.randomBytes(6).toString('hex'),file=id+'.mp3';
      await fs.promises.mkdir(MUSIC_DIR,{recursive:true});
      await fs.promises.writeFile(path.join(MUSIC_DIR,file+'.tmp'),bytes);
      await fs.promises.rename(path.join(MUSIC_DIR,file+'.tmp'),path.join(MUSIC_DIR,file));
      const next=Playlist.validate({revision:playlist.revision+1,tracks:[...playlist.tracks,{id,file,title:Playlist.titleFrom(url.searchParams.get('name'))}]});
      writeJSON(PLAYLIST_FILE,next);playlist=next;broadcast(playlistSnapshot());
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({id}));
     }catch(error){console.error('Không thêm được nhạc:',error.message);refuse(500,'Không lưu được tệp nhạc.');}
    });
    return;
  }
  if (p.startsWith(Playlist.BASE)) {
    const name=path.basename(p),own=path.join(MUSIC_DIR,name),file=fs.existsSync(own)?own:path.join(SHIPPED_MUSIC,name);
    if(!/^[\w-]+\.mp3$/.test(name)||!fs.existsSync(file)){res.writeHead(404);return res.end('not found');}
    const total=fs.statSync(file).size,range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range||'');
    // Trình duyệt cần tua được để nhạc nghe dở tiếp tục đúng đoạn sau mini game.
    if(range&&(range[1]||range[2])){
     const start=range[1]?Number(range[1]):Math.max(0,total-Number(range[2])),end=range[1]&&range[2]?Math.min(total-1,Number(range[2])):total-1;
     if(start>=total||start>end){res.writeHead(416,{'Content-Range':'bytes */'+total});return res.end();}
     res.writeHead(206,{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Range':'bytes '+start+'-'+end+'/'+total,'Content-Length':end-start+1,'Cache-Control':'no-cache'});
     return fs.createReadStream(file,{start,end}).pipe(res);
    }
    res.writeHead(200,{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Length':total,'Cache-Control':'no-cache'});
    return fs.createReadStream(file).pipe(res);
  }
  if (p === '/') p = '/game/index.html'; else if (p === '/control') p = '/game/control.html';
  else if (!p.startsWith('/assets/') && !p.startsWith('/game/')) p = '/game' + p;
  let file = path.resolve(ROOT, '.' + p);
  // Old browser sources may still request PNG paths until their next reload.
  if(path.extname(file)==='.png'&&!fs.existsSync(file)&&fs.existsSync(file.slice(0,-4)+'.webp'))file=file.slice(0,-4)+'.webp';
  const allowed = ['game', 'assets'].some(dir => file.startsWith(path.join(ROOT, dir) + path.sep));
  if (!allowed || p.includes('/_')) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(data); });
});
const wss = new WebSocketServer({ server, maxPayload: 262144 });
wss.on('error',()=>{}); // HTTP listen errors are reported and cleaned up below.
const sendOne = (ws, data) => { if (ws.readyState === 1) ws.send(JSON.stringify(data)); };
const broadcast = data => { if (!wss.clients.size) return; const text = JSON.stringify(data); for (const ws of wss.clients) if (ws.readyState === 1&&!(ws.testSession&&['state','liveBatch'].includes(data.type))) ws.send(text); };
// Screens never need the ledger of departed donors; it is only saved to disk.
const {publicView,coalesceEvents}=require('./lib/live-view');
const publicState = () => publicView(state);
const snapshot = () => ({ type: 'state', state: publicState(), now: Date.now() });
const tt = { user: '', conn: null, token: 0, live: false, state: 'idle', error: '', retry: null, received:0,lastEventAt:0,counts:{} };
const status = () => ({ type: 'status', user: tt.user, live: tt.live, state: tt.state, error: tt.error,received:tt.received,lastEventAt:tt.lastEventAt,counts:tt.counts });
const {LoadTest}=require('./lib/load-test');
const {advanceSimulation}=require('./lib/live-simulation');
function simulationTick(room,elapsed){return advanceSimulation(room,elapsed,{weddingConfig,rollcallConfig,hasScreens:[...wss.clients].some(w=>w.testSession===room.id&&w.readyState===1)});}
const loadTest=new LoadTest({giftConfig:()=>giftEvents,scenarioTick:simulationTick,transformState:s=>HeartEvents.sync(s,heartEvents),allowed:()=>!tt.user,onReport:report=>{for(const ws of wss.clients)if(ws.role==='ctrl')sendOne(ws,{type:'loadTest',report});},onFrame:(packet,id)=>{const text=JSON.stringify(packet);for(const ws of wss.clients)if(ws.testSession===id&&ws.readyState===1)ws.send(text);}});
function clientsInfo() {
  const games = [...wss.clients].filter(c => c.role === 'game' && !c.testSession && c.readyState === 1);
  const audible = games.filter(c => !c.mute && ((c.audioReady && ui.sound) || (c.musicReady && ui.music && ui.musicvol>0))).length;
  return { type: 'clients', game: games.length, audible };
}
const eventBatch = [];
// Batch at most 10 times/second; every gift receipt is preserved, repeated low-cost signals are merged.
let batchSentAt = 0;
function flushEvents(force = false) {
  if (!eventBatch.length) return;
  const now = Date.now();
  if (!force && now - batchSentAt < 100) return;
  batchSentAt = now; broadcast({ type: 'liveBatch', events: coalesceEvents(eventBatch.splice(0)), state: publicState(), now });
}
setInterval(flushEvents, 50).unref();
function publishEvent(raw) { const event = applySessionEvent(state,raw,Date.now(),giftEvents); if (!event) return; HeartEvents.sync(state,heartEvents);dirty = true; eventBatch.push(event); }
function command(d) {
  flushEvents(true);
  if (d.name === 'reset') { Rules.resetWedding(state); HeartEvents.sync(state,heartEvents);Party.ensure(state).syncSpeech=process.env.GAME_NO_VOICE!=='1'; dirty=true; return broadcast(snapshot()); }
  if (d.name === 'fast') { state.speed=d.value?6:1; dirty=true; return broadcast(snapshot()); }
  if (d.name === 'voice') return broadcast({ type: 'cmd', name: 'voice' });
  if (!Object.hasOwn(ui, d.name)) return;
  if(d.name.startsWith('voice_')){const role=d.name.slice(6),expected=role==='groom'?'M':'F';if(typeof d.value!=='string'||(d.value&&!speechService.voices.some(v=>v.id===d.value&&v.gender===expected)))return;ui[d.name]=d.value;}
  else if(Object.hasOwn(ScriptPolicy.runtimeLimits,d.name)){const value=Number(d.value);if(!Number.isFinite(value))return;const [min,max]=ScriptPolicy.runtimeLimits[d.name];ui[d.name]=Math.max(min,Math.min(max,Math.round(value)));}
  else if(d.name==='musicvol'){const value=Number(d.value);if(!Number.isFinite(value))return;ui[d.name]=Math.max(0,Math.min(.6,value));}
  else ui[d.name] = d.name === 'rate' ? Math.min(1.5, Math.max(.7, Number(d.value) || 1)) : !!d.value;
  persistSettings(); broadcast({ type: 'cmd', name: d.name, value: ui[d.name] }); broadcast({ type: 'ui', ui }); broadcast(clientsInfo());
}
wss.on('connection', ws => {
  ws.role = null; ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  sendOne(ws, status());
  ws.on('message', raw => {
    try {
      const d = JSON.parse(raw);
      if (d.type === 'hello') {
        ws.role = d.role === 'ctrl' ? 'ctrl' : 'game'; ws.mute = !!d.mute;
        if(d.testSession){if(!loadTest.has(d.testSession)){sendOne(ws,{type:'error',message:'Phiên thử đã hết hạn.'});ws.close(1008);return;}ws.role='game';ws.testSession=d.testSession;}
        sendOne(ws, { type: 'ui', ui }); sendOne(ws,playlistSnapshot());sendOne(ws,scriptsSnapshot());sendOne(ws,giftEventsSnapshot());sendOne(ws,heartSnapshot());sendOne(ws,weddingSnapshot());sendOne(ws,rollcallSnapshot()); sendOne(ws,ws.testSession?{type:'state',state:loadTest.snapshot(ws.testSession),now:Date.now()}:snapshot());if(ws.role==='ctrl'){sendOne(ws,{type:'loadTest',report:loadTest.metrics()});}broadcast(clientsInfo()); return;
      }
      if(d.type==='musicReady'&&ws.role==='game'){ws.musicReady=!!d.value;broadcast(clientsInfo());return;}
      if (d.type === 'audioReady' && ws.role === 'game') { ws.audioReady = !!d.value; broadcast(clientsInfo()); return; }
      if(d.type==='heartSceneDone'&&ws.role==='game'){
        const target=ws.testSession?(loadTest.has(ws.testSession)?loadTest.room.state:null):state;
        const h=target?.heart;
        const audibleElsewhere=[...wss.clients].some(c=>c!==ws&&c.role==='game'&&c.testSession===ws.testSession&&!c.mute&&c.readyState===1);
        if(!h||ws.mute&&audibleElsewhere||d.round!==target.round||d.revision!==h.revision||d.ordinal!==h.played||h.played>=h.earned)return;
        h.played++;if(ws.testSession)loadTest.frame(true);else{dirty=true;broadcast(snapshot());}return;
      }
      if(['rollcallReady','rollcallKickoff','rollcallAnnounced'].includes(d.type)&&ws.role==='game'){
        const target=ws.testSession?(loadTest.has(ws.testSession)?loadTest.room.state:null):state;
        const audibleElsewhere=[...wss.clients].some(c=>c!==ws&&c.role==='game'&&c.testSession===ws.testSession&&!c.mute&&c.readyState===1);
        if(!target||ws.mute&&audibleElsewhere)return;
        const acknowledge=d.type==='rollcallReady'?Rollcall.ready:d.type==='rollcallKickoff'?Rollcall.kickoff:Rollcall.acknowledgeResult;
        if(acknowledge(target.rollcall,d.id)){if(ws.testSession)loadTest.frame(true);else{dirty=true;broadcast(snapshot());}}return;
      }
      if(d.type==='weddingTakeover'&&ws.role==='game'){const target=ws.testSession?(loadTest.has(ws.testSession)?loadTest.room.state:null):state;if(target?.ceremony?.key===d.key){if(d.active)WeddingCycle.holdTakeover(target);else WeddingCycle.resumeTakeover(target);if(ws.testSession)loadTest.frame(true);else{dirty=true;broadcast(snapshot());}}return;}
      if(d.type==='weddingTransitionDone'&&ws.role==='game'){
        const target=ws.testSession?(loadTest.has(ws.testSession)?loadTest.room.state:null):state;
        const transition=target?.ceremony?.transition;
        const audibleElsewhere=[...wss.clients].some(c=>c!==ws&&c.role==='game'&&c.testSession===ws.testSession&&!c.mute&&c.readyState===1);
        if(transition?.key===d.key&&!(ws.mute&&audibleElsewhere))transition.spoken=true;
        return;
      }
      if(d.type==='weddingPhaseDone'&&ws.role==='game'){const target=ws.testSession?(loadTest.has(ws.testSession)?loadTest.room.state:null):state;const audibleElsewhere=[...wss.clients].some(c=>c!==ws&&c.role==='game'&&c.testSession===ws.testSession&&!c.mute&&c.readyState===1);if(!(ws.mute&&audibleElsewhere)&&target?.ceremony?.key===d.key){target.ceremony.ack=true;if(!ws.testSession)dirty=true;}return;}
      if(d.type==='weddingCancelDone'&&ws.role==='game'){const target=ws.testSession?(loadTest.has(ws.testSession)?loadTest.room.state:null):state;const audibleElsewhere=[...wss.clients].some(c=>c!==ws&&c.role==='game'&&c.testSession===ws.testSession&&!c.mute&&c.readyState===1);if(!(ws.mute&&audibleElsewhere))WeddingCycle.finishCancel(target,d.key);return;}
      if(d.type==='weddingPhaseHold'&&ws.role==='game'){const target=ws.testSession?(loadTest.has(ws.testSession)?loadTest.room.state:null):state;const audibleElsewhere=[...wss.clients].some(c=>c!==ws&&c.role==='game'&&c.testSession===ws.testSession&&!c.mute&&c.readyState===1);if(!(ws.mute&&audibleElsewhere))WeddingCycle.holdPhase(target,d.key);return;}
      if (ws.role !== 'ctrl') return;
      if(d.type==='savePlaylist'){
        if(d.revision!==playlist.revision){sendOne(ws,playlistSnapshot());throw Error('Danh sách nhạc đã đổi, mở lại rồi thử lại.');}
        // Chỉ được đổi tên, đổi thứ tự hoặc xóa; bài mới phải đi qua đường thêm nhạc.
        const known=new Map(playlist.tracks.map(track=>[track.id,track]));
        const next=Playlist.validate({revision:playlist.revision+1,tracks:(d.tracks||[]).map(track=>{const old=known.get(track?.id);if(!old)throw Error('Bài nhạc không có trong danh sách.');return{...old,title:track.title};})});
        const removed=playlist.tracks.filter(track=>!next.tracks.some(item=>item.id===track.id));
        writeJSON(PLAYLIST_FILE,next);playlist=next;broadcast(playlistSnapshot());
        for(const track of removed)fs.promises.unlink(path.join(MUSIC_DIR,track.file)).catch(()=>{});
        return;
      }
      if(d.type==='saveWeddingConfig'){
        if(d.config?.revision!==weddingConfig.revision)throw Error('Cấu hình đã đổi, nạp lại trước khi lưu.');
        const next=WeddingCycle.validate(d.config);next.revision=weddingConfig.revision+1;writeJSON(CYCLE_FILE,next);weddingConfig=next;broadcast(weddingSnapshot());return;
      }

      if(d.type==='stopWeddingTest'){if(loadTest.room){Rollcall.cancel(loadTest.room.state.rollcall);const c=WeddingCycle.ensure(loadTest.room.state);weddingMiniRounds.delete(c);delete c.pausedAt;delete c.transition;c.phase=null;if(c.config)c.config={...c.config,enabled:false};loadTest.room.scenarioConfig={...(loadTest.room.scenarioConfig||{}),wedding:{...weddingConfig,enabled:false}};loadTest.frame(true);}return;}
      if(d.type==='testWeddingCycle'||d.type==='testMiniSequence'){if(!loadTest.allowed())throw Error('Ngắt TikTok trước khi thử riêng.');if(loadTest.room?.status==='running')throw Error('Dừng thử tải trước khi thử vòng cưới.');const room=d.type!=='testMiniSequence'&&loadTest.room?.status==='ready'?loadTest.room:loadTest.clear(ws);Rollcall.cancel(room.state.rollcall);room.scenarioConfig={...(room.scenarioConfig||{}),wedding:{...weddingConfig,enabled:true}};weddingMiniRounds.delete(WeddingCycle.ensure(room.state));delete room.state.ceremony.pausedAt;delete room.state.ceremony.transition;room.state.ceremony.phase=null;room.singleWeddingScene=WeddingCycle.phases.includes(d.phase)?d.phase:null;if(d.type==='testMiniSequence'||d.phase==='mini'){
 room.scenarioConfig.wedding.enabled=false;
 weddingMiniRounds.set(room.state.ceremony,{index:1,standalone:true});
 Rollcall.start(room.state,Rollcall.forVariant(rollcallConfig,weddingMiniGames[0].variant));
}else{
 WeddingCycle.tick(room.state,room.scenarioConfig.wedding);
 if(WeddingCycle.phases.includes(d.phase)){const c=room.state.ceremony;c.phase=d.phase;c.startedAt=Date.now();c.endsAt=c.startedAt+weddingConfig.durations[d.phase]*1000;c.key=c.number+':'+d.phase+':'+c.startedAt;if(Number.isInteger(d.variant))c.variantOverride={phase:d.phase,index:d.variant};}}loadTest.frame(true);loadTest.report(true);if(d.type==='testMiniSequence')sendOne(ws,{type:'miniSequenceStarted',testSession:room.id});return;}
      if(d.type==='saveRollcall'){
        if(d.config?.revision!==rollcallConfig.revision)throw Error('Cấu hình đã đổi. Bỏ thay đổi để nạp bản mới.');
        const next=Rollcall.validate(d.config);next.revision=rollcallConfig.revision+1;writeJSON(ROLLCALL_FILE,next);rollcallConfig=next;broadcast(rollcallSnapshot());broadcast(snapshot());return;
      }
      if(d.type==='startRollcall'){
        if(state.ceremony?.transition||weddingMiniRounds.has(state.ceremony))throw Error('Vòng cưới đang chuyển cảnh.');
        flushEvents(true);Rollcall.start(state,Rollcall.forVariant(rollcallConfig,d.variant));dirty=true;broadcast(snapshot());return;
      }
      if(d.type==='testRollcall'){
        if(!loadTest.allowed())throw Error('Dừng kết nối TikTok trước khi thử nghiệm.');
        if(loadTest.room?.status==='running')throw Error('Dừng thử tải trước khi bắt đầu mini game.');
        if(d.testSession&&!loadTest.has(d.testSession))throw Error('Phiên thử đã hết hạn.');
        const room=loadTest.room?.status==='ready'?loadTest.room:loadTest.clear(ws);
        weddingMiniRounds.delete(room.state.ceremony);
        if(room.state.ceremony)delete room.state.ceremony.transition;
        Rollcall.cancel(room.state.rollcall);
        Rollcall.start(room.state,Rollcall.forVariant(rollcallConfig,d.variant));loadTest.frame(true);loadTest.report(true);return;
      }
      if(d.type==='finishRollcall'||d.type==='cancelRollcall'){
        const target=d.testSession?(loadTest.has(d.testSession)?loadTest.room.state:null):state;
        if(!target)throw Error('Phiên thử đã hết hạn.');
        const changed=d.type==='cancelRollcall'?Rollcall.cancel(target.rollcall):Rollcall.finish(target.rollcall);
        if(changed){if(d.testSession)loadTest.frame(true);else{dirty=true;broadcast(snapshot());}}return;
      }
      if(d.type==='saveHeartEvents'){
        if(d.config?.revision!==heartEvents.revision)throw Error('Mốc tim đã đổi ở cửa sổ khác. Bỏ thay đổi để nạp lại.');
        const next=HeartEvents.validate(d.config);next.revision=heartEvents.revision+1;writeJSON(HEART_FILE,next);heartEvents=next;HeartEvents.sync(state,next);dirty=true;
        if(loadTest.room)HeartEvents.sync(loadTest.room.state,next);broadcast(heartSnapshot());broadcast(snapshot());if(loadTest.room)loadTest.frame(true);return;
      }
      if(d.type==='testHeartScene'){
        const sorted=heartEvents.events.filter(e=>e.enabled).sort((a,b)=>a.likes-b.likes),ordinal=sorted.findIndex(e=>e.id===d.id);
        if(!heartEvents.enabled||ordinal<0)throw Error('Bật mốc tim trước khi thử.');
        const room=loadTest.clear(ws);room.state.likes=sorted[ordinal].likes;HeartEvents.sync(room.state,heartEvents);room.state.heart.played=ordinal;loadTest.frame(true);loadTest.report(true);return;
      }
      if(d.type==='diagnosticPing'){sendOne(ws,{type:'diagnosticPong',sentAt:d.sentAt,heapMB:Math.round(process.memoryUsage().heapUsed/1048576),speech:speechService.status});return;}
      if(d.type==='testStart'){loadTest.create(d.options,ws);return;}
      if(d.type==='testStop'){loadTest.stop();return;}
      if(d.type==='testClear'){loadTest.clear(ws);return;}
      if(d.type==='testEvent'){loadTest.inject(d.event,ws);return;}
      if(d.type==='saveGiftEvents'){
        if(d.config?.revision!==giftEvents.revision){sendOne(ws,{type:'error',message:'Sự kiện đã đổi ở cửa sổ khác. Tải lại trang trước khi lưu.'});return;}
        const next=GiftEvents.validate(d.config);next.revision=giftEvents.revision+1;writeJSON(GIFT_EVENTS_FILE,next);giftEvents=next;broadcast(giftEventsSnapshot());return;
      }
      if(d.type==='testGiftScene'){
        if(!loadTest.allowed())throw Error('Dừng kết nối TikTok trước khi thử nghiệm.');
        if(loadTest.room?.status==='running')throw Error('Dừng thử tải trước khi thử sự kiện.');
        const room=loadTest.room?.status==='ready'?loadTest.room:loadTest.clear(ws);
        Rollcall.cancel(room.state.rollcall);
        if(room.state.heart)room.state.heart.played=room.state.heart.earned;

        if(d.role==='cancel'){
          room.scenarioConfig={...(room.scenarioConfig||{}),wedding:{...weddingConfig,enabled:true}};
          const c=WeddingCycle.ensure(room.state);
          if(!c.phase)WeddingCycle.tick(room.state,room.scenarioConfig.wedding);
          c.ceremonyStartedAt=0;
          const gift=GiftEvents.selected(giftEvents,'cancel')[0];
          loadTest.inject({type:'gift',id:'event_test_cancel',name:'Khách 6',coins:gift.coins,unitCoins:gift.coins,giftName:gift.name},ws);
          return;
        }
        if(d.role!==undefined){
          const group=GiftEvents.roleGifts.find(item=>item.role===d.role);
          if(!group)throw Error('Không có vai để thử');
          const gift=GiftEvents.selected(giftEvents,group.role)[0];
          const prefix='event_test_'+group.role;
          const current=loadTest.room?.state.weddingRoles?.[group.role];
          const guest=current?.id===prefix+'_a'?'b':'a';
          loadTest.inject({type:'gift',id:prefix+'_'+guest,name:'Khách '+((group.role==='bride'?2:4)+(guest==='b'?1:0)),coins:gift.coins,unitCoins:gift.coins,giftName:gift.name},ws);
          return;
        }
        const event=giftEvents.events.find(e=>e.id===d.id);
        if(!event)throw Error('Không có sự kiện');
        const gift=GiftEvents.selected(giftEvents,'thanks')[0];
        loadTest.inject({type:'gift',id:'event_test',name:'Khách 1',coins:gift.coins,unitCoins:gift.coins,giftName:gift.name},ws);
        return;
      }
      if(d.type==='saveScripts'){
        if(d.revision!==scriptRevision){sendOne(ws,{...scriptsSnapshot(),type:'scriptsConflict'});return;}
        const rows=ScriptPolicy.validateScripts(d.rows),revision=scriptRevision+1;
        writeJSON(SCRIPT_FILE,{revision,rows});scriptRows=rows;scriptRevision=revision;
        broadcast(scriptsSnapshot());return;
      }
      if (d.type === 'sim') publishEvent(d.event);
      else if (d.type === 'cmd') command(d);
      else if (d.type === 'connect') setUser(d.user);
      else if (d.type === 'disconnect') setUser('');
    } catch (e) { sendOne(ws, { type: 'error', message: e.message }); }
  });
  ws.on('error', () => {}); ws.on('close', () => {loadTest.ownerClosed(ws);broadcast(clientsInfo());});
});
setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) ws.terminate(); else { ws.isAlive = false; ws.ping(); } } }, 30000).unref();
setInterval(persistSession, 1000).unref();
setInterval(()=>{if(publicState().waitingCount)broadcast(snapshot());},10000).unref();
setInterval(() => { if (Party.pruneUsers(state)) dirty = true; }, 60000).unref();
const WEDDING_SCENE_BREAK_SECONDS=10;
const weddingMiniRounds=new WeakMap();
const weddingMiniGames=[
 {variant:'rollcall',name:'Hai họ điểm danh'},
 {variant:'tug',name:'Kéo co hai họ'}
];
// Hết mini game và cảnh tiếp theo đã chạy thì mới cho khách đã tặng quà cướp vai lên đá.
function releaseSteals(session){
 const c=session.ceremony;
 if(Rollcall.live(session.rollcall)||c&&(weddingMiniRounds.has(c)||c.transition||c.pausedAt))return[];
 return releaseDeferredSteals(session,Date.now(),giftEvents);
}
function weddingTransition(c,text,seconds,now){
 c.transition={key:c.key+':'+now,text,seconds,deadline:now+15000};
}
function tickWeddingWithMiniGame(session,config,screens){
 const now=Date.now(),c=session.ceremony,e=session.rollcall;
 let changed=Rollcall.tick(e,now);
 // Lễ đang bị hủy: bỏ các trò và phần nghỉ còn lại, chờ màn hình diễn xong rồi sang lễ mới.
 if(c?.cancelling){weddingMiniRounds.delete(c);delete c.transition;return WeddingCycle.tick(session,config,now,screens)||changed;}
 // A missing or muted game screen must not leave the ceremony stuck.
 if(e?.phase==='preparing'){
  if(!e.selectionEndsAt&&now>=e.createdAt+(screens?15000:0))changed=Rollcall.ready(e,e.id,now)||changed;
  else if(e.selectionEndsAt&&now>=e.selectionEndsAt+(screens?10000:0))changed=Rollcall.kickoff(e,e.id,now)||changed;
 }
 const standalone=c&&weddingMiniRounds.get(c)?.standalone;
 if(!config.enabled&&c&&!standalone){
  weddingMiniRounds.delete(c);
  delete c.transition;
  delete c.pausedAt;
 }
 if(Rollcall.live(e))return WeddingCycle.tick(session,config,now,screens,true)||changed;
 const round=c&&weddingMiniRounds.get(c);
 let advanced=false;
 if(c?.transition){
  const gap=c.transition;
  if(gap.spoken||!screens||now>=gap.deadline)gap.endsAt??=now+gap.seconds*1000;
  if(gap.endsAt==null||now<gap.endsAt)return changed;
  delete c.transition;
  if(round){
   const next=weddingMiniGames[round.index++];
   Rollcall.start(session,Rollcall.forVariant(rollcallConfig,next.variant),now);
   return true;
  }
  advanced=true;
 }
 if(round){
  const next=weddingMiniGames[round.index];
  if(next){
   weddingTransition(c,WeddingCycle.extraLine(c,config,'miniNext').replaceAll('{tieptheo}',next.name),config.miniBreakSeconds,now);
   return true;
  }
  weddingMiniRounds.delete(c);
  if(round.standalone)return true;
  weddingTransition(c,WeddingCycle.extraLine(c,config,'miniDone'),WEDDING_SCENE_BREAK_SECONDS,now);
  return true;
 }
 if(config.enabled&&c?.phase&&!c.pausedAt&&!c.takeoverAt&&!advanced&&WeddingCycle.phaseReady(c,now,screens)){
  const next=WeddingCycle.phases[WeddingCycle.phases.indexOf(c.phase)+1]||'welcome';
  const title=(c.phase==='show'?weddingMiniGames[0].name:WeddingCycle.names[next]).replace(' · ',' và ');
  weddingTransition(c,WeddingCycle.extraLine(c,config,'sceneNext').replaceAll('{tieptheo}',title),WEDDING_SCENE_BREAK_SECONDS,now);
  return true;
 }
 const previous=c?.phase;
 const phaseChanged=WeddingCycle.tick(session,config,now,screens);
 if(phaseChanged&&previous==='show'&&session.ceremony?.phase==='thanks'){
  Rollcall.start(session,Rollcall.forVariant(rollcallConfig,weddingMiniGames[0].variant),now);
  weddingMiniRounds.set(session.ceremony,{index:1});
  WeddingCycle.tick(session,config,now,screens,true);
 }
 return phaseChanged||changed||advanced;
}
setInterval(()=>{
 const screens=[...wss.clients].some(w=>w.role==='game'&&!w.testSession&&w.readyState===1);
 const changed=tickWeddingWithMiniGame(state,weddingConfig,screens);
 for(const event of releaseSteals(state)){eventBatch.push(event);dirty=true;}
 if(Party.tick(state)||changed){dirty=true;broadcast(snapshot());}
 if(loadTest.room){
  const room=loadTest.room;
  const testScreens=[...wss.clients].some(w=>w.testSession===room.id&&w.readyState===1);
  const config=room.scenarioConfig?.wedding||weddingConfig;
  const scene=room.state.ceremony;
  const now=Date.now();
  if(config.enabled&&room.singleWeddingScene===scene?.phase&&scene?.phase&&
     !scene.takeoverAt&&!scene.pausedAt&&!Rollcall.live(room.state.rollcall)&&
     WeddingCycle.phaseReady(scene,now,testScreens)){
   room.singleWeddingScene=null;
   config.enabled=false;
  }
  const roomChanged=tickWeddingWithMiniGame(room.state,config,testScreens),released=releaseSteals(room.state);
  room.pending.push(...released);
  if(roomChanged||released.length)loadTest.frame(true);
 }
},200).unref();

// Exactly one retry timer and one connector per generation.
function stopTikTok() { tt.token++; clearTimeout(tt.retry); tt.retry = null; const conn = tt.conn; tt.conn = null; tt.live = false; if (conn) { conn.removeAllListeners(); conn.on('error', () => {}); try { conn.disconnect(); } catch {} } }
function scheduleRetry(token, message) {
  if (token !== tt.token || tt.retry) return;
  tt.live = false; tt.state = 'waiting'; tt.error = String(message || 'Mất kết nối').slice(0, 180); broadcast(status());
  const conn = tt.conn; tt.conn = null; if (conn) { conn.removeAllListeners(); conn.on('error', () => {}); try { conn.disconnect(); } catch {} }
  tt.retry = setTimeout(() => { tt.retry = null; if (token === tt.token) connectTikTok(tt.user, token); }, 10000);
}
async function connectTikTok(user, token) {
  let timeout;
  try {
    const { TikTokLiveConnection, WebcastEvent } = await import('tiktok-live-connector');
    if (token !== tt.token) return;
    const conn = new TikTokLiveConnection(user, {}); tt.conn = conn;
    const active = () => token === tt.token && tt.conn === conn;
    const normalizeGift = createGiftNormalizer();
    let statusAt=0;
    const receive=(type,data)=>{
      if(!active())return;
      const event=type==='gift'?normalizeGift(data):normalizeInteraction(type,data);
      if(!event)return;publishEvent(event);tt.received++;tt.lastEventAt=Date.now();tt.counts[type]=(tt.counts[type]||0)+1;
      if(Date.now()-statusAt>1000){statusAt=Date.now();broadcast(status());}
    };
    conn.on('error', e => { if (active()) { tt.error = String(e.info || e.message || 'TikTok connection error'); broadcast(status()); } });
    for(const [event,type] of [[WebcastEvent.MEMBER,'join'],[WebcastEvent.CHAT,'chat'],[WebcastEvent.SHARE,'share'],[WebcastEvent.LIKE,'like'],[WebcastEvent.GIFT,'gift']])conn.on(event,data=>receive(type,data));
    conn.on('disconnected', () => { if (active()) scheduleRetry(token, 'Mất kết nối TikTok'); });
    conn.on('streamEnd', () => { if (active()) scheduleRetry(token, 'Phiên live đã kết thúc'); });
    tt.state = 'connecting'; broadcast(status());
    await Promise.race([conn.connect(), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Quá 20 giây chưa nối được TikTok')), 20000); })]);
    if (!active()) { try { conn.disconnect(); } catch {} return; }
    tt.live = true; tt.state = 'live'; tt.error = ''; broadcast(status());
  } catch (e) { scheduleRetry(token, e.message); } finally { clearTimeout(timeout); }
}
function setUser(raw) {
  const user = String(raw || '').trim().replace(/^https?:\/\/(www\.)?tiktok\.com\/@/, '').replace(/^@/, '').replace(/\/.*$/, '');
  if (user && !/^[\w.]{1,64}$/.test(user)) return;
  if (user === tt.user && ['live', 'connecting'].includes(tt.state)) return;
  if(user)loadTest.stop('Đã dừng để kết nối TikTok');
  stopTikTok(); tt.user = user; tt.error = '';tt.received=0;tt.lastEventAt=0;tt.counts={}; persistSettings();
  if (user) connectTikTok(user, tt.token); else { tt.state = 'idle'; broadcast(status()); }
}
function shutdown() { loadTest.close();persistSessionSync(); stopTikTok(); speechService.close(); wss.close(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 1000).unref(); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
server.on('error', e => {
  console.error(e.code==='EADDRINUSE'?`Cong ${PORT} da co server dang chay. Mo http://127.0.0.1:${PORT}/control`:'Không khởi động được server: '+e.message);
  stopTikTok();speechService.close();setTimeout(()=>process.exit(1),100);
});
server.listen(PORT, '127.0.0.1', () => {
  speechService.inventory().then(voices=>{for(const role of ['mc','bride','groom'])if(!voices.some(v=>v.id===ui['voice_'+role]))ui['voice_'+role]=role==='mc'?'Trúc Ly':role==='bride'?'Ngọc Huyền':'Hải Đăng';persistSettings();}).catch(error=>console.error('VieNeu cục bộ:',error.message));
  console.log(`Game: http://localhost:${server.address().port} | Điều khiển: http://localhost:${server.address().port}/control`);
  const first = process.env.TIKTOK_USER ?? settings.user ?? ''; if (first) setUser(first);
});
