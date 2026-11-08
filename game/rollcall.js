'use strict';
(function(root){
 const commentaryLines=Object.freeze({
 "reminder": "Còn vài giây thôi! Một là nhà trai, không là nhà gái. Chọn nhầm phe là cả họ giận đó!",
 "selection": "Đồng hồ chạy rồi, chọn phe đi cả nhà!",
 "kickoff": "Hết giờ chọn! Giờ nhà nào yêu đôi trẻ hơn, nhìn bảng điểm là biết. Bắt đầu!",
 "gift": "{ten} vừa bồi thêm {diem} điểm! Cả họ phải cảm ơn bạn đó!",
 "topLikes": "Người có ngón tay nhanh nhất hôm nay là {ten}, với {luong} tim. Xin một tràng pháo tay!",
 "topGifts": "Hậu phương vững chắc nhất trận này là {ten}, với {luong} xu. Hai họ ghi nhớ!",
 "groomLead": "Nhà trai vượt lên rồi! Nhà gái ơi, để thua là mất mặt với thông gia đó!",
 "brideLead": "Nhà gái đang dẫn! Nhà trai ơi, chưa cưới xong mà đã thua vợ rồi sao?",
 "groomOvertake": "Lật kèo rồi! Nhà trai vừa vượt lên, nhà gái đang ngơ ngác kìa!",
 "brideOvertake": "Khoan đã! Nhà gái vừa lật ngược thế cờ, bảng điểm đổi chủ rồi!",
 "tie": "Bằng điểm rồi cả nhà ơi! Lúc này một trái tim cũng quyết định tất cả!",
 "waiting": "Bảng điểm còn trống trơn. Họ nào dám ra tay trước, nào?",
 "finalGroom": "Những giây cuối! Nhà gái ơi, còn kịp đó, đừng để nhà trai cười cả năm!",
 "finalBride": "Sắp hết giờ! Nhà trai ơi, còn một cú cuối, dồn hết sức đi!",
 "finalTie": "Vẫn hòa! Những giây cuối cùng rồi, ai nhanh tay người đó thắng!",
 "resultTie": "Hòa! Đúng là trời sinh một cặp, tới thi đấu cũng không ai chịu thua ai!"
});
 const defaults=()=>({version:1,revision:0,duration:30,selectionSeconds:10,weddingVariant:'rollcall',autoEnabled:false,autoInterval:120,intro:"Dừng cỗ, dừng đũa! Giờ là lúc hai họ phân định xem nhà nào đông, nhà nào yêu đôi trẻ hơn!",rules:"Gõ một về nhà trai, gõ không về nhà gái. Khi thi, một tim một điểm, một xu mười điểm. Bên nhiều điểm hơn, cả năm được quyền nói to!",outro:"{ben} thắng với {diem} điểm! Từ nay trong họp gia đình, {ben} được nói trước!",commentary:{...commentaryLines}});
 function validate(c){if(!c||!Number.isInteger(c.duration)||c.duration<10||c.duration>120)throw Error('Thời gian từ 10 đến 120 giây.');for(const key of ['intro','outro'])if(typeof c[key]!=='string'||!c[key].trim()||c[key].length>160)throw Error('Lời MC cần từ 1 đến 160 ký tự.');const rules=c.rules??defaults().rules;if(typeof rules!=='string'||!rules.trim()||rules.length>160)throw Error('Cách chơi cần từ 1 đến 160 ký tự.');const selectionSeconds=c.selectionSeconds??10;
  if(!Number.isInteger(selectionSeconds)||selectionSeconds<3||selectionSeconds>60)throw Error('Thời gian chọn phe từ 3 đến 60 giây.');
  const autoInterval=c.autoInterval??120;
  if(!Number.isInteger(autoInterval)||autoInterval<30||autoInterval>3600)throw Error('Khoảng nghỉ mini game từ 30 đến 3600 giây.');
  const commentary={};
  for(const [key,fallback] of Object.entries(commentaryLines)){
   const line=c.commentary?.[key]??fallback;
   if(typeof line!=='string'||!line.trim()||line.length>160)throw Error('Lời MC cần từ 1 đến 160 ký tự.');
   commentary[key]=line.trim();
  }
  return{version:1,revision:Number(c.revision)||0,duration:c.duration,selectionSeconds,weddingVariant:c.weddingVariant==='tug'?'tug':'rollcall',autoEnabled:!!c.autoEnabled,autoInterval,intro:c.intro.trim(),rules:rules.trim(),outro:c.outro.trim(),commentary,...(c.tug?{tug:validateTug(c.tug)}:{})};}
 const live=e=>!!e&&['preparing','active','result'].includes(e.phase);
 function start(s,c,now=Date.now()){if(live(s.rollcall))throw Error('Sự kiện đang chạy. Kết thúc hoặc hủy trước.');s.rollcall={id:'rollcall-'+now+'-'+Math.random().toString(36).slice(2,8),phase:'preparing',createdAt:now,config:{...c},scores:{groom:0,bride:0},people:{groom:0,bride:0},likes:0,activity:{},leaders:{},participants:{},participantCount:0,winner:null};
  for(const user of Object.values(s.users||{})){
   selectTeam(s.rollcall,user.id,user.team);
  }
  return s.rollcall;}
 function ready(e,id,now=Date.now()){
  if(e?.id!==id||e.phase!=='preparing'||e.selectionEndsAt)return false;
  e.selectionEndsAt=now+(e.config.selectionSeconds??10)*1000;
  return true;
 }
 function kickoff(e,id,now=Date.now()){
  if(e?.id!==id||e.phase!=='preparing'||!e.selectionEndsAt||now<e.selectionEndsAt)return false;
  e.phase='active';
  e.startedAt=now;
  e.endsAt=now+e.config.duration*1000;
  return true;
 }
 function finish(e,now=Date.now()){if(!e||e.phase!=='active')return false;e.phase='result';e.finishedAt=now;e.hideAt=now+60000;e.winner=e.scores.groom===e.scores.bride?'tie':e.scores.groom>e.scores.bride?'groom':'bride';return true;}
 function acknowledgeResult(e,id,now=Date.now()){
  if(e?.id!==id||e.phase!=='result'||e.announced)return false;
  e.announced=true;
  e.hideAt=Math.max(e.finishedAt+5000,now);
  return true;
 }
 function tick(e,now=Date.now()){if(!e)return false;
  if(e.phase==='active'&&now>=e.endsAt)return finish(e,e.endsAt);if(e.phase==='result'&&now>=e.hideAt){e.phase='finished';e.participants={};return true;}return false;}
 function cancel(e,now=Date.now()){if(!live(e))return false;e.phase='cancelled';e.finishedAt=now;e.participants={};return true;}
 function restore(s){if(live(s.rollcall))cancel(s.rollcall);return s;}
 function captures(e,raw,now=Date.now()){
  if(!e)return false;
  if(raw.type==='chat'&&/^[01]$/.test(String(raw.text||'').trim())){
   return (e.phase==='preparing'&&(!e.selectionEndsAt||now<e.selectionEndsAt))||(e.phase==='active'&&now<e.endsAt);
  }
  return ['like','gift'].includes(raw.type)&&e.phase==='active'&&now>=e.startedAt&&now<e.endsAt;
 }
 function selectTeam(e,id,team){
  const previous=Object.hasOwn(e.participants,id)?e.participants[id]:null;
  if(previous===team)return;
  if(previous)e.people[previous]--;
  else{
   if(e.participantCount>=20000)return;
   e.participantCount++;
  }
  e.participants[id]=team;
  e.people[team]++;
 }
 function apply(e,event,salonTeam,now=Date.now()){
  if(e?.phase==='preparing'&&(!e.selectionEndsAt||now<e.selectionEndsAt)){
   const choice=event.type==='chat'?event.text.trim():'';
   const team=choice==='1'?'groom':choice==='0'?'bride':salonTeam;
   if(choice==='1'||choice==='0'||!Object.hasOwn(e.participants,event.id)){
    selectTeam(e,event.id,team);
   }
  }
  if(e?.phase==='active'&&now>=e.startedAt&&now<e.endsAt&&!Object.hasOwn(e.participants,event.id)){
   const team=e.people.groom<=e.people.bride?'groom':'bride';
   selectTeam(e,event.id,team);
  }
  if(!captures(e,event,now))return false;
  if(['like','gift'].includes(event.type)&&Object.hasOwn(e.participants,event.id)){
   const gift=event.type==='gift';
   const amount=gift?event.coins:event.count;
   const points=gift?amount*10:amount;
   const activity=e.activity[event.id]??={likes:0,gifts:0};
   const category=gift?'gifts':'likes';
   activity[category]+=amount;
   e.scores[e.participants[event.id]]+=points;
   if(gift)event.rollcallGiftPoints=points;
   else e.likes+=amount;
   const leader=e.leaders[category];
   if(!leader||leader.id===event.id||activity[category]>leader.amount){
    e.leaders[category]={id:event.id,name:event.name,avatar:event.avatar||'',amount:activity[category]};
   }
  }
  return true;
 }
 function view(e,now=Date.now()){if(!e)return null;const {participants,activity,leaders,...publicEvent}=e;return{...publicEvent,leaders:e.phase==='result'?leaders:undefined,serverAt:now};}
 function resultText(e){if(e.winner==='tie')return e.config.commentary?.resultTie??commentaryLines.resultTie;return e.config.outro.replace(/\{ben\}/g,e.winner==='groom'?'Nhà trai':'Nhà gái').replace(/\{diem\}/g,String(e.scores[e.winner]));}
 function validateTug(script){
  const {intro,rules,outro,commentary}=validate({...defaults(),...script,tug:undefined});
  return {intro,rules,outro,commentary};
 }
 function forVariant(config,variant){
  if(variant!=='tug')return config;
  if(config.tug)return {...config,...config.tug,variant};
  return {...config,variant,
   intro:'Kéo co hai họ bắt đầu! Sợi dây đã căng, danh dự cả họ nằm ở hai bàn tay này!',
   rules:'Gõ một về nhà trai, gõ không về nhà gái. Khi thi, một tim một điểm, một xu mười điểm. Bên nhiều điểm hơn kéo dây về đích!',
   outro:'{ben} kéo dây về đích với {diem} điểm! Bên kia về rửa bát nha!',
   commentary:{...commentaryLines,...Object.freeze({"groomLead":"Dây đang về phía nhà trai! Nhà gái ơi, cầm chắc tay vào!","brideLead":"Nhà gái kéo khỏe quá! Nhà trai ơi, ăn cỗ nãy giờ để làm gì?","groomOvertake":"Nhà trai giật ngược sợi dây! Coi chừng tuột dép kìa!","brideOvertake":"Nhà gái kéo ngược rồi! Nhà trai trượt chân cả hàng kìa!","tie":"Nơ đứng ngay giữa sân! Hai họ đang gồng tới đỏ mặt!","waiting":"Dây đã căng! Họ nào dám kéo nhịp đầu tiên?","finalGroom":"Những giây cuối! Nhà gái dồn sức, kéo ngược lại đi!","finalBride":"Sắp hết giờ! Nhà trai ơi, một hơi cuối thôi!","finalTie":"Dây vẫn ở giữa! Cú kéo cuối cùng sẽ quyết định tất cả!","resultTie":"Sợi dây đứng im giữa sân! Hai họ khỏe y như nhau, thôi về ăn tiếp!"})
   }
  };
 }
 const api={forVariant,commentaryLines,defaults,validate,live,start,ready,kickoff,finish,acknowledgeResult,tick,cancel,restore,captures,apply,view,resultText};if(typeof module!=='undefined')module.exports=api;else root.Rollcall=api;
})(typeof globalThis!=='undefined'?globalThis:this);
