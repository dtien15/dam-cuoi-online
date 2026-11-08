'use strict';
(function(root) {
  const Requests=root.GuestRequests||(typeof require==='function'?require('./guest-requests'):null);
  const Lines=root.MCLines||(typeof require==='function'?require('./mc-lines'):null);
  const READY = {
    tho: 'Trầu xanh têm với cau vàng. Cô dâu cười tít, cả làng cùng vui. Chú rể đứng cạnh bùi ngùi. Từ nay rửa bát có người kiểm tra!',
    gift: 'Cảm ơn bà con tặng quà! Sổ mừng đã ghi đủ rồi nhé!',
    giftMany: 'Quà tới liên tục! Cảm ơn cả nhà, sổ mừng nhận đủ từng xu!',
    join: 'Mời bà con vào tiệc, ghế còn trống, trà còn mát nhé!',
    chucmung: 'Cảm ơn lời chúc của bạn! Hai họ vui quá rồi!',
    ny: 'Chuyện người yêu để cô bàn đầu tư vấn nhé!',
    an: 'Xôi nóng, gà lên mâm rồi! Ăn chậm thôi nhé, cô dâu chưa tung hoa mà bạn đã xin hộp mang về rồi!',
    bia: 'Mình nâng ly trà đá, vui rồi về nhà an toàn nhé!',
    dep: 'Cảm ơn bạn khen, cô dâu cười tươi quá rồi!',
    hat: 'Mời cả nhà vỗ tay chúc mừng cô dâu chú rể nhé!',
    tien: 'Một lời chúc cũng quý, cứ vào chung vui nhé!',
    que: 'Quê mình có rạp cưới ngoài ngõ, cả xóm chung vui!',
    nhat: 'MC xin nhận nửa lỗi, nửa còn lại tại chú rể cười chưa đủ duyên! Bạn muốn nghe thơ hài hay chuyện đi ăn cỗ?',
    mc: 'MC có mặt! Chuyên dẫn đám cưới, kiêm tìm người rửa bát. Bạn muốn gửi lời chúc hay nghe thơ hài nào?',
    cuoi: 'Bạn cười là cả rạp vui rồi!',
    chao: 'Xin chào bạn, mời vào tiệc chung vui nhé!',
    hoi: 'Câu này nhờ ban cố vấn bàn đầu giúp MC nhé!',
  };
  // A reply read long after its comment feels like lag on stream, so comments go stale quickly.
  const COMMENT_TTL = 15000;
  const runtime={mc_idle_gap:20,mc_gift_limit:12,mc_gift_ttl:25};
  const runtimeLimits={mc_idle_gap:[10,90],mc_gift_limit:[3,24],mc_gift_ttl:[10,60]};
  function setRuntime(name,value){if(!Object.hasOwn(runtimeLimits,name))return;const number=Number(value),[min,max]=runtimeLimits[name];if(Number.isFinite(number))runtime[name]=Math.max(min,Math.min(max,Math.round(number)));}
  let scriptConfig=null;
  const scriptCursors=new Map();
  const EVENTS={wish:'Chúc mừng',gift:'Cảm ơn quà',welcome:'Đón khách',idle:'Lúc vắng',share:'Chia sẻ',like:'Thả tim'};
  const REPLIES={tho:'Đọc thơ',ny:'Người yêu',an:'Ăn cỗ',bia:'Cụng ly / đồ uống',dep:'Khen đẹp',hat:'Âm nhạc',tien:'Chuyện tiền',que:'Quê quán',nhat:'Khách thấy chán',mc:'Gọi MC',cuoi:'Tiếng cười',chao:'Chào hỏi',hoi:'Câu hỏi',team:'Chọn hai họ',kitchen:'Gần bếp',dishes:'Rửa bát',food:'Chọn món',location:'Khách nói địa phương',fallback:'Bình luận khác'};
  function scriptCatalog(){return{...EVENTS,...Object.fromEntries(Object.entries(REPLIES).map(([key,label])=>['reply.'+key,label]))};}
  function validateScripts(rows){
    if(!Array.isArray(rows)||rows.length>250)throw new Error('Tối đa 250 câu thoại.');
    const events=scriptCatalog(),ids=new Set();
    return rows.map((row,i)=>{
      if(!row||typeof row.id!=='string'||!/^[\w-]{1,80}$/.test(row.id)||ids.has(row.id))throw new Error('Mã câu thoại không hợp lệ hoặc bị trùng.');
      ids.add(row.id);
      if(!Object.hasOwn(events,row.event)||typeof row.text!=='string'||!row.text.trim()||row.text.length>300)throw new Error('Câu '+(i+1)+': chọn mục và nhập từ 1–300 ký tự.');
      for(const match of row.text.matchAll(/\{([^{}]+)\}/g))if(!['ten','qua','duyen','binhluan','ben'].includes(match[1]))throw new Error('Biến không hỗ trợ: {'+match[1]+'}');
      return{id:row.id,event:row.event,text:row.text.trim(),enabled:row.enabled!==false};
    });
  }
  function setScripts(rows){scriptConfig=validateScripts(rows);scriptCursors.clear();}
  // Lượt đầu đi theo thứ tự đã soạn, các lượt sau xáo lại và không lặp ngay câu vừa nói.
  function nextRow(event,rows){
    const key=rows.map(row=>row.id).join('|');
    let cursor=scriptCursors.get(event);
    if(!cursor||cursor.key!==key)cursor={key,order:rows.map((_,index)=>index),pos:0,last:-1};
    if(cursor.pos>=cursor.order.length){
      const order=rows.map((_,index)=>index);
      for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      if(order.length>1&&order[0]===cursor.last)[order[0],order[1]]=[order[1],order[0]];
      cursor.order=order;cursor.pos=0;
    }
    const index=cursor.order[cursor.pos++];cursor.last=index;scriptCursors.set(event,cursor);
    return rows[index];
  }
  function scriptText(event,vars={}){
    if(scriptConfig===null)return undefined;
    const rows=scriptConfig.filter(row=>row.event===event&&row.enabled);if(!rows.length)return '';
    return nextRow(event,rows).text.replace(/\{(ten|qua|duyen|binhluan|ben)\}/g,(_,key)=>String(vars[key]??''));
  }
  function item(key, seq, now = Date.now()) {
    const comment = key.startsWith('cmt.') || key === 'cmtRead' || key === 'cmtBad';
    const kind = comment ? 'comment' : key === 'testVoice' ? 'test' : 'ambient';
    return { key, seq, kind, createdAt: now, expiresAt: now + (comment ? COMMENT_TTL : kind === 'test' ? 90000 : kind === 'ambient' ? 4000 : 10000), prio: { comment: 8, event: 7, phase: 6, test: 9, ambient: 1 }[kind] };
  }
  function interrupt(current, incoming) {
    return false;
  }
  function prune(queue, now = Date.now()) {
    const comments=queue.filter(x=>x.kind==='comment');
    const keep=new Set(comments.slice(-20));
    return queue.filter(x=>x.kind==='gift'||x.kind==='scene'||x.kind==='chant'||(x.expiresAt>now&&(x.kind!=='comment'||keep.has(x)))).sort((a,b)=>a.createdAt-b.createdAt);
  }

  function spokenName(name) {
    const characters = Array.from(String(name || 'Khách').trim() || 'Khách');
    if (characters.length <= 28) return characters.join('');
    const half = characters.slice(0, Math.ceil(characters.length / 2)).join('').trimEnd();
    const lastSpace = half.lastIndexOf(' ');
    return lastSpace >= 12 ? half.slice(0, lastSpace) : half;
  }
  function giftMessage(gifts) {
    const names = [...new Set(gifts.map(g => spokenName(g.name)))];
    const amount = gifts.reduce((sum,g) => sum + g.vnd,0), count = gifts.reduce((sum,g) => sum + (g.receipts || 1),0);
    const label = (amount/10000).toLocaleString('vi-VN');
    const caption = `Cảm ơn ${names.slice(0,4).join(', ')}${names.length>4 ? ` và ${names.length-4} khách nữa` : ''}! ${label} chỉ vàng.`;
    let spoken=gifts.length<=3?gifts.map(g=>`Cảm ơn ${spokenName(g.name)} đã gửi ${(g.vnd/10000).toLocaleString('vi-VN')} chỉ vàng!`).join(' '):`Cảm ơn ${names.join(', ')} đã chung vui với hai họ!`;

    if(gifts.length<=3&&spoken.length>380)spoken=`Cảm ơn ${names.join(', ')} đã chung vui! Hai họ nhận thêm ${label} chỉ vàng!`;
    return { caption, spoken, fallback: null, count, amount };
  }
  const IDLE=[
    'Khách mới gõ nhà trai hoặc nhà gái để chọn bàn nhé! Hai họ chia chỗ ngồi, không chia phần đùi gà đâu!',
    'Muốn đổi nhân vật, bạn nhắn đổi nam hoặc đổi nữ nhé. MC sửa diện mạo, còn độ đẹp trai bạn tự chịu trách nhiệm!',
    'Bạn thích áo dài hay váy hồng? Gõ đổi thành cô áo dài xanh, hoặc đổi thành thiếu nữ để thử nhé!',
    'Mới vào cứ chào MC một tiếng! Bạn đang xem từ đâu vậy? Bàn mình còn thiếu người kể chuyện vui đấy!',
    'Đói bụng thì gõ cho em gà hoặc cho em xôi nhé! Bồi bàn mang món trong game, ngoài đời nhớ tự lấy bát nha!',
    'Muốn chuyển bàn, cứ gõ nhà trai hoặc nhà gái. Qua bên nào cũng được, nhớ đừng bê cả mâm theo!',
    'Ai muốn nghe thơ cứ nhắn MC đọc thơ nhé! Thơ MC có vần, còn hay hay không thì hai họ chấm điểm!',
    'Đi ăn cưới bạn mê món gì nhất? MC chọn gà, chú rể chọn cơm nhà vì từ nay có người kiểm tra!'
  ];
  const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
  const WISH_REPLIES=["Cảm ơn {ten}, lời chúc ngọt quá!", "Hai họ cảm ơn {ten} nhé!", "Nhận lời chúc rồi, cảm ơn {ten}!", "Cảm ơn {ten}, đôi trẻ cười tít rồi!", "{ten} chúc hay quá, hai họ nhận nhé!", "Cảm ơn {ten}, thêm vui cả mâm!", "Lời chúc đến rồi, cảm ơn {ten}!", "Cảm ơn {ten}, ngọt hơn bánh cưới!", "Hai họ nhận lời chúc của {ten} nhé!", "Cảm ơn {ten}, vui như được nghỉ lễ!", "{ten} chúc tới đâu, cả rạp vui tới đó!", "Cảm ơn {ten}, chú rể cười rơi cà vạt!"];
  function createHost(){
    let activity=[],lastWelcome=-Infinity,index=0,wishIndex=0;
    const greeted=new Map(),replied=new Map(),shared=new Map(),liked=new Map(),thanksAt=new Map();
    const bounded=(map,key,value)=>{map.set(key,value);if(map.size>1000)map.delete(map.keys().next().value);};
    const busy=now=>{activity=activity.filter(at=>now-at<20000);return activity.length>=18;};
    function observe(event,user,now=Date.now()){
      if(event.type!=='join')activity.push(now);if(activity.length>200)activity.splice(0,activity.length-200);
      const crowded=busy(now);
      if(event.type==='share')bounded(shared,user.id,{name:user.name,at:now});
      if(event.type==='like'&&now-(thanksAt.get(user.id)||-Infinity)>30000){const old=liked.get(user.id);bounded(liked,user.id,{name:user.name,at:now,count:(old?.count||0)+(event.count||1)});}
      if(event.type!=='join'||crowded||now-lastWelcome<5000||now-(greeted.get(user.id)||-Infinity)<120000)return null;
      bounded(greeted,user.id,now);lastWelcome=now;
      user={...user,name:spokenName(user.name)};
      const lines=[`${user.name} ơi, chào bạn vào tiệc! Bạn thích ngồi nhà trai hay nhà gái? Gõ nhà trai hoặc nhà gái để chọn bàn nhé!`,`${user.name} tới rồi, mời vào ăn cỗ bằng mắt trước nhé! Bạn đang xem từ đâu vậy?`,`${user.name} ơi, hôm nay đi một mình hay dẫn cả hội vào chơi? MC kê thêm ghế tinh thần đây!`];
      const custom=scriptText('welcome',{ten:user.name}),text=custom??lines[index++%lines.length];if(!text)return null;
      return{...item('cmt.welcome',[['mc',text.includes(user.name)?text:`${user.name} ơi! ${text}`]],now),userId:user.id};
    }
    function reply(user,text,topic,now=Date.now(),characterResult){
      user={...user,name:spokenName(user.name)};
      const crowded=busy(now),plain=fold(text).trim(),request=Requests?.parse(text);
      if(/^[01]$/.test(plain)||now-(replied.get(user.id)||-Infinity)<(request?.kind==='gender'?2000:crowded?12000:4000))return null;
      if(crowded&&!topic&&!request&&!/mc|\?/.test(plain))return null;
      if(request){
       let options;
       if(request.kind==='gender')options=['Đổi nhân vật '+(request.gender==='male'?'nam':'nữ')+' cho '+user.name+' rồi nhé!','Đã chỉnh nhân vật của '+user.name+' theo ý bạn rồi!'];
       else if(request.kind==='genderQuestion'||request.kind==='characterQuestion')options=['Bạn muốn nhân vật nam hay nữ? Nhắn đổi nam hoặc đổi nữ giúp MC nhé.'];
       else if(['character','randomCharacter','copyCharacter'].includes(request.kind))options=[characterResult?.error||(characterResult?.label?user.name+' ơi, đổi thành '+characterResult.label+' rồi nhé!':user.name+' muốn đổi thành ai? Nhắn rõ tên nhân vật giúp MC nhé.')];
       else options=['MC nghe '+user.name+' chọn '+request.food+' rồi, đúng gu ăn cỗ đấy!',user.name+' chọn '+request.food+', MC nhớ món rồi nhé!'];
       const response=options[index++%options.length];bounded(replied,user.id,now);
       return {...item('cmt.reply',[['mc',response]],now),userId:user.id};
      }
      let response;
      if(/nha trai|nha gai/.test(plain))response=`MC nghe rồi, bạn chọn ${plain.includes('nha gai')?'nhà gái':'nhà trai'} nhé! Qua bàn nhớ kể một chuyện vui, đừng chỉ ngồi canh đĩa gà!`;
      else if(topic==='chao')response='Chào bạn! Mình vừa tới hay ngồi đây từ nãy? Hôm nay thích nghe thơ hay nghe chuyện vui?';
      else if(/rua bat/.test(plain))response='Rửa bát mà chia đôi thì vui cả đôi! Chú rể rửa, cô dâu kiểm tra, MC đứng cổ vũ từ xa!';
      else if(/gan bep|bep/.test(plain))response='Chọn gần bếp là có kinh nghiệm đi ăn cỗ rồi! Cô dâu chưa ra mà bạn đã biết món tiếp theo!';
      else if(/^(xoi|ga|ga luoc|thich xoi|thich ga)$/.test(plain))response=plain.includes('xoi')?'Bạn chọn xôi là chắc bụng rồi! MC xin thêm miếng gà, mình lập đội vét mâm bằng tinh thần thôi nhé!':'Đội mê gà có thêm thành viên rồi! Chú rể giấu đùi gà đi đâu, bà con đang nhìn đấy!';
      else if(/^(ha noi|sai gon|tphcm|hcm|da nang|can tho|hai phong|nghe an|thanh hoa|viet nam)$/.test(plain))response=`MC chào bàn ${String(text).slice(0,35)} nhé! Đặc sản chỗ bạn là món gì, giới thiệu để hai họ mở mang thực đơn nào!`;
      else if(topic==='tho'){const poems=[READY.tho,'Hôm nay hai họ một nhà. Chú rể nhận việc giặt là từ đây. Cô dâu chỉ nhẹ bàn tay. Việc nhà chia sẻ, cả ngày cùng vui!','Yêu nhau mấy núi cũng trèo. Cưới xong anh nhớ đổ đều rác nha. Việc nhà hai đứa chia ra. Cơm ngon canh ngọt, cả nhà cùng vui!'];response=poems[index++%poems.length];}
      else if(topic==='chucmung')response=WISH_REPLIES[wishIndex++%WISH_REPLIES.length].replace(/\{ten\}/g,user.name);
      else if(topic)response=READY[topic];
      else if(plain.length>=2)response=`MC thấy bạn nhắn “${String(text).slice(0,55)}”. Bạn kể thêm chút nhé, MC đang nghe đây!`;
      const trigger=/nha trai|nha gai/.test(plain)?'team':/rua bat/.test(plain)?'dishes':/gan bep|bep/.test(plain)?'kitchen':/^(xoi|ga|ga luoc|thich xoi|thich ga)$/.test(plain)?'food':/^(ha noi|sai gon|tphcm|hcm|da nang|can tho|hai phong|nghe an|thanh hoa|viet nam)$/.test(plain)?'location':topic||'fallback';
      const custom=scriptText(trigger==='chucmung'?'wish':'reply.'+trigger,{ten:user.name,binhluan:String(text).slice(0,55),ben:plain.includes('nha gai')?'nhà gái':'nhà trai'});
      if(custom!==undefined)response=custom;
      if(!response)return null;
      const escapedName=user.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const named=new RegExp('(^|[^\\p{L}\\p{N}])'+escapedName+'(?=$|[^\\p{L}\\p{N}])','u').test(response);
      bounded(replied,user.id,now);return{...item('cmt.reply',[['mc',named?response:`${user.name} ơi! ${response}`]],now),userId:user.id};
    }
    function social(now=Date.now()){
      for(const [kind,map]of [['share',shared],['like',liked]]){
        for(const [id,v]of map)if(now-v.at>20000)map.delete(id);
        const batch=[...map].filter(([,v])=>kind==='share'||v.count>=20).slice(0,3);if(!batch.length)continue;
        for(const [id]of batch){map.delete(id);bounded(thanksAt,id,now);}
        const names=batch.map(([,v])=>spokenName(v.name)).join(', ');
        const custom=scriptText(kind,{ten:names});if(custom==='')continue;
        if(custom!==undefined)return{kind:'social',createdAt:now,expiresAt:now+20000,seq:[['mc',custom.includes(names)?custom:`${names} ơi! ${custom}`]]};
        return{kind:'social',createdAt:now,expiresAt:now+20000,seq:[['mc',kind==='share'?`Cảm ơn ${names} đã chia sẻ bữa tiệc! Có bạn bè vào là thêm người kể chuyện vui rồi!`:`MC nhận được tim của ${names} rồi! Hai họ cười tươi thêm một chút, chú rể đừng cười rơi cà vạt nhé!`]]};
      }return null;
    }
    function idle(users,now=Date.now()){
      const recent=users.filter(u=>now-u.last<120000);
      const custom=scriptText('idle',{ten:recent.length?recent[index++%recent.length].name:'cả nhà'});if(custom!==undefined)return custom;
      if(!busy(now)&&recent.length&&index%3===0){const u=recent[index%recent.length];index++;return`${u.name} ơi, MC mời bạn làm cố vấn: ăn cỗ chọn xôi hay chọn gà? Chú rể đang chờ câu trả lời để chọn mâm đấy!`;}
      return IDLE[index++%IDLE.length];
    }
    return{observe,reply,social,idle,busy};
  }
  // Only the spoken backlog is filtered; all gifts remain in the game ledger.
  const MAX_GIFT_VOICES=12,GIFT_VOICE_TTL=25000;
  function trimGifts(list,now=Date.now()){
    const kept=list.filter(g=>now-(g.updatedAt??g.at)<runtime.mc_gift_ttl*1000).sort((a,b)=>b.vnd-a.vnd||a.at-b.at).slice(0,runtime.mc_gift_limit);
    list.splice(0,list.length,...kept);return list;
  }
  function takeGifts(list,now=Date.now()){trimGifts(list,now);return list.splice(0,3);}
  function scriptDefaults(){
    const groups=Lines.lines;
    return Object.entries(groups).flatMap(([event,texts])=>texts.map((text,index)=>({id:event.replaceAll('.','-')+'-'+index,event,text,enabled:true})));
  }
  const api = { spokenName, READY, COMMENT_TTL, item, interrupt, prune, giftMessage,createHost,trimGifts,takeGifts,MAX_GIFT_VOICES,GIFT_VOICE_TTL,scriptCatalog,scriptDefaults,validateScripts,setScripts,runtime,runtimeLimits,setRuntime };
  if (typeof module !== 'undefined') module.exports = api; else root.MCPolicy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
