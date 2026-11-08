'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const I=require('../game/identity'),R=require('../game/rules'),{createGiftNormalizer}=require('../lib/tiktok-events');
test('avatar comes from nested TikTok data and only HTTPS images are accepted',()=>{
 assert.equal(I.fromTikTok({user:{avatarThumb:{urlList:['https://example.com/a.jpg']}}}),'https://example.com/a.jpg');
 for(const url of ['javascript:alert(1)','data:image/png;base64,abc','file:///etc/passwd','http://example.com/a'])assert.equal(I.avatar(url),'');
 assert.equal(I.fromTikTok({profilePictureUrl:'https://example.com/b.jpg'}),'https://example.com/b.jpg');
});
test('same-name guests retain independent avatars, full names and money through missing avatar packets and reload',()=>{
 const s=R.createState();const name='Nguyễn Thị Lan Phương khách mời có tên rất dài';
 R.applyEvent(s,{type:'join',id:'a',name,avatar:'https://example.com/a.jpg'});R.applyEvent(s,{type:'join',id:'b',name,avatar:'https://example.com/b.jpg'});
 R.applyEvent(s,{type:'gift',id:'a',name,coins:5});const restored=R.migrateState(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.users.a.name,name);assert.equal(restored.users.a.avatar,'https://example.com/a.jpg');assert.equal(restored.users.b.avatar,'https://example.com/b.jpg');assert.equal(restored.users.a.total,50000);assert.equal(restored.users.b.total,0);
});
test('gift normalizer carries avatar through final combo without changing coins',()=>{
 const e=createGiftNormalizer()({user:{userId:'x',nickname:'Lan',avatarThumb:{urlList:['https://example.com/x.png']}},giftDetails:{giftType:1,diamondCount:5},repeatEnd:true,repeatCount:3});assert.equal(e.avatar,'https://example.com/x.png');assert.equal(e.coins,15);
});
