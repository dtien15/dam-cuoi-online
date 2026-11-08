'use strict';
(function(root){
 const phases=['welcome','entrance','ceremony','cake','show','thanks'];
 const names={welcome:'Đón khách',entrance:'Tiến vào lễ đường',ceremony:'Trao nhẫn · Thành hôn',cake:'Cắt bánh · Nâng ly',show:'Văn nghệ',thanks:'Cảm ơn hai họ'};
 const Library=typeof module!=='undefined'?require('./wedding-scripts'):root.WeddingScripts;
 const speakers={mc:'MC',groom:'Chú rể',bride:'Cô dâu'};
 // seconds chỉ dùng để ước tính độ dài trong màn cài đặt; cảnh luôn chờ lời thoại đọc xong.
 const actions={walk:{name:'Đi vào lễ đường',seconds:0},rings:{name:'Trao nhẫn',seconds:6},kiss:{name:'Hôn cô dâu',seconds:6},cheek:{name:'Thơm má',seconds:6},cake:{name:'Cắt bánh',seconds:6},toast:{name:'Nâng ly, tiếng zô',seconds:6},fireworks:{name:'Đôi cưới và pháo hoa',seconds:9},dance:{name:'Đội văn nghệ nhảy',seconds:40},applause:{name:'Tiếng vỗ tay',seconds:3},sparkle:{name:'Bắn pháo hoa',seconds:1},wait:{name:'Chờ khách bình luận 4 giây',seconds:4},pause:{name:'Nghỉ 1,5 giây',seconds:2}};
 const defaults=()=>({version:3,revision:0,enabled:true,miniBreakSeconds:15,extraLines:Library.extraLines(),durations:{welcome:20,entrance:20,ceremony:60,cake:60,show:30,thanks:60},scripts:Library.scripts(),stories:Library.stories(),fixedStory:null,giftThanksPhases:['welcome'],likesStep:100,giftsStep:50,volume:.6,effects:true});
 const joinGifts=[{role:'bride',gift:'GG',label:'GG',icon:'/assets/tiktok-gift-gg.webp'},{role:'groom',gift:'TikTok',label:'TikTok',icon:'/assets/tiktok-gift-tiktok.webp'}];
 const fold=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').trim();
 function shouldBlurAisle(x,y,coupleYs){return x>410&&x<670&&coupleYs.some(cy=>Math.abs(cy-y)<230);}
 function validate(raw){const d=defaults();if(!raw||typeof raw.enabled!=='boolean')throw Error('Kiểm tra cấu hình vòng cưới');for(const key of phases){const value=Number(raw.durations?.[key]??d.durations[key]),n=key==='entrance'&&!(raw.version>=2)?Math.max(10,value):value;if(!Number.isInteger(n)||n<(['show','entrance'].includes(key)?10:6)||n>300)throw Error('Thời lượng cảnh từ 6–300 giây; văn nghệ ít nhất 10 giây');d.durations[key]=n;if(raw.version>=3&&raw.scripts?.[key]!==undefined)d.scripts[key]=validateVariants(raw.scripts[key],names[key]);}for(const k of ['likesStep','giftsStep']){const n=Number(raw[k]??d[k]);if(!Number.isSafeInteger(n)||n<10||n>1000000)throw Error('Mốc hiệu ứng từ 10 đến 1.000.000');d[k]=n;}d.volume=Math.max(0,Math.min(1,Number(raw.volume??.6)));d.effects=raw.effects!==false;d.miniBreakSeconds=Number(raw.miniBreakSeconds??d.miniBreakSeconds);if(!Number.isInteger(d.miniBreakSeconds)||d.miniBreakSeconds<0||d.miniBreakSeconds>300)throw Error('Nghỉ giữa hai mini game từ 0 đến 300 giây');if(raw.version>=3){for(const key of Object.keys(d.extraLines)){
  const line=raw.extraLines?.[key]??d.extraLines[key];
  if(typeof line!=='string'||!line.trim()||line.length>2000)throw Error('Lời dẫn MC cần từ 1 đến 2000 ký tự');
  d.extraLines[key]=line.trim();
 }
 if(raw.stories!==undefined){if(!Array.isArray(raw.stories)||raw.stories.length>8||raw.stories.some(name=>typeof name!=='string'||!name.trim()||name.length>40))throw Error('Tên câu chuyện từ 1 đến 40 ký tự');d.stories=raw.stories.map(name=>name.trim());}
 d.fixedStory=Number.isInteger(raw.fixedStory)&&raw.fixedStory>=0&&raw.fixedStory<8?raw.fixedStory:null;
 if(raw.giftThanksPhases!==undefined){if(!Array.isArray(raw.giftThanksPhases))throw Error('Danh sách cảnh cảm ơn quà không hợp lệ');d.giftThanksPhases=phases.filter(key=>raw.giftThanksPhases.includes(key));}
 }d.enabled=raw.enabled;d.revision=Number(raw.revision)||0;return d;}
 function validateVariants(list,title){
  if(!Array.isArray(list)||!list.length||list.length>8)throw Error(title+': cần từ 1 đến 8 bản kịch bản');
  return list.map((beats,index)=>{
   const where=title+' · Bản '+(index+1);
   if(!Array.isArray(beats)||!beats.length||beats.length>40)throw Error(where+': cần từ 1 đến 40 dòng');
   return beats.map(beat=>{
    if(beat?.action!==undefined){if(!Object.hasOwn(actions,beat.action))throw Error(where+': hiệu ứng không hợp lệ');return{action:beat.action};}
    const text=typeof beat?.text==='string'?beat.text.trim():'';
    if(!Object.hasOwn(speakers,beat?.who)||!text||text.length>300)throw Error(where+': mỗi câu thoại từ 1 đến 300 ký tự');
    if(/\{(?!re\}|dau\}|le\}|topqua\}|cuop\})/.test(text))throw Error(where+': chỉ dùng {re}, {dau}, {le}, {topqua}, {cuop}');
    return{who:beat.who,text};
   });
  });
 }
 function scriptFor(config,phase,number=1,override){
  const list=config?.scripts?.[phase]?.length?config.scripts[phase]:Library.scripts()[phase];
  const fixed=Number.isInteger(config?.fixedStory)&&list[config.fixedStory]?config.fixedStory:null;
  const index=Number.isInteger(override)&&list[override]?override:fixed??Math.max(0,number-1)%list.length;
  return list[index];
 }
 const beatSeconds=beat=>beat.action?actions[beat.action].seconds:Math.max(2,beat.text.length/13)+.6;
 const estimateSeconds=beats=>Math.round(beats.reduce((sum,beat)=>sum+beatSeconds(beat),0));
 function averageSeconds(config,phase){const all=config.scripts[phase],list=all[config.fixedStory]?[all[config.fixedStory]]:all;return Math.max(config.durations[phase],Math.round(list.reduce((sum,beats)=>sum+estimateSeconds(beats),0)/list.length));}
 function extraLine(c,config,key){
  const list=String(config.extraLines?.[key]||'').split('\n').map(x=>x.trim()).filter(Boolean);if(!list.length)return'';
  const cursors=c.lineCursor??={},index=cursors[key]||0;cursors[key]=index+1;return list[index%list.length];
 }
 // Đang đọc kịch bản thì màn hình giữ cảnh; màn hình mất kết nối thì hết hạn sau vài giây và cảnh vẫn đi tiếp.
 function phaseReady(c,now,screens){
  if(now<c.endsAt)return false;if(!screens||c.ack)return true;
  const held=c.hold?.key===c.key?c.hold.until:0;
  return now>=Math.max(c.endsAt+15000,held);
 }
 function holdPhase(s,key,now=Date.now()){const c=s?.ceremony;if(!c||c.key!==key)return false;c.hold={key,until:Math.min(now+15000,c.startedAt+900000)};return true;}
 function topDonors(c,limit=3){return Object.values(c.donors||{}).sort((a,b)=>b.coins-a.coins).slice(0,limit);}
 function thanksMuted(c,config){return !!c?.phase&&!c.transition&&!(config?.giftThanksPhases??['welcome']).includes(c.phase);}
 // Hủy hôn: màn hình diễn cảnh rồi báo xong; màn hình mất kết nối thì vẫn sang lễ mới sau vài giây.
 // Vừa vào lễ mới thì chưa hủy được, để một chuỗi quà liên tiếp không xóa hết các lễ.
 const CANCEL_GRACE=15000;
 function cancelWedding(s,e,now=Date.now(),force=false){
  const c=ensure(s);if(!c.phase||c.cancelling||!force&&now-(c.ceremonyStartedAt||0)<CANCEL_GRACE)return false;
  c.cancelling={key:c.key,until:now+12000};delete c.transition;delete c.takeoverAt;delete c.remaining;delete c.pausedAt;
  e.weddingCancel={key:c.key};return true;
 }
 function finishCancel(s,key){const c=s?.ceremony;if(!c?.cancelling||c.cancelling.key!==key)return false;c.cancelling.done=true;return true;}
 function ensure(s){return s.ceremony??={number:0,phase:null,queues:{bride:[],groom:[]},served:[],completed:0,lastCelebration:0,likes:0,giftCoins:0,celebration:0};}
 function eligible(s,u,now){const c=ensure(s);return u&&(u.lastWedding===undefined||c.number-u.lastWedding>3)&&!c.served.includes(u.id);}
 function pick(s,role,used,now){const c=ensure(s),q=c.queues[role];while(q.length){const t=q.shift(),u=s.users[t.id];if(eligible(s,u,now)&&!used.has(u.id))return{...t,name:u.name,avatar:u.avatar||t.avatar||'',source:'queue'};}
  const gender=role==='bride'?'female':'male';const pool=Object.values(s.users).filter(u=>now-u.last<180000&&eligible(s,u,now)&&!used.has(u.id)&&(!u.gender||u.gender===gender)&&u.weddingActivity?.at>now-120000&&u.weddingDeclined!==c.number);
  pool.sort((a,b)=>Number(b.gender===gender)-Number(a.gender===gender)||(a.lastWedding??-1)-(b.lastWedding??-1)||(b.weddingActivity.score-a.weddingActivity.score)||a.joined-b.joined);
  const u=pool[0];return u?{id:u.id,name:u.name,avatar:u.avatar||'',source:'interaction'}:null;
 }
 function start(s,config,now){const c=ensure(s);c.number++;c.ceremonyStartedAt=now;delete c.cancelling;c.served=[];c.phase='welcome';c.startedAt=now;c.endsAt=now+config.durations.welcome*1000;c.ack=false;c.key=c.number+':welcome:'+now;c.likes=0;c.giftCoins=0;c.celebration=0;c.lastCelebration=0;c.donors={};c.stealers=[];delete c.hold;delete c.variantOverride;c.config=config;s.weddingRoles={};const used=new Set();for(const role of ['groom','bride']){const chosen=pick(s,role,used,now);if(chosen){s.weddingRoles[role]=chosen;used.add(chosen.id);c.served.push(chosen.id);}}
 }
 function tick(s,config,now=Date.now(),waitForScreen=false,paused=false){const c=ensure(s);if(!config.enabled){c.config=config;delete c.cancelling;if(c.phase){c.phase=null;s.weddingRoles={};return true;}return false;}
  if(c.cancelling){if(waitForScreen&&!c.cancelling.done&&now<c.cancelling.until)return false;for(const id of c.served){if(s.users[id])s.users[id].lastWedding=c.number;}start(s,config,now);return true;}
  if(c.takeoverAt&&now-c.takeoverAt<30000)return false;if(c.takeoverAt){resumeTakeover(s,now);}
  if(paused){if(!c.pausedAt)c.pausedAt=now;return false;}if(c.pausedAt){c.startedAt=now;c.endsAt=now+config.durations[c.phase||'entrance']*1000;c.key=c.number+':'+c.phase+':'+now;c.ack=false;delete c.pausedAt;return true;}
  if(!c.phase){start(s,config,now);return true;}if(!phaseReady(c,now,waitForScreen))return false;
  const index=phases.indexOf(c.phase);if(index===phases.length-1){for(const id of c.served){if(s.users[id])s.users[id].lastWedding=c.number;}c.completed++;start(s,config,now);}else{c.phase=phases[index+1];c.startedAt=now;c.endsAt=now+config.durations[c.phase]*1000;c.key=c.number+':'+c.phase+':'+now;c.ack=false;c.config=config;}return true;
 }
 function apply(s,e,now=Date.now(),registration){
  const c=ensure(s),u=s.users[e.id];if(!u)return;
  if(['chat','like','share'].includes(e.type)){const a=u.weddingActivity??={at:now,score:0,lastScore:0};a.at=now;if(now-a.lastScore>=5000){a.score=Math.min(20,a.score+(e.type==='share'?3:1));a.lastScore=now;}}
  if(e.type==='chat'&&/^(khong|bo qua|khong cuoi|khong lam (dau|re))$/.test(fold(e.text))){u.weddingDeclined=c.number;for(const role of ['bride','groom']){if(s.weddingRoles?.[role]?.id===u.id&&s.weddingRoles[role].source==='interaction'&&c.phase==='entrance'){delete s.weddingRoles[role];const replacement=pick(s,role,new Set(Object.values(s.weddingRoles).map(x=>x.id)),now);if(replacement){s.weddingRoles[role]=replacement;c.served.push(replacement.id);}}}return;}
  if(c.config?.enabled===false)return;
  if(e.type==='gift'){
   c.giftCoins+=e.coins||0;
   if(e.coins>0){const donor=(c.donors??={})[u.id]??={name:u.name,coins:0};donor.name=u.name;donor.coins+=e.coins;}
   if(e.weddingRole){const stealers=c.stealers??=[];if(!stealers.includes(u.name)){stealers.push(u.name);if(stealers.length>3)stealers.shift();}c.served.push(e.id);c.endsAt=Math.max(c.endsAt||0,now+12000);return;}
   const g=registration===undefined?joinGifts.find(g=>(e.unitCoins||e.coins)===1&&[fold(g.gift),fold(g.label)].includes(fold(e.giftName))):registration;
   if(g){e.ceremonyRegistration={role:g.role,accepted:false};if(Object.values(s.weddingRoles||{}).some(x=>x.id===u.id))return;
    if(!s.weddingRoles?.[g.role]){s.weddingRoles??={};s.weddingRoles[g.role]={id:u.id,name:u.name,avatar:u.avatar||'',source:'gift'};for(const role of ['bride','groom'])c.queues[role]=c.queues[role].filter(t=>t.id!==u.id);c.served.push(u.id);e.ceremonyRegistration={role:g.role,accepted:true,immediate:true};e.weddingRole={role:g.role,title:g.role==='bride'?'cô dâu':'chú rể',seat:u.seat,registration:true};return;}
    if(!eligible(s,u,now))return;
    const prior=[...c.queues.bride,...c.queues.groom].find(t=>t.id===u.id);for(const role of ['bride','groom'])c.queues[role]=c.queues[role].filter(t=>t.id!==u.id);
    c.queues[g.role].push({id:u.id,name:u.name,avatar:u.avatar||'',at:prior?.at||now});c.queues[g.role].sort((a,b)=>a.at-b.at);e.ceremonyRegistration.accepted=true;
   }
  }if(e.type==='like')c.likes+=e.count||1;
  const cfg=c.config||defaults();const pulses=Math.floor(c.likes/cfg.likesStep)+Math.floor(c.giftCoins/cfg.giftsStep);if(pulses>c.lastCelebration){c.lastCelebration=pulses;c.celebration++;}
 }
 function holdTakeover(s,now=Date.now()){const c=ensure(s);if(!c.phase||c.takeoverAt)return;c.takeoverAt=now;c.remaining=Math.max(1000,c.endsAt-now);}
 function resumeTakeover(s,now=Date.now()){const c=ensure(s);if(!c.takeoverAt)return;c.endsAt=now+c.remaining;c.startedAt+=now-c.takeoverAt;delete c.takeoverAt;delete c.remaining;}
 function view(s){if(!s.ceremony)return null;const c=s.ceremony;return{number:c.number,phase:c.phase,key:c.key,startedAt:c.startedAt,endsAt:c.endsAt,config:c.config&&{...c.config,scripts:undefined},variantOverride:c.variantOverride,donors:topDonors(c),stealers:c.stealers||[],likes:c.likes,giftCoins:c.giftCoins,celebration:c.celebration,queues:Object.fromEntries(['bride','groom'].map(k=>[k,c.queues[k].slice(0,5)])),waiting:Object.fromEntries(['bride','groom'].map(k=>[k,c.queues[k].length])),transition:c.transition,paused:!!c.pausedAt||!!c.transition};}
 const api={cancelWedding,finishCancel,CANCEL_GRACE,speakers,actions,scriptFor,estimateSeconds,averageSeconds,extraLine,phaseReady,holdPhase,topDonors,thanksMuted,defaults,validate,joinGifts,names,phases,ensure,tick,apply,view,holdTakeover,resumeTakeover,shouldBlurAisle};if(typeof module!=='undefined')module.exports=api;else root.WeddingCycle=api;
})(typeof globalThis!=='undefined'?globalThis:this);
