'use strict';
(function(root){
  const tables=[]; const seats=[];
  for(let row=0;row<2;row++) for(let side=0;side<2;side++){
    const width=340, x=side?865:215, y=1060+row*280;
    const table={id:tables.length,x,y,width,height:210,row,side}; tables.push(table);
    for(let seat=0;seat<6;seat++){
      const front=seat>=3, column=seat%3;
      seats.push({id:seats.length,table:table.id,x:x+(column-1)*100,y:y+(front?84:-30),width:120,z:Math.round(y)+(front?100:-10),front,view:front?column+1:0});
    }
  }
  const giftBox={left:990,top:875,width:70,deposit:{x:960,y:935}};
  function route(seat,lane=0,stage=false){
    const aisleX=540+(lane%3-1)*35;
    const table=tables[seat.table],corridor=seat.front?table.y+175:table.y-190;
    return [{x:seat.x,y:seat.y},{x:seat.x,y:corridor},{x:aisleX,y:corridor},...(stage?[{x:aisleX,y:820},{x:940,y:760}]:[{x:aisleX,y:900},{...giftBox.deposit}])];
  }
  const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  function routeLength(points){let sum=0;for(let i=1;i<points.length;i++)sum+=distance(points[i-1],points[i]);return sum;}
  // Vị trí từng điểm theo quãng đường đã đi, để nhân vật đi đều tốc độ trên cả đoạn ngắn lẫn đoạn dài.
  function routeOffsets(points){const total=routeLength(points)||1;let walked=0;return points.map((point,i)=>{if(i)walked+=distance(points[i-1],point);return Math.min(1,walked/total);});}
  // Bo tròn các góc vuông để nhân vật lượn qua thay vì khựng lại rồi quay ngoắt.
  function roundCorners(points,radius=36){
   const result=[points[0]];
   for(let i=1;i<points.length-1;i++){
    const before=points[i-1],corner=points[i],after=points[i+1],inLength=distance(before,corner),outLength=distance(corner,after),r=Math.min(radius,inLength/2,outLength/2);
    if(r<1){continue;}
    result.push({x:corner.x+(before.x-corner.x)*r/inLength,y:corner.y+(before.y-corner.y)*r/inLength},{x:corner.x+(after.x-corner.x)*r/outLength,y:corner.y+(after.y-corner.y)*r/outLength});
   }
   result.push(points.at(-1));return result;
  }
  // Đường ngắn nhất tới hộp chỉ vàng mà không đi xuyên bàn: ra khỏi ghế, vào lối đi gần nhất, lên sân rồi tới hộp.
  function groundRoute(seat,lane=0){
   const shift=(lane%3)-1,top=giftBox.deposit.y+shift*10,passages=[410,670,1040],start={x:seat.x,y:seat.y},end={...giftBox.deposit};
   const table=Number.isInteger(seat.table)?tables[seat.table]:null;
   const exitY=table?(seat.front?table.y+135:table.y-125):seat.y;
   const open=y=>!tables.some(t=>y>t.y-110&&y<t.y+110);
   const direct=table?false:!tables.some(t=>start.x>t.x-t.width/2-20&&start.y>t.y-110);
   const points=[start];
   if(table&&Math.abs(exitY-seat.y)>1)points.push({x:seat.x,y:exitY});
   if(!direct&&exitY>top+30||table&&!open(exitY)){
    const usable=passages.filter(x=>!table||(table.side?x>=670:x===410)),x=usable.reduce((best,item)=>Math.abs(item-seat.x)<Math.abs(best-seat.x)?item:best)+(shift*12);
    const lanes=Math.min(1052,x);
    points.push({x:lanes,y:exitY},{x:lanes,y:top});
   }else if(Math.abs(exitY-top)>1)points.push({x:points.at(-1).x,y:top});
   points.push(end);
   return roundCorners(points.filter((point,i)=>!i||distance(points[i-1],point)>1));
  }
  const api={tables,seats,capacity:seats.length,route,groundRoute,routeLength,routeOffsets,giftBox};
  if(typeof module!=='undefined')module.exports=api;else root.HallLayout=api;
})(typeof globalThis!=='undefined'?globalThis:this);
