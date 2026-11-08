'use strict';
(function(root){
 const catalog=typeof module!=='undefined'?require('./gift-catalog'):root.GiftCatalog;
 const fallbackLine='Cảm ơn {ten} đã gửi {duyen} chỉ vàng!';
 const roleLines={
  cancel:['Dừng lại hết! {ten} vừa hủy hôn, đám cưới này chính thức tan!','Trời ơi {ten}! Nhẫn chưa kịp ấm tay mà lễ đã bị hủy rồi!','{ten} phản đối và đã hủy hôn! Cô dâu chú rể về nhà ai nấy ở!','Hai họ bình tĩnh! {ten} vừa xé thiệp cưới, lễ này xin dừng tại đây!','{ten} hủy hôn! Cỗ vẫn còn, nhưng đôi này thì hết. Mời lễ tiếp theo!'].join('\n'),
  bride:['{ten} cướp rể thành công! Cô dâu cũ nhường sân!','Dừng lễ! {ten} vừa kéo chú rể đi ngay trước mặt hai họ!','Trời ơi {ten}! Cô dâu cũ còn chưa kịp khóc, đã có cô dâu mới rồi!','Chúc mừng {ten}! Chú rể đứng yên đó, cả rạp đang nhìn anh đó!','Không ai ngờ được! {ten} giành luôn chú rể, xin chúc mừng cô dâu mới!','{ten} đã ra tay! Yêu là phải liều, chúc mừng cô dâu mới của xóm mình!'].join('\n'),
  groom:['{ten} cướp dâu thành công! Chú rể cũ ra ghế dự bị!','Dừng lễ! {ten} vừa rước cô dâu đi ngay trước mặt hai họ!','Trời ơi {ten}! Chú rể cũ còn đang cầm nhẫn, đã có chú rể mới rồi!','Chúc mừng {ten}! Cô dâu đừng chạy, cả xóm đang làm chứng đây!','Không ai ngờ được! {ten} giành luôn cô dâu, xin chúc mừng chú rể mới!','{ten} đã ra tay! Yêu là phải liều, chúc mừng chú rể mới của xóm mình!'].join('\n'),
 };
 const defaults=()=>({version:3,revision:0,specialNames:{},giftSelections:{},roleLines:{...roleLines},board:{enabled:true,height:330,speed:14},events:[
 {id:'envelope',enabled:true,coins:1,icon:'✉️',name:'Mừng chỉ vàng',action:'envelope',line:fallbackLine,lines:['{ten} ơi, cảm ơn bạn đã gửi {duyen} chỉ vàng!']} ]});
 function validate(value){if(!value||!Array.isArray(value.events)||value.events.length>30)throw Error('Tối đa 30 sự kiện');const ids=new Set(),thresholds=new Set();const events=value.events.map(e=>{if(!e||typeof e.id!=='string'||! /^[a-zA-Z0-9_-]{1,60}$/.test(e.id)||ids.has(e.id))throw Error('Mã sự kiện không hợp lệ');ids.add(e.id);if(!Number.isSafeInteger(e.coins)||e.coins<1||e.coins>1000000||thresholds.has(e.coins))throw Error('Mức xu phải khác nhau, từ 1 đến 1.000.000');thresholds.add(e.coins);if(!['envelope','stage','thanks'].includes(e.action))throw Error('Tiết mục chưa hỗ trợ');const name=String(e.name||'').trim(),line=String(e.line||'').trim(),icon=String(e.icon||'🎁');if(!name||name.length>45||!line||line.length>300||icon.length>16)throw Error('Kiểm tra tên, icon và lời MC');if(/\{(?!ten\}|duyen\}|qua\})/.test(line))throw Error('Lời MC chỉ dùng {ten}, {duyen}, {qua}');const result={id:e.id,enabled:!!e.enabled,coins:e.coins,icon,name,action:e.action,line};if(e.lines!==undefined){
 if(!Array.isArray(e.lines)||e.lines.length>12||e.lines.some(line=>typeof line!=='string'||!line.trim()||line.length>300||/\{(?!ten\}|duyen\}|qua\})/.test(line)))throw Error('Kiểm tra các lời MC bổ sung');
 result.lines=e.lines.map(line=>line.trim());
 }if(e.activity!==undefined&&!['toast','dance'].includes(e.activity))throw Error('Hoạt động sân khấu không hợp lệ');if(e.action==='stage')result.activity=e.activity||'toast';if(e.propIcon)result.propIcon=String(e.propIcon).slice(0,16);if(e.giftImage){if(typeof e.giftImage!=='string'||e.giftImage.length>6000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(e.giftImage))throw Error('Ảnh quà không hợp lệ hoặc quá lớn');result.giftImage=e.giftImage;}if(e.iconImage){if(typeof e.iconImage!=='string'||e.iconImage.length>6000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(e.iconImage))throw Error('Ảnh icon không hợp lệ hoặc quá lớn');result.iconImage=e.iconImage;}return result;});const b=value.board||{};if(!Number.isFinite(b.height)||b.height<180||b.height>650||!Number.isFinite(b.speed)||b.speed<4||b.speed>40)throw Error('Chiều cao 180–650, tốc độ 4–40');if(JSON.stringify(events).length>220000)throw Error('Tổng ảnh quá lớn, bớt ảnh trước khi lưu');return{version:3,revision:Number(value.revision)||0,board:{enabled:!!b.enabled,height:b.height,speed:b.speed},events,specialNames:validateSpecialNames(value.specialNames),roleLines:validateRoleLines(value.roleLines),giftSelections:validateSelections(value.giftSelections)};}
 function validateSpecialNames(value){
  const names={};
  for(const key of ['bride','groom','cancel']){
   if(value?.[key]===undefined)continue;
   const name=typeof value[key]==='string'?value[key].trim():'';
   if(!name||name.length>45)throw Error('Tên hiển thị cần từ 1 đến 45 ký tự.');
   names[key]=name;
  }
  return names;
 }
 function validateRoleLines(value){
  const lines={...roleLines};
  for(const role of Object.keys(lines)){
   if(value?.[role]===undefined)continue;
   const line=value[role];
   const rows=typeof line==='string'?line.split('\n').map(row=>row.trim()).filter(Boolean):[];
   if(!rows.length||rows.length>12||rows.some(row=>row.length>120||!row.includes('{ten}')||/\{(?!ten\}|duyen\}|qua\})/.test(row)))throw Error('Lời MC đổi vai: mỗi dòng một câu, có {ten}, tối đa 120 ký tự.');
   lines[role]=rows.join('\n');
  }
  return lines;
 }
 const roleGifts=[
  {role:'groom',coins:5,title:'Cướp dâu',gifts:[['Finger Heart','Bắn tim','/assets/role-gift-1.webp']]},
  {role:'bride',coins:5,title:'Cướp rể',matchByName:true,gifts:[['Peach','Quả đào','/assets/role-gift-2.webp']],aliases:['Đào']},
 ];
 const normalizeName=name=>String(name||'').trim().toLowerCase().normalize('NFC');
 const defaultNames={thanks:'Rose','signup-bride':'GG','signup-groom':'TikTok',bride:'Peach',groom:'Finger Heart',cancel:'Okay'};
 function selected(config,key){
  const ids=config?.giftSelections?.[key];
  return ids?ids.map(id=>catalog.find(gift=>gift.id===id)).filter(Boolean):catalog.filter(gift=>gift.name===defaultNames[key]);
 }
 function validateSelections(value){
  const selections={};
  const used=new Set();
  for(const key of Object.keys(defaultNames)){
   const ids=value?.[key];
   if(ids!==undefined){
    if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('Chọn ít nhất một món quà cho mỗi sự kiện.');
    const gifts=selected({giftSelections:{[key]:ids}},key);
    if(gifts.length!==ids.length||gifts.some(gift=>gift.coins!==gifts[0].coins))throw Error('Các món quà của một sự kiện phải cùng giá.');
    selections[key]=ids;
   }
   for(const gift of selected({giftSelections:selections},key)){
    if(used.has(gift.id))throw Error('Mỗi món quà chỉ được chọn cho một sự kiện.');
    used.add(gift.id);
   }
  }
  return selections;
 }
 function matches(config,key,event){
  const aliases={Peach:['Đào','Quả đào'],'Finger Heart':['Bắn tim'],Rose:['Hoa hồng']};
  return selected(config,key).some(gift=>{
   const names=[gift.name,...(aliases[gift.name]||[])];
   const legacyPeach=!config?.giftSelections?.[key]&&gift.name==='Peach';
   const priceMatches=gift.coins===(event.unitCoins||event.coins)||legacyPeach;
   return priceMatches&&names.some(name=>normalizeName(name)===normalizeName(event.giftName));
  });
 }
 function applyRoleGift(state,event,config){
  if(event.type!=='gift')return;
  const rule=roleGifts.find(group=>matches(config,group.role,event));
  if(!rule)return;
  const roles=state.weddingRoles??={};
  const current=roles[rule.role];
  if(Object.values(roles).some(holder=>holder.id===event.id))return;
  roles[rule.role]={id:event.id,name:event.name,avatar:event.avatar||''};
  event.weddingRole={role:rule.role,title:rule.role==='bride'?'cô dâu':'chú rể',previous:current?.name,seat:state.users?.[event.id]?.seat};
 }
 function choose(config,coins){
  const tier=coins>=1&&coins<5?1:coins;
  return config.events.find(e=>e.enabled&&e.coins===tier)||{...defaults().events[0],action:'envelope'};
 }
 const roleLineCursor=new Map();
 function roleLine(config,role){
  const rows=String(config?.roleLines?.[role]||roleLines[role]).split('\n').map(row=>row.trim()).filter(Boolean);
  const index=roleLineCursor.get(role)||0;roleLineCursor.set(role,index+1);return rows[index%rows.length];
 }
 const lineCursor=new Map();
 function speech(event,gift){
  const lines=[event.line,...(event.lines||[])];
  const index=(lineCursor.get(event.id)||0)%lines.length;
  lineCursor.set(event.id,index+1);
  return lines[index].replace(/(\{duyen\}\s+)(?:phong bì|cá|duyên lành|duyên)(?=[\s!.,?]|$)/gi,'$1chỉ vàng').replace(/\{(ten|duyen|qua)\}/g,(_,key)=>({ten:gift.name,duyen:gift.coins.toLocaleString('vi-VN'),qua:gift.giftName||'món quà'})[key]);
 }
 function thanksBatch(queue,maxChars=180,spokenName=name=>name){const batch=[];let length=9;while(queue.length&&batch.length<4){const scene=queue[0],entry=spokenName(scene.gift.name)+' gửi '+scene.gift.coins.toLocaleString('vi-VN')+' chỉ vàng';if(batch.length&&(length+entry.length+2>maxChars||scene.event.exclusive||batch[0].event.exclusive||scene.event.activity==='takeover'||batch[0].event.activity==='takeover'))break;queue.shift();batch.push(scene);length+=entry.length+2;}if(!batch.length)return null;const custom=batch.length===1?speech(batch[0].event,{...batch[0].gift,name:spokenName(batch[0].gift.name)}):'';const spoken=batch.length===1?(batch[0].event.activity==='takeover'||batch[0].event.exclusive||custom.length<=120&&custom.includes(spokenName(batch[0].gift.name))?custom:'Cảm ơn '+spokenName(batch[0].gift.name)+' đã gửi '+batch[0].gift.coins.toLocaleString('vi-VN')+' chỉ vàng!'):'Cảm ơn '+batch.map(s=>spokenName(s.gift.name)+' gửi '+s.gift.coins.toLocaleString('vi-VN')+' chỉ vàng').join(', ')+'!';return{batch,spoken};}
 function enqueue(queue,scene){const existing=queue.find(s=>s.gift.id===scene.gift.id&&s.round===scene.round&&!s.event.exclusive&&!scene.event.exclusive&&s.event.activity!=='takeover'&&scene.event.activity!=='takeover');if(existing){if(scene.acks)existing.acks=[...(existing.acks||[]),...scene.acks];existing.gift.coins+=scene.gift.coins;existing.amount+=scene.amount;if(scene.event.coins>existing.event.coins)existing.event=scene.event;if(existing.gift.giftName!==scene.gift.giftName)existing.gift.giftName='nhiều món quà';}else queue.push(scene);return existing||scene;}
 function migrate(config){
  if(config.version===3){const first=config.events.find(e=>e.coins===1)||defaults().events[0];return validate({...config,events:[{...first,enabled:true,action:'envelope'}]});}
  const core=defaults().events.map(sample=>{
   const old=config.events.find(e=>e.coins===sample.coins);
   return old?{...sample,iconImage:old.iconImage,giftImage:old.giftImage,line:old.line||sample.line}:sample;
  });
  const extra=config.events.filter(e=>e.coins>10&&e.id!=='love-seat').map(e=>e.action==='chair'?{...e,action:'envelope',propIcon:'🪑'}:e);
  return validate({...config,events:[...core,...extra]});
 }
 const cancelGift={role:'cancel',coins:5,title:'Hủy hôn'};
 const api={cancelGift,roleLine,catalog,selected,matches,roleGifts,applyRoleGift,defaults,validate,migrate,choose,speech,thanksBatch,enqueue};if(typeof module!=='undefined')module.exports=api;else root.GiftEvents=api;
})(typeof globalThis!=='undefined'?globalThis:this);
