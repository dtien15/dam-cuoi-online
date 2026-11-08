'use strict';
const Rollcall=require('../game/rollcall'),WeddingCycle=require('../game/wedding-cycle');
function advanceSimulation(room,elapsed,{weddingConfig,rollcallConfig,hasScreens=false,now=Date.now()}){
 const config=room.scenarioConfig??={wedding:{...weddingConfig,enabled:true},lastWedding:0};
 let changed=false;
 if(Rollcall.cancel(room.state.rollcall,now))changed=true;
 if(WeddingCycle.tick(room.state,config.wedding,now,hasScreens,Rollcall.live(room.state.rollcall)))changed=true;
 const number=room.state.ceremony?.number||0;if(number!==config.lastWedding){room.coverage.wedding++;config.lastWedding=number;}
 return changed;
}
module.exports={advanceSimulation};
