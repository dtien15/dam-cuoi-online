'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('interrupting MC speech does not invalidate the takeover before the attacker starts running',async()=>{
 const source=fs.readFileSync('game/game.js','utf8'),played=[],signals=[];
 const scope={cycleRoleChanges:new Map(),cycleTakeoverRunning:false,cycleActiveRole:null,speechGeneration:7,cycleState:{key:'welcome-1'},ws:{readyState:1,send:raw=>signals.push(JSON.parse(raw))},cycleVoiceQueue:[],console,WeddingCycleView:{interrupt:async()=>{},resume(){}},playGiftScene:async(scene,generation)=>played.push({id:scene.gift.id,generation})};
 scope.interruptSpeech=()=>scope.speechGeneration++;
 vm.createContext(scope);vm.runInContext(source.slice(source.indexOf('async function queueCycleTakeover('),source.indexOf('function syncState(')),scope);
 await scope.queueCycleTakeover({event:{role:'bride'},gift:{id:'29'}});
 assert.deepEqual(played,[{id:'29',generation:8}]);assert.equal(scope.cycleRoleChanges.size,0);assert.equal(scope.cycleTakeoverRunning,false);
 assert.deepEqual(signals.map(s=>s.active),[true,false]);
});
