'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {normalizeInteraction,createGiftNormalizer}=require('../lib/tiktok-events');
const Rules=require('../game/rules'),Party=require('../game/party-engine');
const user={id:'1234567890123456789',nickname:'Khách live',displayId:'khachlive',avatarThumb:{urlList:['https://example.com/avatar.jpg']}};
test('current v3 live comments create a seated guest with actual text, name and avatar',()=>{
 const event=normalizeInteraction('chat',{user,content:'nhà gái'});
 assert.equal(event.id,user.id);assert.equal(event.text,'nhà gái');assert.equal(event.avatar,user.avatarThumb.urlList[0]);
 const state=Rules.createState(1000),accepted=Rules.applyEvent(state,event,2000);Party.onEvent(state,accepted,2000);
 assert.equal(state.users[user.id].name,user.nickname);assert.equal(state.users[user.id].team,'bride');assert.ok(state.users[user.id].seat>=0);
 assert.equal(normalizeInteraction('like',{user,count:37}).count,37);
 assert.equal(normalizeInteraction('join',{user}).id,user.id);assert.equal(normalizeInteraction('share',{user}).id,user.id);
});
test('v3 gift objects preserve the complete final streak and deduplicate it',()=>{
 const normalize=createGiftNormalizer(),packet={user,giftId:'5655',gift:{type:1,diamondCount:5,name:'Quà'},repeatCount:3,repeatEnd:0,groupId:'live-group'};
 assert.equal(normalize(packet),null);
 const event=normalize({...packet,repeatEnd:1});assert.equal(event.id,user.id);assert.equal(event.coins,15);assert.equal(event.giftName,'Quà');assert.equal(Rules.coinsToVnd(event.coins),150000);
 assert.equal(normalize({...packet,repeatEnd:1}),null);
});
test('legacy payloads still work and packets without a sender are rejected',()=>{
 const legacy={user:{userId:'old',nickname:'Lan'},comment:'chào',likeCount:20};
 assert.equal(normalizeInteraction('chat',legacy).text,'chào');assert.equal(normalizeInteraction('like',legacy).count,20);
 assert.equal(normalizeInteraction('chat',{content:'no identity'}),null);
});
test('a twenty-rose combo scores every coin but keeps the one-coin gift action',()=>{
 const G=require('../game/gift-events'),event=createGiftNormalizer()({user,gift:{type:1,diamondCount:1,name:'Hoa hồng'},repeatEnd:true,repeatCount:20,groupId:'twenty-roses'}),state=Rules.createState();
 const applied=Rules.applyEvent(state,event);assert.equal(applied.coins,20);assert.equal(applied.unitCoins,1);assert.equal(state.total,200000);assert.equal(G.choose(G.defaults(),applied.unitCoins).action,'envelope');assert.equal(G.choose(G.defaults(),applied.unitCoins).coins,1);
});
