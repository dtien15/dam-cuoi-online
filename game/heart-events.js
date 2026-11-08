'use strict';
(function(root){
 const actions={toast:'Nâng ly hai họ',cheek:'Hôn má',cake:'Cắt bánh cưới',rings:'Trao nhẫn',fireworks:'Pháo hoa',kiss:'Nụ hôn đám cưới'};
 const defaults=()=>({version:1,revision:0,enabled:true,board:true,repeat:true,step:5000,events:[
  {id:'toast',enabled:true,likes:500,action:'toast',name:'Nâng ly hai họ',line:'Đủ {tim} tim! Hai họ cùng nâng ly nào!'},
  {id:'cheek',enabled:true,likes:1000,action:'cheek',name:'Hôn má',line:'Đủ {tim} tim! Đôi trẻ hôn má nào!'},
  {id:'cake',enabled:true,likes:2000,action:'cake',name:'Cắt bánh cưới',line:'Đủ {tim} tim! Mời đôi trẻ cắt bánh!'},
  {id:'rings',enabled:true,likes:3000,action:'rings',name:'Trao nhẫn',line:'Đủ {tim} tim! Chú rể trao nhẫn nào!'},
  {id:'fireworks',enabled:true,likes:5000,action:'fireworks',name:'Pháo hoa chúc mừng',line:'Đủ {tim} tim! Pháo hoa chúc mừng!'},
  {id:'kiss',enabled:true,likes:10000,action:'kiss',name:'Nụ hôn đám cưới',line:'Đủ {tim} tim! Đôi trẻ hôn nhau nào!'}]});
 function validate(c){if(!c||!Array.isArray(c.events)||!c.events.length||c.events.length>30)throw Error('Cần từ 1 đến 30 mốc tim');const ids=new Set(),levels=new Set();const events=c.events.map(e=>{if(!e||typeof e.id!=='string'||! /^[\w-]{1,60}$/.test(e.id)||ids.has(e.id))throw Error('Mã mốc tim không hợp lệ');ids.add(e.id);if(!Number.isSafeInteger(e.likes)||e.likes<1||e.likes>1e9||levels.has(e.likes))throw Error('Mốc tim phải khác nhau, từ 1 đến 1 tỷ');levels.add(e.likes);if(!actions[e.action])throw Error('Tiết mục chưa hỗ trợ');const name=String(e.name||'').trim(),line=String(e.line||'').trim();if(!name||name.length>45||!line||line.length>300)throw Error('Tên tối đa 45, lời MC tối đa 300 ký tự');return{id:e.id,enabled:!!e.enabled,likes:e.likes,action:e.action,name,line};});if(!Number.isSafeInteger(c.step)||c.step<500||c.step>1e9)throw Error('Khoảng lặp từ 500 đến 1 tỷ tim');return{version:1,revision:Number(c.revision)||0,enabled:!!c.enabled,board:!!c.board,repeat:!!c.repeat,step:c.step,events};}
 const ordered=c=>c.enabled?c.events.filter(e=>e.enabled).sort((a,b)=>a.likes-b.likes):[];
 function at(c,index){const rows=ordered(c);if(!rows.length||!Number.isSafeInteger(index)||index<0)return null;if(index<rows.length)return{...rows[index],ordinal:index};if(!c.repeat)return null;return{...rows[(index-rows.length)%rows.length],likes:rows.at(-1).likes+(index-rows.length+1)*c.step,ordinal:index,repeated:true};}
 function earned(c,likes){const rows=ordered(c);if(!rows.length)return 0;const count=rows.filter(e=>likes>=e.likes).length;return count+(c.repeat?Math.max(0,Math.floor((likes-rows.at(-1).likes)/c.step)):0);}
 function sync(s,c){const count=earned(c,s.likes||0);if(!s.heart||s.heart.revision!==c.revision)s.heart={revision:c.revision,played:count,earned:count};s.heart.earned=count;s.heart.played=Math.max(0,Math.min(count,Number(s.heart.played)||0));return s.heart;}
 const api={defaults,validate,actions,at,earned,sync};if(typeof module!=='undefined')module.exports=api;else root.HeartEvents=api;
})(typeof globalThis!=='undefined'?globalThis:this);
