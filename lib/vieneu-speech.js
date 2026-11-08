'use strict';
const path=require('node:path'),{spawn}=require('node:child_process');

class VieNeuSpeech {
 constructor({root,spawnWorker,pythonPath,modelHome}={}){
  this.root=root;this.spawnWorker=spawnWorker;this.pythonPath=pythonPath||path.join(root,'tools','vieneu','.venv','Scripts','python.exe');this.modelHome=modelHome||path.join(root,'tools','vieneu','models');
  this.worker=null;this.buffer='';this.voices=[];this.queue=[];this.current=null;this.serial=0;this.ready=null;this.resolveReady=null;this.rejectReady=null;this.lastError='';this.failure=null;this.startedAt=0;this.failures=0;this.retryAt=0;this.retryTimer=null;this.closed=false;
 }
 start(){
  if(this.closed)return Promise.reject(new Error('Server dừng.'));
  // A crashed or stuck worker is respawned after a growing pause instead of muting the rest of the live.
  if(this.failure){if(Date.now()<this.retryAt)return Promise.reject(this.failure);this.failure=null;}
  if(this.worker)return this.ready;
  clearTimeout(this.retryTimer);this.retryTimer=null;
  this.ready=new Promise((resolve,reject)=>{this.resolveReady=resolve;this.rejectReady=reject;});
  const worker=this.spawnWorker?this.spawnWorker():spawn(this.pythonPath,[path.join(this.root,'tools','vieneu','worker.py')],{windowsHide:true,env:{...process.env,HF_HOME:this.modelHome,HF_HUB_DISABLE_SYMLINKS_WARNING:'1',PYTHONIOENCODING:'utf-8',VIENEU_THREADS:process.env.VIENEU_THREADS||'4',VIENEU_PRECISION:process.env.VIENEU_PRECISION||'int8'}});
  this.worker=worker;worker.stdout.on('data',data=>{if(this.worker!==worker)return;this.buffer+=data.toString('utf8');let index;while((index=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,index).trim();this.buffer=this.buffer.slice(index+1);this.receive(line);}});
  worker.stderr.on('data',data=>{const message=data.toString('utf8');for(const line of message.split(/\r?\n/).filter(Boolean))console.log(`[VieNeu] ${line}`);});worker.stdin.on('error',e=>{if(this.worker===worker)this.fail(e);});worker.on('error',e=>{if(this.worker===worker)this.fail(e);});worker.on('exit',code=>{if(this.worker===worker)this.fail(new Error(`Tiến trình VieNeu đã dừng (${code}).`));});
  this.startTimer=setTimeout(()=>{if(this.resolveReady)this.fail(new Error('VieNeu không tải xong model trong 5 phút.'));},300000);return this.ready;
 }
 receive(line){
  if(line.startsWith('READY\t')){clearTimeout(this.startTimer);try{this.voices=JSON.parse(line.slice(6));}catch{this.voices=[];}this.lastError='';this.failures=0;this.startedAt=Date.now();this.resolveReady?.(this.voices);this.resolveReady=this.rejectReady=null;this.pump();return;}
  if(line.startsWith('FATAL\t')){this.fail(new Error(Buffer.from(line.slice(6),'base64').toString('utf8')));return;}
  const [type,id,payload]=line.split('\t'),job=this.current;if(!job||id!==job.id)return;
  if(type==='CHUNK'&&!job.cancelled){const pcm=Buffer.from(payload||'','base64');if(pcm.length&&pcm.length%2===0)job.onChunk(pcm);return;}
  if(type==='DONE'||type==='ERR'){
   this.current=null;clearTimeout(job.timer);job.signal?.removeEventListener('abort',job.abort);
   if(!job.settled){job.settled=true;if(type==='DONE'){job.resolve({duration:Number(payload)||0});}else{this.lastError=Buffer.from(payload||'','base64').toString('utf8');job.reject(new Error(this.lastError||'VieNeu tạo giọng thất bại.'));}}
   this.pump();
  }
 }
 async inventory(){await this.start();return this.voices;}
 get status(){return{engine:'vieneu-local-onnx',ready:!!this.startedAt,voices:this.voices,busy:!!this.current,queued:this.queue.length,lastError:this.lastError};}
 stream(text,{voice='Trúc Ly',signal,onChunk=()=>{},deadline=Date.now()+2500}={}){
  if(signal?.aborted||Date.now()>=deadline)return Promise.reject(new Error('Speech expired'));
  return this.inventory().then(voices=>{
   if(signal?.aborted)throw new Error('Speech cancelled');if(Date.now()>=deadline)throw new Error('Speech expired');
   if(!voices.some(v=>v.id===voice))throw new Error('Không tìm thấy preset voice: '+voice);
   if(this.queue.length>=12)throw new Error('Hàng đợi giọng đang bận.');
   return new Promise((resolve,reject)=>{const job={id:String(++this.serial),text:String(text).slice(0,400),voice,onChunk,signal,deadline,resolve,reject,settled:false,cancelled:false};
   job.abort=()=>{const i=this.queue.indexOf(job);if(i>=0){this.queue.splice(i,1);job.signal?.removeEventListener('abort',job.abort);job.settled=true;job.reject(new Error('Speech cancelled'));}else if(this.current===job&&!job.cancelled){job.cancelled=true;job.onChunk=()=>{};this.worker.stdin.write(JSON.stringify({type:'cancel',id:job.id})+'\n');if(!job.settled){job.settled=true;job.reject(new Error('Speech cancelled'));}}};
   signal?.addEventListener('abort',job.abort,{once:true});this.queue.push(job);this.pump();
   });
  });
 }
 pump(){if(this.current||this.resolveReady||!this.queue.length)return;const job=this.queue.shift();if(job.signal?.aborted||Date.now()>=job.deadline){job.signal?.removeEventListener('abort',job.abort);job.reject(new Error('Speech expired'));return this.pump();}this.current=job;job.timer=setTimeout(()=>this.fail(new Error('VieNeu không trả âm thanh sau 60 giây.')),60000);this.worker.stdin.write(JSON.stringify({type:'speak',id:job.id,text:job.text,voice:job.voice})+'\n');}
 fail(error){clearTimeout(this.startTimer);const worker=this.worker;this.worker=null;this.buffer='';worker?.kill();this.failure=error;this.startedAt=0;
  const delay=Math.min(60000,3000*2**this.failures++);this.retryAt=Date.now()+delay;clearTimeout(this.retryTimer);
  if(!this.closed){this.retryTimer=setTimeout(()=>{this.retryTimer=null;if(!this.worker)this.start().catch(()=>{});},delay);this.retryTimer.unref?.();}this.rejectReady?.(error);this.resolveReady=this.rejectReady=null;this.lastError=error.message;const jobs=[...(this.current?[this.current]:[]),...this.queue.splice(0)];this.current=null;for(const job of jobs){clearTimeout(job.timer);job.signal?.removeEventListener('abort',job.abort);if(!job.settled){job.settled=true;job.reject(error);}}}
 close(){this.closed=true;clearTimeout(this.retryTimer);this.retryTimer=null;const error=new Error('Server dừng.');const jobs=[...(this.current?[this.current]:[]),...this.queue.splice(0)];this.current=null;for(const job of jobs){clearTimeout(job.timer);job.signal?.removeEventListener('abort',job.abort);if(!job.settled){job.settled=true;job.reject(error);}}clearTimeout(this.startTimer);const worker=this.worker;this.worker=null;worker?.kill();this.rejectReady?.(error);this.resolveReady=this.rejectReady=null;}
}
module.exports={VieNeuSpeech};
