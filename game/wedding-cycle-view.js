'use strict';
window.WeddingCycleView=(()=>{
 let api,current=null,key=null,token=0,job=null,stopFx=null,lastCelebration=-1,interrupted=null,blurTimer=null,progress=null,holdTimer=null,abandonedKey=null;
 const animations=new Set();
 // Đôi cưới đứng đón khách trong vùng TikTok không che, để màn cướp dâu lúc này vẫn nhìn thấy (đáy khung bị giao diện TikTok phủ).
 const YARD_Y=540;
 const HEART_ACTIONS=new Set(['rings','kiss','cheek','cake','toast','fireworks']);
 function walk(direction){for(const role of ['groom','bride']){const el=api?.rigs[role].el;if(!el)continue;el.classList.toggle('is-walking',!!direction);if(direction)el.dataset.walkDirection=direction;else delete el.dataset.walkDirection;}}
 function clearBlur(){clearInterval(blurTimer);blurTimer=null;for(const el of (typeof document==='undefined'?[]:document.querySelectorAll('.aisle-guest-muted')))el.classList.remove('aisle-guest-muted');}
 function followAisle(){clearBlur();blurTimer=setInterval(()=>{const stage=api.stage.getBoundingClientRect(),scale=stage.width/1080||1;const people=['groom','bride'].map(r=>api.rigs[r].el.getBoundingClientRect());for(const el of document.querySelectorAll('#guests>.guest,#reception>.guest,#walkers>.runner')){const b=el.getBoundingClientRect(),x=(b.left+b.width/2-stage.left)/scale;const close=WeddingCycle.shouldBlurAisle(x,(b.bottom-stage.top)/scale,people.map(p=>(p.bottom-stage.top)/scale));el.classList.toggle('aisle-guest-muted',close);}},100);}
 function cancel(){clearBlur();walk(null);token++;clearInterval(holdTimer);holdTimer=null;progress=null;for(const a of animations)a.cancel();animations.clear();stopFx?.();stopFx=null;api?.stage.classList.remove('cycle-show','aisle-busy','procession-focus');}
 async function wait(ms,id){const until=Date.now()+ms;while(id===token&&Date.now()<until)await new Promise(r=>setTimeout(r,Math.min(50,until-Date.now())));}
 async function linger(c,id){while(id===token&&Date.now()<c.endsAt)await wait(Math.min(1000,c.endsAt-Date.now()),id);}
 function scriptOf(c){return WeddingCycle.scriptFor(api.config()||WeddingCycle.defaults(),c.phase,c.number,c.variantOverride?.phase===c.phase?c.variantOverride.index:undefined);}
 // Trả về chuỗi rỗng khi chưa có khách mừng, để bỏ qua câu vinh danh thay vì đọc thiếu tên.
 function fill(text,c){
  const live=current?.number===c.number?current:c;
  const list=names=>names.length>1?names.slice(0,-1).join(', ')+' và '+names.at(-1):names[0]||'';
  const donors=(live.donors||[]).map(d=>api.spokenName(d.name)),stealers=(live.stealers||[]).map(name=>api.spokenName(name));
  if(text.includes('{topqua}')&&!donors.length||text.includes('{cuop}')&&!stealers.length)return'';
  return text.replace(/\{re\}/g,()=>api.roleName('groom')).replace(/\{dau\}/g,()=>api.roleName('bride')).replace(/\{le\}/g,String(c.number||1)).replace(/\{topqua\}/g,()=>list(donors)).replace(/\{cuop\}/g,()=>list(stealers));
 }
 function startWalk(c,id,state,remaining,narration=0){
  const home=role=>{const p=c.resumePositions?.[role];return p?((p.x-(role==='groom'?485:615))+'px '+(p.y-720)+'px'):'0 '+YARD_Y+'px';};
  api.rigs.mc.el.style.translate='0 0';api.stage.classList.add('aisle-busy');followAisle();walk('back');
  // Đôi trẻ tới lễ đài đúng lúc MC dẫn xong, không đứng chờ cũng không bị cắt ngang lời.
  const duration=remaining||Math.max(16000,(c.config.durations?.entrance||16)*1000,Math.min(narration,40)*1000);
  state.walked=true;state.walkEndsAt=Date.now()+duration;
  for(const role of ['groom','bride']){const a=api.rigs[role].el.animate([{translate:home(role),opacity:1},{opacity:1,offset:.04},{translate:'0 0',opacity:1}],{duration,fill:'forwards',easing:'linear'});animations.add(a);}
  return wait(duration,id).then(()=>{if(id!==token)return;clearBlur();for(const role of ['groom','bride'])api.rigs[role].el.style.translate='0 0';walk(null);api.stage.classList.remove('aisle-busy','procession-focus');});
 }
 async function perform(action,c,id,alive){
  if(HEART_ACTIONS.has(action))return api.heart(action,{alive,sleep:ms=>wait(ms,id),zo:()=>api.zo(alive)});
  if(action==='dance')return api.park(alive);
  if(action==='applause')return api.applause(alive);
  if(action==='wait')return wait(4000,id);
  if(action==='pause')return wait(1500,id);
  if(action==='sparkle'&&c.config.effects!==false){stopFx?.();stopFx=api.fireworks(alive);return wait(1000,id);}
 }
 async function run(c,id,resume){
  const alive=()=>id===token,beats=scriptOf(c);
  const state=progress={key:c.key,index:Math.min(resume?.index||0,beats.length),total:beats.length,busy:true,walked:false,walkEndsAt:0};
  api.hold(c.key);holdTimer=setInterval(()=>{if(alive())api.hold(c.key);},4000);
  let walking=null;
  try{
   if(c.phase==='welcome'){
    for(const role of ['groom','bride'])api.rigs[role].el.style.translate=(role==='groom'?'-40px':'40px')+' '+YARD_Y+'px';
    api.rigs.mc.el.style.translate='210px 0';followAisle();
   }else if(c.phase==='entrance'){
    api.rigs.mc.el.style.translate='210px 0';
    for(const role of ['groom','bride']){const p=c.resumePositions?.[role];api.rigs[role].el.style.translate=p?((p.x-(role==='groom'?485:615))+'px '+(p.y-720)+'px'):(role==='groom'?'-40px':'40px')+' '+YARD_Y+'px';}
    if(resume?.walked)walking=startWalk(c,id,state,resume.walkRemaining);
   }
   for(let i=state.index;i<beats.length&&alive();i++){
    state.index=i;const beat=beats[i];
    if(beat.action==='walk'){if(c.phase==='entrance'&&!state.walked)walking=startWalk(c,id,state,0,WeddingCycle.estimateSeconds(beats.slice(i+1)));}
    else if(beat.action)await perform(beat.action,c,id,alive);
    else{const text=fill(beat.text,c);if(text)await api.speak(text,beat.who,c.key,alive);}
    if(alive())await wait(200,id);
   }
   if(!alive())return;
   state.index=beats.length;
   if(c.phase==='entrance'&&!state.walked)walking=startWalk(c,id,state);
   if(walking)await walking;
   if(!alive())return;
   state.busy=false;api.quiet();
  }catch(error){console.error('Vòng cưới:',error);}finally{if(alive()){state.busy=false;await linger(c,id);}if(alive()){clearBlur();walk(null);clearInterval(holdTimer);holdTimer=null;api.stage.classList.remove('aisle-busy','procession-focus');for(const a of animations)a.cancel();animations.clear();stopFx?.();stopFx=null;api.done(c.key);}}
 }
 function sync(saved){if(!api)return;const c=saved?.ceremony,paused=c?.paused||window.Rollcall?.live(saved?.rollcall);current=c;
  api.stage.classList.toggle('cycle-active',!!c?.phase);if(interrupted)return;api.lock(c?.phase==='show');
  if(!c?.phase||paused){for(const role of ['groom','bride'])api.rigs[role].el.style.translate='0 0';api.rigs.mc.el.style.translate='0 0';if(key){cancel();key=null;}api.lock(false);return;}
  api.stage.dataset.cyclePhase=c.phase;
  if(lastCelebration!==c.celebration){if(lastCelebration>=0&&c.celebration>0&&c.config.effects!==false)api.spark();lastCelebration=c.celebration;}
  if(key===c.key||abandonedKey===c.key)return;abandonedKey=null;cancel();if(!['welcome','entrance'].includes(c.phase)){api.rigs.mc.el.style.translate='0 0';for(const role of ['groom','bride'])api.rigs[role].el.style.translate='0 0';}key=c.key;const id=token;job=run(c,id,c.resumeBeat);
 }
 return{init(options){api=options;},sync,async interrupt(){
 if(interrupted)return;const positions={};for(const role of ['groom','bride']){const b=api.rigs[role].el.getBoundingClientRect(),s=api.stage.getBoundingClientRect(),scale=s.width/1080||1;positions[role]={x:(b.left+b.width/2-s.left)/scale,y:(b.bottom-s.top)/scale};}
 const at=Date.now(),beat=progress?{index:progress.index,walked:progress.walked,walkRemaining:progress.walked?Math.max(1000,progress.walkEndsAt-at):0}:null;
 interrupted={scene:current,at,positions,beat};cancel();for(const role of ['groom','bride']){const home=role==='groom'?485:615,p=positions[role];api.rigs[role].el.style.translate=(p.x-home)+'px '+(p.y-720)+'px';}
 },rolePosition(role){if(interrupted?.positions[role])return interrupted.positions[role];const el=api?.rigs[role]?.el;if(!el)return null;const b=el.getBoundingClientRect(),s=api.stage.getBoundingClientRect(),scale=s.width/1080||1;return{x:(b.left+b.width/2-s.left)/scale,y:(b.bottom-s.top)/scale};},abandon(sceneKey){interrupted=null;key=null;abandonedKey=sceneKey;for(const role of ['groom','bride'])api.rigs[role].el.style.translate='0 0';api.rigs.mc.el.style.translate='0 0';},resume(){if(!interrupted)return;const hold=interrupted;interrupted=null;key=null;if(hold.scene){const remaining=Math.max(1000,hold.scene.endsAt-hold.at);sync({ceremony:{...hold.scene,endsAt:Date.now()+remaining,resumePositions:hold.positions,resumeBeat:hold.beat}});}},get state(){return current;},get busy(){return !!interrupted||!!progress?.busy;},get progress(){return progress;}};
})();
