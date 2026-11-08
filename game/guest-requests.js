'use strict';
(function(root){
 const fold=text=>String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
 const characters={teenboy:['male','bạn nam sơ mi'],teengirl:['female','bạn nữ váy hồng'],aunt:['female','cô áo dài xanh'],uncle:['male','chú mặc vest'],flashy:['nonbinary','bạn mặc áo hoa']};
 const aliases=[['flashy',/lgbt|phi nhi nguyen|ao hoa|sac mau|lo[e ]*loet/],['aunt',/co giao|phu nu trung nien|nu trung nien|co trung nien|ao dai xanh/],['uncle',/thay giao|nam trung nien|chu trung nien|mac vest|chu mac vest/],['teengirl',/thieu nu|nu sinh|hoc sinh nu|vay hong|be gai/],['teenboy',/thieu nien|nam sinh|hoc sinh nam|so mi|be trai/]];
 function characterFor(user){
  if(characters[user.character])return user.character;
  const all=Object.keys(characters),options=all.filter(k=>!user.gender||characters[k][0]===user.gender);
  let hash=0;for(const ch of String(user.id))hash=(hash*31+ch.charCodeAt(0))|0;
  return options[Math.abs(hash)%options.length];
 }
 function resolve(request,user,users){
  if(request.kind==='character')return{character:request.character,gender:characters[request.character][0],label:request.label};
  if(request.kind==='randomCharacter'){
   const options=Object.keys(characters).filter(k=>(!user.gender||characters[k][0]===user.gender)&&k!==characterFor(user));
   const character=options.length?options[(user.characterChanges||0)%options.length]:characterFor(user);return{character,gender:characters[character][0],label:characters[character][1]};
  }
  if(request.kind==='copyCharacter'){
   const name=fold(request.target),others=Object.values(users).filter(u=>u.id!==user.id);
   let matches=others.filter(u=>fold(u.name)===name);
   if(!matches.length&&name.length>=3)matches=others.filter(u=>fold(u.name).includes(name));
   if(matches.length!==1)return{error:matches.length?'Có nhiều bạn trùng tên, bạn chọn nam, nữ hoặc tên nhân vật nhé.':'MC chưa tìm thấy tên đó. Bạn chọn nam, nữ hoặc nói tên nhân vật nhé.'};
   const character=characterFor(matches[0]);return{character,gender:characters[character][0],label:characters[character][1]};
  }
  return null;
 }
 function parse(text){
  const plain=fold(text).replace(/\bnv\b/g,'nhan vat');
  if(/\b(dung|khoi|khong can|ko can) (doi|chuyen|sua)\b/.test(plain))return null;
  if(/\b(nha trai|nha gai)\b/.test(plain)&&!/(doi nhan vat|toi la|minh la|em la|anh la)/.test(plain))return null;
  const change=/\b(doi|chuyen|sua|bien|thay)(?:\b)|\bcho (?:em|minh|toi|tui|anh|chi|con|chau)\b/.test(plain);
  const copy=plain.match(/(?:giong|nhu) (?:nhan vat |cua |nguoi |ban |khach )*(?:ten )?(.+?)(?: nhe| nha| voi| duoc khong)?$/);
  if(change&&copy)return{kind:'copyCharacter',target:copy[1]};
  if(change){for(const [character,re]of aliases)if(new RegExp('\\b(?:'+re.source+')\\b').test(plain))return{kind:'character',character,label:/\bco giao\b/.test(plain)?'cô giáo':characters[character][1]};}
  const genderPatterns=[
   ['female',/^(nu|con gai|nhan vat nu)$|\b(?:doi|chuyen|sua|cho)(?: nhan vat| hinh| avatar| gioi tinh| cho| giup| em| toi| minh| tui| sang| thanh| ve| lai| la| lam| nguoi)* (?:nu|con gai|girl)\b|\b(?:toi|minh|em|chi|tui|tao) (?:la )?(?:nu|con gai|phu nu)\b/],
   ['male',/^(nam|con trai|nhan vat nam)$|\b(?:doi|chuyen|sua|cho)(?: nhan vat| hinh| avatar| gioi tinh| cho| giup| em| toi| minh| tui| sang| thanh| ve| lai| la| lam| nguoi)* (?:nam|con trai|boy)\b|\b(?:toi|minh|em|anh|tui|tao) (?:la )?(?:nam|con trai|dan ong)\b/]
  ];
  const affirmative=plain.replace(/\b(khong|ko|khong phai|ko phai|k phai) (la )?(nam|nu|con trai|con gai|dan ong|phu nu)\b/g,'');
  const matches=genderPatterns.filter(([,pattern])=>pattern.test(affirmative));
  if(matches.length===1)return{kind:'gender',gender:matches[0][0]};
  if(change&&/nhan vat|hinh dai dien|avatar|doi hinh/.test(plain)){
   if(matches.length>1)return{kind:'characterQuestion'};
   return{kind:'randomCharacter'};
  }
  if(/sai gioi tinh|nham gioi tinh|doi gioi tinh|doi nam nu|sao.*(con gai|con trai|nhan vat nu|nhan vat nam)/.test(plain))return{kind:'genderQuestion'};
  if(/\b(het|khong an|ko an|khong thich|ko thich)\b/.test(plain))return null;
  if(/^(len mon|mon|len do an|cho mon|mang mon|do an)$/.test(plain))return{kind:'food',food:'mâm cỗ'};
  if(/\b(an|mon|them|doi bung|mang|cho|thich|xin|len)\b/.test(plain)||/^(ga|xoi|nem|cha gio)$/.test(plain)){
   if(/\b(xoi)\b/.test(plain))return{kind:'food',food:'xôi'};
   if(/\b(ga)\b/.test(plain))return{kind:'food',food:'gà'};
   if(/\b(nem|cha gio)\b/.test(plain))return{kind:'food',food:'nem'};
   if(/len mon|mang mon|them mon/.test(plain))return{kind:'food',food:'mâm cỗ'};
  }
  return null;
 }
 const api={parse,resolve,characterFor,characters};
 if(typeof module!=='undefined')module.exports=api;else root.GuestRequests=api;
})(globalThis);
