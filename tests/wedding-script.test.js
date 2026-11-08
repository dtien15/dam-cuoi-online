'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../game/wedding-cycle'),G=require('../game/gift-events'),P=require('../game/mc-policy'),R=require('../game/rules'),{applySessionEvent:apply}=require('../lib/session-events');
const config=C.defaults(),now=1000000;
test('every scene has several script versions and the vows are a real groom and bride exchange',()=>{
 for(const phase of C.phases)assert.ok(config.scripts[phase].length>=3,phase);
 for(const beats of config.scripts.ceremony){
  const whoSpeaks=beats.filter(b=>b.text).map(b=>b.who);
  const ask=beats.findIndex(b=>b.who==='groom'&&b.text.includes('?'));
  const answer=beats.findIndex(b=>b.who==='bride'&&/đồng ý/i.test(b.text));
  assert.ok(ask>=0&&answer>ask,'chú rể hỏi trước, cô dâu trả lời sau');
  assert.ok(whoSpeaks.includes('mc')&&whoSpeaks.includes('groom')&&whoSpeaks.includes('bride'));
  assert.ok(beats.some(b=>b.action==='rings'));assert.ok(beats.some(b=>['kiss','cheek'].includes(b.action)));
  assert.ok(C.estimateSeconds(beats)>=90,'nghi lễ đủ dài');
 }
 for(const beats of config.scripts.entrance)assert.ok(beats.some(b=>b.action==='walk'));
 for(const beats of config.scripts.show)assert.ok(beats.some(b=>b.action==='dance'));
});
test('each ceremony rotates to another version, and a chosen version can be tested',()=>{
 const seen=[1,2,3].map(n=>C.scriptFor(config,'ceremony',n));
 assert.equal(new Set(seen).size,3);assert.equal(C.scriptFor(config,'ceremony',4),seen[0]);
 assert.equal(C.scriptFor(config,'ceremony',1,2),seen[2]);
});
test('old saved settings move to the new scripts but keep their timing; custom scripts are validated',()=>{
 const old=C.validate({version:2,enabled:true,durations:{...config.durations,ceremony:33},lines:{ceremony:'Câu cũ'},extraLines:{sceneNext:'Câu cũ'}});
 assert.equal(old.version,3);assert.equal(old.durations.ceremony,33);assert.equal(old.scripts.ceremony.length,3);assert.notEqual(old.extraLines.sceneNext,'Câu cũ');
 const edited=C.validate({...config,scripts:{...config.scripts,cake:[[{who:'bride',text:' Em đây '},{action:'cake'}]]}});
 assert.deepEqual(edited.scripts.cake,[[{who:'bride',text:'Em đây'},{action:'cake'}]]);
 for(const bad of [[],[[]],[[{who:'dj',text:'a'}]],[[{who:'mc',text:'{hacked}'}]],[[{who:'mc',text:'  '}]],[[{action:'boom'}]]])assert.throws(()=>C.validate({...config,scripts:{...config.scripts,cake:bad}}));
});
test('a scene waits while the screen reads the script, and moves on if that screen goes away',()=>{
 const s=R.createState(now);C.tick(s,config,now);const c=s.ceremony,end=c.endsAt;
 assert.equal(C.holdPhase(s,'other-scene',end),false);
 C.holdPhase(s,c.key,end+14000);
 assert.equal(C.tick(s,config,end+20000,true),false,'màn hình còn đang đọc');
 assert.equal(c.phase,'welcome');
 assert.equal(C.tick(s,config,end+14000+15000,true),true,'màn hình đã mất, cảnh đi tiếp');
 assert.equal(s.ceremony.phase,'entrance');
});
test('gift thanks stay quiet during rituals, and top donors of this ceremony are remembered',()=>{
 const s=R.createState(now);C.tick(s,config,now);
 assert.equal(C.thanksMuted(s.ceremony,config),false,'đón khách vẫn cảm ơn');
 for(const phase of ['entrance','ceremony','cake','show','thanks']){s.ceremony.phase=phase;assert.equal(C.thanksMuted(s.ceremony,config),true,phase);}
 s.ceremony.transition={key:'x'};assert.equal(C.thanksMuted(s.ceremony,config),false,'nghỉ chuyển cảnh được cảm ơn');delete s.ceremony.transition;
 assert.equal(C.thanksMuted(s.ceremony,{...config,giftThanksPhases:['ceremony']}),true);s.ceremony.phase='ceremony';assert.equal(C.thanksMuted(s.ceremony,{...config,giftThanksPhases:['ceremony']}),false);
 for(const [id,coins]of [['a',5],['b',50],['c',20],['d',1],['a',1]])apply(s,{id,name:'Khách '+id,type:'gift',coins,giftName:'Ice Cream'},now+10);
 assert.deepEqual(C.view(s).donors.map(d=>[d.name,d.coins]),[['Khách b',50],['Khách c',20],['Khách a',6]]);
 assert.equal(C.view(s).config.scripts,undefined,'không gửi kịch bản theo mỗi lần cập nhật');
});
test('a stolen role is congratulated with varied lines, never with a gift thank-you',()=>{
 const seen=new Set();for(let i=0;i<5;i++)seen.add(G.roleLine(G.defaults(),'groom'));assert.equal(seen.size,5);
 const long={event:{activity:'takeover',line:'x',id:'r'},gift:{id:'a',name:'Lan',coins:5}};
 long.event.line='{ten} '+'cướp dâu '.repeat(20);
 assert.doesNotMatch(G.thanksBatch([long]).spoken,/Cảm ơn/);
 assert.throws(()=>G.validate({...G.defaults(),roleLines:{bride:'Thiếu tên khách'}}));
 const multi=G.validate({...G.defaults(),roleLines:{bride:'{ten} một\n{ten} hai'}});assert.equal(G.roleLine(multi,'bride').length>0,true);
});
test('MC lines do not repeat the same sentence back to back after the first pass',()=>{
 P.setScripts(['a','b','c','d'].map(id=>({id,event:'like',text:id,enabled:true})));
 const h=P.createHost(),order=[];
 for(let i=0;i<40;i++){h.observe({type:'like',count:30},{id:'u'+i,name:'K'+i},1000+i*40000);order.push(h.social(1000+i*40000).seq[0][1].split('ơi! ')[1]);}
 assert.deepEqual(order.slice(0,4),['a','b','c','d']);
 for(let i=1;i<order.length;i++)assert.notEqual(order[i],order[i-1]);
 P.setScripts(P.scriptDefaults());
});
test('default MC lines are plentiful, valid and within the row limit',()=>{
 const rows=P.validateScripts(P.scriptDefaults());assert.ok(rows.length>=120&&rows.length<=240);
 for(const event of ['wish','idle','welcome','share','like'])assert.ok(rows.filter(r=>r.event===event).length>=7,event);
});

test('MC names a role thief and top donors only when they exist, and every script line reads well without a guest name',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const say=async(ceremony)=>{
  const window={},spoken=[],classes={add(){},remove(){},toggle(){}},rig={el:{style:{},classList:classes,dataset:{}}};
  vm.runInNewContext(fs.readFileSync('game/wedding-cycle-view.js','utf8'),{window,Date,setTimeout,setInterval:()=>0,clearInterval,Promise,console,WeddingCycle:C});
  const view=window.WeddingCycleView;
  await new Promise(resolve=>{view.init({stage:{classList:classes,dataset:{}},rigs:{mc:rig,groom:rig,bride:rig},lock(){},roleName:r=>r==='groom'?'Minh':'Lan',spokenName:x=>x,config:()=>config,hold(){},quiet(){},fireworks:()=>()=>{},speak:async text=>{spoken.push(text);},done:()=>resolve()});view.sync({ceremony:{key:'k',number:1,phase:'thanks',endsAt:0,config:{},...ceremony}});});
  return spoken;
 };
 const none=await say({});
 assert.ok(!none.some(t=>/\{|Lễ hôm nay còn có màn|sổ vàng/.test(t)));
 const named=await say({stealers:['Thu Hà'],donors:[{name:'An'},{name:'Bình'}]});
 assert.ok(named.some(t=>t.includes('Thu Hà')));assert.ok(named.some(t=>t.includes('An và Bình')));
 for(const list of Object.values(config.scripts))for(const beats of list)for(const beat of beats)if(beat.text)assert.doesNotMatch(beat.text,/(chú rể|cô dâu) \{(re|dau)\}/i,'Vai chưa có người sẽ đọc thành chú rể Chú rể');
});
test('each ceremony tells one story across all scenes, and stealing is remembered by name',()=>{
 const story=[/xích|xe đạp/,/hợp đồng|điều khoản|bên A/,/bến xe|xe khách|yêu xa|vé xe|xa/];
 for(const phase of ['welcome','entrance','ceremony','cake','thanks'])story.forEach((word,index)=>assert.ok(config.scripts[phase][index].some(b=>word.test(b.text||'')),phase+' bản '+(index+1)));
 const s=R.createState(now);C.tick(s,config,now);
 apply(s,{id:'t',name:'Thu Hà',type:'gift',coins:5,giftName:'Finger Heart'},now+10);
 assert.deepEqual(C.view(s).stealers,['Thu Hà']);
 for(const beats of config.scripts.ceremony)assert.ok(beats.some(b=>/phản đối|cướp dâu/.test(b.text||'')),'có lời thách cướp dâu');
});

test('settings can lock one story, name stories, and old saved settings get the story names',()=>{
 assert.equal(config.stories.length,config.scripts.ceremony.length);
 const locked=C.validate({...config,fixedStory:1});
 assert.equal(C.scriptFor(locked,'ceremony',1),locked.scripts.ceremony[1]);assert.equal(C.scriptFor(locked,'thanks',7),locked.scripts.thanks[1]);
 assert.equal(C.scriptFor(locked,'ceremony',1,2),locked.scripts.ceremony[2],'chạy thử bản khác vẫn được');
 assert.equal(C.validate({...config,fixedStory:99}).fixedStory,null);
 assert.equal(C.scriptFor({...config,fixedStory:7},'ceremony',2),config.scripts.ceremony[1],'chuyện đã xóa thì quay về xoay vòng');
 assert.ok(C.averageSeconds(locked,'ceremony')>=90);
 assert.throws(()=>C.validate({...config,stories:['']}));
 assert.deepEqual(C.validate({version:2,enabled:true}).stories,config.stories);
});

test('a role gift during a mini game scores now and takes the role only after the game ends',()=>{
 const Rollcall=require('../game/rollcall'),{releaseDeferredSteals}=require('../lib/session-events');
 const s=R.createState(now);C.tick(s,config,now);s.weddingRoles={groom:{id:'old',name:'Cũ'}};
 apply(s,{id:'a',name:'An',type:'chat',text:'nhà trai'},now+1);
 const e=Rollcall.start(s,Rollcall.defaults(),now+2);Rollcall.ready(e,e.id,now+3);Rollcall.kickoff(e,e.id,e.selectionEndsAt);
 const at=e.startedAt+100;
 const gift=apply(s,{id:'a',name:'An',type:'gift',coins:5,unitCoins:5,giftName:'Finger Heart'},at);
 assert.equal(gift.rollcallId,e.id,'quà vẫn tính cho mini game');assert.equal(gift.weddingRole,undefined,'chưa đá ngay');
 assert.equal(s.weddingRoles.groom.id,'old');assert.ok(e.scores.groom>0);
 assert.equal(s.ceremony.deferredSteals.groom.id,'a');
 const total=s.total;
 Rollcall.cancel(e);
 const released=releaseDeferredSteals(s,at+1000);
 assert.equal(released.length,1);assert.equal(released[0].weddingRole.role,'groom');assert.equal(released[0].coins,0);
 assert.equal(s.weddingRoles.groom.id,'a');assert.equal(s.total,total,'không cộng điểm lần hai');
 assert.deepEqual(C.view(s).stealers,['An']);
 assert.deepEqual(releaseDeferredSteals(s,at+2000),[],'chỉ đá một lần');
});
test('only the newest steal per role waits, and a guest who left or already holds a role is skipped',()=>{
 const Rollcall=require('../game/rollcall'),{releaseDeferredSteals}=require('../lib/session-events');
 const s=R.createState(now);C.tick(s,config,now);
 for(const id of ['a','b','c','d'])apply(s,{id,name:id,type:'chat',text:'nhà gái'},now+1);
 const e=Rollcall.start(s,Rollcall.defaults(),now+2);Rollcall.ready(e,e.id,now+3);Rollcall.kickoff(e,e.id,now+4);const at=e.startedAt+100;
 apply(s,{id:'a',name:'a',type:'gift',coins:5,unitCoins:5,giftName:'Finger Heart'},at);
 apply(s,{id:'b',name:'b',type:'gift',coins:5,unitCoins:5,giftName:'Finger Heart'},at+1);
 apply(s,{id:'b',name:'b',type:'gift',coins:5,unitCoins:5,giftName:'Peach'},at+2);
 Rollcall.cancel(e);
 const released=releaseDeferredSteals(s,at+1000);
 assert.equal(released.length,1,'một khách không giữ được hai vai');assert.equal(s.weddingRoles.groom.id,'b');assert.equal(s.weddingRoles.bride,undefined);
 s.ceremony.deferredSteals={bride:{id:'gone',name:'gone',giftName:'Peach',unitCoins:5}};
 assert.deepEqual(releaseDeferredSteals(s,at+2000),[]);
});

test('the Okay gift cancels the wedding at once and the next ceremony starts after the scene',()=>{
 const G2=require('../game/gift-events');
 assert.equal(G2.selected(undefined,'cancel')[0].name,'Okay');assert.equal(G2.selected(undefined,'cancel')[0].coins,5);
 const s=R.createState(now);C.tick(s,config,now);const first=s.ceremony.number,key=s.ceremony.key;
 s.weddingRoles={groom:{id:'g',name:'G'},bride:{id:'b',name:'B'}};s.ceremony.served=['g','b'];
 const early=apply(s,{id:'x',name:'X',type:'gift',coins:5,unitCoins:5,giftName:'Okay'},now+5000);
 assert.equal(early.weddingCancel,undefined,'15 giây đầu chưa hủy');assert.equal(s.ceremony.cancelling,undefined);
 const at=now+20000,total=s.total;
 const gift=apply(s,{id:'x',name:'X',type:'gift',coins:5,unitCoins:5,giftName:'Okay'},at);
 assert.equal(gift.weddingCancel.key,key);assert.equal(s.total,total+50000,'quà vẫn cộng điểm');
 assert.equal(apply(s,{id:'y',name:'Y',type:'gift',coins:5,unitCoins:5,giftName:'Okay'},at+100).weddingCancel,undefined,'đang hủy thì không hủy chồng');
 assert.equal(C.tick(s,config,at+1000,true),false,'chờ màn hình diễn');
 assert.equal(C.finishCancel(s,'sai-key'),false);assert.equal(C.finishCancel(s,key),true);
 assert.equal(C.tick(s,config,at+1100,true),true);
 assert.equal(s.ceremony.number,first+1);assert.equal(s.ceremony.phase,'welcome');assert.equal(s.ceremony.cancelling,undefined);assert.deepEqual(s.weddingRoles,{});
 assert.equal(s.users.x.total>0,true);
});
test('a cancelled ceremony moves on without a screen, and a steal during the cancel waits for the next ceremony',()=>{
 const {releaseDeferredSteals}=require('../lib/session-events');
 const s=R.createState(now);C.tick(s,config,now);const at=now+20000;
 apply(s,{id:'x',name:'X',type:'gift',coins:5,unitCoins:5,giftName:'Okay'},at);
 const steal=apply(s,{id:'z',name:'Z',type:'gift',coins:5,unitCoins:5,giftName:'Finger Heart'},at+100);
 assert.equal(steal.weddingRole,undefined);assert.deepEqual(releaseDeferredSteals(s,at+200),[]);
 assert.equal(C.tick(s,config,at+11000,true),false);assert.equal(C.tick(s,config,at+12001,true),true,'màn hình mất vẫn đi tiếp');
 const released=releaseDeferredSteals(s,at+13000);assert.equal(released.length,1);assert.equal(s.weddingRoles.groom.id,'z');
});
test('Okay during a mini game scores now and cancels only when the game ends',()=>{
 const Rollcall=require('../game/rollcall'),{releaseDeferredSteals}=require('../lib/session-events');
 const s=R.createState(now);C.tick(s,config,now);
 apply(s,{id:'x',name:'X',type:'chat',text:'nhà trai'},now+1);
 const e=Rollcall.start(s,Rollcall.defaults(),now+2);Rollcall.ready(e,e.id,now+3);Rollcall.kickoff(e,e.id,e.selectionEndsAt);
 const gift=apply(s,{id:'x',name:'X',type:'gift',coins:5,unitCoins:5,giftName:'Okay'},e.startedAt+100);
 assert.equal(gift.rollcallId,e.id);assert.equal(gift.weddingCancel,undefined);assert.equal(s.ceremony.cancelling,undefined);
 Rollcall.cancel(e);
 const released=releaseDeferredSteals(s,e.startedAt+2000);assert.equal(released.length,1);assert.ok(released[0].weddingCancel);assert.equal(released[0].coins,0);assert.ok(s.ceremony.cancelling);
});

test('the spoken lines stay voice only, with no subtitle box on the stage',()=>{
 const fs=require('node:fs'),css=fs.readFileSync('game/style.css','utf8');
 assert.match(css,/#bubble,#bubble\.show,\.has-party-scene #bubble\{display:none!important\}/);
 for(const file of ['game/style.css','game/game.js','game/wedding-control.js','game/wedding-cycle.js'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/dialogue-?captions/i,file);
 assert.equal(config.dialogueCaptions,undefined);
});
