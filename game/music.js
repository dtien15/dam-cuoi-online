'use strict';
(function(root){
  class BackgroundMusic {
    constructor({src,AudioClass=root.Audio,onBlocked=()=>{},onState=()=>{},now=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout}){
      this.audio=new AudioClass(src);this.audio.loop=true;this.audio.preload='auto';this.audio.volume=0;
      this.onBlocked=onBlocked;this.onState=onState;this.now=now;this.schedule=(fn,ms)=>schedule.call(root,fn,ms);this.cancel=id=>cancel.call(root,id);
      this.list=[];this.index=0;this.current=src||null;this.override=null;this.errors=0;
      this.enabled=true;this.connected=false;this.muted=false;this.volume=.22;this.ducked=false;this.timer=null;this.pending=null;
      this.audio.onerror=()=>{
        this.onState({playing:false,error:'Không tải được nhạc nền'});
        // Bài hỏng thì sang bài sau, nhưng không quay vòng mãi nếu cả danh sách đều hỏng.
        if(!this.override&&this.list.length>1&&++this.errors<this.list.length)this.next();
      };
      this.audio.onended=()=>{if(!this.override&&this.list.length>1)this.next();};
    }
    get allowed(){return this.enabled&&this.connected&&!this.muted&&this.volume>0&&!!this.current;}
    // Phát lần lượt; danh sách đổi mà bài đang phát vẫn còn thì nghe tiếp, không phát lại từ đầu.
    setPlaylist(urls){
      const list=(urls||[]).filter(Boolean),playing=this.override?this.saved?.url:this.current;
      this.list=list;this.errors=0;
      const kept=list.indexOf(playing);
      if(kept>=0){this.index=kept;if(!this.override)this.audio.loop=list.length===1;return;}
      this.index=Math.min(this.index,Math.max(0,list.length-1));
      if(this.override){this.saved=null;return;}
      this.load(list[this.index]||null);
    }
    next(){if(!this.list.length)return;this.index=(this.index+1)%this.list.length;this.load(this.list[this.index]);}
    load(url,time=0){
      this.current=url;this.audio.pause();
      if(!url){this.audio.removeAttribute?.('src');this.audio.src='';this.stop();return;}
      this.audio.loop=this.list.length===1;this.audio.src=url;
      if(time)this.audio.onloadedmetadata=()=>{this.audio.currentTime=time;this.audio.onloadedmetadata=null;};
      this.start().catch?.(()=>{});
    }
    // Nhạc riêng của mini game; xong thì về đúng bài và đúng đoạn đang nghe dở.
    setOverride(src){
      if(src){
        if(this.override===src)return;
        if(!this.override)this.saved={url:this.current,time:this.audio.currentTime||0};
        this.override=src;this.current=src;this.audio.pause();this.audio.loop=true;this.audio.src=src;this.start().catch?.(()=>{});
        return;
      }
      if(!this.override)return;
      this.override=null;const saved=this.saved;this.saved=null;
      if(saved?.url&&this.list.includes(saved.url))this.load(saved.url,saved.time);else this.load(this.list[this.index]||null);
    }
    get target(){return this.allowed?this.volume*(this.ducked?.25:1):0;}
    configure(options){
      for(const key of ['enabled','connected','muted'])if(options[key]!==undefined)this[key]=!!options[key];
      if(options.volume!==undefined&&Number.isFinite(Number(options.volume)))this.volume=Math.max(0,Math.min(.6,Number(options.volume)));
      if(!this.allowed){this.stop();return;}
      if(this.audio.paused)this.start().catch(()=>{});else this.ramp(this.target,300);
    }
    start(){
      if(!this.allowed)return Promise.resolve(false);
      if(this.pending)return this.pending;
      if(!this.audio.paused){this.ramp(this.target,500);return Promise.resolve(true);}
      this.audio.volume=0;
      this.pending=Promise.resolve().then(()=>this.audio.play()).then(()=>{
        if(!this.allowed){this.stop();return false;}
        this.errors=0;this.ramp(this.target,700);this.onState({playing:true});return true;
      }).catch(error=>{this.onState({playing:false,error:error.name});if(error.name==='NotAllowedError'&&this.allowed)this.onBlocked();return false;}).finally(()=>this.pending=null);
      return this.pending;
    }
    duck(value){this.ducked=!!value;if(this.allowed&&!this.audio.paused)this.ramp(this.target,value?180:1000);}
    ramp(target,duration){
      if(this.timer!==null)this.cancel(this.timer);this.timer=null;
      const initial=this.audio.volume,start=this.now();
      const tick=()=>{const progress=Math.min(1,(this.now()-start)/duration);this.audio.volume=Math.max(0,Math.min(1,initial+(target-initial)*(1-(1-progress)**2)));if(progress<1)this.timer=this.schedule(tick,40);else this.timer=null;};tick();
    }
    stop(){if(this.timer!==null)this.cancel(this.timer);this.timer=null;this.audio.volume=0;this.audio.pause();this.onState({playing:false});}
    destroy(){this.enabled=false;this.stop();this.audio.src='';}
  }
  if(typeof module!=='undefined')module.exports={BackgroundMusic};else root.BackgroundMusic=BackgroundMusic;
})(typeof globalThis!=='undefined'?globalThis:this);
