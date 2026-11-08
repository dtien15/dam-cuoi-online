'use strict';
(()=>{
 const el=id=>document.getElementById(id),panel=document.createElement('div');const mini=el('rollcall-editor');panel.id='wedding-editor';panel.hidden=true;el('event-library').append(panel);let store,miniExpanded=false;
 const miniScript=el('rc-script-panel');
 el('rc-play-tab').closest('nav').remove();
 const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 function iconButton(icon,label){
  const button=make('button',null,'secondary wedding-icon');
  button.dataset.icon=icon;
  button.title=label;
  button.setAttribute('aria-label',label);
  return button;
 }
 function trialButton(key,label,start){
  const button=iconButton('play','Thử · '+label);
  button.dataset.trial=key;
  button.dataset.label=label;
  button.onclick=()=>{
   if(button.dataset.icon!=='stop'){start();return;}
   if(key==='rollcall'||key==='tug')send({type:'cancelRollcall',testSession:el('game-preview').dataset.test});
   else send({type:'stopWeddingTest'});
  };
  return button;
 }
 function updateTrials(){
  let scene,mini;
  if(testPreview&&testReport?.status!=='running'){
   try{
    const view=el('game-preview').contentWindow;
    scene=view.getWeddingPreviewState?.();
    mini=view.getRollcallPreviewState?.();
   }catch{}
  }
  for(const button of panel.querySelectorAll('[data-trial]')){
   const key=button.dataset.trial;
   const active=key===scene?.phase&&!Rollcall.live(mini)||Rollcall.live(mini)&&key===(mini.config?.variant==='tug'?'tug':'rollcall');
   const icon=active&&!button.dataset.miniTrial?'stop':'play';
   if(button.dataset.miniTrial){
    button.disabled=active;
    const liveMini=!testPreview?window.lastRollcallState:null;
    const event=mini||liveMini;
    const matches=Rollcall.live(event)&&key===(event.config?.variant==='tug'?'tug':'rollcall');
    const actions=button.parentElement;
    actions.querySelector('[data-mini-live]').disabled=!window.canStartMiniLive();
    actions.querySelector('[data-mini-finish]').disabled=!matches||event.phase!=='active';
    actions.querySelector('[data-mini-cancel]').disabled=!matches;
   }
   if(button.dataset.icon===icon)continue;
   button.dataset.icon=icon;
   button.classList.toggle('danger',active);
   button.classList.toggle('secondary',!active);
   button.title=(active?'Dừng':'Thử')+' · '+button.dataset.label;
   button.setAttribute('aria-label',button.title);
  }
 }
 setInterval(updateTrials,150);
 const clock=seconds=>{const m=Math.floor(seconds/60),s=seconds%60;return (m?m+' phút ':'')+(s||!m?s+' giây':'');};
 function status(){
  const node=panel.querySelector('[data-state]');
  if(!store||!node)return;
  const stores=[store,window.rollcallSettings].filter(Boolean);
  const pending=stores.some(item=>item.pending);
  const dirty=stores.some(item=>item.dirty);
  const conflict=stores.some(item=>item.remote);
  const loading=stores.some(item=>item.state==='loading');
  node.textContent=stores.find(item=>item.error)?.error||(pending?'Đang lưu…':conflict?'Có bản mới · Bỏ để nạp lại':loading?'Đang tải…':dirty?'Chưa lưu':'Đã lưu');
  panel.querySelector('[data-save]').disabled=!dirty||pending||loading||conflict;
  panel.querySelector('[data-discard]').disabled=pending||(!dirty&&!conflict);
  for(const node of panel.querySelectorAll('[data-step-length]')){const phase=node.dataset.stepLength,count=store.draft.scripts[phase].length;node.textContent='Khoảng '+clock(WeddingCycle.averageSeconds(store.draft,phase))+' · '+count+' bản';}
  const seconds=WeddingCycle.phases.reduce((sum,phase)=>sum+WeddingCycle.averageSeconds(store.draft,phase),store.draft.miniBreakSeconds);panel.querySelector('[data-duration]').textContent='Khoảng '+Math.max(1,Math.round(seconds/60))+' phút + mini game';
 }
 function storyName(index){return store.draft.stories?.[index]||'Bản '+(index+1);}
 function test(phase,variant){if(store.dirty){notify('Lưu trước khi thử.');return;}testAwaiting=send(phase==='mini'?{type:'testMiniSequence'}:{type:'testWeddingCycle',phase,variant});}
 function voiceOf(who){return document.getElementById('st-voice_'+who)?.value;}
 function sampleBeat(text){return text.replaceAll('{re}','Minh').replaceAll('{dau}','Lan').replaceAll('{le}','3').replaceAll('{topqua}','Hoàng Anh và Bảo Trâm').replaceAll('{cuop}','Thu Hà');}
 function scriptEditor(dialog,phase,title){
  const d=store.draft;let variant=0;
  const thanksRow=make('label',null,'switch'),thanks=make('input');thanks.type='checkbox';thanks.checked=d.giftThanksPhases.includes(phase);thanks.onchange=()=>{d.giftThanksPhases=WeddingCycle.phases.filter(key=>key===phase?thanks.checked:d.giftThanksPhases.includes(key));store.changed();};thanksRow.append(thanks,document.createTextNode('MC đọc lời cảm ơn quà trong cảnh này'));
  const note=make('small','Khi tắt, MC chỉ chúc mừng khách cướp dâu, cướp rể. Quà vẫn được cộng điểm và hiện trên màn hình.','muted');
  const help=make('p','{re}: chú rể · {dau}: cô dâu · {le}: số thứ tự lễ · {topqua}: khách mừng nhiều nhất · {cuop}: khách vừa cướp vai. Câu có {topqua}, {cuop} tự bỏ qua khi chưa có ai. Bản cùng số ở mọi cảnh là một câu chuyện.','muted');
  const tabs=make('nav',null,'script-tabs'),info=make('small',null,'muted'),list=make('div',null,'beat-list'),tools=make('div',null,'compact-actions beat-tools');
  const nameLabel=make('label','Tên câu chuyện',),nameInput=make('input');nameInput.maxLength=40;nameLabel.className='story-name';nameInput.oninput=()=>{(d.stories??=[])[variant]=nameInput.value;store.changed();const tab=tabs.children[variant];if(tab)tab.textContent='Bản '+(variant+1)+' · '+(nameInput.value||'');};nameLabel.append(nameInput);
  const minimum=number('Giữ cảnh ít nhất (giây)',d.durations[phase],['show','entrance'].includes(phase)?10:6,300,v=>d.durations[phase]=v);minimum.className='scene-minimum';minimum.querySelector('input').setAttribute('aria-label','Giữ cảnh ít nhất (giây) · '+title);
  const minimumNote=make('small','Đọc xong sớm hơn số này thì MC trò chuyện với khách cho đủ giờ. Thường không cần đổi.','muted');
  dialog.append(thanksRow,note,minimum,minimumNote,help,tabs,nameLabel,info,list,tools);
  function beats(){return d.scripts[phase][variant];}
  function changed(redraw=true){store.changed();info.textContent='Bản này dài khoảng '+clock(WeddingCycle.estimateSeconds(beats()))+'.';status();if(redraw)draw();}
  function beatRow(beat,index){
   const row=make('div',null,'beat-row'),who=make('select');who.setAttribute('aria-label','Người nói hoặc hiệu ứng');
   for(const [value,label]of [...Object.entries(WeddingCycle.speakers),['action','Hiệu ứng']]){const option=make('option',label);option.value=value;who.append(option);}
   who.value=beat.action?'action':beat.who;
   who.onchange=()=>{const list=beats();if(who.value==='action')list[index]={action:'pause'};else list[index]={who:who.value,text:beat.text||''};changed();};
   let body;
   if(beat.action){body=make('select');body.setAttribute('aria-label','Chọn hiệu ứng');for(const [value,info]of Object.entries(WeddingCycle.actions)){const option=make('option',info.name);option.value=value;body.append(option);}body.value=beat.action;body.onchange=()=>{beat.action=body.value;changed(false);};}
   else{body=make('textarea');body.rows=2;body.maxLength=300;body.value=beat.text;body.setAttribute('aria-label','Lời thoại');body.oninput=()=>{beat.text=body.value;changed(false);};}
   const actions=make('div',null,'compact-actions');
   if(!beat.action){const listen=make('button','Nghe','secondary');listen.onclick=()=>playText(sampleBeat(beat.text),voiceOf(beat.who));actions.append(listen);}
   const up=make('button','↑','secondary'),down=make('button','↓','secondary'),remove=make('button','Xóa','danger');
   up.title='Đưa lên';down.title='Đưa xuống';up.disabled=index===0;down.disabled=index===beats().length-1;
   up.onclick=()=>{const list=beats();[list[index-1],list[index]]=[list[index],list[index-1]];changed();};
   down.onclick=()=>{const list=beats();[list[index+1],list[index]]=[list[index],list[index+1]];changed();};
   remove.disabled=beats().length===1;remove.onclick=()=>{beats().splice(index,1);changed();};
   actions.append(up,down,remove);row.append(who,body,actions);return row;
  }
  function draw(){
   tabs.replaceChildren();for(const index of d.scripts[phase].keys()){const tab=make('button','Bản '+(index+1)+' · '+storyName(index),index===variant?'active':'');tab.onclick=()=>{variant=index;draw();};tabs.append(tab);}
   list.replaceChildren(...beats().map(beatRow));
   nameInput.value=storyName(variant);
   info.textContent='Bản này dài khoảng '+clock(WeddingCycle.estimateSeconds(beats()))+'.';
   const addLine=make('button','+ Thêm câu','secondary'),addVariant=make('button','+ Thêm bản','secondary'),removeVariant=make('button','Xóa bản này','danger'),listen=make('button','Nghe cả bản','secondary'),run=make('button','Chạy thử bản này'),original=make('button','Về kịch bản gốc','secondary');
   original.onclick=()=>{if(!confirm('Thay kịch bản '+title+' bằng bản gốc? Các sửa đổi ở cảnh này sẽ mất khi bấm Lưu.'))return;d.scripts[phase]=WeddingCycle.defaults().scripts[phase];variant=0;changed();};
   addLine.onclick=()=>{if(beats().length>=40){notify('Tối đa 40 dòng mỗi bản.');return;}beats().push({who:'mc',text:'Lời thoại mới'});changed();};
   addVariant.disabled=d.scripts[phase].length>=8;addVariant.onclick=()=>{d.scripts[phase].push(JSON.parse(JSON.stringify(beats())));variant=d.scripts[phase].length-1;(d.stories??=[]);if(!d.stories[variant])d.stories[variant]='Câu chuyện '+(variant+1);changed();};
   removeVariant.disabled=d.scripts[phase].length===1;removeVariant.onclick=()=>{d.scripts[phase].splice(variant,1);variant=0;changed();};
   listen.onclick=()=>playSequence(beats().filter(beat=>beat.text).map(beat=>({text:sampleBeat(beat.text),voice:voiceOf(beat.who)})));
   run.onclick=()=>{dialog.close();test(phase,variant);};
   tools.replaceChildren(addLine,addVariant,removeVariant,original,listen,run);
  }
  draw();
 }
 function number(title,value,min,max,set){const label=make('label',title),input=make('input');input.type='number';input.min=min;input.max=max;input.value=value;input.setAttribute('aria-label',title);input.oninput=()=>{set(input.valueAsNumber);store.changed();};label.append(input);return label;}
 function render(){const d=store.draft;panel.replaceChildren();const top=make('div',null,'wedding-overview'),label=make('label',null,'switch'),on=make('input');on.type='checkbox';on.checked=d.enabled;on.onchange=()=>{d.enabled=on.checked;store.changed();};label.append(on,document.createTextNode('Tự chạy vòng cưới'));
  const storyBar=make('div',null,'wedding-story'),storyLabel=make('label','Câu chuyện của mỗi lễ'),storyPick=make('select');storyPick.setAttribute('aria-label','Câu chuyện của mỗi lễ');storyLabel.htmlFor='wedding-story-pick';storyPick.id='wedding-story-pick';
  const storyTotal=Math.max(...WeddingCycle.phases.map(phase=>d.scripts[phase].length));const rotate=make('option','Xoay vòng '+storyTotal+' câu chuyện');rotate.value='';storyPick.append(rotate);for(let i=0;i<storyTotal;i++){const option=make('option','Chỉ dùng: '+storyName(i));option.value=String(i);storyPick.append(option);}storyPick.value=d.fixedStory===null||d.fixedStory===undefined?'':String(d.fixedStory);storyPick.onchange=()=>{d.fixedStory=storyPick.value===''?null:Number(storyPick.value);store.changed();};storyBar.append(storyLabel,storyPick);const actions=make('div',null,'compact-actions'),duration=make('small');duration.dataset.duration='';const b=make('button','Thử một vòng','secondary');b.onclick=()=>test();const stop=make('button','Dừng thử','danger');stop.onclick=()=>send({type:'stopWeddingTest'});actions.append(duration,b,stop);top.append(label,actions);panel.append(top);
  panel.append(storyBar,make('p','Mỗi lễ kể trọn một câu chuyện từ Đón khách tới Cảm ơn hai họ. Cảnh chạy đến khi đọc hết kịch bản, nên độ dài tùy lời thoại. Bấm bút chì để sửa.','muted wedding-note'));
  const body=make('ol',null,'wedding-steps');
  const phases=WeddingCycle.phases.flatMap(phase=>phase==='show'?['show','mini']: [phase]);
  for(const [index,phase] of phases.entries()){
   const isMini=phase==='mini',title=isMini?'Mini game':WeddingCycle.names[phase];
   const row=make('li',null,'wedding-step'),name=make('strong',title),buttons=make('div',null,'compact-actions');
   if(isMini){
    const toggle=make('button','Xem 2 trò','secondary'),list=make('div',null,'mini-step-list');

    list.hidden=!miniExpanded;toggle.setAttribute('aria-expanded',String(miniExpanded));
    toggle.onclick=()=>{miniExpanded=!miniExpanded;list.hidden=!miniExpanded;toggle.setAttribute('aria-expanded',String(miniExpanded));};
    const script=settingsDialog('Kịch bản mini game');
    mini.hidden=false;miniScript.hidden=false;list.append(mini);
    mini.querySelector('.rollcall-save-bar').hidden=true;
    const timings=mini.querySelector('.rollcall-timings');
    timings.querySelector('.mini-break-time')?.remove();
    const rest=number('Nghỉ giữa hai trò (giây)',d.miniBreakSeconds,0,300,v=>d.miniBreakSeconds=v);
    rest.className='mini-break-time';
    timings.append(rest);
    const saveMini=make('button','Xong');saveMini.onclick=()=>script.close();
    script.append(miniScript,saveMini);
    for(const [variant,title] of [['rollcall','Hai họ điểm danh'],['tug','Kéo co hai họ']]){
     const item=make('div',null,'mini-step-item'),actions=make('div',null,'compact-actions');
     const edit=iconButton('pencil','Sửa kịch bản · '+title);
     edit.onclick=()=>{
      window.openMiniVariant(variant);
      script.querySelector('h3').textContent='Kịch bản · '+title;
      script.setAttribute('aria-label','Kịch bản · '+title);
      script.showModal();
     };
     actions.append(edit);
     const trial=trialButton(variant,title,()=>window.testMiniVariant(variant));trial.dataset.miniTrial='true';
     const finish=make('button','Kết thúc','secondary'),cancel=make('button','Hủy','danger');
     finish.dataset.miniFinish='';cancel.dataset.miniCancel='';finish.disabled=cancel.disabled=true;
     finish.onclick=()=>el('rc-finish').click();cancel.onclick=()=>el('rc-cancel').click();
     const live=make('button','LIVE','secondary');
     live.dataset.miniLive='';
     live.title='Bắt đầu LIVE · '+title;
     live.setAttribute('aria-label',live.title);
     live.disabled=true;
     live.onclick=()=>window.startMiniLive(variant);
     actions.append(live,trial,finish,cancel);
     item.append(make('strong',title),actions);list.append(item);
    }
    const testBoth=make('button','Thử cả hai','secondary');
    testBoth.onclick=()=>{if(window.rollcallSettings?.dirty){notify('Lưu trước khi thử.');return;}test('mini');};
    buttons.append(toggle,testBoth);row.append(make('span',String(index+1),'step-number'),name,buttons,list,script);body.append(row);continue;
   }
   const script=settingsDialog('Kịch bản · '+title);
   const edit=iconButton('pencil','Sửa kịch bản · '+title),preview=trialButton(phase,title,()=>test(phase));
   edit.onclick=()=>script.showModal();
   {
    const length=make('small',null,'step-length');length.dataset.stepLength=phase;buttons.append(length);
    scriptEditor(script,phase,title);
   }
   buttons.append(edit,preview);
   row.append(make('span',String(index+1),'step-number'),name,buttons);
   row.append(script);
   body.append(row);
  }
  panel.append(body);
  const extra=settingsDialog('Lời chuyển cảnh');
  extra.append(make('p','Mỗi dòng một câu, MC đổi câu mỗi lần chuyển cảnh. {tieptheo} là tên phần tiếp theo.','muted'));
  for(const [key,title] of Object.entries({sceneNext:'Chuyển cảnh',miniNext:'Giới thiệu trò tiếp theo',miniDone:'Chuyển sang cảm ơn hai họ'})){
   const label=make('label',title),input=make('textarea');
   input.rows=5;input.maxLength=2000;input.value=d.extraLines[key];
   input.oninput=()=>{d.extraLines[key]=input.value;store.changed();};
   label.append(input);extra.append(label);
  }
  const openExtra=make('button','Lời chuyển cảnh','secondary');
  openExtra.onclick=()=>extra.showModal();
  actions.prepend(openExtra);panel.append(extra);
  const bar=make('footer',null,'editor-footer'),state=make('span');state.dataset.state='';const tools=make('div',null,'compact-actions'),discard=make('button','Bỏ','danger'),save=make('button','Lưu');discard.dataset.discard='';save.dataset.save='';discard.onclick=()=>{store.discard();window.rollcallSettings?.discard();};save.onclick=()=>{if(store.dirty)store.save();if(window.rollcallSettings?.dirty)window.rollcallSettings.save();};tools.append(discard,save);bar.append(state,tools);panel.append(bar);status();
 }
 store=new SettingsStore({defaults:WeddingCycle.defaults(),validate:WeddingCycle.validate,send,command:'saveWeddingConfig',onChange:status,onReplace:render});
 window.receiveWeddingConfig=c=>{store.receive(c);const autoNote=el('rc-schedule-note');if(autoNote)autoNote.textContent='Khi bật, mini game chạy sau Văn nghệ và trước Cảm ơn hai họ.';};
 el('tab-hearts').onclick=()=>window.selectEventTab('wedding');window.addEventListener('settingsError',e=>store.fail(e.detail));window.addEventListener('beforeunload',e=>{if(store.dirty){e.preventDefault();e.returnValue='';}});
 window.addEventListener('rollcallSettingsChanged',status);
 if(window.lastWeddingConfig)store.receive(window.lastWeddingConfig);else render();
})();
