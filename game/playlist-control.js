'use strict';
// Danh sách nhạc trong tab Âm thanh. Mọi thay đổi lưu ngay, giống các cài đặt âm thanh khác.
(()=>{
 const box=document.getElementById('music-list'),status=document.getElementById('music-status'),picker=document.getElementById('music-file');
 const addButton=document.getElementById('music-add');
 let playlist=Playlist.defaults(),listening=null;
 const listener=new Audio();
 const make=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
 const save=tracks=>send({type:'savePlaylist',revision:playlist.revision,tracks});
 const clock=seconds=>Math.floor(seconds/60)+':'+String(Math.round(seconds%60)).padStart(2,'0');
 function stopListening(){listener.pause();listening=null;for(const button of box.querySelectorAll('[data-listen]'))button.textContent='Nghe';}
 function render(){
  box.replaceChildren();
  if(!playlist.tracks.length){box.append(make('p','Chưa có bài nào, nhạc nền sẽ im. Bấm Thêm nhạc để thêm.','muted'));return;}
  for(const [index,track]of playlist.tracks.entries()){
   const row=make('div',null,'music-row'),number=make('span',String(index+1),'step-number'),title=make('input'),length=make('small','','music-length');
   title.value=track.title;title.maxLength=80;title.setAttribute('aria-label','Tên bài '+(index+1));
   title.onchange=()=>{if(!title.value.trim()){title.value=track.title;return;}save(playlist.tracks.map(item=>item===track?{...item,title:title.value}:item));};
   const url=Playlist.BASE+track.file,meta=new Audio();meta.preload='metadata';meta.onloadedmetadata=()=>{length.textContent=clock(meta.duration);};meta.src=url;
   const listen=make('button',listening===track.id?'Dừng':'Nghe','secondary');listen.dataset.listen=track.id;
   listen.onclick=()=>{const again=listening===track.id;stopListening();if(again)return;listener.src=url;listener.volume=.6;listener.play().then(()=>{listening=track.id;listen.textContent='Dừng';}).catch(error=>notify('Chưa phát được: '+error.message));};
   const up=make('button','↑','secondary'),down=make('button','↓','secondary'),remove=make('button','Xóa','danger');
   up.title='Đưa lên';down.title='Đưa xuống';up.disabled=index===0;down.disabled=index===playlist.tracks.length-1;
   const move=by=>{const tracks=[...playlist.tracks];[tracks[index],tracks[index+by]]=[tracks[index+by],tracks[index]];save(tracks);};
   up.onclick=()=>move(-1);down.onclick=()=>move(1);
   remove.onclick=()=>{if(!confirm('Xóa bài "'+track.title+'" khỏi danh sách và khỏi máy?'))return;if(listening===track.id)stopListening();save(playlist.tracks.filter(item=>item!==track));};
   const actions=make('div',null,'compact-actions');actions.append(listen,up,down,remove);
   row.append(number,title,length,actions);box.append(row);
  }
 }
 async function upload(files){
  addButton.disabled=true;let added=0;
  try{
   for(const [index,file]of files.entries()){
    status.textContent='Đang thêm '+(index+1)+'/'+files.length+': '+file.name;
    const response=await fetch('/playlist/upload?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':'audio/mpeg'},body:file});
    if(!response.ok)throw Error(await response.text()||'Không thêm được '+file.name);
    added++;
   }
   status.textContent=added?'Đã thêm '+added+' bài vào cuối danh sách.':'';
  }catch(error){status.textContent=error.message;notify(error.message);}
  finally{addButton.disabled=false;picker.value='';}
 }
 addButton.onclick=()=>picker.click();
 picker.onchange=()=>{if(picker.files.length)upload([...picker.files]);};
 listener.onended=stopListening;
 window.receivePlaylist=data=>{playlist=data;render();};
 window.addEventListener('settingsError',event=>{if(/nhạc|bài/i.test(event.detail||''))status.textContent=event.detail;});
 if(window.lastPlaylist)window.receivePlaylist(window.lastPlaylist);else render();
})();
