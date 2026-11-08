'use strict';
// One transparent canvas, capped particles and a 30 FPS effect clock.
window.WeddingFireworks={start(container,alive,{colors,interval=285,showHearts=true}={}){
 const canvas=document.createElement('canvas');canvas.className='wedding-fireworks';canvas.width=1080;canvas.height=1000;canvas.setAttribute('aria-hidden','true');container.append(canvas);
 const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return()=>{};}
 colors??=['#ffbd19','#ff347c','#39d9ff','#c264ff','#fff4bd','#ff713b'];
 const bursts=Array.from({length:16},(_,i)=>({at:250+i*interval,x:150+(i*233)%780,y:265+(i*97)%265,done:false}));
 const sparks=[],hearts=Array.from({length:showHearts?36:0},(_,i)=>({x:100+(i*167)%880,y:790+(i*71)%190,size:15+i%5*4,delay:i%9*140,speed:50+i%6*10,color:i%2?'#ff6399':'#ffb0cd'}));
 let raf=0,stopped=false,start=null,last=-Infinity,previous=0,peak=0;
 function heart(x,y,size,color){ctx.save();ctx.translate(x,y);ctx.scale(size/20,size/20);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,6);ctx.bezierCurveTo(-25,-10,-12,-25,0,-12);ctx.bezierCurveTo(12,-25,25,-10,0,6);ctx.fill();ctx.restore();}
 function explode(b,index){const count=index>=12?56:40;for(let j=0;j<count;j++){if(sparks.length>=360)sparks.shift();const angle=j*Math.PI*2/count,radius=75+(j*37)%160;sparks.push({x:b.x,y:b.y,vx:Math.cos(angle)*radius,vy:Math.sin(angle)*radius,age:0,life:1.05+(j%5)*.12,color:colors[(j+index)%colors.length],size:j%4===0?5.5:3.5});}canvas.dataset.bursts=String(Number(canvas.dataset.bursts||0)+1);}
 function draw(now){if(stopped||!alive()){stop();return;}if(start===null){start=now;previous=now;}const elapsed=now-start;if(elapsed>6500){stop();return;}raf=requestAnimationFrame(draw);if(now-last<32)return;last=now;const dt=Math.min(.06,(now-previous)/1000);previous=now;ctx.clearRect(0,0,1080,1000);
  for(const [i,b]of bursts.entries()){const lead=elapsed-b.at;if(!b.done&&lead>=0){b.done=true;explode(b,i);}else if(!b.done&&lead>-380){const progress=(lead+380)/380,x=b.x,y=820+(b.y-820)*progress;ctx.globalAlpha=.85;ctx.strokeStyle=colors[i%colors.length];ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y+38);ctx.lineTo(x,y);ctx.stroke();}}
  for(const [i,b]of bursts.entries()){const age=elapsed-b.at;if(!b.done||age<0||age>950)continue;ctx.globalAlpha=(1-age/950)*.8;ctx.strokeStyle=colors[i%colors.length];ctx.lineWidth=5;ctx.beginPath();ctx.arc(b.x,b.y,18+age*.19,0,Math.PI*2);ctx.stroke();if(age<180){ctx.globalAlpha=(1-age/180)*.9;ctx.fillStyle='#fff8dc';ctx.beginPath();ctx.arc(b.x,b.y,30,0,Math.PI*2);ctx.fill();}}
  for(let i=sparks.length-1;i>=0;i--){const p=sparks[i];p.age+=dt;if(p.age>=p.life){sparks.splice(i,1);continue;}const oldX=p.x,oldY=p.y;p.vx*=.985;p.vy+=75*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.globalAlpha=Math.min(1,(1-p.age/p.life)*1.5);ctx.strokeStyle=p.color;ctx.lineWidth=p.size;ctx.beginPath();ctx.moveTo(oldX-p.vx*.035,oldY-p.vy*.035);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.fillStyle=p.age<.2?'#fff':p.color;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}
  for(const [i,h]of hearts.entries()){const age=(elapsed-h.delay)/1000;if(age<0)continue;ctx.globalAlpha=Math.min(1,age*2,Math.max(0,(6.5-elapsed/1000)*1.5))*.85;heart(h.x+Math.sin(age*2+i)*23,h.y-age*h.speed,h.size,h.color);}
  ctx.globalAlpha=1;peak=Math.max(peak,sparks.length);canvas.dataset.peakParticles=String(peak);canvas.dataset.hearts=String(hearts.length);
 }
 function stop(){if(stopped)return;stopped=true;cancelAnimationFrame(raf);sparks.length=0;canvas.remove();}
 raf=requestAnimationFrame(draw);return stop;
}};
