'use strict';
window.RollcallView=(()=>{
 let current=null,offset=0,timer=null,lastLeader=null,changedAt=0,previousId=null,celebratedId=null,stopFireworks=null,resultStage=null;const el=id=>document.getElementById(id);
 const frame='/assets/events/cute-v3/rollcall-frame.webp',actors='/assets/events/cute-v3/reactions.webp';
 function build(){if(el('rollcall-overlay'))return;const overlay=document.createElement('section');overlay.id='rollcall-overlay';overlay.hidden=true;overlay.setAttribute('aria-label','Sự kiện Hai họ điểm danh');overlay.innerHTML=`<div class="rollcall-panel"><img class="rollcall-frame" src="${frame}" alt="Hai họ điểm danh"><div class="rollcall-clock"></div><div class="rollcall-scores"><div class="rollcall-team groom"><span>NHÀ TRAI</span><strong>0</strong><small>0 điểm</small></div><div class="rollcall-team bride"><span>NHÀ GÁI</span><strong>0</strong><small>0 điểm</small></div></div><div class="rollcall-result"></div><div class="rollcall-honors"></div><div class="tug-lineup" aria-hidden="true"><img class="tug-rope" src="/assets/events/tug/rope.webp" alt=""><div class="tug-team groom"></div><div class="tug-team bride"></div></div><div class="rollcall-points">1 tim = 1 điểm · 1 xu = 10 điểm</div><div class="rollcall-actor groom" style="background-image:url('${actors}')"></div><div class="rollcall-actor bride" style="background-image:url('${actors}')"></div><div class="rollcall-meter"><div class="rollcall-labels"><b>GÕ 1 · NHÀ TRAI</b><b>NHÀ GÁI · GÕ 0</b></div><div class="rollcall-track"><div class="rollcall-blue"></div><i class="rollcall-divider">♥</i></div></div></div>`;el('stage').append(overlay);}
 function pose(node,index,bride){const n=index+(bride?6:0);node.style.backgroundPosition=`${n%3*50}% ${Math.floor(n/3)*100/3}%`;node.dataset.pose=String(index);}
 function draw(){if(!current)return;const overlay=el('rollcall-overlay'),now=Date.now()+offset,active=current.phase==='active',result=current.phase==='result',revealed=result&&!!resultStage;overlay.hidden=!active&&!result&&current.phase!=='preparing';if(overlay.hidden)return;const {scores,people}=current;const leader=scores.groom===scores.bride?'tie':scores.groom>scores.bride?'groom':'bride';if(leader!==lastLeader){lastLeader=leader;changedAt=Date.now();}
  const tug=current.config?.variant==='tug';
  overlay.classList.toggle('is-tug',tug);
  const art=overlay.querySelector('.rollcall-frame');
  const artwork=tug?'/assets/events/cute-v3/tug-header.webp':frame;
  if(art.getAttribute('src')!==artwork){
   art.src=artwork;
   art.alt=tug?'Kéo co hai họ':'Hai họ điểm danh';
   overlay.setAttribute('aria-label',art.alt);
  }
  for(const team of ['groom','bride']){overlay.querySelector('.rollcall-team.'+team+' strong').textContent=people[team].toLocaleString('vi-VN')+' người';overlay.querySelector('.rollcall-team.'+team+' small').textContent=scores[team].toLocaleString('vi-VN')+' điểm';}
  overlay.querySelector('.rollcall-clock').textContent=active?'⏱ '+Math.max(0,Math.ceil((current.endsAt-now)/1000))+' GIÂY':result?'HẾT GIỜ':current.selectionEndsAt&&now>=current.selectionEndsAt?'CHUẨN BỊ THI':current.selectionEndsAt?'CHỌN PHE · '+Math.max(0,Math.ceil((current.selectionEndsAt-now)/1000))+'s':'CHỌN PHE';
  const labels=overlay.querySelectorAll('.rollcall-labels b');
  labels[0].textContent=active||result?'ĐIỂM NHÀ TRAI':'GÕ 1 · NHÀ TRAI';
  labels[1].textContent=active||result?'ĐIỂM NHÀ GÁI':'NHÀ GÁI · GÕ 0';
  const scoreKey=scores.groom+':'+scores.bride;
  if(active&&overlay.dataset.scoreKey!==scoreKey){
   overlay.querySelector('.rollcall-divider').animate([
    {scale:'1'},{scale:'1.5'},{scale:'1'}
   ],{duration:360});
  }
  overlay.dataset.scoreKey=scoreKey;
  overlay.dataset.leader=leader;
  const total=scores.groom+scores.bride,percent=total?scores.groom/total*100:50;overlay.querySelector('.rollcall-blue').style.width=percent+'%';overlay.querySelector('.rollcall-divider').style.left=percent+'%';
  if(tug){
   const lineup=overlay.querySelector('.tug-lineup');
   const showOutcome=revealed&&current.winner!=='tie';
   lineup.classList.toggle('tug-outcome',showOutcome);
   lineup.style.setProperty('--pull',(showOutcome?0:(50-percent)*1.05)+'px');
   for(const team of ['groom','bride']){
    const pose=(active||revealed)&&leader!=='tie'?(leader===team?1:2):0;
    const row=showOutcome?(current.winner===team?0:100):pose*50;
    lineup.querySelector('.tug-team.'+team).style.backgroundPosition=(team==='groom'?0:100)+'% '+row+'%';
   }
  }
  const message=overlay.querySelector('.rollcall-result');message.textContent=revealed?(current.winner==='tie'?'HAI HỌ NGANG TÀI!':current.winner==='groom'?'NHÀ TRAI THẮNG!':'NHÀ GÁI THẮNG!'):'';message.hidden=!revealed||resultStage==='honors';
  overlay.dataset.resultStage=resultStage||'';
  const honors=overlay.querySelector('.rollcall-honors');
  const honorsKey=resultStage==='honors'?current.id:'';
  if(honors.dataset.event!==honorsKey){
   honors.dataset.event=honorsKey;
   honors.replaceChildren();
   if(honorsKey)for(const [key,title,unit] of [['likes','Top thả tim','tim'],['gifts','Top tặng quà','xu']]){
    const leader=current.leaders?.[key];
    if(!leader)continue;
    const card=document.createElement('div');
    const figure=view.makeFigure?.(leader);
    if(figure)card.append(figure);
    const badge=document.createElement('div');
    badge.className='rollcall-honor-avatar';
    badge.textContent=Array.from(leader.name.trim())[0]?.toUpperCase()||'?';
    if(leader.avatar){
     const fallback=badge.textContent;
     const avatar=document.createElement('img');
     avatar.src=leader.avatar;
     avatar.alt='';
     avatar.onerror=()=>{badge.textContent=fallback;};
     badge.replaceChildren(avatar);
    }
    card.prepend(badge);
    const label=document.createElement('span');
    label.className='rollcall-honor-label';
    label.textContent=title;
    const name=document.createElement('span');
    name.className='rollcall-honor-name';
    name.textContent=leader.name;
    name.title=leader.name;
    const amount=document.createElement('span');
    amount.textContent=leader.amount.toLocaleString('vi-VN')+' '+unit;
    card.append(label,name,amount);
    honors.append(card);
   }
  }
  for(const team of ['groom','bride']){let p;if(revealed)p=current.winner==='tie'?2:current.winner===team?4:5;else if(leader!==team&&leader!=='tie'&&Date.now()-changedAt<1200)p=3;else p=[0,1,2,1][Math.floor(Date.now()/750)%4];const node=overlay.querySelector('.rollcall-actor.'+team);pose(node,p,team==='bride');node.classList.toggle('rollcall-winning',revealed&&current.winner===team);}
  overlay.dataset.phase=current.phase;overlay.dataset.scoreGroom=String(scores.groom);overlay.dataset.scoreBride=String(scores.bride);
 }
 function sync(event){
  build();
  if(event?.id!==current?.id||event?.phase!=='result')resultStage=null;
  const winner=resultStage==='winner'&&event?.phase==='result'&&['groom','bride'].includes(event.winner);
  if(!winner||event.id!==current?.id){
   stopFireworks?.();
   stopFireworks=null;
  }
  current=event;
  if(winner&&celebratedId!==event.id){
   const id=event.id;
   celebratedId=id;
   stopFireworks=WeddingFireworks.start(el('rollcall-overlay'),()=>current?.id===id&&current.phase==='result',{
    colors:event.winner==='groom'?['#39d9ff','#7cafff','#fff4bd','#ffbd19']:['#ff347c','#ff9ec7','#fff4bd','#ffbd19'],
    interval:220
   });
  }
  view.onPhase?.(event);
  offset=event?event.serverAt-Date.now():0;if(event?.id!==previousId){previousId=event?.id;lastLeader=null;}if(Rollcall.live(event)){draw();if(!timer)timer=setInterval(draw,150);}else{el('rollcall-overlay').hidden=true;clearInterval(timer);timer=null;}}
 const view={sync,onPhase:null,makeFigure:null,reveal(id,stage){
  if(current?.id!==id||current.phase!=='result')return;
  resultStage=stage;
  sync(current);
  view.onReveal?.(stage);
 }};
 return view;
})();
