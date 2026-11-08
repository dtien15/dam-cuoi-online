'use strict';
(()=>{
 const el=id=>document.getElementById(id);let section='thanks',mode='settings',store;
 const tabs=document.createElement('nav');tabs.className='script-tabs gift-subtabs';tabs.setAttribute('aria-label','Sự kiện quà');el('event-list').before(tabs);
 const labels={thanks:'Chỉ vàng',signup:'Đăng ký',bride:'Cướp rể · 5 xu',groom:'Cướp dâu · 5 xu',cancel:'Hủy hôn · 5 xu'};
 const specialTitle=key=>key==='cancel'?GiftEvents.cancelGift.title:GiftEvents.roleGifts.find(g=>g.role===key).title;
 function status(){if(!store)return;const state=store.state,node=el('ev-status');node.className='save-state '+state;node.textContent=store.error||({loading:'Đang tải…',saved:'Đã lưu',saving:'Đang lưu…',dirty:'Chưa lưu',conflict:'Có bản mới · Bỏ để nạp lại'}[state]);el('ev-save').disabled=!store.dirty||!!store.pending;el('ev-discard').disabled=!store.dirty&&!store.remote;}
 const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 function field(title,value,set,max=120){const label=make('label',title),input=make('input');input.value=value;input.maxLength=max;input.oninput=()=>{set(input.value);store.changed();};label.append(input);return label;}
 function test(data){if(store.dirty){notify('Lưu trước khi thử.');return;}testAwaiting=send(data);}
 function textArea(value,set){const input=make('textarea');input.rows=2;input.maxLength=300;input.value=value;input.oninput=()=>{set(input.value);store.changed();};return input;}
 function lineTools(card,text,set,remove){const row=make('div',null,'event-line'),area=textArea(text,set),listen=make('button','Nghe','secondary');listen.onclick=()=>playText(sample(area.value));row.append(area,listen);if(remove){const b=make('button','Xóa','danger');b.onclick=remove;row.append(b);}card.append(row);}
 function giftPicker(card,config,key){
  const chosen=GiftEvents.selected(config,key);
  const picker=settingsDialog('Chọn quà');
  const open=make('button','Chọn quà','secondary');
  open.onclick=()=>{tier.value=GiftEvents.selected(config,key)[0].coins;update();picker.showModal();};
  const tier=make('select');
  tier.setAttribute('aria-label','Giá quà');
  for(const coins of new Set(GiftEvents.catalog.map(gift=>gift.coins))){
   const option=make('option',coins+' xu');option.value=coins;tier.append(option);
  }
  tier.value=chosen[0].coins;
  const grid=make('div',null,'gift-picker-grid');
  const selectedLabel=make('small');
  function update(){
   const current=GiftEvents.selected(config,key);
   selectedLabel.textContent=current.map(gift=>gift.name).join(', ')+' · '+current[0].coins+' xu';
   grid.replaceChildren();
   for(const gift of GiftEvents.catalog.filter(gift=>gift.coins===Number(tier.value))){
    const label=make('label',null,'gift-picker-option'),checkbox=make('input'),icon=make('img');
    checkbox.type='checkbox';checkbox.checked=current.some(item=>item.id===gift.id);
    const usedElsewhere=['thanks','signup-bride','signup-groom','bride','groom','cancel'].some(other=>other!==key&&GiftEvents.selected(config,other).some(item=>item.id===gift.id));
    checkbox.disabled=usedElsewhere||(checkbox.checked&&current.length===1);
    if(usedElsewhere)label.title='Quà đã dùng cho sự kiện khác';
    icon.src=gift.icon;icon.alt='';icon.width=32;icon.height=32;icon.loading='lazy';
    checkbox.onchange=()=>{
     const ids=current.filter(item=>item.coins===gift.coins&&item.id!==gift.id).map(item=>item.id);
     if(checkbox.checked)ids.push(gift.id);
     (config.giftSelections??={})[key]=ids;
     store.changed();update();
    };
    label.append(checkbox,icon,make('span',gift.name));grid.append(label);
   }
  }
  tier.onchange=update;
  picker.append(tier,grid);card.append(selectedLabel,open,picker);update();
 }
 function render(){
  const d=store.draft;el('ev-board').checked=d.board.enabled;el('ev-height').value=d.board.height;el('ev-speed').value=d.board.speed;
  tabs.replaceChildren();for(const[key,label]of Object.entries(labels)){const b=make('button',['bride','groom','cancel'].includes(key)?label.split(' · ')[0]+' · '+GiftEvents.selected(d,key)[0].coins+' xu':label,key===section?'active':'');b.onclick=()=>{section=key;render();};tabs.append(b);}
  const list=el('event-list');list.replaceChildren();
  if(section==='signup'){
   const card=make('article',null,'event-card');card.append(make('h3','Đăng ký lễ tiếp theo'),make('p','Mỗi tài khoản một lượt chờ. Đã cưới nghỉ 3 lễ.', 'event-description'));
   const choices=make('div',null,'registration-list');for(const g of WeddingCycle.joinGifts){const row=make('div',null,'registration-card'),text=make('div');text.append(make('b',g.role==='bride'?'Cô dâu':'Chú rể'));giftPicker(text,d,'signup-'+g.role);const b=make('button','Thử','secondary');b.onclick=()=>{const gift=GiftEvents.selected(d,'signup-'+g.role)[0];test({type:'testEvent',event:{type:'gift',id:'signup_'+g.role,name:g.role==='bride'?'Khách 1':'Khách 2',coins:gift.coins,unitCoins:gift.coins,giftName:gift.name}});};row.append(text,b);choices.append(row);}card.append(choices);list.append(card);status();return;
  }
  const event=d.events[0],role=['bride','groom','cancel'].includes(section)?section:null;
  const card=make('article',null,'event-card'),head=make('div',null,'event-heading');head.append(make('h3',labels[section].split(' · ')[0]));const b=make('button','Thử','secondary');b.onclick=()=>test(role?{type:'testGiftScene',role}:{type:'testGiftScene',id:event.id});head.append(b);card.append(head);
  const sub=make('nav',null,'script-tabs');for(const[key,label]of [['settings','Cài đặt'],['scripts','Kịch bản MC']]){const b=make('button',label,key===mode?'active':'');b.onclick=()=>{mode=key;render();};sub.append(b);}card.append(sub);
  if(mode==='settings'){
   card.append(field('Tên trên bảng',role?(d.specialNames[role]||specialTitle(role)):event.name,value=>role?d.specialNames[role]=value:event.name=value,45));
   giftPicker(card,d,section);
   card.append(make('p',role?({groom:'Thay chú rể',bride:'Thay cô dâu',cancel:'Dừng lễ đang diễn ra và sang lễ mới ngay. Vừa vào lễ mới 15 giây đầu chưa hủy được. Đang mini game thì hết trò mới hủy.'}[role]):'Khách đi dưới sân đến hộp chỉ vàng, cộng chỉ vàng và cảm ơn.','event-description'));
  }else{
   card.append(make('small','{ten}: tên khách · {duyen}: số chỉ vàng · {qua}: tên quà'));
   if(role){card.append(make('small',(role==='cancel'?'MC đổi câu mỗi lần có khách hủy hôn.':'MC đổi câu mỗi lần có khách cướp vai.')+' Mỗi dòng một câu, có {ten}, tối đa 120 ký tự.'));const row=make('div',null,'event-line'),area=make('textarea'),listen=make('button','Nghe','secondary');area.rows=6;area.maxLength=1500;area.value=d.roleLines[role];area.oninput=()=>{d.roleLines[role]=area.value;store.changed();};listen.onclick=()=>playText(sample(area.value.split('\n')[0]||''));row.append(area,listen);card.append(row);}
   else{lineTools(card,event.line,v=>event.line=v);for(const[i,line]of(event.lines||[]).entries())lineTools(card,line,v=>event.lines[i]=v,()=>{event.lines.splice(i,1);store.changed();render();});const add=make('button','+ Thêm câu','secondary');add.onclick=()=>{if((event.lines||[]).length>=12)return; (event.lines??=[]).push('Cảm ơn {ten} đã chung vui!');store.changed();render();};card.append(add);}
  }
  list.append(card);status();
 }
 store=new SettingsStore({defaults:GiftEvents.defaults(),validate:GiftEvents.validate,send,command:'saveGiftEvents',onChange:status,onReplace:render});
 window.receiveGiftEvents=c=>store.receive(c);window.addEventListener('settingsError',e=>store.fail(e.detail));
 for(const[id,key]of [['ev-board','enabled'],['ev-height','height'],['ev-speed','speed']])el(id).oninput=()=>{store.draft.board[key]=key==='enabled'?el(id).checked:Number(el(id).value);store.changed();};
 el('ev-save').onclick=()=>store.save();el('ev-discard').onclick=()=>store.discard();
 el('tab-gifts').onclick=()=>window.selectEventTab('gifts');
 window.addEventListener('beforeunload',e=>{if(store.dirty){e.preventDefault();e.returnValue='';}});
 if(window.lastGiftConfig)store.receive(window.lastGiftConfig);else render();
})();
