'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
async function playback(trace,rate=1.2,bufferWhole=false){
 let clock=0;const played=[];
 class AudioContext{
  get currentTime(){return clock;}
  resume(){return Promise.resolve();}
  createBuffer(_,samples,hz){return{duration:samples/hz,getChannelData:()=>new Float32Array(samples)};}
  createBufferSource(){const source={playbackRate:{value:1},connect(){},stop(){},start(at){played.push({at,end:at+source.buffer.duration/source.playbackRate.value,samples:source.buffer.duration*48000});}};return source;}
 }
 let index=0;const context={AudioContext,Uint8Array,Int16Array,Float32Array,AbortController,DOMException,performance:{now:()=>clock*1000},clearTimeout,
  setTimeout(fn,ms){if(ms>=1000)return setTimeout(fn,ms);clock+=ms/1000;queueMicrotask(fn);return 0;},
  fetch:async()=>({ok:true,body:{getReader:()=>({cancel:async()=>{},read:async()=>{if(index===trace.length)return{done:true};const [at,bytes]=trace[index++];clock=at;return{value:new Uint8Array(bytes),done:false};}})}})};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../game/pcm-player.js'),'utf8'),context);
 const player=new context.PcmSpeechPlayer();assert.equal(await player.play('/tts',{rate,bufferWhole}),true);return{played,stats:player.stats};
}
test('measured live PCM arrival jitter plays continuously at 1.2x without losing odd packet bytes',async()=>{
 const trace=[[.581,30720],[.795,30720],[1.220,46080],[1.629,46080],[1.952,46080],[2.238,46080],[2.444,61440],[2.785,65529],[2.785,18951],[3.519,65529],[3.519,65536],[3.519,60935],[4.186,65529],[4.187,65536],[4.187,60935],[4.429,65529],[4.429,3591]];
 const {played,stats}=await playback(trace);
 assert.equal(stats.underruns,0);assert.equal(stats.samples,trace.reduce((a,[,bytes])=>a+bytes,0)/2);
 assert.ok(played[0].at>=1.9&&played[0].at<2.1);
 for(let i=1;i<played.length;i++)assert.ok(Math.abs(played[i].at-played[i-1].end)<1e-8,'buffers must join without silence');
});
test('a short completed phrase plays fully instead of waiting forever for the startup buffer',async()=>{
 const {played,stats}=await playback([[.5,10001],[.51,9199]]);assert.equal(stats.samples,9600);assert.equal(played.length,1);assert.equal(stats.underruns,0);
});
test('a long CPU stall rebuffers once instead of inserting small gaps into each arriving packet',async()=>{
 const {stats}=await playback([[.5,192000],[4,15360],[4.1,15360],[4.2,92160]]);
 assert.equal(stats.underruns,1);assert.equal(stats.samples,314880/2);
});

test('full-phrase mode tolerates arbitrary generation gaps without breaking a spoken sentence',async()=>{
 const {played,stats}=await playback([[.2,30720],[2.5,30720],[4,30720]],1.2,true);
 assert.equal(stats.underruns,0);assert.ok(played[0].at>=4);assert.equal(stats.samples,46080);
 for(let i=1;i<played.length;i++)assert.ok(Math.abs(played[i].at-played[i-1].end)<1e-8);
});
