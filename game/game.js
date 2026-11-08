 'use strict';
const Q=new URLSearchParams(location.search);let previewMuted=Q.has('mute'),configuredSound=true;const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function sleepScene(ms,generation){const until=Date.now()+ms;while(generation===speechGeneration&&Date.now()<until)await sleep(Math.min(50,until-Date.now()));}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const rnd=(a,b)=>a+Math.random()*(b-a);
const hash=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h);};
const A=key=>'/assets/'+key;
const setText=(id,value)=>{const el=$(id);if(el.textContent!==value)el.textContent=value;};
const fmt=n=>(n/10000).toLocaleString('vi-VN',{maximumFractionDigits:0});
let COMIC={},FAST=1,round=null,ws=null,wsUp=false;
const rigs={};
const musicController=new BackgroundMusic({onBlocked:()=>showUnlock(),onState:state=>{if(ws?.readyState===1)ws.send(JSON.stringify({type:'musicReady',value:state.playing}));}});
musicController.audio.id='wedding-bgm';musicController.audio.hidden=true;document.body.appendChild(musicController.audio);
const speechPlayer=new PcmSpeechPlayer();
const musicDuckReasons=new Set();
function setMusicDucked(value,reason='speech'){if(value)musicDuckReasons.add(reason);else musicDuckReasons.delete(reason);value=musicDuckReasons.size>0;musicController.duck(value);musicController.audio.dataset.ducked=String(!!value);musicController.audio.dataset.targetVolume=musicController.target.toFixed(3);}
const S={waitingCount:null,guestCount:0,users:new Map(),total:0,teamMoney:{groom:0,bride:0},likes:0,couple:['Tuấn','Lan'],soundOn:!previewMuted,rate:1,readCmt:true,voices:{mc:'Trúc Ly',bride:'Ngọc Huyền',groom:'Hải Đăng'}};
let heartConfig=HeartEvents.defaults(),heartState=null,heartLocal=0,heartRound=null,heartRevision=null,giftStreak=0;
let rollcallState=null,rollcallExclusive=false,rollcallIntroId=null;const rollcallResults=new Set();
const rollcallApplause=new Audio('/assets/music/rollcall-applause.mp3');
rollcallApplause.preload='auto';
let rollcallMusicPlaying=false;
RollcallView.onPhase=event=>{
 const playing=event?.phase==='active';
 if(playing!==rollcallMusicPlaying){
  rollcallMusicPlaying=playing;
  musicController.setOverride(playing?'/assets/music/rollcall-party.mp3':null);
 }
 if(event?.phase!=='result')rollcallApplause.pause();
};
RollcallView.makeFigure=guest=>{
 const figure=document.createElement('div');
 figure.className='rollcall-honor-figure';
 figure.append(comicFigure(GUEST_CAST[spriteType(S.users.get(guest.id)||guest)],false,true));
 return figure;
};
RollcallView.onReveal=()=>{
 if(previewMuted||!S.soundOn)return;
 rollcallApplause.volume=.48;
 rollcallApplause.currentTime=0;
 rollcallApplause.play().catch(()=>{});
};
let giftConfig=GiftEvents.defaults();const giftSceneQueue=[],giftSpeechQueue=[];let heartReserved=false,giftStageGroup=null;
const giftTraffic=new GiftTraffic({queue:giftSceneQueue,limit:4,run:async(scene,slot)=>{const generation=speechGeneration;if(scene.event.action!=='envelope')await waitGiftSpeechStart(scene,generation);if(generation===speechGeneration)return playGiftScene(scene,generation,slot);},onStart:scene=>{giftStreak++;if(scene.speechQueued)return;scene.speechQueued=true;scene.ack={started:false};GiftEvents.enqueue(giftSpeechQueue,{...scene,gift:{...scene.gift},speechAt:Date.now(),acks:[scene.ack]});},onError:error=>console.error('Khách lên mừng:',error)});
const mc={queue:[],gifts:[],current:null,mouth:null,cmtAt:0,giftAt:0};
let host=MCPolicy.createHost();
const SPEAKER_X={mc:330,groom:485,bride:615};
const visualTimers=new Set();
function later(fn,ms){const token=round;const timer=setTimeout(()=>{visualTimers.delete(timer);if(token===round)fn();},ms);visualTimers.add(timer);return timer;}
async function loadAssets(){
  const response=await fetch('/assets/characters/cute-v3/cast.json');
  if(!response.ok)throw new Error('comic cast');COMIC=await response.json();
  const sources=['/assets/backgrounds/rural-wedding-red-aisle.webp','/assets/props/banquet_table.webp','/assets/events/cute-v3/rollcall-frame.webp','/assets/events/cute-v3/reactions.webp',...new Set(Object.values(COMIC).flatMap(spec=>spec.sprite?[spec.sprite.src,...(spec.walk?[spec.walk.src]:[]),...(spec.seated?[spec.seated.src]:[]),...(spec.seated?.eating?[spec.seated.eating.src]:[]),...(spec.expression?[spec.expression.sprite?.src||spec.expression.src]:[])]:spec.layers.map(layer=>layer.src)))];
  await Promise.all(sources.map(src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(new Error('Missing '+src));image.src=src;})));
}
function comicFigure(name,autonomous=true,stageSize=false,seed=name){
 const el=document.createElement('div');el.className='comic-figure'+(autonomous?' autonomous':'');el.dataset.character=name;
 el.style.setProperty('--face-delay',(-hash(seed)*.17%8)+'s');
 const spec=COMIC[name];
 if(spec.sprite){const sprite=spec.sprite,factor=stageSize?304/sprite.h:Math.min(236/sprite.w,310/sprite.h)*(spec.scale||1),width=sprite.w*factor,height=sprite.h*factor;const frame=document.createElement('span');frame.className='comic-atlas-frame';Object.assign(frame.style,{left:(256-width)/2/256*100+'%',top:(320-height)/320*100+'%',width:width/256*100+'%',height:height/320*100+'%'});const image=document.createElement('img');image.className='sprite-image';image.src=sprite.src;image.alt='';image.draggable=false;Object.assign(image.style,{width:sprite.sheetWidth/sprite.w*100+'%',height:sprite.sheetHeight/sprite.h*100+'%',left:-sprite.x/sprite.w*100+'%',top:-sprite.y/sprite.h*100+'%'});const rest=document.createElement('span');rest.className='sprite-rest';rest.append(image);frame.append(rest);
 if(spec.expression){
  const head=document.createElement('span');head.className='comic-expression';
  const expression=spec.expression.sprite;
  if(expression){
   el.classList.add('registered-expression');el.dataset.expressionMode='whole-frame';
  }else head.style.clipPath=spec.expression.clip;
  const alternate=image.cloneNode();alternate.className='sprite-alternate';alternate.src=expression?.src||spec.expression.src;
  if(expression)Object.assign(alternate.style,{width:expression.sheetWidth/expression.w*100+'%',height:expression.sheetHeight/expression.h*100+'%',left:-expression.x/expression.w*100+'%',top:-expression.y/expression.h*100+'%'});
  head.appendChild(alternate);frame.appendChild(head);
 }
 el.appendChild(frame);
 if(spec.walk){
  const walk=spec.walk,pose=document.createElement('span');pose.className='sprite-walk';el.classList.add('has-walk');
  const height=heightForWalk(spec,stageSize),width=height*walk.w/walk.h;
  Object.assign(pose.style,{left:(256-width)/2/256*100+'%',top:(320-height)/320*100+'%',width:width/256*100+'%',height:height/320*100+'%',backgroundImage:`url("${walk.src}")`,backgroundSize:walk.frames*100+'% '+(walk.rows||5)*100+'%',backgroundPositionY:walk.row*100/((walk.rows||5)-1)+'%'});
  if(Number.isInteger(walk.backRow))pose.style.setProperty('--walk-back-y',walk.backRow*100/((walk.rows||5)-1)+'%');el.appendChild(pose);
 }
 return el;}
 COMIC[name].layers.filter((layer,index)=>autonomous||index<2).forEach((layer,index)=>{const img=document.createElement('img');img.src=layer.src;img.alt='';img.className=index===0?'comic-body':'comic-head face-'+index;
  Object.assign(img.style,{left:layer.x/256*100+'%',top:layer.y/320*100+'%',width:layer.w/256*100+'%',height:layer.h/320*100+'%'});el.appendChild(img);});
 return el;
}
function seatedFigure(name,view,seed=name){
 const spec=COMIC[name]?.seated;if(!spec)return comicFigure(name,false,false);
 const el=document.createElement('div');el.className='comic-figure seated-figure';el.dataset.character=name;el.dataset.seatedView=String(view);
 const sprite=document.createElement('span');sprite.className='seated-sprite';
 Object.assign(sprite.style,{backgroundImage:`url("${spec.src}")`,backgroundSize:'400% 500%',backgroundPosition:(view*100/3)+'% '+(spec.row*25)+'%'});
 if(spec.eating){
  const eating=spec.eating,columns=spec.views*eating.frames,phase=hash(String(seed));
  el.classList.add('has-eating');
  Object.assign(sprite.style,{backgroundImage:`url("${eating.src}")`,backgroundSize:columns*100+'% 500%',backgroundPositionX:(view*eating.frames*100/(columns-1))+'%'});
  for(const [index,key]of ['rest','bite','chew'].entries())sprite.style.setProperty('--eat-'+key+'-x',((view*eating.frames+index)*100/(columns-1))+'%');
  sprite.style.setProperty('--eat-duration',(14+phase%9)+'s');
  sprite.style.setProperty('--eat-delay',-(phase%220)/10+'s');
 }
 el.appendChild(sprite);return el;
}
function heightForWalk(spec,stageSize){return stageSize?304:Math.min(236/spec.sprite.w,310/spec.sprite.h)*(spec.scale||1)*spec.sprite.h;}
function buildRig(name,cx,bottom,width){
 const el=document.createElement('div');el.className='rig comic-stage';el.style.setProperty('--s',1);
 Object.assign(el.style,{left:cx-width/2+'px',top:bottom-width*1.25+'px',width:width+'px',height:width*1.25+'px'});
 const figure=comicFigure(name);el.appendChild(figure);$('chars').appendChild(el);
 const rig={el,homeLeft:el.style.left,rest:0,talkHeads:[0,1],cur:null};
 rig.setHead=n=>{if(rig.cur===n)return;figure.dataset.face=String(n);rig.cur=n;};rig.setHead(0);return rig;
}

function buildCharacters(){
  rigs.mc=buildRig('mc',330,720,145);
  rigs.groom=buildRig('groom',485,720,165);
  rigs.bride=buildRig('bride',615,720,155);
  Object.values(rigs).forEach(rig=>rig.el.classList.add('bob'));
}
function talkStart(who='mc'){const rig=rigs[who]||rigs.mc;if(!rig)return;clearInterval(mc.mouth);rig.el.classList.add('talking');mc.mouth=setInterval(()=>rig.setHead(pick(rig.talkHeads)),170);}
function talkStop(who='mc'){clearInterval(mc.mouth);const rig=rigs[who]||rigs.mc;if(rig){rig.el.classList.remove('talking');rig.setHead(rig.rest);}}
const guestEls=new Map(),chatBubbles=new Map(),thankRows=new Map();
const GUEST_CAST=['teenboy','teengirl','aunt','uncle','flashy'];
const spriteType=user=>{
 if(GUEST_CAST.includes(user.character))return GUEST_CAST.indexOf(user.character);
 const options=user.gender==='female'?['aunt','teengirl']:user.gender==='male'?['uncle','teenboy']:user.gender==='nonbinary'?['flashy']:GUEST_CAST;
 return GUEST_CAST.indexOf(options[hash(user.id)%options.length]);
};
function portraitStyle(type){return `--guest-col:${type*100/3}%;background-position:${type%2?100:0}% ${type>=2?100:0}%`;}
function getUser(event){const id=String(event.id);let user=S.users.get(id);if(!user){user={id,name:GameRules.cleanName(event.name),total:0,gifts:0,chats:0,last:Date.now(),joined:Date.now(),seat:-1,type:hash(id)%4};S.users.set(id,user);}return user;}
function guestLabel(user,full=false){const label=document.createElement('span');label.className='guest-identity'+(full?' full':'');label.dataset.userId=user.id;label.title=user.name;
  const face=document.createElement('span');face.className='avatar';const fallback=document.createElement('span');fallback.className='avatar-fallback';fallback.textContent=Array.from(user.name||'K').slice(0,1).join('').toUpperCase();face.appendChild(fallback);
  const url=GuestIdentity.avatar(user.avatar);if(url){const img=document.createElement('img');img.alt='';img.decoding='async';img.referrerPolicy='no-referrer';img.src=url;img.onload=()=>fallback.hidden=true;img.onerror=()=>img.remove();face.appendChild(img);}
  const name=document.createElement('span');name.className='guest-name';name.textContent=user.name;label.append(face,name);return label;
}
function updateTag(tag,user){if(tag.dataset.name===user.name&&tag.dataset.avatar===(user.avatar||''))return;tag.replaceChildren(guestLabel(user));tag.dataset.name=user.name;tag.dataset.avatar=user.avatar||'';}
function guestPuppet(user){const el=document.createElement('div');el.className='guest-puppet comic-walker';el.appendChild(comicFigure(GUEST_CAST[spriteType(user)],true,false,user.id));const cup=document.createElement('span');cup.className='puppet-cup';cup.textContent='🥂';el.appendChild(cup);return el;}
function makeGuest(user,runner=false){const el=document.createElement('div');if(runner){const size=130;el.style.width=size+'px';el.style.height=size+'px';el.style.setProperty('--walker-size',size+'px');}el.className=runner?'runner':'guest';el.dataset.userId=user.id;el.innerHTML=`<div class="portrait" style="${portraitStyle(spriteType(user))}"></div><div class="tag"></div>${runner?'<span class="carried-envelope">✉</span>':''}`;if(runner)el.appendChild(guestPuppet(user));else el.querySelector('.portrait').appendChild(comicFigure(GUEST_CAST[spriteType(user)],false,false,user.id));el.style.setProperty('--face-delay',(-hash(user.id)%80)/10+'s');updateTag(el.querySelector('.tag'),user);return el;}
function buildTables(){
 Object.assign($('giftbox').style,{left:HallLayout.giftBox.left+'px',top:HallLayout.giftBox.top+'px',width:HallLayout.giftBox.width+'px',zIndex:'950'});
 for(const table of HallLayout.tables){
  const el=document.createElement('div');el.className='banquet-table';
  Object.assign(el.style,{left:table.x-table.width/2+'px',top:table.y-table.height/2+'px',width:table.width+'px',height:table.height+'px',zIndex:Math.round(table.y)+25});
  el.innerHTML='<img src="/assets/props/banquet_table.webp" alt="">';$('tables').appendChild(el);
 }
 for(const side of [0,1]){const label=document.createElement('div');label.className='team-table-guide '+(side?'bride-side':'groom-side');label.innerHTML=side?'<b>NHÀ GÁI</b><small>Gõ nhà gái</small>':'<b>NHÀ TRAI</b><small>Gõ nhà trai</small>';$('tables').appendChild(label);}
}
function layoutGuests(){
  const users=[...S.users.values()];
  const shown=users.filter(user=>Number.isInteger(user.seat)&&user.seat>=0&&user.seat<HallLayout.capacity),ids=new Set(shown.map(user=>user.id));
  for(const [id,el]of guestEls)if(!ids.has(id)){el.remove();guestEls.delete(id);}
  for(const user of shown){const seat=user.seat;
    let el=guestEls.get(user.id);if(!el){el=makeGuest(user);guestEls.set(user.id,el);$('guests').appendChild(el);}
    const pos=HallLayout.seats[seat];if(el.dataset.seat!==String(seat)){el.dataset.seat=String(seat);Object.assign(el.style,{left:pos.x-pos.width/2+'px',top:pos.y-pos.width+'px',width:pos.width+'px',height:pos.width+'px',zIndex:pos.z});}const character=GUEST_CAST[spriteType(user)];
    const currentFigure=el.querySelector('.comic-figure');if(currentFigure?.dataset.character!==character||currentFigure?.dataset.seatedView!==String(pos.view))el.querySelector('.portrait').replaceChildren(seatedFigure(character,pos.view,user.id));
    updateTag(el.querySelector('.tag'),user);el.dataset.team=user.team||'groom';
  }
  const queue=users.filter(u=>u.seat<0);
  const front=(S.waitingIds??queue.map(u=>u.id)).map(id=>S.users.get(String(id))).filter(Boolean).slice(0,30),reception=$('reception'),key=front.map(user=>[user.id,user.name,user.avatar,user.team,user.gender,user.character].join('|')).join('\n');
  if(reception.dataset.key!==key){reception.dataset.key=key;const wanted=new Set(front.map(u=>u.id));for(const el of [...reception.children])if(!wanted.has(el.dataset.userId))el.remove();const existing=new Map([...reception.children].map(el=>[el.dataset.userId,el]));for(const [i,user] of front.entries()){const prior=existing.get(user.id);if(prior){updateTag(prior.querySelector('.tag'),user);if(prior.querySelector('.comic-figure')?.dataset.character!==GUEST_CAST[spriteType(user)])prior.querySelector('.portrait').replaceChildren(comicFigure(GUEST_CAST[spriteType(user)],false,false,user.id));continue;}const el=makeGuest(user);const seed=hash(user.id),size=130;
    // Spread spectators across the courtyard, including the carpet.
    const x=(i%2?670:65)+((i*.61803398875+.17)%1)*230;
    const y=1460+((i*.754877666+.31)%1)*245;
    const targetX=25+((i*.41421356237+.63)%1)*880;
    const dx=targetX-x,dy=Math.max(-45,Math.min(45,(seed%91)-45));
    Object.assign(el.style,{left:x+'px',top:y+'px',width:size+'px',height:size+'px',zIndex:String(Math.round(y))});
    el.style.setProperty('--crowd-duration',(23+seed%15)+'s');el.style.setProperty('--crowd-delay',-(seed%37)+'s');
    el.style.setProperty('--out-facing',dx<0?'-1':'1');el.style.setProperty('--return-facing',((i%2?820:90)-x-dx)<0?'-1':'1');el.style.setProperty('--home-facing',((i%2?820:90)-x)>0?'-1':'1');el.style.setProperty('--walk-x',dx+'px');el.style.setProperty('--walk-y',dy+'px');
    el.style.setProperty('--return-x',((i%2?820:90)-x)+'px');el.style.setProperty('--return-y',Math.max(-50,Math.min(50,1640-y))+'px');
    el.style.setProperty('--yield-x',((x<475?80+(i%3)*95:650+(i%3)*95)-x)+'px');
    el.classList.add('crowd-wander');reception.appendChild(el);}}
  const teams=S.teamCounts||[...S.users.values()].reduce((counts,user)=>{counts[user.team==='bride'?'bride':'groom']++;return counts;},{groom:0,bride:0});setText('groom-count',teams.groom);setText('bride-count',teams.bride);setText('waiting-count',`${S.waitingCount??queue.length} chờ bàn`);
  const waiting=S.waitingCount??queue.length;setText('guest-more',waiting?`ĐÓN KHÁCH · ${waiting} bạn đang chờ bàn`:'');
}
const foodDeliveries=new Map();let serviceSerial=0;
function clearFoodDeliveries(){
 for(const delivery of foodDeliveries.values()){delivery.cancelled=true;delivery.animation?.cancel();delivery.node.remove();}
 foodDeliveries.clear();
}
function serveFood(user,food){
 if(Rollcall.live(rollcallState)||$('stage').classList.contains('park-dance-playing')||foodDeliveries.has(user.id)||foodDeliveries.size>=3)return;
 const seat=HallLayout.seats[user.seat],node=document.createElement('div');node.className='food-delivery';
 const figure=document.createElement('div');figure.className='food-waiter';const type=serviceSerial++%2?'waitress':'waiter';
 figure.append(comicFigure(type,false,false,user.id));figure.setAttribute('aria-label',type==='waiter'?'Nam phục vụ mang món':'Nữ phục vụ mang món');
 const caption=document.createElement('span');caption.className='food-caption';caption.textContent=user.name.slice(0,18)+' · '+food;node.append(figure,caption);
 const right=user.team==='bride',table=seat?HallLayout.tables[seat.table]:null;
 const target=table?{x:table.x+(right?-220:220),y:table.y+60}:waitingSpot(user.id);
 const path=[{x:540,y:900},{x:540,y:target.y},{x:target.x,y:target.y}];
 $('fx').append(node);const delivery={node,animation:null,cancelled:false};foodDeliveries.set(user.id,delivery);
 const move=async(points,facing)=>{
  if(delivery.cancelled)return false;node.classList.add('is-walking');node.style.setProperty('--waiter-facing',String(facing));
  delivery.animation=node.animate(points.map(p=>({transform:`translate(${p.x-65}px,${p.y-130}px)`,opacity:1})),{duration:2100,easing:'linear',fill:'forwards'});
  try{await delivery.animation.finished;}catch{}finally{node.classList.remove('is-walking');}
  return !delivery.cancelled;
 };
 (async()=>{try{if(!await move(path,right?1:-1))return;await sleep(1000);if(delivery.cancelled)return;await move([...path].reverse(),right?-1:1);}finally{node.remove();if(foodDeliveries.get(user.id)===delivery)foodDeliveries.delete(user.id);}})();
}
function floatText(text,x,y){if($('fx').childElementCount>30)return;const el=document.createElement('div');el.className='float';el.textContent=text;el.style.left=x+'px';el.style.top=y+'px';$('fx').appendChild(el);el.animate([{opacity:1,transform:'translate(-50%,0)'},{opacity:0,transform:'translate(-50%,-65px)'}],{duration:1400}).onfinish=()=>el.remove();}
function removeChat(id){const item=chatBubbles.get(id);if(!item)return;clearTimeout(item.timer);visualTimers.delete(item.timer);item.el.remove();chatBubbles.delete(id);}
function chatBubble(user,text,feedback=''){
 if(!String(text).trim())return;
 const previous=chatBubbles.get(user.id);if(previous?.text===text&&Date.now()-previous.at<800)return;
 removeChat(user.id);if(chatBubbles.size>=8)removeChat(chatBubbles.keys().next().value);
 const el=document.createElement('div');el.className='say';el.textContent=BAD_WORDS.test(text)?'🤐 ***':Array.from(text).slice(0,65).join('')+(Array.from(text).length>65?'…':'');
 if(feedback){const result=document.createElement('small');result.className='chat-result';result.textContent=feedback;el.appendChild(result);}
 $('fx').appendChild(el);
 const item={el,text,at:Date.now(),timer:later(()=>removeChat(user.id),4500)};chatBubbles.set(user.id,item);positionChat(user.id,item);
}
function positionChat(id,item){
 const runner=Array.from($('walkers').children).find(el=>el.dataset.userId===id);
 const holder=Array.from(document.querySelectorAll('.wedding-role-guest')).find(el=>el.dataset.userId===id);
 const target=runner||holder?.closest('.rig')||findGuestElement(id);
 item.el.hidden=!target;if(!target)return;
 const rect=target.getBoundingClientRect(),layer=$('fx'),base=layer.getBoundingClientRect();
 const scale=base.width/(layer.offsetWidth||1080);if(!scale)return;
 item.el.style.left=((rect.left+rect.width/2-base.left)/scale)+'px';
 item.el.style.top=((rect.top-base.top)/scale-28)+'px';
}
setInterval(()=>{for(const [id,item]of chatBubbles)positionChat(id,item);},100);
const WALK_SPEED=360;
const walkJobs=new Map(),walkWaiting=[],walkingAnimations=new Set();let walking=0;
function deposit(job){if(job.round!==round)return;const box=$('giftbox');box._bump?.cancel();box._bump=box.animate([{scale:1},{scale:1.12},{scale:1}],{duration:280});floatText('+'+fmt(job.amount)+' chỉ vàng',HallLayout.giftBox.deposit.x,HallLayout.giftBox.top-10);}
function requestWalk(user,amount){const current=walkJobs.get(user.id);if(current){current.amount+=amount;return;}
  const seat=HallLayout.seats[user.seat]||waitingSpot(user.id);
  const job={id:user.id,name:user.name,avatar:user.avatar,type:spriteType(user),seat:{...seat},amount,round,at:Date.now()};walkJobs.set(job.id,job);walkWaiting.push(job);pumpWalks();
}
function pumpWalks(){while(walking<4&&walkWaiting.length){const job=walkWaiting.shift();if(job.round!==round){walkJobs.delete(job.id);deposit(job);continue;}
  walking++;const el=makeGuest(job,true);el.classList.add('is-walking');$('walkers').appendChild(el);const original=findGuestElement(job.id);original?.classList.add('away');
  const path=HallLayout.groundRoute(job.seat,walking),points=[...path,path[path.length-1],...path.slice(0,-1).reverse()];const offsets=HallLayout.routeOffsets(points);
  const animation=el.animate(points.map((point,i)=>({transform:`translate(${point.x-parseFloat(el.style.width)/2}px,${point.y-parseFloat(el.style.height)}px)`,offset:offsets[i]})),{duration:6000,easing:'linear',fill:'forwards'});walkingAnimations.add(animation);job.animation=animation;
  const drop=later(()=>{deposit(job);el.querySelector('.carried-envelope').style.opacity=0;},3000);
  animation.finished.catch(()=>{}).finally(()=>{clearTimeout(drop);visualTimers.delete(drop);el.remove();original?.classList.remove('away');walkingAnimations.delete(animation);if(job.round===round){walkJobs.delete(job.id);walking--;pumpWalks();}});
}}
function clearWalks(){giftFocus.clear();clearFoodDeliveries();walkingAnimations.forEach(animation=>animation.cancel());walkingAnimations.clear();walkWaiting.length=0;walkJobs.clear();walking=0;$('walkers').replaceChildren();}
function renderBoards(){
  setText('giftbox-total',fmt(S.total));setText('summary-total',fmt(S.total));setText('couple',`${S.couple[0]} & ${S.couple[1]}`);
  const top=(S.topDonors||[...S.users.values()].filter(user=>user.total>0)
    .sort((a,b)=>b.total-a.total||a.id.localeCompare(b.id))).slice(0,10);
  const rows=$('latest-gift');
  const key=JSON.stringify(top.map(({id,name,avatar,total})=>[id,name,avatar,total]));
  if(rows.dataset.key===key)return;
  rows.dataset.key=key;
  if(!top.length){rows.textContent='Chưa có quà mừng';return;}
  let pinned=rows.querySelector('.donors-pinned'),track=rows.querySelector('.donors-track');
  if(!pinned||!track){
   pinned=document.createElement('div');pinned.className='donors-pinned';
   const window=document.createElement('div');window.className='donors-window';
   track=document.createElement('div');track.className='donors-track';
   window.append(track);rows.replaceChildren(pinned,window);
  }
  const entries=top.map((user,index)=>{
   const row=document.createElement('div');row.className='lrow';row.dataset.rank=String(index+1);
   const name=document.createElement('b'),amount=document.createElement('span');
   name.append(guestLabel(user));amount.textContent=fmt(user.total);row.append(name,amount);
   return row;
  });
  pinned.replaceChildren(...entries.slice(0,2));
  track.replaceChildren(...entries.slice(2));
  track.style.setProperty('--donor-travel',Math.max(0,entries.length-5)*-48+'px');
  track.classList.toggle('donors-scrolling',entries.length>5);
}
function line(key,vars={}){const list=LINES[key];if(!list?.length)return[];const text=pick(list).replace(/\{(\w)\}/g,(match,key)=>vars[key]??match);return[['mc',text]];}
function talk(key,vars,prio=1,at=Date.now()){const seq=line(key,vars);if(!seq.length)return;const item=MCPolicy.item(key,seq,at);mc.queue=MCPolicy.prune(mc.queue);mc.queue.push(item);}
// Giọng VieNeu chạy cục bộ, stream PCM để MC bắt đầu nói ngay khi có khung đầu.
let audioBlocked=false,speechGeneration=0,lastInteractionAt=Date.now(),idleAt=Date.now()-10000,idleIndex=0;
function reportAudio(value, message = '') {
  if (ws?.readyState === 1) ws.send(JSON.stringify({ type: 'audioReady', value }));
  let el = $('audio-status');
  if (value) { el?.remove(); return; }
  if (previewMuted) return;
  if (window.parent !== window) {
    el?.remove();
    window.parent.postMessage({type:'preview-audio-error', message}, window.location.origin);
    return;
  }
  if (!el) { el = document.createElement('div'); el.id = 'audio-status'; document.body.appendChild(el); }
  el.replaceChildren(document.createTextNode(message + ' '));
  const retry = document.createElement('button'); retry.textContent = 'Thử lại giọng';
  retry.onclick = () => { audioBlocked = false; cancelSpeech(); talk('testVoice', {}, 5); el.remove(); };
  el.appendChild(retry);
}
function showUnlock() {
  if (window.parent !== window || previewMuted || $('unlock')) return;
  const button = document.createElement('button'); button.id = 'unlock'; button.textContent = 'Bấm để bật nhạc nền và giọng MC';
  button.onclick = () => { speechPlayer.context?.resume(); const needsVoice=audioBlocked;audioBlocked=false;button.remove();musicController.start();if(needsVoice)talk('testVoice'); };
  document.body.appendChild(button);
}
function interruptSpeech() {
  setMusicDucked(false);
  speechGeneration++; speechPlayer.stop();
  clearInterval(mc.mouth);
  for (const rig of Object.values(rigs)) { rig.el.classList.remove('talking'); rig.setHead(rig.rest); }
  $('bubble').classList.remove('show');
}
function cancelSpeech() {
  interruptSpeech(); mc.queue.length = mc.gifts.length = 0;
}
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const readingTime=text=>clamp(text.length*55,1500,7000);
async function say(text, who = 'mc', item = { kind: 'test', expiresAt: Date.now()+90000 }) {
  const generation = speechGeneration, sp = SPEAKERS[who] || SPEAKERS.mc;
  $('bubble-text').innerHTML = `<b class="who">${esc(item.speakerName || sp.name)}</b>${esc(item.caption || text)}`;
  $('bubble').style.setProperty('--tail', clamp(SPEAKER_X[who] - 122, 40, 800) + 'px');
  const captionLength = (item.caption || text).length;
  $('bubble').style.fontSize = captionLength > 110 ? '22px' : captionLength > 80 ? '23px' : '24px';
  $('bubble').classList.add('show');
  $('bubble').dataset.speechKind = item.kind; $('bubble').dataset.voiceState = 'waiting';
  if(S.soundOn&&audioBlocked&&!previewMuted){item.failed=true;showUnlock();return;}
  const audible = S.soundOn && !audioBlocked && !previewMuted;
  item.speaker=who;item.preparing=true;
  item.preparing = false;
  if (generation !== speechGeneration || Date.now() >= item.expiresAt) return;
  if (audible) {
    try{
      
      const rate=S.rate,voice=S.voices[who]||'Trúc Ly';
      const url=`/tts?r=${rate}&voice=${encodeURIComponent(voice)}&until=${item.expiresAt||Date.now()+5000}${item.kind==='cycle'?'&wait=long':''}&t=${encodeURIComponent(text.slice(0,400))}`;
      const completed=await speechPlayer.play(url,{rate,bufferWhole:false,onPlaying:()=>{if(generation!==speechGeneration)return;talkStart(who);setMusicDucked(true);$('bubble').dataset.voiceState='playing';$('bubble').dataset.lastSpoken=text;$('bubble').dataset.lastAudioAt=String(Date.now());if(item.kind==='gift'){$('stage').dataset.lastGiftAudioAt=String(Date.now());$('stage').dataset.lastGiftThankYou=text;}$('bubble').dataset.latencyMs=String(Date.now()-(item.createdAt||Date.now()));reportAudio(true);item.onPlaying?.();}});if(completed===false&&generation===speechGeneration)item.failed=true;
    }catch(error){if(generation===speechGeneration){if(error.name==='NotAllowedError'||error.name==='InvalidStateError'){audioBlocked=true;showUnlock();}if(!item.retryFirst)reportAudio(false,'Chưa phát được giọng cục bộ: '+error.message);}item.failed=true;}
    setMusicDucked(false);
  } else {
    talkStart(who);item.onPlaying?.();
    const until = Date.now() + (item.kind === 'cycle' ? readingTime(text) : item.kind === 'comment' ? 150 : Math.min(2500, Math.max(600, text.length * 25)));
    while (Date.now() < until && generation === speechGeneration) await sleep(80);
  }
  if (generation === speechGeneration) talkStop(who);
}


function giftSeq(gifts){return[['mc',MCPolicy.giftMessage(gifts).spoken]];}
// Donation storage keeps its legacy scale; display and speech convert to 1 chỉ vàng per coin.
function addGift(list,gift){const pending=list.find(item=>item.id===gift.id);if(pending){pending.vnd+=gift.vnd;pending.receipts+=gift.receipts;pending.updatedAt=gift.at;if(pending.giftName!==gift.giftName)pending.giftName='nhiều món quà';}else list.push(gift);MCPolicy.trimGifts(list);}
function removeThanks(id){const item=thankRows.get(id);if(!item)return;clearTimeout(item.timer);visualTimers.delete(item.timer);item.el.remove();thankRows.delete(id);}
const GIFT_CAMERA_ENABLED=false;
let giftFocusNode=null;const focusBlurred=new Set();let focusSource=null;
function giftFocusSource(id){return findGuestElement(id)||Object.values(rigs).map(r=>r.el).find(el=>el.querySelector('.wedding-role-guest')?.dataset.userId===id);}
const giftFocus=new GiftFocus({
 ready:user=>!!giftFocusSource(user.id),
 start(item){
  const stage=$('stage'),source=giftFocusSource(item.user.id);
  const world=$('camera-world'),bounds=world.getBoundingClientRect(),scale=bounds.width/1080||1;
  const box=source?.getBoundingClientRect(),x=box?(box.left+box.width/2-bounds.left)/scale:540,y=box?(box.bottom-bounds.top)/scale:1300;
  giftFocusNode=document.createElement('div');giftFocusNode.className='gift-focus-scene';
  giftFocusNode.style.setProperty('--focus-x',x+'px');giftFocusNode.style.setProperty('--focus-y',y+'px');giftFocusNode.style.setProperty('--focus-head-y',((box?(box.top-bounds.top)/scale:y-120)-8)+'px');stage.classList.add('donor-camera-active');
  const light=document.createElement('div');light.className='gift-focus-light';
  const badge=document.createElement('div');badge.className='gift-focus-caption';
  const name=guestLabel(item.user);name.classList.add('gift-focus-identity');const thanks=document.createElement('small');thanks.textContent='Cảm ơn bạn!';
  const amount=document.createElement('b');amount.className='gift-focus-amount';badge.append(name,thanks,amount);
  giftFocusNode.append(light,badge);world.append(giftFocusNode);
  for(const el of [...guestEls.values(),...$('reception').children]){
   if(el===source)continue;const r=el.getBoundingClientRect(),cx=(r.left+r.width/2-bounds.left)/scale,cy=(r.top+r.height/2-bounds.top)/scale;
   if(Math.hypot(cx-x,cy-y)<440){el.classList.add('gift-focus-near');focusBlurred.add(el);}
  }
  if(source){focusSource=source;source.classList.add('gift-focus-source');}
  const camera=GiftFocus.camera(x,y-75);world.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`;
 },
 update(item){
  const liveSource=giftFocusSource(item.user.id);
  if(liveSource&&liveSource!==focusSource&&giftFocusNode){
   focusSource?.classList.remove('gift-focus-source');liveSource.classList.remove('gift-focus-near');focusBlurred.delete(liveSource);focusSource=liveSource;liveSource.classList.add('gift-focus-source');
   const world=$('camera-world'),bounds=world.getBoundingClientRect(),scale=bounds.width/1080||1,box=liveSource.getBoundingClientRect();
   const x=(box.left+box.width/2-bounds.left)/scale,y=(box.bottom-bounds.top)/scale;
   giftFocusNode.style.setProperty('--focus-x',x+'px');giftFocusNode.style.setProperty('--focus-y',y+'px');giftFocusNode.style.setProperty('--focus-head-y',((box.top-bounds.top)/scale-8)+'px');
   const camera=GiftFocus.camera(x,y-75);world.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`;
  }
  const amount=giftFocusNode?.querySelector('.gift-focus-amount');if(amount)amount.textContent='+'+fmt(Math.round(item.shown))+' chỉ vàng';
 },
 end(){$('stage').classList.remove('donor-camera-active');const world=$('camera-world');if(world)world.style.transform='translate(0px,0px) scale(1)';giftFocusNode?.remove();giftFocusNode=null;for(const el of focusBlurred)el.classList.remove('gift-focus-near');focusBlurred.clear();focusSource?.classList.remove('gift-focus-source');focusSource=null;}
});
if(GIFT_CAMERA_ENABLED)setInterval(()=>giftFocus.tick(Date.now(),Rollcall.live(rollcallState)||$('stage').classList.contains('park-dance-playing')),80);
function showThanks(user,amount){
 let item=thankRows.get(user.id);
 if(!item){if(thankRows.size>=3)removeThanks(thankRows.keys().next().value);const el=document.createElement('div'),value=document.createElement('b');el.className='thank';el.append(guestLabel(user),value);item={el,value,amount:0};thankRows.set(user.id,item);}
 else{clearTimeout(item.timer);visualTimers.delete(item.timer);thankRows.delete(user.id);thankRows.set(user.id,item);}
 item.amount+=amount;item.value.textContent='+'+fmt(item.amount)+' chỉ vàng';$('thanks').prepend(item.el);item.timer=later(()=>removeThanks(user.id),4500);
}
const rollcallGiftSpeech=[];
async function mcLoop(){
 let commentary=null;
 let selectionReminderId=null,kickoffId=null;
 while(true){await sleep(60);if(!rigs.mc||!wsUp)continue;
 if(Rollcall.live(rollcallState)){
  rollcallExclusive=true;heartReserved=false;giftTraffic.pause();
  if(rollcallState.phase==='preparing'){
   const event=rollcallState,generation=speechGeneration;
   if(event.selectionEndsAt&&selectionReminderId!==event.id){
    selectionReminderId=event.id;
    const now=Date.now();
    if(event.selectionEndsAt-now>=2500){
     const item={kind:'event',createdAt:now,expiresAt:event.selectionEndsAt};
     mc.current=item;
     await say(event.config.commentary?.reminder??Rollcall.commentaryLines.reminder,'mc',item);
     if(mc.current===item)mc.current=null;
    }
   }
   if(event.selectionEndsAt&&Date.now()>=event.selectionEndsAt&&kickoffId!==event.id){
    const item={kind:'event',createdAt:Date.now(),expiresAt:Infinity};
    mc.current=item;
    await say(event.config.commentary?.kickoff??Rollcall.commentaryLines.kickoff,'mc',item);
    if(mc.current===item)mc.current=null;
    if(generation===speechGeneration&&rollcallState?.id===event.id&&rollcallState.phase==='preparing'){
     if(item.failed)await sleepScene(1000,generation);
     else if(ws?.readyState===1){
      ws.send(JSON.stringify({type:'rollcallKickoff',id:event.id}));
      kickoffId=event.id;
     }
    }
   }
   if(!event.selectionEndsAt&&rollcallIntroId!==event.id){const item={kind:'event',createdAt:Date.now(),expiresAt:Infinity};mc.current=item;await say([event.config.intro,event.config.rules,event.config.commentary?.selection??Rollcall.commentaryLines.selection].filter(Boolean).join(' '),'mc',item);if(generation===speechGeneration&&rollcallState?.id===event.id&&rollcallState.phase==='preparing'){if(!item.failed){rollcallIntroId=event.id;ws.send(JSON.stringify({type:'rollcallReady',id:event.id}));}else await sleepScene(1000,generation);}if(mc.current===item)mc.current=null;}
   continue;
  }
  if(rollcallState.phase==='active'){
   const event=rollcallState;
   if(commentary?.event!==event.id){
    commentary={event:event.id,lead:null,lastAt:event.startedAt,final:false};
   }
   const now=Date.now(),remaining=event.endsAt-now;
   if(now-event.startedAt<6000||remaining<4200||now-commentary.lastAt<10000)continue;
   const {groom,bride}=event.scores;
   const lead=groom===bride?'tie':groom>bride?'groom':'bride';
   const final=remaining<=8500;
   const giftIndex=rollcallGiftSpeech.findIndex(gift=>gift.round===event.id);
   if(giftIndex!==-1&&remaining>6500&&!final){
    const [gift]=rollcallGiftSpeech.splice(giftIndex,1);
    commentary.lastAt=now;
    const item={kind:'event',createdAt:now,expiresAt:event.endsAt-2000};
    mc.current=item;
    await say((event.config.commentary?.gift??Rollcall.commentaryLines.gift).replace(/\{ten\}/g,()=>MCPolicy.spokenName(gift.name)).replace(/\{diem\}/g,String(gift.points)),'mc',item);
    if(mc.current===item)mc.current=null;
    continue;
   }
   if(commentary.final||(!final&&lead===commentary.lead))continue;
   let key;
   if(final)key={groom:'finalGroom',bride:'finalBride',tie:'finalTie'}[lead];
   else if(lead==='tie')key=groom?'tie':'waiting';
   else if(lead==='groom')key=commentary.lead==='bride'?'groomOvertake':'groomLead';
   else key=commentary.lead==='groom'?'brideOvertake':'brideLead';
   const line=event.config.commentary?.[key]??Rollcall.commentaryLines[key];
   commentary.lead=lead;
   commentary.final=final;
   commentary.lastAt=now;
   const item={kind:'event',createdAt:now,expiresAt:event.endsAt-2000};
   mc.current=item;
   await say(line,'mc',item);
   if(mc.current===item)mc.current=null;
   continue;
  }
  if(rollcallState.phase==='result'){
   const event=rollcallState;
   if(!event.announced&&!rollcallResults.has(event.id)){
    const generation=speechGeneration;
    const item={kind:'event',createdAt:Date.now(),expiresAt:Infinity};
    mc.current=item;
    const {likes,gifts}=event.leaders||{};
    const honors=[['topLikes',likes],['topGifts',gifts]].filter(([,leader])=>leader).map(([key,leader])=>
     (event.config.commentary?.[key]??Rollcall.commentaryLines[key]).replace(/\{ten\}/g,()=>MCPolicy.spokenName(leader.name)).replace(/\{luong\}/g,String(leader.amount))); 
    const stillShowing=()=>generation===speechGeneration&&rollcallState?.id===event.id&&rollcallState.phase==='result';
    await say(Rollcall.resultText(event),'mc',item);
    if(stillShowing()&&!item.failed){
     RollcallView.reveal(event.id,'winner');
     await sleepScene(2500,generation);
     if(stillShowing()&&honors.length){
      RollcallView.reveal(event.id,'honors');
      await say(honors.join(' '),'mc',item);
      if(stillShowing()&&!item.failed)await sleepScene(2200,generation);
     }
    }
    if(mc.current===item)mc.current=null;
    if(generation!==speechGeneration||rollcallState?.id!==event.id||rollcallState.phase!=='result')continue;
    if(item.failed){await sleepScene(1000,generation);continue;}
    ws.send(JSON.stringify({type:'rollcallAnnounced',id:event.id}));
    rollcallResults.add(event.id);
    if(rollcallResults.size>50)rollcallResults.delete(rollcallResults.values().next().value);
   }
   continue;
  }
 }else if(rollcallExclusive){rollcallExclusive=false;rollcallIntroId=null;commentary=null;heartReserved=false;giftTraffic.resume();}

 // Lời chúc mừng cướp vai và hủy hôn phải nói ngay, không đứng sau câu kịch bản đang chờ.
 const stageLine=giftSpeechQueue.findIndex(scene=>scene.event.activity==='takeover'||scene.event.exclusive);
 if(stageLine>=0){
  const [scene]=giftSpeechQueue.splice(stageLine,1),generation=speechGeneration,thanks=GiftEvents.thanksBatch([scene],180,MCPolicy.spokenName);
  const item={kind:'gift',giftBatch:thanks.batch,createdAt:Date.now(),expiresAt:Infinity,onPlaying:()=>{for(const ack of scene.acks||[])ack.started=true;}};
  mc.current=item;await say(thanks.spoken,'mc',item);
  if(generation===speechGeneration&&item.failed){GiftEvents.enqueue(giftSpeechQueue,scene);await sleepScene(1000,generation);}
  if(mc.current===item)mc.current=null;continue;
 }
 if(cycleVoiceQueue.length){const task=cycleVoiceQueue.shift();if(!task.alive()){task.resolve();continue;}const who=task.who||'mc',generation=speechGeneration,item={kind:'cycle',createdAt:Date.now(),expiresAt:Infinity,speakerName:who==='mc'||S.couple[who==='groom'?0:1]===SPEAKERS[who].name?SPEAKERS[who].name:SPEAKERS[who].name+' · '+S.couple[who==='groom'?0:1]};mc.current=item;try{item.retryFirst=true;await say(task.text,who,item);
  // Lời thoại trong lễ không được mất câu: máy bận thì đọc lại một lần rồi mới báo lỗi.
  if(item.failed&&task.alive()&&!audioBlocked&&generation===speechGeneration){item.failed=false;item.retryFirst=false;await sleepScene(400,generation);await say(task.text,who,item);}
  if(item.failed&&task.alive())await sleepScene(readingTime(task.text),generation);}finally{if(mc.current===item)mc.current=null;task.resolve();}continue;}
 const heartPending=false; // Wedding ceremonies now own the scene timeline.
 if(heartPending&&(!giftSceneQueue.length||giftStreak>=3)){heartReserved=true;giftTraffic.pause();}
 if(heartReserved&&!giftTraffic.active.size){try{if(heartPending)await runHeartScene();}finally{heartReserved=false;giftStreak=0;if(!Rollcall.live(rollcallState))giftTraffic.resume();}continue;}
 giftTraffic.pump();
 if($('stage').classList.contains('park-dance-playing')||mc.current?.kind==='park-outro')continue;
 if(giftSpeechQueue.length&&WeddingCycle.thanksMuted(cycleState,cycleState?.config)){
  // Trong nghi lễ MC chỉ chúc mừng khách cướp vai; quà vẫn được cộng điểm và hiện trên màn hình.
  for(let i=giftSpeechQueue.length-1;i>=0;i--){const scene=giftSpeechQueue[i];if(scene.event.activity==='takeover'||scene.event.exclusive)continue;for(const ack of scene.acks||[])ack.started=true;giftSpeechQueue.splice(i,1);}
 }
 if(giftSpeechQueue.length){const thanks=GiftEvents.thanksBatch(giftSpeechQueue,180,MCPolicy.spokenName),generation=speechGeneration,item={kind:'gift',giftBatch:thanks.batch,createdAt:Date.now(),expiresAt:Infinity,onPlaying:()=>{for(const scene of thanks.batch)for(const ack of scene.acks||[])ack.started=true;}};mc.current=item;await say(thanks.spoken,'mc',item);if(generation===speechGeneration&&item.failed){for(const scene of thanks.batch)GiftEvents.enqueue(giftSpeechQueue,scene);await sleepScene(1000,generation);}if(mc.current===item)mc.current=null;continue;}
 if(heartReserved||rollcallExclusive||WeddingCycleView.busy)continue;
 if(!S.soundOn||audioBlocked)continue;mc.queue=MCPolicy.prune(mc.queue);const crowded=host.busy(Date.now())||mc.gifts.length>3;
  if(crowded)mc.queue=mc.queue.filter(q=>q.kind!=='ambient'&&(q.kind!=='comment'||Date.now()-q.createdAt<6000));
  if(!crowded&&!mc.queue.length&&!mc.gifts.length&&Date.now()-lastInteractionAt>10000&&Date.now()-idleAt>MCPolicy.runtime.mc_idle_gap*1000){idleAt=Date.now();const text=host.idle([...S.users.values()]);if(text)mc.queue.push(MCPolicy.item('idle',[['mc',text]],Date.now()));}
  let item;
  if(mc.gifts.length&&Date.now()-mc.gifts[0].at>=500){const gifts=MCPolicy.takeGifts(mc.gifts);if(!gifts.length)continue;const message=MCPolicy.giftMessage(gifts);if(!message.spoken)continue;item={kind:'gift',gifts,seq:[['mc',message.spoken]],caption:message.caption,createdAt:Date.now(),expiresAt:Infinity};mc.giftAt=Date.now();}
  else {item=host.social();if(!item&&mc.queue.length)item=mc.queue.shift();}
  if(!item?.seq.length)continue;mc.current=item;item.failed=false;const generation=speechGeneration;for(const[who,text]of item.seq){if(generation!==speechGeneration||Date.now()>=item.expiresAt)break;await say(text,who,item);}if(!item.failed&&generation===speechGeneration)item.onDone?.();if(item.failed&&item.kind==='gift'&&generation===speechGeneration){for(const gift of item.gifts||[])addGift(mc.gifts,gift);await sleep(1500);}if(mc.current===item)mc.current=null;if(generation===speechGeneration)$('bubble').classList.remove('show');
}}
function queueReply(item){if(!item)return;mc.queue=mc.queue.filter(q=>q.kind!=='comment'||q.userId!==item.userId);mc.queue.push(item);mc.queue=MCPolicy.prune(mc.queue);if(host.busy(Date.now())){const newest=mc.queue.filter(q=>q.kind==='comment').slice(-3);mc.queue=mc.queue.filter(q=>q.kind!=='comment'||newest.includes(q));}}
function handle(event){if(event.type!=='like')lastInteractionAt=Date.now();if(event.rollcallId){if(event.rollcallGiftPoints){rollcallGiftSpeech.push({round:event.rollcallId,name:event.name,points:event.rollcallGiftPoints});if(rollcallGiftSpeech.length>30)rollcallGiftSpeech.shift();}return;}const user=getUser(event);if(event.type==='join'||event.firstAttendance)arrival(user,event.type==='join');if(event.type!=='join')user.last=Date.now();
  if(event.gender)user.gender=event.gender;
  if(Object.hasOwn(event,'character'))user.character=event.character;
  if(event.food)serveFood(user,event.food);
  const greeting=host.observe(event,user);
  if(S.readCmt&&!BAD_WORDS.test(user.name))queueReply(greeting);
  if(event.type==='chat'){
    const request=GuestRequests.parse(event.text||'');
    const plain=String(event.text||'').toLowerCase();
    const feedback=event.characterResult?.error||
      (event.characterResult?.label?'✓ Đã đổi: '+event.characterResult.label:
      event.gender?'✓ Đã đổi nhân vật '+(event.gender==='male'?'nam':event.gender==='female'?'nữ':'theo yêu cầu'):
      event.food?'🍽 Đang mang '+event.food:
      /nh[àa]\s*tr[aá]i|nh[àa]\s*g[áa]i/.test(plain)&&!request?'✓ '+(user.team==='bride'?'Nhà gái':'Nhà trai'):'');
    chatBubble(user,event.text||'',feedback);const at=event.at||Date.now();
    if(!S.readCmt||Date.now()-at>MCPolicy.COMMENT_TTL||BAD_WORDS.test((event.text||'')+' '+user.name))return;
    const rule=CMT_RULES.find(([,re])=>re.test((event.text||'').toLowerCase()));
    queueReply(host.reply(user,event.text||'',rule?.[0],at,event.characterResult));
  }
  if(event.type==='gift'){
    const amount=event.deferredSteal?0:GameRules.coinsToVnd(event.coins);
    if(amount){showThanks(user,amount);if(GIFT_CAMERA_ENABLED)giftFocus.enqueue(user,amount);}
    if(event.weddingCancel&&cycleState?.phase){queueCycleCancel({event:{id:'cancel',coins:5,icon:'💔',name:'Hủy hôn',action:'stage',activity:'cancel',exclusive:true,line:GiftEvents.roleLine(giftConfig,'cancel')},gift:{...user,avatar:event.avatar||user.avatar,coins:event.coins,giftName:event.giftName},amount,round});return;}
    const role=event.weddingRole;
    const smallGift=GiftEvents.choose(giftConfig,1);
    const playsEnvelope=!giftConfig.giftSelections?.thanks||GiftEvents.matches(giftConfig,'thanks',event);
    let chosen={...smallGift,action:playsEnvelope?'envelope':'thanks'};
    if(event.ceremonyRegistration?.accepted)chosen={...chosen,line:'{ten} vừa ghi tên vào sổ cưới! Lễ sau chuẩn bị tinh thần nha.'};
    if(role){
     const targetRole=role.role||(role.title==='cô dâu'?'bride':'groom');
     const line=role.registration?'Sân khấu đang trống vai, và {ten} đã bước lên! Xin chào '+(targetRole==='bride'?'cô dâu':'chú rể')+' của lễ này!':GiftEvents.roleLine(giftConfig,targetRole);
     chosen={id:'role-'+targetRole,coins:5,action:'stage',activity:'takeover',role:targetRole,line};
    }
    const scene={event:{...chosen},gift:{...user,avatar:event.avatar||user.avatar,seat:role?.seat??user.seat,coins:event.coins,giftName:event.giftName},amount,round};
    if(role&&cycleState?.phase){GiftEvents.enqueue(giftSpeechQueue,{...scene,speechAt:Date.now()});queueCycleTakeover(scene);return;}
    if(chosen.action==='thanks'){
     GiftEvents.enqueue(giftSpeechQueue,{...scene,speechAt:Date.now()});
    }else{
     const pending=GiftEvents.enqueue(giftSceneQueue,scene);
     pending.readyAt=Date.now()+2500;
     giftTraffic.pump();
    }
  }
}
function showWeddingHolder(role,holder){
   const actor=rigs[role]?.el;
   if(!actor)return;
   const old=actor.querySelector('.wedding-role-guest');
   if(old?.dataset.userId===holder?.id&&old?.title===holder?.name)return;
   old?.remove();
   if(holder){
    const badge=guestLabel(holder);
    const letters=Array.from(holder.name);
    badge.querySelector('.guest-name').textContent=letters.length>8?letters.slice(0,8).join('')+'…':holder.name;
    badge.classList.add('wedding-role-guest');
    actor.append(badge);
   }
}
let lastWeddingTransition=null;
let cycleState=null,cycleLocked=false;const cycleVoiceQueue=[],cycleRoleChanges=new Map();let cycleTakeoverRunning=false,cycleActiveRole=null;
async function queueCycleTakeover(scene){
 cycleRoleChanges.set(scene.event.role,scene);
 if(cycleTakeoverRunning)return;cycleTakeoverRunning=true;interruptSpeech();const generation=speechGeneration;
 try{if(ws?.readyState===1)ws.send(JSON.stringify({type:'weddingTakeover',key:cycleState?.key,active:true}));for(const task of cycleVoiceQueue.splice(0))task.resolve();await WeddingCycleView.interrupt();while(cycleRoleChanges.size&&generation===speechGeneration){const [role,next]=cycleRoleChanges.entries().next().value;cycleRoleChanges.delete(role);cycleActiveRole=role;await playGiftScene(next,generation);cycleActiveRole=null;}}catch(error){console.error(error);}finally{cycleActiveRole=null;cycleTakeoverRunning=false;if(generation!==speechGeneration)cycleRoleChanges.clear();if(ws?.readyState===1)ws.send(JSON.stringify({type:'weddingTakeover',key:cycleState?.key,active:false}));if(cycleCancelPending){const scene=cycleCancelPending;cycleCancelPending=null;runCycleCancel(scene);}else WeddingCycleView.resume();}
}
let cycleCancelPending=null;
function queueCycleCancel(scene){cycleRoleChanges.clear();if(cycleTakeoverRunning){cycleCancelPending=scene;return;}runCycleCancel(scene);}
async function runCycleCancel(scene){
 cycleTakeoverRunning=true;interruptSpeech();const generation=speechGeneration,key=cycleState?.key;
 GiftEvents.enqueue(giftSpeechQueue,{...scene,speechAt:Date.now()});
 try{for(const task of cycleVoiceQueue.splice(0))task.resolve();await WeddingCycleView.interrupt();await playCancelScene(scene,generation);}
 catch(error){console.error('Hủy hôn:',error);}
 finally{cycleTakeoverRunning=false;WeddingCycleView.abandon(key);if(ws?.readyState===1)ws.send(JSON.stringify({type:'weddingCancelDone',key}));}
}
// Khách đi lên giữa đôi cưới, đóng dấu HỦY HÔN, cô dâu và chú rể văng về hai phía.
async function playCancelScene(scene,generation){
 const alive=()=>generation===speechGeneration&&scene.round===round;
 const user=scene.gift,el=makeGuest(user,true),original=findGuestElement(user.id),seat=HallLayout.seats[user.seat]||waitingSpot(user.id);
 const stage=$('stage'),groomAt=WeddingCycleView.rolePosition('groom'),brideAt=WeddingCycleView.rolePosition('bride');
 const target={x:((groomAt?.x??485)+(brideAt?.x??615))/2,y:Math.max(groomAt?.y??720,brideAt?.y??720)+22};
 const points=[{x:seat.x,y:seat.y},{x:540,y:seat.y},{x:540,y:target.y},target].filter((p,i,all)=>!i||Math.hypot(p.x-all[i-1].x,p.y-all[i-1].y)>1);
 el.classList.add('takeover-attacker','is-walking');el.querySelector('.carried-envelope').hidden=true;el.querySelector('.puppet-cup')?.remove();
 el.style.setProperty('--walk-facing',target.x<seat.x?'-1':'1');$('walkers').append(el);original?.classList.add('away');
 stage.classList.add('takeover-active','wedding-cancel-active');
 const actors=[],stamp=document.createElement('div');stamp.className='wedding-cancel-stamp';stamp.textContent='HỦY HÔN';
 try{
  const offsets=HallLayout.routeOffsets(points),walk=el.animate(points.map((p,i)=>({transform:`translate(${p.x-parseFloat(el.style.width)/2}px,${p.y-parseFloat(el.style.height)}px)`,offset:offsets[i]})),{duration:1400,fill:'forwards',easing:'linear'});
  walkingAnimations.add(walk);try{await walk.finished;}catch{}finally{walkingAnimations.delete(walk);el.classList.remove('is-walking');}
  if(!alive())return;
  stamp.style.top=(target.y-250)+'px';stamp.style.left=target.x+'px';$('gift-stage-fx').append(stamp);
  await sleepScene(450,generation);if(!alive())return;
  for(const [role,direction]of [['groom',-1],['bride',1]]){
   const rig=rigs[role].el,incoming=rig.querySelector('.comic-figure'),actor=comicFigure(role,false);
   actor.classList.add('stage-role-outgoing');rig.append(actor);if(incoming)incoming.hidden=true;
   actor.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${direction*420}px,-240px) rotate(${direction*140}deg) scale(.1)`,opacity:0}],{duration:800,easing:'ease-out',fill:'forwards'});
   actors.push({actor,incoming});
  }
  await sleepScene(2600,generation);
 }finally{
  for(const {actor,incoming}of actors){actor.remove();if(incoming)incoming.hidden=false;}
  stamp.remove();el.remove();original?.classList.remove('away');stage.classList.remove('takeover-active','wedding-cancel-active');
 }
}
function syncState(saved,pending=[]){if(!saved)return;FAST=saved.speed||1;S.teamCounts=saved.teamCounts??null;S.waitingCount=saved.waitingCount??null;S.waitingIds=saved.waitingIds??null;S.guestCount=saved.guestCount??Object.keys(saved.users).length;
  if(round!==saved.round){for(const timer of visualTimers)clearTimeout(timer);visualTimers.clear();clearWalks();cancelSpeech();chatBubbles.clear();thankRows.clear();$('thanks').replaceChildren();for(const guest of guestEls.values())guest.remove();guestEls.clear();S.users.clear();$('fx').replaceChildren();round=saved.round;S.couple=[...saved.couple];showWeddingHolder('groom');showWeddingHolder('bride');rollcallState=null;rollcallExclusive=false;rollcallIntroId=null;$('stage').dataset.giftWalks='0';giftTraffic.reset();giftSpeechQueue.length=0;heartReserved=false;$('gift-stage-fx').replaceChildren();host=MCPolicy.createHost();clearArrivals();}
  const ids=new Set(Object.keys(saved.users));for(const id of S.users.keys())if(!ids.has(id))S.users.delete(id);for(const user of Object.values(saved.users))Object.assign(getUser(user),user);
  setText('receipt-count','🎁 '+(saved.receipts||0).toLocaleString('vi-VN')+' lượt quà');setText('wish-count','✨ '+(saved.wishes||0).toLocaleString('vi-VN')+' lời chúc');S.topDonors=Array.isArray(saved.topDonors)?saved.topDonors:null;S.recentGifts=saved.recentGifts||(saved.lastGift?[saved.lastGift]:[]);S.lastGift=saved.lastGift;S.total=saved.total;S.teamMoney=saved.teamMoney;S.likes=saved.likes;const deferred=new Set();
  for(const event of pending)if(event.weddingRole)deferred.add(event.weddingRole.role||(event.weddingRole.title==='cô dâu'?'bride':'groom'));
  for(const scene of [...giftSceneQueue,...Array.from(giftTraffic.active.values(),ticket=>ticket.scene)]){
   if(scene.event.activity==='takeover')deferred.add(scene.event.role);
  }
  for(const [index,role] of ['groom','bride'].entries()){
   if(deferred.has(role)||cycleRoleChanges.has(role)||cycleActiveRole===role)continue;
   const holder=saved.weddingRoles?.[role];
   S.couple[index]=holder?.name||(saved.ceremony?.phase?(role==='groom'?'Chú rể':'Cô dâu'):saved.couple[index]);
   showWeddingHolder(role,holder);
  }
  const nextRollcall=saved.rollcall||null;
  if(Rollcall.live(rollcallState)&&nextRollcall?.phase==='cancelled'){
   interruptSpeech();mc.current=null;rollcallGiftSpeech.length=0;rollcallApplause.pause();
  }
  if(Rollcall.live(nextRollcall)){
   if(!Rollcall.live(rollcallState)||rollcallState.id!==nextRollcall.id){
    const deferredScenes=[...giftSceneQueue,...Array.from(giftTraffic.active.values(),ticket=>ticket.scene)];
    const interruptedThanks=mc.current?.kind==='gift'?mc.current.giftBatch||[]:[];
    cancelSpeech();
    clearWalks();
    clearArrivals();
    giftTraffic.pause();
    giftTraffic.reset();
    giftTraffic.pause();
    giftSceneQueue.push(...deferredScenes);
    for(const scene of interruptedThanks)GiftEvents.enqueue(giftSpeechQueue,scene);
    rollcallGiftSpeech.length=0;
   }
   rollcallExclusive=true;
   heartReserved=false;
   giftTraffic.pause();
  }
  rollcallState=nextRollcall;RollcallView.sync(rollcallState);cycleState=saved.ceremony||null;WeddingCycleView.sync(saved);
  const transition=cycleState?.transition;
  if(transition&&lastWeddingTransition!==transition.key){
   lastWeddingTransition=transition.key;
   const alive=()=>cycleState?.transition?.key===transition.key;
   const done=()=>{if(alive()&&ws?.readyState===1)ws.send(JSON.stringify({type:'weddingTransitionDone',key:transition.key}));};
   if(!S.soundOn||previewMuted)done();
   else cycleVoiceQueue.push({text:transition.text,key:transition.key,alive,resolve:done});
  }
  syncHeart(saved);layoutGuests();renderBoards();
}
function applyCmd(command){MCPolicy.setRuntime(command.name,command.value);switch(command.name){case'sound':configuredSound=!!command.value;S.soundOn=configuredSound&&!previewMuted;if(!S.soundOn){cancelSpeech();rollcallApplause.pause();}break;case'music':musicController.configure({enabled:command.value});break;case'musicvol':musicController.configure({volume:command.value});break;case'rate':S.rate=clamp(Number(command.value)||1,.7,1.5);break;case'readcmt':S.readCmt=!!command.value;break;case'voice_mc':case'voice_bride':case'voice_groom':S.voices[command.name.slice(6)]=String(command.value||'');break;case'voice':talk('testVoice');break;}}
const renderQueue=new LiveRenderQueue({sync:syncState,event:handle,onStats:stats=>{$('stage').dataset.eventBacklog=String(stats.pending);$('stage').dataset.renderMs=stats.ms.toFixed(2);$('stage').dataset.renderPeakMs=Math.max(Number($('stage').dataset.renderPeakMs)||0,stats.ms).toFixed(2);}});
function connectWS(){ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);ws.onopen=()=>{wsUp=true;musicController.configure({connected:true,muted:previewMuted});ws.send(JSON.stringify({type:'hello',role:'game',mute:previewMuted,...(Q.get('test')?{testSession:Q.get('test')}:{})}));};ws.onmessage=message=>{try{const data=JSON.parse(message.data);if(data.type==='weddingConfig'){window.cycleConfig=data.config;renderGiftMenu();}else if(data.type==='heartEvents'){heartConfig=data.config;heartState=null;renderHeartProgress();}else if(data.type==='giftEvents'){giftConfig=data.config;renderGiftMenu();}else if(data.type==='state')renderQueue.push(data.state);else if(data.type==='liveBatch')renderQueue.push(data.state,data.events);else if(data.type==='cmd')applyCmd(data);else if(data.type==='playlist')musicController.setPlaylist(Playlist.urls(data));else if(data.type==='scripts')MCPolicy.setScripts(data.rows);else if(data.type==='ui')Object.entries(data.ui).forEach(([name,value])=>applyCmd({name,value}));}catch(error){console.error(error);}};ws.onclose=()=>{renderQueue.clear();wsUp=false;musicController.configure({connected:false});RollcallView.sync(null);cancelSpeech();setTimeout(connectWS,2000);};}
function fit(){$('stage').style.transform=`scale(${Math.min(innerWidth/1080,innerHeight/1920)})`;}
addEventListener('resize',fit);fit();addEventListener('pointerdown',()=>{musicController.start();if(audioBlocked){audioBlocked=false;$('unlock')?.remove();talk('testVoice');}});
async function cycleClip(src,alive,fallback=0){
 if(previewMuted||!S.soundOn){const until=Date.now()+fallback;while(alive()&&Date.now()<until)await sleep(40);return;}
 const audio=new Audio(src);audio.volume=cycleState?.config?.volume??.6;let timer,limit;setMusicDucked(true,'cycle');
 try{await new Promise(resolve=>{const done=()=>resolve();audio.onended=audio.onerror=done;timer=setInterval(()=>{if(!alive())done();},40);limit=setTimeout(done,30000);audio.play().catch(done);});}finally{clearInterval(timer);clearTimeout(limit);audio.pause();setMusicDucked(false,'cycle');}
}
function initWeddingCycle(){
 WeddingCycleView.init({stage:$('stage'),rigs,tables:HallLayout.tables,roleName:role=>{const name=S.couple[role==='groom'?0:1];return BAD_WORDS.test(name)?(role==='groom'?'Chú rể':'Cô dâu'):MCPolicy.spokenName(name);},spokenName:MCPolicy.spokenName,config:()=>window.cycleConfig,
 speak:(text,who,key,alive)=>new Promise(resolve=>cycleVoiceQueue.push({text,who,key,alive,resolve})),
 hold:key=>{if(ws?.readyState===1)ws.send(JSON.stringify({type:'weddingPhaseHold',key}));},
 quiet:()=>{if(!mc.current&&!cycleVoiceQueue.length){$('bubble').classList.remove('show');}},
 heart:(action,options)=>HeartScenes.play(action,{container:$('heart-scene'),groom:rigs.groom.el,bride:rigs.bride.el,...options}),
 zo:alive=>cycleClip('/assets/music/zo.mp3',alive,2800),
 park:async alive=>{const stage=$('stage'),floor=$('park-dance');stage.classList.add('park-dance-playing');floor.hidden=false;const stop=WeddingFireworks.start(stage,alive,{interval:350,showHearts:false});try{await cycleClip('/assets/music/cong-vien-lam-lang.mp3',alive,7584);}finally{stop();floor.hidden=true;stage.classList.remove('park-dance-playing');}},
 applause:alive=>cycleClip('/assets/music/park-applause.mp3',alive,800),
 fireworks:alive=>WeddingFireworks.start($('stage'),alive,{interval:220}),spark:()=>{const until=Date.now()+1800;WeddingFireworks.start($('stage'),()=>Date.now()<until,{interval:500});},
 chat:text=>{if(Date.now()-lastInteractionAt>4000&&!mc.current&&!mc.queue.length)queueReply(MCPolicy.item('idle',[['mc',text]],Date.now()));},
 done:key=>{if(ws?.readyState===1)ws.send(JSON.stringify({type:'weddingPhaseDone',key}));},
 lock:value=>{cycleLocked=value;if(value&&cycleState?.phase==='show')giftTraffic.pause();else if(!Rollcall.live(rollcallState)&&!heartReserved)giftTraffic.resume();}
 });
 const queue=document.createElement('div');queue.id='cycle-queue';$('camera-world').append(queue);
 let queueIndex=0,queueChangedAt=0,queueSignature='';
 setInterval(()=>{
  const c=cycleState;renderHeartProgress();const count=Math.min(5,Math.max(c?.queues?.bride?.length||0,c?.queues?.groom?.length||0));
  queue.hidden=false;if(!count){if(queue.dataset.empty!=='true'){queue.dataset.empty='true';queue.innerHTML='<h2>♥ ĐÔI CƯỚI CHỜ</h2><small>Chưa có đôi đăng ký</small>';}return;}if(queue.dataset.empty==='true'){delete queue.dataset.empty;queueSignature='';}
  const signature=JSON.stringify(c.queues);if(signature!==queueSignature){queueSignature=signature;queueIndex=Math.min(queueIndex,count-1);queueChangedAt=Date.now();queue.replaceChildren();}
  if(Date.now()-queueChangedAt>=6500){queueIndex=(queueIndex+1)%count;queueChangedAt=Date.now();queue.replaceChildren();}
  if(queue.childElementCount)return;
  const rank=document.createElement('b');rank.className='couple-order';rank.textContent=String(queueIndex+1);
  const text=document.createElement('span');text.className='couple-wait-names';
  for(const [role,title]of [['groom','Rể'],['bride','Dâu']]){const row=document.createElement('span');row.className='couple-wait-person';const prefix=document.createElement('small');prefix.textContent=title+':';row.append(prefix);const person=c.queues[role][queueIndex];if(person)row.append(guestLabel(person));else{const empty=document.createElement('span');empty.className='guest-name';empty.textContent='Chờ ghép đôi';row.append(empty);}text.append(row);}
  const heading=document.createElement('h2');heading.textContent='♥ ĐÔI CƯỚI CHỜ';const card=document.createElement('div');card.className='couple-wait-card';card.append(rank,text);queue.append(heading,card);
 },250);

}
(async()=>{try{await loadAssets();buildTables();buildCharacters();initWeddingCycle();connectWS();mcLoop();window.__game={S,guestEls,walkJobs,layoutGuests};}catch(error){console.error(error);reportAudio(false,'Không tải đủ ảnh game. Vui lòng tải lại trang.');}})();

// Change preview data without reloading sprites or losing browser audio permission.
window.setPreviewSession=id=>{
 if(!rigs.mc)return false;
 const next=id?String(id):null;if((Q.get('test')||null)===next)return true;
 if(next)Q.set('test',next);else Q.delete('test');
 const old=ws;if(old){old.onopen=null;old.onclose=null;old.onmessage=null;old.close();}
 wsUp=false;renderQueue.clear();cancelSpeech();round=null;heartState=null;heartRound=null;rollcallState=null;rollcallExclusive=false;rollcallIntroId=null;RollcallView.sync(null);giftTraffic.reset();giftSpeechQueue.length=0;heartReserved=false;
 clearWalks();$('gift-stage-fx').replaceChildren();updateTestBadge();connectWS();return true;
};

window.getRollcallPreviewState=()=>rollcallState;
window.getWeddingPreviewState=()=>cycleState;

// Same-origin preview control: changes only this frame, never global sound settings.
window.setPreviewAudio=async enabled=>{
 previewMuted=!enabled;rollcallIntroId=null;cancelSpeech();host=MCPolicy.createHost();S.soundOn=configuredSound&&!previewMuted;
 musicController.configure({muted:previewMuted});
 if(previewMuted)rollcallApplause.pause();
 if(ws?.readyState===1)ws.send(JSON.stringify({type:'hello',role:'game',mute:previewMuted,...(Q.get('test')?{testSession:Q.get('test')}:{})}));
 if(enabled){const Context=window.AudioContext||window.webkitAudioContext;speechPlayer.context ||=new Context({sampleRate:48000});const resumed=speechPlayer.context.resume();musicController.start();await resumed;audioBlocked=false;$('unlock')?.remove();}
 return !previewMuted;
};

let meterRunning=false;
function startMeter(){
 if(meterRunning)return;meterRunning=true;let sampleAt=performance.now(),frames=0;
 const meter=now=>{if(!Q.has('test')){meterRunning=false;return;}frames++;
 if(now-sampleAt>=2000){const stage=$('stage'),fps=Math.round(frames*1000/(now-sampleAt));stage.dataset.fps=String(fps);stage.dataset.walkWaiting=String(walkWaiting.length+giftSceneQueue.length);stage.dataset.voiceWaiting=String(mc.queue.length+mc.gifts.length+giftSpeechQueue.length+Math.max(0,(heartState?.earned||0)-heartLocal-(mc.current?.kind==='heart'?1:0)));
 sampleAt=now;frames=0;}requestAnimationFrame(meter);};requestAnimationFrame(meter);
}
function updateTestBadge(){document.querySelector('.load-test-badge')?.remove();if(!Q.has('test'))return;const badge=document.createElement('div');badge.textContent='PHIÊN THỬ';badge.className='load-test-badge';$('stage').appendChild(badge);startMeter();}
updateTestBadge();
const arrivals={queue:[],seen:new Map(),timer:null,active:false};
function clearArrivals(){clearTimeout(arrivals.timer);arrivals.queue=[];arrivals.seen.clear();arrivals.active=false;$('arrival-toast').hidden=true;}
function arrival(user,viewer){const now=Date.now();if(now-(arrivals.seen.get(user.id)||0)<120000)return;arrivals.seen.set(user.id,now);if(arrivals.seen.size>500)arrivals.seen.delete(arrivals.seen.keys().next().value);arrivals.queue.push({user:{id:user.id,name:user.name,avatar:user.avatar},viewer});if(arrivals.queue.length>30)arrivals.queue.shift();if(!arrivals.active)nextArrival();}
function nextArrival(){if(!arrivals.queue.length){arrivals.active=false;$('arrival-toast').hidden=true;return;}arrivals.active=true;const batch=arrivals.queue.splice(0,arrivals.queue.length>3?arrivals.queue.length:1),first=batch[0],box=$('arrival-toast');box.replaceChildren(guestLabel(first.user),document.createTextNode((batch.length>1?' +'+(batch.length-1)+' bạn':'')+(first.viewer?' vào live':' vào tiệc')));box.hidden=false;arrivals.timer=setTimeout(nextArrival,2600);}
let giftMenuAnimation=null;
let giftIconTimer;
function renderGiftMenu(){
 giftMenuAnimation?.cancel();
 clearInterval(giftIconTimer);
 const box=$('gift-menu'),list=$('gift-menu-list'),view=$('gift-menu-window');
 list.replaceChildren();
 view.style.height=giftConfig.board.height+'px';
 const rotating=[];
 function addRow(key,title,suffix=''){
  const gifts=GiftEvents.selected(giftConfig,key);
  if(!gifts.length)return;
  const row=document.createElement('div'),icon=document.createElement('span'),img=document.createElement('img');
  row.className='gift-menu-row';
  const label=document.createElement('div'),name=document.createElement('b'),price=document.createElement('small');
  name.textContent=title;
  price.textContent=gifts[0].coins+' xu'+suffix;
  img.src=gifts[0].icon;img.alt=gifts[0].name;img.title=gifts[0].name;
  if(gifts.length>1)rotating.push({img,gifts,index:0});
  icon.append(img);label.append(name,price);row.append(icon,label);list.append(row);
 }
 const envelope=giftConfig.events.find(event=>event.enabled&&event.coins===1);
 if(envelope)addRow('thanks',envelope.name);
 for(const group of WeddingCycle.joinGifts)addRow('signup-'+group.role,group.role==='bride'?'Đăng ký cô dâu':'Đăng ký chú rể',' · chờ lượt');
 for(const group of GiftEvents.roleGifts)addRow(group.role,giftConfig.specialNames?.[group.role]??group.title);
 addRow('cancel',giftConfig.specialNames?.cancel??GiftEvents.cancelGift.title);
 if(giftConfig.board.enabled&&rotating.length)giftIconTimer=setInterval(()=>{
  for(const row of rotating){
   row.index=(row.index+1)%row.gifts.length;
   const gift=row.gifts[row.index];
   row.img.src=gift.icon;row.img.alt=gift.name;row.img.title=gift.name;
  }
 },2500);
 box.hidden=!giftConfig.board.enabled;
 requestAnimationFrame(()=>{const distance=list.scrollHeight-view.clientHeight;if(distance<=0)return;const duration=distance/giftConfig.board.speed*1000;giftMenuAnimation=list.animate([{transform:'translateY(0)',offset:0},{transform:'translateY(0)',offset:.1},{transform:`translateY(-${distance}px)`,offset:.8},{transform:`translateY(-${distance}px)`,offset:1}],{duration:duration+3500,iterations:Infinity,direction:'alternate',easing:'linear'});});
}
async function waitGiftSpeechStart(scene,generation){while(scene.ack&&!scene.ack.started&&generation===speechGeneration)await sleepScene(50,generation);}
function enterGiftStage(generation){
 if(!giftStageGroup||giftStageGroup.generation!==generation){
  giftStageGroup?.poses.forEach(a=>a.cancel());giftStageGroup?.dancers?.forEach(a=>a.cancel());
  giftStageGroup={generation,users:0,danceUsers:0,dancers:null,toast:null,poses:['groom','bride'].map((who,i)=>rigs[who].el.animate([{translate:'0 0'},{translate:(i?155:-155)+'px 0'}],{duration:350,fill:'forwards'}))};
 }
 giftStageGroup.users++;return giftStageGroup;
}
function leaveGiftStage(group){if(--group.users===0){group.poses.forEach(a=>a.cancel());if(giftStageGroup===group)giftStageGroup=null;}}
function sharedGiftToast(group,generation){
 if(group.toast)return group.toast;
 const cups=document.createElement('div');cups.className='gift-toast-cups';cups.textContent='🥂　🥂　🥂';$('gift-stage-fx').append(cups);
 group.toast=playZo(generation).finally(()=>{cups.remove();group.toast=null;});return group.toast;
}
async function playGiftScene(scene,generation,slot=0){
 if(scene.round!==round||generation!==speechGeneration)return;
 $('stage').dataset.giftWalks=String((Number($('stage').dataset.giftWalks)||0)+1);$('stage').dataset.lastGiftCoins=String(scene.gift.coins);$('stage').dataset.lastGiftWalkAt=String(Date.now());
 const user=scene.gift,el=makeGuest(user,true),original=findGuestElement(user.id),seat=HallLayout.seats[user.seat]||waitingSpot(user.id);el.dataset.giftSlot=String(slot);$('walkers').append(el);original?.classList.add('away');
 const envelope=el.querySelector('.carried-envelope');setGiftIcon(envelope,{...scene.event,iconImage:scene.event.giftImage,icon:scene.event.propIcon||'✉️'});envelope.classList.add('scene-prop');if(scene.event.action==='envelope')el.querySelector('.puppet-cup')?.remove();if(scene.event.action==='stage'){envelope.hidden=true;el.querySelector('.puppet-cup')?.remove();}
 const path=(scene.event.activity==='takeover'?(Number.isInteger(seat.table)?HallLayout.route(seat,1,true):[{x:seat.x,y:seat.y},{x:540,y:seat.y},{x:540,y:820},{x:940,y:760}]):HallLayout.groundRoute(seat,slot)).map(p=>({...p}));
 // Separate lanes and stage slots let several guests walk up without hiding one another.
 if(scene.event.activity==='takeover'||scene.event.action==='stage')for(let i=1;i<path.length-1;i++)if(Math.abs(path[i].x-540)<50)path[i].x+=(slot-1.5)*44;
 if(scene.event.activity==='takeover'){const position=WeddingCycleView.rolePosition(scene.event.role);if(position){const approach=scene.event.role==='bride'?-65:65;path.splice(1,path.length-1,{x:540,y:seat.y},{x:540,y:position.y},{x:position.x+approach,y:position.y});}else path[path.length-1]={x:scene.event.role==='bride'?610:465,y:720};}
 else if(scene.event.action==='stage')path[path.length-1]={x:425+slot*80,y:720};
 else path[path.length-1]={x:HallLayout.giftBox.deposit.x-slot%2*35,y:HallLayout.giftBox.deposit.y+Math.floor(slot/2)*10};
 const move=async points=>{
  el.classList.add('is-walking');
  const offsets=HallLayout.routeOffsets(points),length=HallLayout.routeLength(points);
  const duration=scene.event.activity==='takeover'?1400:scene.event.action==='envelope'?clamp(length/WALK_SPEED*1000,500,3200):1900;
  // Nhân vật quay mặt theo đúng đoạn đường đang đi, đoạn đi thẳng đứng thì giữ hướng cũ.
  const turns=[];let facing=points.at(-1).x<points[0].x?'-1':'1';
  for(let i=1;i<points.length;i++){const dx=points[i].x-points[i-1].x;if(Math.abs(dx)<4)continue;const next=dx<0?'-1':'1';if(!turns.length)facing=next;else if(next===facing&&turns.at(-1).value===next)continue;turns.push({at:offsets[i-1]*duration,value:next});}
  el.style.setProperty('--walk-facing',turns[0]?.value||facing);
  const timers=turns.slice(1).map(turn=>setTimeout(()=>el.style.setProperty('--walk-facing',turn.value),turn.at));
  const animation=el.animate(points.map((p,i)=>({transform:`translate(${p.x-parseFloat(el.style.width)/2}px,${p.y-parseFloat(el.style.height)}px)`,offset:offsets[i]})),{duration,fill:'forwards',easing:'linear'});
  walkingAnimations.add(animation);
  try{await animation.finished;}catch{}finally{timers.forEach(clearTimeout);el.classList.remove('is-walking');walkingAnimations.delete(animation);}
 };
 let present=null;if(scene.event.activity==='takeover'){el.classList.add('takeover-attacker');$('stage').classList.add('takeover-active');$('stage').dataset.takeoverRole=scene.event.role;}
 try{
  await move(path);if(generation!==speechGeneration||scene.round!==round)return;
  if(scene.event.activity==='takeover'){
   const bride=scene.event.role==='bride',direction=bride?1:-1;
   const rig=rigs[scene.event.role].el;
   const incoming=rig.querySelector('.comic-figure');
   const actor=comicFigure(scene.event.role,false);
   actor.classList.add('stage-role-outgoing');
   rig.append(actor);
   if(incoming)incoming.hidden=true;
   const runner=el.querySelector('.guest-puppet');
   await sleepScene(250,generation);if(generation!==speechGeneration)return;
   const kick=runner.animate([{transform:'translateX(0) rotate(0deg)'},{transform:`translateX(${-direction*18}px) rotate(${-direction*12}deg)`,offset:.25},{transform:`translateX(${direction*65}px) rotate(${direction*22}deg)`,offset:.65},{transform:'translateX(0) rotate(0deg)'}],{duration:650});
   walkingAnimations.add(kick);
   await sleepScene(380,generation);
   present=document.createElement('img');
   present.src='/assets/props/role-kick-impact.svg';
   present.alt='';
   present.className='role-kick-impact';
   const position=WeddingCycleView.rolePosition(scene.event.role);present.style.left=(position?.x||(bride?650:430))+'px';if(position)present.style.top=(position.y-145)+'px';
   $('gift-stage-fx').append(present);
   const flight=actor?.animate([
    {transform:'translate(0,0) scale(1)',opacity:1},
    {transform:`translate(${direction*360}px,-215px) rotate(${direction*120}deg) scale(.08)`,opacity:0}
   ],{duration:700,easing:'ease-out',fill:'forwards'});
   try{
    await sleepScene(740,generation);
    if(generation!==speechGeneration||scene.round!==round)return;
    present.remove();
    el.remove();
    showWeddingHolder(scene.event.role,user);
    S.couple[bride?1:0]=user.name;
    setText('couple',S.couple.join(' & '));
   }
   finally{flight?.cancel();actor.remove();if(incoming)incoming.hidden=false;kick.cancel();walkingAnimations.delete(kick);}
  }else if(scene.event.action==='envelope'){
   const from=envelope.getBoundingClientRect(),target=$('giftbox').getBoundingClientRect(),scale=$('stage').getBoundingClientRect().width/1080||1;
   const dx=(target.left+target.width/2-from.left-from.width/2)/scale,dy=(target.top+target.height*.18-from.top-from.height/2)/scale;
   const drop=envelope.animate([{translate:'0 0',scale:1,opacity:1},{translate:dx+'px '+dy+'px',scale:.18,opacity:0}],{duration:450,easing:'ease-in',fill:'forwards'});walkingAnimations.add(drop);
   try{await drop.finished;}catch{}finally{walkingAnimations.delete(drop);drop.cancel();}
   if(generation!==speechGeneration||scene.round!==round)return;
   envelope.hidden=true;deposit({round,amount:scene.amount});await sleepScene(250,generation);
  }else{
   const group=enterGiftStage(generation);
   try{
    await sleepScene(350,generation);if(generation!==speechGeneration||scene.round!==round)return;
    if(scene.event.activity==='dance'){
     if(group.danceUsers++===0)group.dancers=['groom','bride'].map(who=>rigs[who].el.querySelector('.comic-figure')).filter(Boolean).map(node=>node.animate([{rotate:'-9deg',translate:'0 0'},{rotate:'9deg',translate:'0 -16px'},{rotate:'-9deg',translate:'0 0'}],{duration:480,iterations:Infinity}));
     const dancer=el.querySelector('.guest-puppet')?.animate([{rotate:'-9deg',translate:'0 0'},{rotate:'9deg',translate:'0 -16px'},{rotate:'-9deg',translate:'0 0'}],{duration:480,iterations:6});
     try{await sleepScene(2880,generation);}finally{dancer?.cancel();if(--group.danceUsers===0){group.dancers?.forEach(a=>a.cancel());group.dancers=null;}}
    }
    else await sharedGiftToast(group,generation);
   }finally{leaveGiftStage(group);}
  }
  if(scene.event.activity!=='takeover'&&generation===speechGeneration&&scene.round===round)await move([...path].reverse());
 }finally{present?.remove();el.remove();original?.classList.remove('away');if(scene.event.activity==='takeover'){$('stage').classList.remove('takeover-active');delete $('stage').dataset.takeoverRole;}}
}

function setGiftIcon(node,event){node.replaceChildren();if(event.iconImage){const image=document.createElement('img');image.src=event.iconImage;image.alt=event.name;image.onerror=()=>{node.textContent=event.icon;};node.append(image);}else node.textContent=event.icon;}

async function playZo(generation){if(previewMuted||!S.soundOn||audioBlocked){await sleepScene(3000,generation);return;}const audio=new Audio('/assets/music/zo.mp3');audio.volume=.85;setMusicDucked(true,'toast');let timer,watch;try{await new Promise(resolve=>{const finish=()=>resolve();audio.onended=audio.onerror=finish;timer=setTimeout(finish,15000);watch=setInterval(()=>{if(generation!==speechGeneration||!S.soundOn)finish();},100);audio.play().catch(finish);});}finally{clearTimeout(timer);clearInterval(watch);audio.pause();setMusicDucked(false,'toast');}}

function findGuestElement(id){return guestEls.get(id)||Array.from($('reception').children).find(el=>el.dataset.userId===id);}
function waitingSpot(id){const el=findGuestElement(id),width=el?parseFloat(el.style.width)||130:130;return el?{x:parseFloat(el.style.left)+width/2,y:parseFloat(el.style.top)+width,width}:{x:540,y:1700,width};}

function syncHeart(saved){
 if(!saved.heart){heartState=null;renderHeartProgress();return;}
 if(heartRound!==saved.round||heartRevision!==saved.heart.revision){heartLocal=saved.heart.played;heartRound=saved.round;heartRevision=saved.heart.revision;}
 heartState=saved.heart;heartLocal=Math.max(heartLocal,heartState.played);renderHeartProgress();
}
function renderHeartProgress(){
 if(window.cycleConfig&&!cycleState?.phase){$('heart-progress').hidden=true;return;}
 if(cycleState?.phase){const c=cycleState,node=$('heart-progress');node.hidden=false;$('heart-goal').textContent='💍 Lễ '+c.number+' · '+WeddingCycle.names[c.phase];const script=WeddingCycleView.progress;$('heart-count').textContent=script?.busy?(Math.min(script.index+1,script.total)+'/'+script.total):Math.max(0,Math.ceil((c.endsAt-Date.now())/1000))+'s';const progress=(script?.busy?clamp(script.index/script.total*100,0,100):clamp((Date.now()-c.startedAt)/(c.endsAt-c.startedAt)*100,0,100))+'%';$('heart-fill').style.width=progress;$('heart-marker').style.left=progress;return;}
 const earned=HeartEvents.earned(heartConfig,S.likes||0),next=HeartEvents.at(heartConfig,earned),node=$('heart-progress');node.hidden=!heartConfig.board||!heartConfig.enabled||!next;if(!next)return;
 const previous=HeartEvents.at(heartConfig,earned-1)?.likes||0;
 $('heart-goal').textContent='♥ '+next.likes.toLocaleString('vi-VN')+' tim · '+next.name;
 $('heart-count').textContent=(S.likes||0).toLocaleString('vi-VN')+' / '+next.likes.toLocaleString('vi-VN');
 const progress=clamp(((S.likes||0)-previous)/(next.likes-previous)*100,0,100)+'%';
 $('heart-fill').style.width=progress;
 $('heart-marker').style.left=progress;
 node.dataset.pending=String(Math.max(0,(heartState?.earned||0)-heartLocal));
}
async function runHeartScene(){
 const ordinal=heartLocal,event=HeartEvents.at(heartConfig,ordinal),generation=speechGeneration,sceneRound=round,revision=heartConfig.revision;
 if(!event||!heartState)return;const alive=()=>generation===speechGeneration&&sceneRound===round&&revision===heartConfig.revision;
 const item={kind:'heart',createdAt:Date.now(),expiresAt:Infinity};mc.current=item;
 try{
  const assets = HeartScenes.load().then(() => true, () => false);
  await say(event.line.replace(/\{tim\}/g,event.likes.toLocaleString('vi-VN')),'mc',item);
  if(!alive())return;
  if(!await assets)throw new Error('Không tải được hiệu ứng mốc tim.');
  if(!alive())return;
  if(item.failed){await sleep(1200);return;}
  const done=await HeartScenes.play(event.action,{container:$('heart-scene'),groom:rigs.groom.el,bride:rigs.bride.el,alive,sleep:ms=>sleepScene(ms,generation),zo:()=>playZo(generation)});
  if(done&&alive()){heartLocal=ordinal+1;ws?.send(JSON.stringify({type:'heartSceneDone',round,revision,ordinal}));renderHeartProgress();}
 }catch(error){console.error('Sự kiện tim:',error);await sleep(2000);}finally{
  if(!alive()&&rollcallExclusive&&sceneRound===round&&revision===heartConfig.revision&&heartLocal===ordinal){
   heartLocal=ordinal+1;
   ws?.send(JSON.stringify({type:'heartSceneDone',round,revision,ordinal}));
   renderHeartProgress();
  }
  if(mc.current===item)mc.current=null;
 }
}

if(Q.has('capture')){
 document.title='LIVE 9:16 · Đám Cưới Xóm Mình';
 window.addEventListener('load',()=>{
  const height=Math.min(960,Math.max(320,screen.availHeight-120));
  const width=Math.round(height*9/16);
  window.resizeTo(width+(window.outerWidth-window.innerWidth),height+(window.outerHeight-window.innerHeight));
 },{once:true});
}
