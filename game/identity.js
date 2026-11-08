'use strict';
(function(root){
  function avatar(value){try{const u=new URL(String(value));return u.protocol==='https:'&&u.href.length<=2048?u.href:'';}catch{return '';}}
  function fromTikTok(data){const u=data.user||data;const pictures=[u.avatarThumb,u.avatarMedium,u.avatarLarge];const candidates=[data.profilePictureUrl,u.profilePictureUrl,u.avatarUrl,...pictures.flatMap(pic=>[pic?.urlList,pic?.url]).flat(2).filter(v=>typeof v==='string')];return candidates.map(avatar).find(Boolean)||'';}
  const api={avatar,fromTikTok};if(typeof module!=='undefined')module.exports=api;else root.GuestIdentity=api;
})(typeof globalThis!=='undefined'?globalThis:this);
