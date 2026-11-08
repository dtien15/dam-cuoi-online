'use strict';
(()=>{
 const el=id=>document.getElementById(id);let draft=Rollcall.defaults(),dirty=false,liveState=null;
 const store=new SettingsStore({defaults:draft,validate:Rollcall.validate,send,command:'saveRollcall',onChange:updateSave,onReplace:()=>{draft=store.draft;render();}});
 window.rollcallSettings=store;
 function updateSave(){dirty=store.dirty;const node=el('rc-save-status');node.className='save-state '+store.state;node.textContent=store.error||({loading:'Đang tải…',saved:'Đã lưu',saving:'Đang lưu…',dirty:'Chưa lưu',conflict:'Có bản mới · Bỏ để nạp lại'}[store.state]);el('rc-save').disabled=!dirty||!!store.pending;el('rc-discard').disabled=!dirty&&!store.remote;status();window.dispatchEvent(new Event('rollcallSettingsChanged'));}
 function mark(){store.changed();}
 window.receiveRollcallConfig=c=>store.receive(c);
 window.receiveRollcallState=e=>{liveState=e;status();};
 function current(){if(!testPreview)return liveState;try{return el('game-preview').contentWindow.getRollcallPreviewState?.()||null;}catch{return null;}}
 function status(){const e=current(),phase=e?.phase,active=Rollcall.live(e);let text={preparing:e?.selectionEndsAt?'Đang chọn phe':'Chờ MC trên màn hình game…',active:'Đang thi thả tim',result:'Công bố kết quả',finished:'Đã kết thúc',cancelled:'Đã hủy'}[phase]||'Chưa chạy';const deadline=phase==='active'?e.endsAt:phase==='preparing'?e.selectionEndsAt:null;if(deadline)text+=' · '+Math.max(0,Math.ceil((deadline-Date.now())/1000))+' giây';el('rc-run-status').textContent=(testPreview?'Phiên thử · ':'LIVE · ')+(e?(e.config?.variant==='tug'?'Kéo co · ':'Điểm danh · '):'')+text;el('rc-score-groom').textContent='Nhà trai · '+(e?.scores.groom||0).toLocaleString('vi-VN');el('rc-score-bride').textContent='Nhà gái · '+(e?.scores.bride||0).toLocaleString('vi-VN');el('rc-test').disabled=dirty||testReport?.status==='running';el('rc-finish').disabled=phase!=='active';el('rc-cancel').disabled=!active;}
 let variant='rollcall';
 const selectedVariant=()=>variant;
 window.openMiniVariant=value=>{variant=value;render();};
 function scriptDraft(){
  if(selectedVariant()!=='tug')return draft;
  if(!draft.tug){
   const {intro,rules,outro,commentary}=Rollcall.forVariant(draft,'tug');
   draft.tug={intro,rules,outro,commentary};
  }
  return draft.tug;
 }
 const labels={
  reminder:'Nhắc lại cách chọn phe',
  selection:'Bắt đầu chọn phe',kickoff:'Bắt đầu thi đấu',
  gift:'Cảm ơn góp điểm · {ten}, {diem}',
  topLikes:'Vinh danh thả tim · {ten}, {luong}',
  topGifts:'Vinh danh tặng quà · {ten}, {luong}',
  groomLead:'Nhà trai dẫn · cổ vũ nhà gái',brideLead:'Nhà gái dẫn · cổ vũ nhà trai',
  groomOvertake:'Nhà trai vượt lên',brideOvertake:'Nhà gái vượt lên',
  tie:'Hai bên đang hòa',waiting:'Chưa có điểm',
  finalGroom:'Nước rút · nhà gái cần bắt kịp',finalBride:'Nước rút · nhà trai cần bắt kịp',
  finalTie:'Nước rút · hai bên đang hòa',resultTie:'Kết quả hòa'
 };
 for(const [key,title] of Object.entries(labels)){
  const label=document.createElement('label');
  const input=document.createElement('textarea');
  label.textContent=title;
  input.id='rc-line-'+key;
  input.rows=2;
  input.maxLength=160;
  input.oninput=()=>{scriptDraft().commentary[key]=input.value;mark();};
  label.append(input);
  el('rc-commentary-fields').append(label);
 }
 function render(){
  for(const key of ['selectionSeconds','duration'])el('rc-'+key).value=draft[key];
  const script=Rollcall.forVariant(draft,selectedVariant());
  for(const key of ['intro','rules','outro'])el('rc-'+key).value=script[key];
  for(const key of Object.keys(labels))el('rc-line-'+key).value=script.commentary[key];
  mark();
 }
 for(const key of ['selectionSeconds','duration','intro','rules','outro'])el('rc-'+key).oninput=()=>{if(['duration','selectionSeconds'].includes(key))draft[key]=Number(el('rc-'+key).value);else scriptDraft()[key]=el('rc-'+key).value;mark();};
 el('rc-save').onclick=()=>store.save();
 el('rc-discard').onclick=()=>store.discard();
 window.canStartMiniLive=()=>!dirty&&!Rollcall.live(liveState);
 window.startMiniLive=variant=>{
  if(!window.canStartMiniLive())return;
  if(testPreview)leaveTest();
  send({type:'startRollcall',variant});
 };
 window.testMiniVariant=(variant=selectedVariant())=>{
  if(testReport?.status==='running'){notify('Dừng bài thử tổng hợp trước khi thử mini game.');return;}
  if(dirty){notify('Lưu cấu hình trước khi thử.');return;}
  const testSession=testPreview?el('game-preview').dataset.test:undefined;
  testAwaiting=send({type:'testRollcall',testSession,variant});
 };
 el('rc-test').onclick=()=>window.testMiniVariant();
 for(const [id,type]of [['rc-finish','finishRollcall'],['rc-cancel','cancelRollcall']])el(id).onclick=()=>send({type,...(testPreview?{testSession:el('game-preview').dataset.test}:{})});
 window.addEventListener('settingsError',e=>store.fail(e.detail));window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 setInterval(status,200);if(window.lastRollcallConfig)window.receiveRollcallConfig(window.lastRollcallConfig);if(window.lastRollcallState)window.receiveRollcallState(window.lastRollcallState);
})();
