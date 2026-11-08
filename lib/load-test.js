'use strict';
const {performance}=require('node:perf_hooks');
const Rules=require('../game/rules'),Party=require('../game/party-engine');
const {publicView,coalesceEvents}=require('./live-view');
const {applySessionEvent}=require('./session-events');
const Rollcall=require('../game/rollcall'),WeddingCycle=require('../game/wedding-cycle');
const SCENARIOS=['realistic','mixed','chat','gift','like','share','join'];
function validateOptions(options={}){
 const integer=(key,fallback,min,max)=>{const n=Number(options[key]??fallback);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(`${key}: chọn từ ${min} đến ${max}.`);return n;};
 const scenario=options.scenario??'realistic';if(!SCENARIOS.includes(scenario))throw Error('Loại thử không hợp lệ.');
 return{guests:integer('guests',100,1,5000),events:integer('events',540,1,20000),rate:integer('rate',3,1,500),scenario};
}
class LoadTest{
 constructor({giftConfig=()=>undefined,onReport=()=>{},onFrame=()=>{},allowed=()=>true,transformState=()=>{},scenarioTick=()=>false}={}){Object.assign(this,{giftConfig,onReport,onFrame,allowed,transformState,scenarioTick});this.room=null;this.serial=0;this.timer=null;}
 create(options={},owner=null,manual=false){
  if(!this.allowed())throw Error('Dừng kết nối TikTok trước khi thử tải.');
  if(this.room?.status==='running')throw Error('Bài thử đang chạy. Bấm Dừng trước.');
  const config=validateOptions(options),now=Date.now(),state=Rules.createState(now);
  if(!manual&&config.scenario!=='realistic'){for(let i=0;i<config.guests;i++)Rules.applyEvent(state,{type:'chat',id:'load_'+i,name:'Khách '+(i+1),text:i%2?'nhà gái':'nhà trai'},now);}
  Party.ensure(state);Party.seating(state,now);this.transformState(state);
  this.room={id:'test-'+now+'-'+(++this.serial),state,config,owner,status:manual?'ready':'running',started:performance.now(),ended:null,processed:0,expected:0,counts:{chat:0,gift:0,like:0,share:0,join:0},coverage:{character:0,food:0,takeover:0,registration:0,rollcall:0,tug:0,wedding:0},giftCoins:0,samples:[],maxEventMs:0,eventMs:0,frames:0,bytes:0,pending:[],lastFrame:0,lastReport:0,reason:''};
  this.frame(true);this.report(true);if(!manual)this.pump();return this.room;
 }
 has(id){return !!this.room&&this.room.id===id;}
 snapshot(id){return this.has(id)?publicView(this.room.state):null;}
 event(index){const c=this.room.config;
  if(c.scenario==='realistic'){
   const spacing=Math.max(3,Math.floor(c.events*.65/c.guests));
   const arrived=Math.min(c.guests,Math.floor(index/spacing)+1),birth=Math.floor(index/spacing);
   const fresh=birth<c.guests&&index%spacing<2;
   const id=fresh?birth:(index*7+Math.floor(index/c.rate))%arrived;
   const base={id:'load_'+id,name:'Khách '+(id+1)};
   if(fresh)return{...base,type:index%spacing===0?'join':'chat',...(index%spacing===1?{text:id%2?'nhà gái':'nhà trai'}:{})};
   const giftEvery=Math.max(6,c.rate*12),giftNumber=Math.floor(index/giftEvery);
   if(index%giftEvery===giftEvery-1){
    const gifts=[{coins:1,giftName:'Rose'},{coins:1,giftName:'GG'},{coins:5,giftName:'Finger Heart'},{coins:1,giftName:'TikTok'},{coins:1,giftName:'Rose'},{coins:5,giftName:'Peach'}];
    return{...base,type:'gift',...gifts[giftNumber%gifts.length]};
   }
   if(index%Math.max(8,c.rate*18)===c.rate*18-2)return{...base,type:'share'};
   const requests=['đổi thành thiếu niên','đổi thành thiếu nữ','cho em gà','đổi nữ trung niên','đổi nam trung niên','đổi nhân vật LGBT','lên món','cho em xôi','đổi nhân vật khác'];
   if(index%Math.max(5,c.rate*7)===c.rate*7-2)return{...base,type:'chat',text:requests[Math.floor(index/(c.rate*7))%requests.length]};
   if(index%3!==0)return{...base,type:'like',count:1+index%5};
   const chats=['Xin chào hai họ!','Chúc hai bạn hạnh phúc!','Cô dâu đẹp quá','Tiệc vui ghê','MC đọc thơ nhé','Chúc mừng đôi cưới!','cô dâu tên gì','nhà trai','nhà gái'];
   return{...base,type:'chat',text:chats[Math.floor(index/3)%chats.length]};
  }
  const type=c.scenario==='mixed'?(index%10===0?'gift':index%10===1?'share':index%10===2?'join':index%3===0?'chat':'like'):c.scenario,id=index%c.guests;
  return{type,id:'load_'+id,name:'Khách '+(id+1),...(type==='gift'?{coins:Math.floor(index/10)%5+1,giftName:'Quà thử tải'}:type==='chat'?{text:['Chúc hai bạn hạnh phúc!','nhà trai','nhà gái','MC đọc thơ nhé'][index%4]}:type==='like'?{count:3}:{})};
 }
 apply(raw){const room=this.room,start=performance.now(),now=Date.now(),event=applySessionEvent(room.state,raw,now,this.giftConfig());if(!event)return false;
  this.transformState(room.state);room.pending.push(event);room.processed++;room.counts[event.type]++;
  if(event.characterResult&&!event.characterResult.error)room.coverage.character++;
  if(event.food)room.coverage.food++;
  if(event.weddingRole)room.coverage.takeover++;
  if(event.ceremonyRegistration?.accepted)room.coverage.registration++;
  if(event.type==='gift'&&!event.rollcallId){room.expected+=event.coins*10000;room.giftCoins+=event.coins;}
  const ms=performance.now()-start;room.eventMs+=ms;room.maxEventMs=Math.max(room.maxEventMs,ms);room.samples.push(ms);if(room.samples.length>512)room.samples.shift();return true;
 }
 pump(){try{this.step();}catch(error){clearTimeout(this.timer);if(this.room){this.room.status='error';this.room.reason=error.message;this.room.ended=performance.now();this.report(true);}}}
 step(){
  const room=this.room;if(!room||room.status!=='running')return;
  if(!this.allowed()){this.stop('Đã dừng vì đang kết nối TikTok');return;}
  const now=performance.now(),limit=room.config.scenario==='realistic'?Math.min(300000,room.config.events/room.config.rate*1000+2000):120000;
  if(now-room.started>=limit){this.stop('Đã hết thời gian thử');return;}
  const changed=room.config.scenario==='realistic'&&this.scenarioTick(room,now-room.started);
  const target=Math.min(room.config.events,Math.floor((now-room.started)*room.config.rate/1000)),start=performance.now();let n=0;
  while(room.processed<target&&performance.now()-start<6&&n++<(room.config.scenario==='realistic'?1:100))this.apply(this.event(room.processed));
  this.frame(changed);this.report();
  if(room.processed>=room.config.events){room.status='completed';room.ended=performance.now();this.stopScenario();this.frame(true);this.report(true);return;}
  this.timer=setTimeout(()=>this.pump(),20);this.timer.unref?.();
 }
 frame(force=false){const r=this.room;if(!r)return;const now=performance.now();if(!force&&(now-r.lastFrame<100||!r.pending.length))return;r.lastFrame=now;
  const packet={type:'liveBatch',state:publicView(r.state),events:coalesceEvents(r.pending.splice(0)),now:Date.now()};r.frames++;r.bytes+=Buffer.byteLength(JSON.stringify(packet));this.onFrame(packet,r.id);
 }
 metrics(){const r=this.room;if(!r)return null;const elapsed=Math.max(1,(r.ended??performance.now())-r.started),samples=[...r.samples].sort((a,b)=>a-b);return{id:r.id,status:r.status,config:r.config,processed:r.processed,elapsedMs:Math.round(elapsed),actualRate:Math.round(r.processed*1000/elapsed),counts:{...r.counts},giftCoins:r.giftCoins,expectedDuyen:r.expected/10000,actualDuyen:r.state.total/10000,scoreMatches:r.state.total===r.expected,avgEventMs:r.processed?Number((r.eventMs/r.processed).toFixed(3)):0,p95EventMs:Number((samples[Math.floor(samples.length*.95)]||0).toFixed(3)),maxEventMs:Number(r.maxEventMs.toFixed(3)),heapMB:Math.round(process.memoryUsage().heapUsed/1048576),frames:r.frames,wireKB:Math.round(r.bytes/1024),guests:Object.keys(r.state.users).length,reason:r.reason,coverage:{...r.coverage}};}
 report(force=false){const r=this.room;if(!r)return;const now=performance.now();if(!force&&now-r.lastReport<500)return;r.lastReport=now;this.onReport(this.metrics());}
 stopScenario(){const r=this.room;if(!r||r.config.scenario!=='realistic')return;Rollcall.cancel(r.state.rollcall);if(r.scenarioConfig){r.scenarioConfig.wedding.enabled=false;WeddingCycle.tick(r.state,r.scenarioConfig.wedding);}}
 stop(reason='Đã dừng theo yêu cầu'){clearTimeout(this.timer);this.timer=null;if(!this.room)return;if(this.room.status==='running'){this.room.status='stopped';this.room.ended=performance.now();this.room.reason=reason;this.stopScenario();}this.frame(true);this.report(true);}
 inject(event,owner){if(!this.allowed())throw Error('Dừng kết nối TikTok trước khi thử nghiệm.');if(this.room?.status==='running')throw Error('Dừng thử tải trước khi thử từng tương tác.');if(this.room?.status!=='ready')this.create({},owner,true);this.apply(event);this.frame(true);this.report(true);}
 clear(owner){if(this.room?.status==='running')this.stop();return this.create({},owner,true);}
 ownerClosed(owner){if(this.room?.owner===owner)this.stop('Đã dừng vì cửa sổ thử mất kết nối');}
 close(){clearTimeout(this.timer);this.timer=null;}
}
module.exports={LoadTest,validateOptions};
