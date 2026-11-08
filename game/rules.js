'use strict';
// Pure rules shared by the server, browser and tests. Money is an in-game score.
(function (root) {
  const COUPLES = [['Tuấn', 'Lan'], ['Hùng', 'Mận'], ['Bình', 'Hoa'], ['Đạt', 'Thơm'], ['Nam', 'Sen']];
  function coinsToVnd(coins) {
    if (!Number.isSafeInteger(coins) || coins < 1 || coins > 100000000) throw new RangeError('Số xu không hợp lệ');
    return coins * 10000;
  }
  const cleanName = s => String(s || 'Khách').replace(/[^\p{L}\p{N}\s._-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Khách';
  const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  function createState(now = Date.now()) {
    // `ledger` keeps donors who left the room (not sent to screens); `topDonors` is the leaderboard across both.
    return { version:2, round:1, users:{}, ledger:{}, topDonors:[], receipts:0,wishes:0,total:0, teamMoney:{groom:0,bride:0}, likes:0, couple:COUPLES[0], speed:1, startedAt:now };
  }
  function rankDonor(s, u) {
    const entry = { id:u.id, name:u.name, avatar:u.avatar||'', total:u.total };
    s.topDonors = [entry, ...(s.topDonors||[]).filter(d => d.id !== u.id)].sort((a,b) => b.total-a.total || (a.id<b.id?-1:a.id>b.id?1:0)).slice(0,10);
  }
  function resetWedding(s, now = Date.now(), random = Math.random) {
    const next=createState(now); next.round=s.round+1; next.couple=COUPLES[Math.floor(random()*COUPLES.length)];
    Object.keys(s).forEach(key=>delete s[key]); Object.assign(s,next);
  }
  function migrateState(s) {
    if (!s || ![1,2].includes(s.version) || !s.users || !Array.isArray(s.couple)) return createState();
    const next=createState();
    for(const key of ['round','users','ledger','topDonors','total','teamMoney','likes','couple','speed','lastGift','recentGifts','receipts','wishes','heart','rollcall','weddingRoles','ceremony']) if(s[key]!==undefined)next[key]=s[key];
    if(s.receipts===undefined)next.receipts=[...Object.values(next.users),...Object.values(next.ledger)].reduce((n,u)=>n+(u.gifts||0),0);
    if(s.party)next.party=s.party;
    next.topDonors=[];
    for(const u of [...Object.values(next.users),...Object.values(next.ledger)])if(u.total>0)rankDonor(next,u);
    next.startedAt=s.startedAt||s.savedAt||Date.now(); return next;
  }
  function normalizeEvent(e) {
    if (!e || !['chat', 'gift', 'like', 'join', 'share'].includes(e.type)) return null;
    const id = String(e.id || e.uid || '').slice(0, 128); if (!id || ['__proto__', 'constructor', 'prototype'].includes(id)) return null;
    const out = { type: e.type, id, name: cleanName(e.name) };
    try{const image=new URL(e.avatar);if(image.protocol==='https:'&&image.href.length<=2048)out.avatar=image.href;}catch{}
    if (e.type === 'gift') {
      try { coinsToVnd(e.coins); } catch { return null; }
      out.coins = e.coins; out.giftName = String(e.giftName || 'Quà').slice(0, 80);
      if(Number.isSafeInteger(e.unitCoins)&&e.unitCoins>0&&e.unitCoins<=e.coins&&e.coins%e.unitCoins===0)out.unitCoins=e.unitCoins;
    }
    if (e.type === 'like') { if (!Number.isSafeInteger(e.count) || e.count < 1 || e.count > 1000000) return null; out.count = e.count; }
    if (e.type === 'chat') out.text = String(e.text || '').slice(0, 200);
    return out;
  }
  function applyEvent(s, raw, now = Date.now(), options = {}) {
    const e = normalizeEvent(raw); if (!e) return null;
    let u = Object.hasOwn(s.users, e.id) ? s.users[e.id] : null;const newlyCreated=!u;
    // Keep interaction time separate from arrival time, which seating uses for newcomers.
    const active = e.type !== 'join';
    if (!u) {
      let balance=0;
      for(const guest of Object.values(s.users))balance+=guest.team==='groom'?1:-1;
      u = s.users[e.id] = { id: e.id, name: e.name, team: balance<=0 ? 'groom' : 'bride', total: 0, gifts: 0, chats: 0, lastChat: 0, last: active ? now : 0, joined:now, seat:-1, toastCoinBase:0, toastAt:0 };
      // A returning donor gets their gifts and side back.
      if (s.ledger && Object.hasOwn(s.ledger, e.id)) { Object.assign(u, s.ledger[e.id]); u.toastCoinBase = u.total; delete s.ledger[e.id]; s.ledgerRev = (s.ledgerRev||0) + 1; }
    }
    e.firstAttendance=active&&(newlyCreated||u.last===0);
    u.name = e.name; if(e.avatar)u.avatar=e.avatar; if (active) u.last = now; else u.lastArrival = now;
    if (e.type === 'gift' && !options.eventOnly) {
      s.receipts=(s.receipts||0)+1;const amount = coinsToVnd(e.coins); s.lastGift={id:u.id,name:u.name,avatar:u.avatar||'',amount,at:now}; s.recentGifts=[s.lastGift,...(s.recentGifts||[])].slice(0,5); u.total += amount; u.gifts++; s.total += amount; s.teamMoney[u.team] += amount; rankDonor(s, u);
    }
    if (e.type === 'chat') {
      const text = e.text.toLowerCase().trim();if(/chúc|chuc|hạnh phúc|hanh phuc|trăm năm/.test(text))s.wishes=(s.wishes||0)+1;
      const team = /nh[àa]\s*tr[aá]i|^trai$/.test(text) ? 'groom' : /nh[àa]\s*g[áa]i|^g[áa]i$/.test(text) ? 'bride' : null;
      if(team&&team!==u.team){s.teamMoney[u.team]-=u.total;s.teamMoney[team]+=u.total;u.team=team;}
      if (now - u.lastChat >= 2500) { u.chats++; u.lastChat = now; }
    }
    if (e.type === 'like' && !options.eventOnly) {
      s.likes += e.count;
    }
    return e;
  }
  const api = { coinsToVnd, cleanName, createState, resetWedding, migrateState, normalizeEvent, applyEvent };
  if (typeof module !== 'undefined') module.exports = api; else root.GameRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
