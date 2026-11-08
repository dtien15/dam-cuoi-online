'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const hall=require('../game/hall-layout'),info=require('./webp-info');
test('four tables align in two columns with room outside the red aisle',()=>{
 assert.equal(hall.tables.length,4);
 for(const side of [0,1]){
  const tables=hall.tables.filter(t=>t.side===side);assert.equal(tables[0].x,tables[1].x);
  for(const t of tables)assert.ok(side?t.x-t.width/2>=695:t.x+t.width/2<=385);
 }
 for(const seat of hall.seats)assert.equal(seat.view,seat.front?seat.id%3+1:0);
});
test('all five guests have four seated camera angles and seated rendering stays separate from walking',()=>{
 const cast=JSON.parse(fs.readFileSync('assets/characters/cute-v3/cast.json','utf8'));
 for(const [row,key] of ['teenboy','teengirl','aunt','uncle','flashy'].entries()){
  const pose=cast[key].seated,meta=info(fs.readFileSync('.'+pose.src));
  assert.equal(meta.alpha,true);assert.equal(pose.views,4);assert.equal(pose.row,row);
  assert.equal(pose.w*4,meta.width);assert.equal(pose.h*5,meta.height);
  assert.ok(cast[key].walk);assert.notEqual(pose.src,cast[key].walk.src);
 }
 const source=fs.readFileSync('game/game.js','utf8');assert.match(source,/seatedFigure\(character,pos.view,user.id\)/);
});

test('every seated angle has three registered eating poses on a shared lightweight alpha sheet',()=>{
 const cast=JSON.parse(fs.readFileSync('assets/characters/cute-v3/cast.json','utf8'));
 for(const key of ['teenboy','teengirl','aunt','uncle','flashy']){
  const pose=cast[key].seated,eat=pose.eating,bytes=fs.readFileSync('.'+eat.src),meta=info(bytes);
  assert.equal(meta.alpha,true);assert.equal(eat.frames,3);assert.ok(bytes.length<600000);
  assert.equal(meta.width,eat.sheetWidth);assert.equal(meta.height,eat.sheetHeight);
  assert.equal(pose.views*eat.frames*eat.w,meta.width);assert.equal(eat.h*5,meta.height);
 }
});

test('eating phase depends on guest identity while camera angle and chair viewport stay fixed',()=>{
 const vm=require('node:vm'),source=fs.readFileSync('game/game.js','utf8');
 const fn=source.slice(source.indexOf('function seatedFigure('),source.indexOf('function heightForWalk('));
 const cast=JSON.parse(fs.readFileSync('assets/characters/cute-v3/cast.json','utf8'));
 const node=()=>({style:{setProperty(k,v){this[k]=v;}},dataset:{},classList:{add(){}},children:[],appendChild(child){this.children.push(child);}});
 const context={COMIC:cast,document:{createElement:node},hash:s=>[...s].reduce((h,c)=>h*3+c.charCodeAt(0),0),comicFigure:()=>{throw Error('Unexpected fallback');}};
 vm.createContext(context);vm.runInContext(fn,context);
 const poses=[];
 for(const key of ['teenboy','teengirl','aunt','uncle','flashy'])for(let view=0;view<4;view++){
  const figure=context.seatedFigure(key,view,'guest-a'),sprite=figure.children[0];poses.push(sprite);
  assert.equal(figure.dataset.seatedView,String(view));assert.equal(sprite.style.backgroundSize,'1200% 500%');
  for(const [frame,phase]of ['rest','bite','chew'].entries())assert.equal(sprite.style['--eat-'+phase+'-x'],((view*3+frame)*100/11)+'%');
 }
 const other=context.seatedFigure('teenboy',0,'guest-b').children[0];
 assert.notEqual(poses[0].style['--eat-delay'],other.style['--eat-delay']);
 const css=fs.readFileSync('game/style.css','utf8');assert.match(css,/seated-eating var\(--eat-duration\) steps\(1,end\)/);
 assert.match(css,/prefers-reduced-motion:reduce\)\{\.has-eating/);
});
