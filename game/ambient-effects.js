'use strict';
(function(root){
 const between=(rng,min,max)=>min+rng()*(max-min);
 function heart(rng=Math.random){return{x:between(rng,3,97),duration:between(rng,18,34),phase:rng(),size:between(rng,35,68),drift:between(rng,-90,90)};}
 function burst(rng=Math.random){return{x:between(rng,8,92),y:between(rng,14,88),radius:between(rng,160,260),hue:between(rng,325,405),particles:22};}
 function mount(doc=root.document){
  const layer=doc.getElementById('ambient-hearts'),stage=doc.getElementById('stage'),world=doc.getElementById('camera-world');
  if(!layer||!stage||!world||layer.dataset.ready)return;
  layer.dataset.ready='true';
  const motion=root.matchMedia('(prefers-reduced-motion: reduce)');
  const wrapper=doc.createElement('div');wrapper.id='ambient-camera';world.before(wrapper);wrapper.append(world);
  const fire=doc.createElement('div');fire.id='ambient-fireworks';fire.setAttribute('aria-hidden','true');stage.append(fire);
  function styleHeart(node,initial=false){const p=heart();node.style.setProperty('--x',p.x+'%');node.style.setProperty('--duration',p.duration+'s');node.style.setProperty('--size',p.size+'px');node.style.setProperty('--drift',p.drift+'px');node.style.setProperty('--delay',initial?-p.phase*p.duration+'s':'0s');}
  for(let i=0;i<6;i++){
   const node=doc.createElement('i');node.textContent='♥';layer.append(node);
  }
  for(const node of layer.children){
   styleHeart(node,true);
   node.style.setProperty('--beat-duration',between(Math.random,2.3,3.8)+'s');
   node.style.setProperty('--beat-delay',-between(Math.random,0,3.8)+'s');
   node.addEventListener('animationiteration',event=>{
    if(event.animationName==='ambient-heart-rise')styleHeart(node);
   });
  }
  let timer;
  function launch(){
   if(doc.hidden||motion.matches)return;
   const p=burst(),node=doc.createElement('div');node.className='ambient-burst';node.style.left=p.x+'%';node.style.top=p.y+'%';node.style.setProperty('--burst-hue',p.hue);fire.append(node);
   for(let i=0;i<p.particles;i++){const spark=doc.createElement('i'),angle=i*2*Math.PI/p.particles; spark.style.setProperty('--spark-x',Math.cos(angle)*p.radius+'px');spark.style.setProperty('--spark-y',Math.sin(angle)*p.radius+'px');node.append(spark);}
   for(let i=0;i<12;i++){const ribbon=doc.createElement('b');ribbon.className='ambient-ribbon';ribbon.style.setProperty('--ribbon-x',between(Math.random,-330,330)+'px');ribbon.style.setProperty('--ribbon-rise',-between(Math.random,150,330)+'px');ribbon.style.setProperty('--ribbon-fall',between(Math.random,400,850)+'px');ribbon.style.setProperty('--ribbon-spin',between(Math.random,-540,540)+'deg');ribbon.style.setProperty('--ribbon-color',String(i*30));ribbon.style.animationDelay=between(Math.random,0,.45)+'s';node.append(ribbon);}
   node.addEventListener('animationend',event=>{if(event.target===node)node.remove();});
   while(fire.children.length>2)fire.firstElementChild.remove();
   timer=root.setTimeout(launch,between(Math.random,4200,7200));
  }
  function update(){root.clearTimeout(timer);stage.classList.toggle('ambient-paused',doc.hidden||motion.matches);if(doc.hidden||motion.matches)fire.replaceChildren();else timer=root.setTimeout(launch,1200);}
  doc.addEventListener('visibilitychange',update);motion.addEventListener('change',update);update();
 }
 const api={heart,burst,mount};
 if(typeof module!=='undefined')module.exports=api;else{root.AmbientEffects=api;mount();}
})(globalThis);
