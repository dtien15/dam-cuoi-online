'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {BackgroundMusic}=require('../game/music');
function setup(){
 let clock=0,id=0;const timers=new Map();const states=[];let blocked=0;
 class FakeAudio{constructor(){this.paused=true;this.currentTime=0;this.volume=0;this.playCalls=0;}play(){this.playCalls++;this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
 const bed=new BackgroundMusic({src:'music.mp3',AudioClass:FakeAudio,onState:s=>states.push(s),onBlocked:()=>blocked++,now:()=>clock,schedule:(fn,ms)=>{const key=++id;timers.set(key,{at:clock+ms,fn});return key;},cancel:key=>timers.delete(key)});
 const advance=ms=>{const until=clock+ms;while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>until)break;clock=next[1].at;timers.delete(next[0]);next[1].fn();}clock=until;};
 return {bed,advance,states,blocked:()=>blocked};
}
test('background music loops, fades in and preserves playback position when toggled',async()=>{
 const {bed,advance}=setup();bed.configure({connected:true});await bed.start();advance(1000);assert.equal(bed.audio.loop,true);assert.ok(Math.abs(bed.audio.volume-.22)<.0001);
 bed.audio.currentTime=42;bed.configure({enabled:false});assert.equal(bed.audio.paused,true);assert.equal(bed.audio.volume,0);bed.configure({enabled:true});await bed.start();advance(1000);assert.equal(bed.audio.currentTime,42);assert.equal(bed.audio.paused,false);bed.destroy();
});
test('music drops to 25 percent during MC speech and smoothly returns after speech',async()=>{
 const {bed,advance}=setup();bed.configure({connected:true,volume:.4});await bed.start();advance(1000);bed.duck(true);advance(250);assert.ok(Math.abs(bed.audio.volume-.1)<.0001);
 bed.configure({volume:.2});advance(400);assert.ok(Math.abs(bed.audio.volume-.05)<.0001);bed.duck(false);advance(1200);assert.ok(Math.abs(bed.audio.volume-.2)<.0001);bed.destroy();
});
test('preview mute, disconnect and volume zero always silence music',async()=>{
 const {bed,advance}=setup();bed.configure({connected:true,muted:true});await bed.start();assert.equal(bed.audio.playCalls,0);
 bed.configure({muted:false});await bed.start();advance(1000);bed.configure({volume:0});assert.equal(bed.audio.paused,true);assert.equal(bed.audio.volume,0);
 bed.configure({volume:.22});await bed.start();bed.configure({connected:false});advance(2000);assert.equal(bed.audio.volume,0);assert.equal(bed.audio.paused,true);bed.destroy();
});
test('blocked autoplay requests one unlock and can be retried after a user gesture',async()=>{
 const {bed,blocked,advance}=setup();let fail=true;bed.audio.play=()=>{if(fail)return Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));bed.audio.paused=false;return Promise.resolve();};
 bed.configure({connected:true});await bed.start();assert.equal(blocked(),1);fail=false;assert.equal(await bed.start(),true);advance(1000);assert.ok(bed.audio.volume>0);bed.destroy();
});
test('the playlist plays in order, returns to the first track and accepts more tracks',async()=>{
 const {bed,advance}=setup();bed.configure({connected:true});
 bed.setPlaylist(['1.mp3','2.mp3','3.mp3','4.mp3']);await bed.pending;assert.equal(bed.audio.loop,false);
 const heard=[bed.audio.src];
 for(let i=0;i<4;i++){bed.audio.paused=true;bed.audio.onended();await bed.pending;heard.push(bed.audio.src);}
 assert.deepEqual(heard,['1.mp3','2.mp3','3.mp3','4.mp3','1.mp3']);
 bed.setPlaylist(['1.mp3','2.mp3','3.mp3','4.mp3','5.mp3','6.mp3']);
 const more=[];for(let i=0;i<5;i++){bed.audio.paused=true;bed.audio.onended();await bed.pending;more.push(bed.audio.src);}
 assert.deepEqual(more,['2.mp3','3.mp3','4.mp3','5.mp3','6.mp3']);bed.audio.onended();await bed.pending;assert.equal(bed.audio.src,'1.mp3');
 advance(1000);bed.destroy();
});
test('changing the list keeps the current song, a removed song moves on, and one song loops by itself',async()=>{
 const {bed}=setup();bed.configure({connected:true});bed.setPlaylist(['a','b','c']);await bed.pending;bed.audio.onended();await bed.pending;assert.equal(bed.audio.src,'b');
 bed.audio.currentTime=30;bed.setPlaylist(['c','b']);assert.equal(bed.audio.src,'b');assert.equal(bed.audio.currentTime,30);assert.equal(bed.index,1);
 bed.setPlaylist(['c','d']);await bed.pending;assert.equal(bed.audio.src,'d');
 bed.setPlaylist(['d']);assert.equal(bed.audio.loop,true);
 bed.setPlaylist([]);assert.equal(bed.allowed,false);assert.equal(bed.audio.paused,true);bed.destroy();
});
test('mini game music takes over and the song resumes where it stopped',async()=>{
 const {bed}=setup();bed.configure({connected:true});bed.setPlaylist(['a','b']);await bed.pending;bed.audio.onended();await bed.pending;
 bed.audio.currentTime=42;bed.setOverride('party');await bed.pending;assert.equal(bed.audio.src,'party');assert.equal(bed.audio.loop,true);
 bed.audio.onended();assert.equal(bed.audio.src,'party','hết nhạc mini game không nhảy bài');
 bed.setPlaylist(['a','b','c']);
 bed.setOverride(null);await bed.pending;assert.equal(bed.audio.src,'b');assert.equal(bed.audio.loop,false);bed.audio.onloadedmetadata();assert.equal(bed.audio.currentTime,42);bed.destroy();
});
test('a broken track is skipped, but a fully broken list does not spin forever',async()=>{
 const {bed}=setup();bed.audio.play=()=>Promise.reject(Object.assign(new Error('bad'),{name:'NotSupportedError'}));bed.configure({connected:true});bed.setPlaylist(['a','b','c']);await bed.pending;
 bed.audio.onerror();await bed.pending;assert.equal(bed.audio.src,'b');bed.audio.onerror();await bed.pending;assert.equal(bed.audio.src,'c');bed.audio.onerror();assert.equal(bed.audio.src,'c','hỏng hết thì dừng');bed.destroy();
});
test('default playlist is the four supplied songs, old piano is unused, and bad entries are refused',()=>{
 const P=require('../game/playlist'),base=path.join(__dirname,'..');
 const list=P.defaults();assert.equal(list.tracks.length,4);
 for(const url of P.urls(list))assert.ok(fs.statSync(path.join(base,url.slice(1))).size>1000000,url);
 assert.doesNotMatch(fs.readFileSync(path.join(base,'game/game.js'),'utf8'),/playful-piano/);
 for(const bad of [{tracks:[{id:'a',title:'',file:'a.mp3'}]},{tracks:[{id:'a',title:'x',file:'../a.mp3'}]},{tracks:[{id:'a',title:'x',file:'a.exe'}]},{tracks:[{id:'a',title:'x',file:'a.mp3'},{id:'a',title:'y',file:'b.mp3'}]},{}])assert.throws(()=>P.validate(bad));
 assert.equal(P.titleFrom('leberch-wedding_piano.mp3'),'leberch wedding piano');
 assert.equal(P.looksLikeMp3(Buffer.alloc(2000)),false);assert.equal(P.looksLikeMp3(Buffer.concat([Buffer.from([0xff,0xfb]),Buffer.alloc(2000)])),true);
});
test('songs can be added, renamed, moved and deleted through the server, only from this machine',{timeout:20000},async t=>{
 const os=require('node:os'),{spawn}=require('node:child_process'),{once}=require('node:events'),WS=require('ws');
 const root=path.join(__dirname,'..'),data=fs.mkdtempSync(path.join(os.tmpdir(),'playlist-')),music=fs.mkdtempSync(path.join(os.tmpdir(),'playlist-files-'));
 const proc=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'0',GAME_DATA_DIR:data,GAME_PLAYLIST_DIR:music,GAME_NO_VOICE:'1',TIKTOK_USER:''},windowsHide:true,stdio:['ignore','pipe','pipe']});
 const sockets=[];t.after(()=>{sockets.forEach(w=>w.terminate());proc.kill();});
 const port=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('server timeout')),8000);proc.stdout.on('data',b=>{text+=b;const m=text.match(/localhost:(\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
 const w=new WS('ws://127.0.0.1:'+port),messages=[];sockets.push(w);w.on('message',r=>messages.push(JSON.parse(r)));await once(w,'open');w.send(JSON.stringify({type:'hello',role:'ctrl'}));
 const next=async check=>{for(let i=0;i<800;i++){const index=messages.findIndex(check);if(index>=0)return messages.splice(index,1)[0];await new Promise(r=>setTimeout(r,5));}throw Error('packet timeout');};
 const first=await next(d=>d.type==='playlist');assert.equal(first.tracks.length,4);
 const origin='http://127.0.0.1:'+port,mp3=Buffer.concat([Buffer.from([0xff,0xfb,0xd0,0x44]),Buffer.alloc(4000,1)]);
 const http=require('node:http');
 const post=(body,headers={Origin:origin},name='bài mới.mp3')=>new Promise((resolve,reject)=>{const q=http.request(origin+'/playlist/upload?name='+encodeURIComponent(name),{method:'POST',headers},r=>{r.resume();resolve({status:r.statusCode});});q.on('error',reject);q.end(body);});
 assert.equal((await post(mp3,{Origin:'http://evil.example'})).status,403);
 assert.equal((await post(Buffer.alloc(4000,65))).status,400);
 assert.equal((await post(mp3)).status,200);
 const added=await next(d=>d.type==='playlist'&&d.tracks.length===5);const song=added.tracks[4];assert.equal(song.title,'bài mới');
 assert.ok(fs.existsSync(path.join(music,song.file)));
 const served=await fetch(origin+'/assets/music/playlist/'+song.file);assert.equal(served.status,200);assert.equal(served.headers.get('content-type'),'audio/mpeg');assert.equal((await served.arrayBuffer()).byteLength,mp3.length);
 const part=await fetch(origin+'/assets/music/playlist/'+song.file,{headers:{Range:'bytes=10-19'}});assert.equal(part.status,206);assert.equal((await part.arrayBuffer()).byteLength,10);
 assert.equal((await fetch(origin+'/assets/music/playlist/piano-music.mp3')).status,200,'bài có sẵn vẫn nghe được');
 assert.equal((await fetch(origin+'/assets/music/playlist/..%2F..%2F..%2Fserver.js')).status,404);
 const reordered=[{...song,title:'Bài đổi tên'},...added.tracks.slice(0,4)];
 w.send(JSON.stringify({type:'savePlaylist',revision:added.revision,tracks:reordered}));
 const moved=await next(d=>d.type==='playlist'&&d.tracks[0].id===song.id);assert.equal(moved.tracks[0].title,'Bài đổi tên');
 w.send(JSON.stringify({type:'savePlaylist',revision:moved.revision,tracks:[{id:'hack',title:'x',file:'server.js'}]}));assert.match((await next(d=>d.type==='error')).message,/không có trong danh sách/);
 w.send(JSON.stringify({type:'savePlaylist',revision:moved.revision,tracks:moved.tracks.slice(1)}));
 await next(d=>d.type==='playlist'&&d.tracks.length===4);await new Promise(r=>setTimeout(r,100));assert.equal(fs.existsSync(path.join(music,song.file)),false);
 assert.equal(JSON.parse(fs.readFileSync(path.join(data,'playlist.json'))).tracks.length,4);
});

test('native browser timer functions retain their required global receiver',async()=>{
 class Audio{constructor(){this.paused=true;this.volume=0;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
 let scheduled=0,cancelled=0;
 const bed=new BackgroundMusic({src:'test',AudioClass:Audio,now:()=>0,schedule:function(){assert.equal(this,globalThis);scheduled++;return 7;},cancel:function(){assert.equal(this,globalThis);cancelled++;}});
 bed.configure({connected:true});await bed.start();bed.duck(true);bed.destroy();assert.ok(scheduled>0);assert.ok(cancelled>0);
});
