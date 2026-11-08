'use strict';
const $=id=>document.getElementById(id),clone=value=>JSON.parse(JSON.stringify(value));
const GROUPS=[['wish','Chúc mừng'],['welcome','Đón khách'],['idle','Lúc vắng'],['share','Chia sẻ'],['like','Thả tim'],['reply','Hỏi đáp']];
const catalog=MCPolicy.scriptCatalog(),defaults=MCPolicy.scriptDefaults();
let ws,rows=[],saved=[],revision=0,loaded=false,dirty=false,saving=null,remote=null,group='wish',previewSound=false,voiceBusy=false;
const voicePlayer=new PcmSpeechPlayer();let noticeTimer,focusedScript=null;
function notify(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('toast').hidden=true,3200);}
window.addEventListener('message',event=>{
 if(event.origin!==window.location.origin||event.source!==$('game-preview')?.contentWindow||event.data?.type!=='preview-audio-error')return;
 $('preview-audio').title=event.data.message;
});
function send(data){if(ws?.readyState!==1){notify('Chưa kết nối server.');return false;}ws.send(JSON.stringify(data));return true;}
const cmd=(name,value)=>send({type:'cmd',name,value});
const matches=(row,key=group)=>key==='reply'?row.event.startsWith('reply.'):row.event===key;
function markDirty(){dirty=JSON.stringify(rows)!==JSON.stringify(saved);$('script-status').textContent=dirty?'Chưa lưu':'Đã lưu';$('save-scripts').disabled=!dirty||!loaded||!!saving||ws?.readyState!==1;$('discard-scripts').disabled=!dirty;updateCounts();}
function updateCounts(){const all=rows.filter(row=>matches(row));$('script-count').textContent=all.filter(row=>row.enabled).length+'/'+all.length+' câu bật';for(const button of $('script-tabs').children){const key=button.dataset.group;button.textContent=GROUPS.find(([id])=>id===key)[1]+' '+rows.filter(row=>matches(row,key)).length;}}
function acceptScripts(data){revision=data.revision;saved=clone(data.rows.filter(row=>row.event!=='gift'));rows=clone(saved);loaded=true;remote=null;$('reload-scripts').hidden=true;saving=null;renderScripts();markDirty();}
function incomingScripts(data){
 if(saving&&JSON.stringify(data.rows)===saving){acceptScripts(data);notify('Đã lưu · kịch bản đã cập nhật sang game');return;}
 if(dirty){if(data.revision===revision&&JSON.stringify(data.rows)===JSON.stringify(saved)){loaded=true;markDirty();return;}remote=data;$('reload-scripts').hidden=false;$('script-status').textContent='Có bản mới từ cửa sổ khác · bản nháp vẫn được giữ';return;}
 acceptScripts(data);
}
function renderScripts(){
 const list=$('script-list');list.replaceChildren();const query=$('script-search').value.trim().toLowerCase();
 const visible=rows.filter(row=>matches(row)&&(!query||row.text.toLowerCase().includes(query)));
 for(const row of visible){
  const card=document.createElement('article');card.className='script-card'+(row.enabled?'':' disabled');card.dataset.id=row.id;
  const top=document.createElement('div');top.className='card-top';
  const label=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=row.enabled;toggle.setAttribute('aria-label','Bật câu thoại');label.append(toggle,document.createTextNode('Sử dụng'));
  toggle.onchange=()=>{row.enabled=toggle.checked;card.classList.toggle('disabled',!row.enabled);markDirty();};top.append(label);
  if(group==='reply'){const select=document.createElement('select');select.setAttribute('aria-label','Tình huống trả lời');for(const [key,text]of Object.entries(catalog).filter(([key])=>key.startsWith('reply.'))){const option=document.createElement('option');option.value=key;option.textContent=text;select.append(option);}select.value=row.event;select.onchange=()=>{row.event=select.value;label.lastChild.textContent='Sử dụng';markDirty();};top.append(select);}
  const listen=document.createElement('button');listen.textContent='Nghe thử';listen.type='button';listen.onclick=()=>playText(sample(row.text));
  const remove=document.createElement('button');remove.textContent='Xóa';remove.className='delete';remove.type='button';remove.onclick=()=>{rows=rows.filter(item=>item.id!==row.id);markDirty();renderScripts();};top.append(listen,remove);
  const text=document.createElement('textarea');text.value=row.text;text.maxLength=300;text.rows=2;text.setAttribute('aria-label','Nội dung câu thoại');text.onfocus=()=>{focusedScript=row.id;};text.oninput=()=>{row.text=text.value;markDirty();};card.append(top,text);list.append(card);
 }
 if(!visible.length){const empty=document.createElement('div');empty.className='empty-state';const title=document.createElement('b');title.textContent=query?'Không tìm thấy câu phù hợp':'Chưa có câu thoại trong mục này';const desc=document.createElement('span');desc.textContent=query?'Thử từ khóa khác.':'Bấm “Thêm câu” để tạo kịch bản.';empty.append(title,desc);list.append(empty);}
 updateCounts();
}
function sample(text){return text.replace(/\{(ten|qua|duyen|binhluan|ben)\}/g,(_,key)=>({ten:'Lan',qua:'Hoa hồng',duyen:'1',binhluan:'Chúc hai bạn hạnh phúc',ben:'nhà gái'})[key]);}
// Nghe thử nhiều câu liên tiếp, mỗi câu dùng giọng của người nói.
async function playSequence(items){for(const [index,item]of items.entries()){if(await playText(item.text,item.voice,index<items.length-1)===false)return;}}
async function playText(text,voiceId,more=false){
 if(voiceBusy){notify('Đang đọc câu trước.');return false;}if(!text.trim()){notify('Nhập câu thoại trước nhé.');return false;}
 const resumePreview=previewSound;
 if(resumePreview)$('game-preview').contentWindow.setPreviewAudio(false);
 $('preview-audio').disabled=true;
 voiceBusy=true;$('local-msg').textContent='Đang chuẩn bị giọng…';notify('Đang chuẩn bị câu nghe thử…');
 try{const rate=Number($('st-rate').value),voice=voiceId||$('st-voice_mc').value||'Trúc Ly';await voicePlayer.play('/tts?voice='+encodeURIComponent(voice)+'&t='+encodeURIComponent(text.slice(0,400)),{rate,bufferWhole:true,onPlaying:()=>{$('local-msg').textContent='Đang đọc…';}});if(!more){$('local-msg').textContent='Đã đọc xong';notify('Đã đọc xong câu thử');}}
 catch(error){$('local-msg').textContent=error.message;notify('Chưa phát được tiếng: '+error.message);return false;}finally{voiceBusy=false;$('preview-audio').disabled=false;if(resumePreview&&previewSound)$('game-preview').contentWindow.setPreviewAudio(true).catch(()=>{});}
}
function receiveUI(ui){for(const [name,value]of Object.entries(ui)){const el=$('st-'+name);if(!el)continue;if(el.type==='checkbox')el.checked=!!value;else{el.dataset.saved=value;if(el.tagName!=='SELECT'||el.options.length)el.value=value;}}$('rate-label').textContent=Number($('st-rate').value).toLocaleString('vi-VN')+'×';$('musicvol-label').textContent=Math.round(Number($('st-musicvol').value)*100)+'%';}
function connect(){
 ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);
 ws.onopen=()=>{$('server-state').textContent='● Server đã nối';$('server-state').classList.add('online');send({type:'hello',role:'ctrl'});};
 ws.onmessage=message=>{const data=JSON.parse(message.data);
  if(data.type==='rollcallConfig'){window.lastRollcallConfig=data.config;window.receiveRollcallConfig?.(data.config);}if(data.type==='state'||data.type==='liveBatch'){window.lastRollcallState=data.state.rollcall||null;window.receiveRollcallState?.(window.lastRollcallState,false);}if(data.type==='heartEvents'){window.lastHeartConfig=data.config;window.receiveHeartEvents?.(data.config);}if(data.type==='scripts')incomingScripts(data);if(data.type==='giftEvents'){window.lastGiftConfig=data.config;window.receiveGiftEvents?.(data.config);}
  if(data.type==='playlist'){window.lastPlaylist=data;window.receivePlaylist?.(data);}
  if(data.type==='weddingConfig'){window.lastWeddingConfig=data.config;window.receiveWeddingConfig?.(data.config);}
  if(data.type==='loadTest')receiveTest(data.report);
  if(data.type==='miniSequenceStarted'){setTestPreview(data.testSession);notify('Đang thử Hai họ điểm danh → Kéo co hai họ.');}
  if(data.type==='diagnosticPong'){$('load-ping').textContent=Math.max(0,Date.now()-data.sentAt)+' ms';$('load-heap').textContent=data.heapMB+' MB';}
  if(data.type==='scriptsConflict'){saving=null;remote={...data,type:'scripts'};$('reload-scripts').hidden=false;$('save-scripts').disabled=true;$('script-status').textContent='Bản trên server đã đổi. Nạp bản mới trước khi lưu.';}
  if(data.type==='status'){const text={idle:'Chưa kết nối TikTok',connecting:'Đang nối @'+data.user,live:'● @'+data.user+' · '+(data.counts?.chat||0)+' bình luận',waiting:'Đang nối lại @'+data.user};$('tt-status').textContent=(text[data.state]||data.state)+(data.error?' · '+data.error:'');if(document.activeElement!==$('tt-user'))$('tt-user').value=data.user||'';}
  if(data.type==='ui')receiveUI(data.ui);
  if(data.type==='clients')$('snd-status').textContent=data.game+' màn hình · '+data.audible+' đang phát tiếng';
  if(data.type==='state'||data.type==='liveBatch'){$('session-info').textContent=(data.state.guestCount??Object.keys(data.state.users).length)+' khách · '+(data.state.total/10000).toLocaleString('vi-VN')+' chỉ vàng';}
  if(data.type==='error'){saving=null;testAwaiting=false;markDirty();commonSettingsError(data.message);notify(data.message);}
 };
 ws.onclose=()=>{$('server-state').textContent='Đang nối lại…';$('server-state').classList.remove('online');$('save-scripts').disabled=true;commonSettingsError('Mất kết nối. Bản nháp được giữ; nối lại rồi lưu.');setTimeout(connect,2000);};
}
for(const [id,label]of GROUPS){const button=document.createElement('button');button.dataset.group=id;button.textContent=label;button.className=id===group?'active':'';button.onclick=()=>{group=id;for(const item of $('script-tabs').children)item.classList.toggle('active',item===button);renderScripts();};$('script-tabs').append(button);}
let selectedPanel='live',eventTab='wedding';
function selectEventTab(tab){
 eventTab=tab;
 for(const[id,key]of [['tab-gifts','gifts'],['tab-hearts','wedding']]){const node=$(id);node.classList.toggle('active',key===tab);node.setAttribute('aria-pressed',String(key===tab));}
 for(const[id,key]of [['gift-editor','gifts'],['wedding-editor','wedding']])if($(id))$(id).hidden=key!==tab;
}
window.selectEventTab=selectEventTab;
for(const button of document.querySelectorAll('[data-panel]'))button.onclick=()=>{
 selectedPanel=button.dataset.panel;
 for(const item of document.querySelectorAll('[data-panel]')){item.classList.toggle('active',item===button);item.setAttribute('aria-selected',String(item===button));}
 for(const panel of document.querySelectorAll('.settings-panel'))panel.hidden=panel.id!=='panel-'+selectedPanel;
 $('event-library').hidden=selectedPanel!=='events';$('script-library').hidden=selectedPanel!=='scripts';
 if(selectedPanel==='events')selectEventTab(eventTab);
 document.querySelector('.control-content').scrollTop=0;
};
function commonSettingsError(message){window.dispatchEvent(new CustomEvent('settingsError',{detail:message}));}
$('script-search').oninput=renderScripts;
$('add-script').onclick=()=>{const row={id:'custom-'+crypto.randomUUID(),event:group==='reply'?'reply.hoi':group,text:'',enabled:true};rows.unshift(row);markDirty();renderScripts();$('script-list').querySelector('textarea')?.focus();};
$('save-scripts').onclick=()=>{try{const valid=MCPolicy.validateScripts(rows);saving=JSON.stringify(valid);$('save-scripts').disabled=true;$('script-status').textContent='Đang lưu…';if(!send({type:'saveScripts',revision,rows:valid})){saving=null;markDirty();}}catch(error){notify(error.message);}};
$('discard-scripts').onclick=()=>{if(remote){acceptScripts(remote);return;}rows=clone(saved);renderScripts();markDirty();};
$('default-scripts').onclick=()=>{rows=rows.filter(row=>!matches(row));const ids=new Set(rows.map(row=>row.id));rows.push(...clone(defaults.filter(row=>matches(row))).map(row=>({...row,id:ids.has(row.id)?'restored-'+crypto.randomUUID():row.id})));renderScripts();markDirty();};
$('reload-scripts').onclick=()=>{if(remote)acceptScripts(remote);};
$('tt-go').onclick=()=>send({type:'connect',user:$('tt-user').value});$('tt-off').onclick=()=>send({type:'disconnect'});$('tt-user').onkeydown=e=>{if(e.key==='Enter')$('tt-go').click();};
$('link-game').value=location.origin+'/';$('copy-link').onclick=async()=>{try{await navigator.clipboard.writeText($('link-game').value);notify('Đã chép link');}catch{notify('Chọn link để sao chép.');}};
$('preview-audio').onclick=async()=>{try{const target=!previewSound,frame=$('game-preview');if(typeof frame.contentWindow.setPreviewAudio!=='function')throw new Error('Khung game chưa tải xong.');await frame.contentWindow.setPreviewAudio(target);previewSound=target;updatePreviewAudioUI();}catch(error){notify(error.message);}};


$('open-live-window').onclick=()=>{
 const height=Math.min(960,Math.max(320,screen.availHeight-120));
 const width=Math.round(height*9/16);
 const liveWindow=window.open(location.origin+'/?capture=1','wedding-live-capture',
  'popup=yes,width='+width+',height='+height+',resizable=yes,scrollbars=no');
 if(!liveWindow){notify('Cho phép cửa sổ bật lên để mở màn hình LIVE.');return;}
 liveWindow.focus();
 notify('Chọn cửa sổ Đám Cưới Xóm Mình trong Window Capture.');
};
$('reset').onclick=()=>{if(confirm('Bắt đầu phiên mới và xóa điểm phiên hiện tại?')){if(testPreview)leaveTest();cmd('reset');}};
for(const name of ['sound','readcmt','music'])$('st-'+name).onchange=e=>cmd(name,e.target.checked);
$('st-rate').oninput=e=>$('rate-label').textContent=Number(e.target.value).toLocaleString('vi-VN')+'×';$('st-rate').onchange=e=>cmd('rate',Number(e.target.value));
$('st-musicvol').oninput=e=>$('musicvol-label').textContent=Math.round(Number(e.target.value)*100)+'%';$('st-musicvol').onchange=e=>cmd('musicvol',Number(e.target.value));
$('st-local').onclick=()=>playText('Lan ơi, chào bạn vào tiệc! Hôm nay bạn thích nghe thơ hay nghe chuyện vui?');
for(const role of ['mc','groom','bride'])$('st-voice_'+role).onchange=e=>cmd('voice_'+role,e.target.value);
$('st-local-groom').onclick=()=>playText('Em có đồng ý làm vợ anh không?',$('st-voice_groom').value);
$('st-local-bride').onclick=()=>playText('Em đồng ý, em đã chờ câu này lâu lắm rồi.',$('st-voice_bride').value);
(async()=>{try{const {voices}=await(await fetch('/voices')).json();for(const [role,gender]of [['mc','F'],['groom','M'],['bride','F']]){const select=$('st-voice_'+role),desired=select.dataset.saved;select.replaceChildren();for(const voice of voices.filter(v=>v.gender===gender)){const option=document.createElement('option');option.value=voice.id;option.textContent=voice.name;select.append(option);}if(desired)select.value=desired;}$('local-voice-info').textContent=voices.length+' giọng cục bộ sẵn sàng';}catch{$('local-voice-info').textContent='Giọng đọc chưa sẵn sàng';}})();
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
$('script-library').hidden=true;renderScripts();connect();

for(const name of ['mc_idle_gap','mc_gift_limit','mc_gift_ttl'])$('st-'+name).onchange=e=>cmd(name,Number(e.target.value));

let testAwaiting=false,testPreview=false,testReport=null;
const fmtMetric=n=>Number(n||0).toLocaleString('vi-VN');
function updatePreviewAudioUI(){
 $('preview-audio').textContent=previewSound?'Tắt tiếng':'Bật tiếng';
 $('preview-audio').setAttribute('aria-pressed',String(previewSound));
 $('preview-state').textContent=(testPreview?'Phiên thử · ':'')+(previewSound?'Có tiếng':'Không tiếng');
}
function switchPreviewSession(id){
 const frame=$('game-preview');voicePlayer.stop();
 // Keep the frame and its unlocked AudioContext; only reconnect its data stream.
 if(typeof frame.contentWindow.setPreviewSession==='function'&&frame.contentWindow.setPreviewSession(id)!==false)return;
 // Compatibility with a game frame loaded before this update.
 frame.onload=()=>{frame.contentWindow.setPreviewAudio?.(previewSound).catch(error=>notify('Chưa bật được tiếng: '+error.message));};
 frame.src='/?'+(id?'test='+encodeURIComponent(id)+(previewSound?'':'&mute=1'):(previewSound?'':'mute=1'));
}
function setTestPreview(id){
 if(!id)return;
 const frame=$('game-preview'),changed=!testPreview||frame.dataset.test!==id;
 testPreview=true;frame.dataset.test=id;
 if(changed)switchPreviewSession(id);
 updatePreviewAudioUI();$('load-live').disabled=false;
}
function leaveTest(){
 if(testReport?.status==='running')send({type:'testStop'});
 testPreview=false;testAwaiting=false;$('load-fps').textContent='—';delete $('game-preview').dataset.test;
 switchPreviewSession(null);updatePreviewAudioUI();$('load-live').disabled=true;
}
function receiveTest(report){
 if(!report)return;testReport=report;
 if(testAwaiting||testPreview)setTestPreview(report.id);testAwaiting=false;
 const running=report.status==='running',manual=report.status==='ready',progress=manual?0:Math.min(100,report.processed/report.config.events*100);
 $('load-start').disabled=running;$('load-stop').disabled=!running;$('load-view').disabled=false;$('load-download').disabled=false;
 $('load-progress-bar').value=progress;
 const labels={running:'Đang mô phỏng',completed:'Hoàn tất',stopped:'Đã dừng',ready:'Phiên thử thủ công'};
 $('load-status').textContent=(labels[report.status]||report.status)+' · '+(report.elapsedMs/1000).toFixed(1)+' giây'+(report.reason?' · '+report.reason:'');
 $('load-processed').textContent=fmtMetric(report.processed)+(manual?'':' / '+fmtMetric(report.config.events));
 $('load-speed').textContent=manual?'Thủ công':fmtMetric(report.actualRate)+' /s';
 $('load-score').textContent=(report.scoreMatches?'✓ ':'✕ ')+fmtMetric(report.actualDuyen)+' / '+fmtMetric(report.expectedDuyen);$('load-score').style.color=report.scoreMatches?'#21835d':'#bd3545';
 $('load-heap').textContent=report.heapMB+' MB';
 $('load-coverage').textContent=report.coverage?Object.entries(report.coverage).filter(([k])=>!['rollcall','tug'].includes(k)).map(([k,v])=>({character:'Đổi nhân vật',food:'Gọi món',takeover:'Cướp vai',registration:'Đăng ký cưới',rollcall:'Điểm danh',tug:'Kéo co',wedding:'Vòng cưới'}[k]||k)+': '+v).join(' · '):'';
 const c=report.counts;$('load-counts').textContent=fmtMetric(c.chat)+' bình luận · '+fmtMetric(c.gift)+' quà · '+fmtMetric(c.like)+' gói tim · '+fmtMetric(c.share)+' chia sẻ · '+fmtMetric(c.join)+' lượt vào';
 $('load-detail').textContent='Xử lý TB '+report.avgEventMs+' ms · P95 '+report.p95EventMs+' ms · Đỉnh '+report.maxEventMs+' ms. Dữ liệu '+fmtMetric(report.wireKB)+' KB / '+report.frames+' đợt.';
}
$('load-start').onclick=()=>{if(voiceBusy){notify('Chờ câu nghe thử kết thúc rồi bắt đầu.');return;}
 const values={};for(const key of ['guests','duration','rate']){const input=$('load-'+key);if(!input.checkValidity()){input.reportValidity();return;}values[key]=Number(input.value);}
 const options={guests:values.guests,events:values.duration*values.rate,rate:values.rate,scenario:'realistic'};
 testAwaiting=true;if(!send({type:'testStart',options}))testAwaiting=false;
};
$('load-stop').onclick=()=>send({type:'testStop'});
$('load-view').onclick=()=>{if(testReport)setTestPreview(testReport.id);};
$('load-live').onclick=leaveTest;$('load-live').disabled=true;
function clearTest(){testAwaiting=true;send({type:'testClear'});}
$('load-clear').onclick=clearTest;
$('load-download').onclick=()=>{if(!testReport)return;const report={...testReport,screen:readScreenStats(),exportedAt:new Date().toISOString()},url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='kiem-thu-server-'+testReport.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function readScreenStats(){
 if(!testPreview)return null;try{const stage=$('game-preview').contentDocument?.getElementById('stage');if(!stage)return null;return{background:!!stage.ownerDocument.hidden,fps:Number(stage.dataset.fps)||0,pending:Number(stage.dataset.eventBacklog)||0,renderMs:Number(stage.dataset.renderMs)||0,walkWaiting:Number(stage.dataset.walkWaiting)||0,voiceWaiting:Number(stage.dataset.voiceWaiting)||0};}catch{return null;}
}
setInterval(()=>{if(ws?.readyState===1&&(selectedPanel==='test'||testReport?.status==='running'))send({type:'diagnosticPing',sentAt:Date.now()});const s=readScreenStats();if(s){$('load-fps').textContent=s.background?'Tab đang ẩn':s.fps?s.fps+' FPS':'Đang đo…';$('load-fps').title='Hàng màn hình '+s.pending+' · Cập nhật '+s.renderMs+' ms · Chờ đi mừng '+s.walkWaiting+' · Chờ MC '+s.voiceWaiting;const detail=$('load-detail');if(testReport)detail.textContent='Xử lý TB '+testReport.avgEventMs+' ms · P95 '+testReport.p95EventMs+' ms. Màn hình chờ '+s.pending+' · cập nhật '+s.renderMs+' ms. Khách chờ đi mừng '+s.walkWaiting+' · MC chờ '+s.voiceWaiting+'.';}},1000);

for(const button of document.querySelectorAll('[data-token]'))button.onclick=()=>{
 const card=Array.from($('script-list').children).find(el=>el.dataset.id===focusedScript)||$('script-list').querySelector('.script-card');
 if(!card){notify('Thêm một câu thoại trước.');return;}
 const field=card.querySelector('textarea');field.focus();field.setRangeText('{'+button.dataset.token+'}',field.selectionStart,field.selectionEnd,'end');field.dispatchEvent(new Event('input',{bubbles:true}));
};
$('preview-live').onclick=leaveTest;
$('preview-open').onclick=()=>$('open-live-window').click();
if($('sim-gift'))$('sim-gift').onchange=()=>{const chosen=$('sim-gift').value;$('sim-coins').disabled=chosen!=='custom';if(chosen!=='custom')$('sim-coins').value=['Finger Heart','Peach'].includes(chosen)?5:1;};

function settingsDialog(title){
 const dialog=document.createElement('dialog');
 dialog.className='settings-dialog';
 dialog.setAttribute('aria-label',title);
 const header=document.createElement('header'),heading=document.createElement('h3'),close=document.createElement('button');
 heading.textContent=title;
 close.textContent='Đóng';
 close.className='secondary';
 close.onclick=()=>dialog.close();
 header.append(heading,close);
 dialog.append(header);
 return dialog;
}
