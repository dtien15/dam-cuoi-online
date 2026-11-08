'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const hall=require('../game/hall-layout');
test('every table and standing guest can reach the ground-level box without entering the stage',()=>{
 assert.equal(hall.tables[0].y,1060);assert.equal(hall.tables[2].y,1340);
 assert.ok(hall.giftBox.top>=864);
 for(const seat of [...hall.seats,{x:200,y:1700},{x:840,y:1770}]){
  const path=hall.groundRoute(seat,2);assert.deepEqual(path[0],{x:seat.x,y:seat.y});
  assert.ok(path.every(point=>point.y>=864));assert.deepEqual(path.at(-1),hall.giftBox.deposit);
 }
 assert.ok(hall.route(hall.seats[0],1,true).some(point=>point.y<864),'takeover route still reaches the stage');
});
test('donor camera is retained but disabled and regular gifts choose envelope delivery during wedding scenes',()=>{
 const source=fs.readFileSync('game/game.js','utf8');
 assert.match(source,/const GIFT_CAMERA_ENABLED=false/);assert.match(source,/if\(GIFT_CAMERA_ENABLED\)giftFocus.enqueue/);
 assert.match(source,/const playsEnvelope=!giftConfig\.giftSelections\?\.thanks\|\|GiftEvents\.matches\(giftConfig,'thanks',event\)/);
 assert.doesNotMatch(source,/if\(cycleState\?\.phase\|\|event.ceremonyRegistration\)chosen=/);
 assert.match(source,/if\(scene.event.action!=='envelope'\)await waitGiftSpeechStart/);
});

test('donors take a short route to the gift box instead of walking around the hall',()=>{
 const box=hall.giftBox.deposit;
 const straight=seat=>Math.hypot(seat.x-box.x,seat.y-box.y);
 for(const seat of hall.seats){
  const path=hall.groundRoute(seat,1),length=hall.routeLength(path);
  assert.ok(length<=straight(seat)+560,'ghế '+seat.id+' đi '+Math.round(length)+'px');
  // Bên phải không bao giờ băng qua lối đi giữa.
  if(hall.tables[seat.table].side===1)assert.ok(path.every(point=>point.x>=640),'ghế '+seat.id+' bên phải đi vòng qua giữa');
  // Không đi xuyên qua mặt bàn.
  for(const table of hall.tables)for(let i=2;i<path.length;i++)for(let t=0;t<=1;t+=.05){
   const x=path[i-1].x+(path[i].x-path[i-1].x)*t,y=path[i-1].y+(path[i].y-path[i-1].y)*t;
   assert.ok(!(Math.abs(x-table.x)<table.width/2-25&&Math.abs(y-table.y)<60),'ghế '+seat.id+' đi xuyên bàn '+table.id);
  }
 }
 const near=hall.seats.find(seat=>seat.table===1&&!seat.front&&seat.x===965);
 assert.ok(hall.routeLength(hall.groundRoute(near,1))<140,'ghế sát hộp phải đi gần như thẳng tới hộp');
 for(const seat of [{x:200,y:1700},{x:840,y:1770},{x:540,y:1500}]){const path=hall.groundRoute(seat,0);assert.ok(hall.routeLength(path)<1500);}
});
test('walking speed is even on every leg of the route',()=>{
 const path=hall.groundRoute(hall.seats[0],1),offsets=hall.routeOffsets(path),length=hall.routeLength(path);
 assert.equal(offsets[0],0);assert.equal(offsets.at(-1),1);
 for(let i=1;i<path.length;i++){const leg=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);assert.ok(Math.abs((offsets[i]-offsets[i-1])*length-leg)<.01);}
});
