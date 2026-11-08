'use strict';
(function(root){
 class PcmSpeechPlayer{
  constructor(){this.context=null;this.generation=0;this.controller=null;this.reader=null;this.sources=new Set();this.stats=null;}
  stop(){this.generation++;this.controller?.abort();this.controller=null;this.reader?.cancel().catch(()=>{});this.reader=null;for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();}
  async play(url,{rate=1,onPlaying=()=>{},signal,bufferWhole=true}={}){
   this.stop();const generation=this.generation;this.controller=new AbortController();const ctl=this.controller;
   if(signal){if(signal.aborted)ctl.abort();else signal.addEventListener('abort',()=>ctl.abort(),{once:true});}
   const Context=root.AudioContext||root.webkitAudioContext;if(!Context)throw new Error('Trình duyệt không hỗ trợ âm thanh PCM.');
   this.context ||= new Context({sampleRate:48000});let resumeTimer;
   try{await Promise.race([this.context.resume(),new Promise((_,reject)=>{resumeTimer=setTimeout(()=>reject(new DOMException('Bấm bật tiếng trên trang game.','NotAllowedError')),1500);})]);}finally{clearTimeout(resumeTimer);}
   const startedAt=performance.now();this.stats={firstAudioMs:0,underruns:0,samples:0};
   const response=await fetch(url,{signal:ctl.signal});if(!response.ok)throw new Error(await response.text()||'Không tạo được giọng đọc.');
   this.reader=response.body.getReader();let pending=new Uint8Array(0),nextAt=0,first=true,rebuffering=false;
   const schedule=(bytes)=>{
    const samples=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2),buffer=this.context.createBuffer(1,samples.length,48000),channel=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)channel[i]=samples[i]/32768;
    const source=this.context.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate;source.connect(this.context.destination);source.onended=()=>this.sources.delete(source);this.sources.add(source);
    source.start(nextAt);nextAt+=buffer.duration/rate;this.stats.samples+=samples.length;
    if(first){first=false;this.stats.firstAudioMs=Math.round(performance.now()-startedAt);onPlaying();}
   };
   // Buffer in PLAYBACK seconds: faster speech needs more source PCM before starting.
   const flush=ended=>{
    if(pending.length<2)return;
    const now=this.context.currentTime;
    if(!first&&nextAt<now+.015&&!rebuffering){rebuffering=true;this.stats.underruns++;}
    const minimum=Math.ceil((first?1.4:rebuffering?.9:.06)*rate*48000)*2;
    if(!ended&&pending.length<minimum)return;
    const even=pending.length-pending.length%2;if(!even)return;
    if(first||rebuffering){nextAt=now+.06;rebuffering=false;}
    let offset=0;
    while(even-offset>=2){let size=Math.min(even-offset,48000);size-=size%2;schedule(pending.slice(offset,offset+size));offset+=size;}
    pending=pending.slice(offset);
   };
   try{
    while(generation===this.generation){const {value,done}=await this.reader.read();if(done)break;if(!value?.length)continue;
     const joined=new Uint8Array(pending.length+value.length);joined.set(pending);joined.set(value,pending.length);pending=joined;if(!bufferWhole)flush(false);
    }
    if(generation!==this.generation)return false;flush(true);
    if(first)throw new Error('Giọng đọc không có dữ liệu âm thanh.');
    while(generation===this.generation&&this.context.currentTime<nextAt)await new Promise(resolve=>setTimeout(resolve,60));
    return generation===this.generation;
   }finally{if(generation===this.generation){this.reader=null;this.controller=null;}}
  }
 }
 root.PcmSpeechPlayer=PcmSpeechPlayer;
})(globalThis);
