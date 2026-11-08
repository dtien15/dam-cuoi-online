'use strict';
// Danh sách nhạc nền: phát lần lượt, hết bài cuối quay lại bài đầu.
(function(root){
 const BASE='/assets/music/playlist/';
 const defaults=()=>({revision:0,tracks:[
  {id:'piano-music',title:'Piano Music',file:'piano-music.mp3'},
  {id:'bridal-piano',title:'Bridal Piano',file:'bridal-piano.mp3'},
  {id:'wedding-piano',title:'Wedding Piano',file:'wedding-piano.mp3'},
  {id:'wedding',title:'Wedding',file:'wedding.mp3'},
 ]});
 function validate(raw){
  if(!raw||!Array.isArray(raw.tracks)||raw.tracks.length>50)throw Error('Danh sách nhạc tối đa 50 bài.');
  const ids=new Set();
  const tracks=raw.tracks.map((track,index)=>{
   const title=typeof track?.title==='string'?track.title.trim():'';
   if(typeof track?.id!=='string'||!/^[\w-]{1,60}$/.test(track.id)||ids.has(track.id))throw Error('Mã bài nhạc không hợp lệ.');
   if(typeof track.file!=='string'||!/^[\w-]{1,70}\.mp3$/.test(track.file))throw Error('Tệp nhạc không hợp lệ.');
   if(!title||title.length>80)throw Error('Bài '+(index+1)+': tên từ 1 đến 80 ký tự.');
   ids.add(track.id);return{id:track.id,title,file:track.file};
  });
  return{revision:Number(raw.revision)||0,tracks};
 }
 const urls=playlist=>playlist.tracks.map(track=>BASE+track.file);
 const titleFrom=name=>String(name||'Bài mới').replace(/\.mp3$/i,'').replace(/[_-]+/g,' ').trim().slice(0,80)||'Bài mới';
 // Tệp MP3 bắt đầu bằng thẻ ID3 hoặc khung âm thanh.
 const looksLikeMp3=bytes=>bytes.length>1000&&(bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33||bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0);
 const api={BASE,defaults,validate,urls,titleFrom,looksLikeMp3};
 if(typeof module!=='undefined')module.exports=api;else root.Playlist=api;
})(typeof globalThis!=='undefined'?globalThis:this);
