'use strict';
const Identity=require('../game/identity');
function sender(data){const u=data.user||data;return{id:String(u.id||u.userId||u.idStr||u.uniqueId||u.displayId||''),name:u.nickname||u.uniqueId||u.displayId||'Khách',avatar:Identity.fromTikTok(data)};}
function normalizeInteraction(type,data){
 const who=sender(data);if(!who.id)return null;
 if(type==='chat')return{type,...who,text:String(data.content??data.comment??'')};
 if(type==='like')return{type,...who,count:Number(data.count??data.likeCount)||1};
 if(type==='join'||type==='share')return{type,...who};
 return null;
}
// Normalize the v2 connector payload; count a streak only at its final packet.
function createGiftNormalizer() {
  const seen = new Map();
  return data => {
    const gift = data.gift || {}, details = data.giftDetails || {}, extended = data.extendedGiftInfo || {};
    const giftType = details.giftType ?? gift.type ?? gift.giftType ?? gift.gift_type ?? data.giftType ?? extended.giftType;
    const repeatEnd = data.repeatEnd ?? gift.repeat_end;
    if (Number(giftType) === 1 && ![true, 1, '1', 'true'].includes(repeatEnd)) return null;
    const giftName = gift.name || gift.giftName || details.giftName || details.name || data.giftName || extended.name || extended.giftName;
    const rawPrice = [gift.diamondCount, details.diamondCount, data.diamondCount, extended.diamondCount].find(value => Number(value) > 0);
    const price = Number(rawPrice ?? (/^(rose|hoa hồng)$/i.test(giftName?.trim() || '') ? 1 : NaN));
    const repeat = Number(data.repeatCount ?? gift.repeat_count ?? 1);
    if (!Number.isSafeInteger(price) || price < 1 || !Number.isSafeInteger(repeat) || repeat < 1) return null;
    const who=sender(data),id=who.id; if (!id) return null;
    const group = data.groupId || data.group?.groupId;
    const message = data.common?.msgId || data.msgId;
    const key = group && String(group) !== '0' ? `${id}|${data.giftId || gift.giftId}|${group}` : message && String(message) !== '0' ? String(message) : null;
    if (key && seen.has(key)) return null;
    if (key) { seen.set(key, true); if (seen.size > 5000) seen.delete(seen.keys().next().value); }
    return { type: 'gift', ...who, coins: price * repeat, unitCoins: price, giftName: giftName || 'Quà' };
  };
}
module.exports = { createGiftNormalizer,normalizeInteraction };
