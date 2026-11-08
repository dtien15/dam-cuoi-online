'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'game/control.html'),'utf8');
test('control has navigation, persistent preview and settings in the requested order, with no retired image uploader',()=>{
 const sidebar=html.indexOf('class="studio-sidebar"'),preview=html.indexOf('class="preview-column"'),content=html.indexOf('class="control-content"');assert.ok(sidebar>0&&sidebar<preview&&preview<content);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);for(const id of ['game-preview','ev-save','preview-live','preview-audio','load-duration','load-start','script-library','event-library'])assert.ok(ids.includes(id),id);
 assert.doesNotMatch(html,/ev-add|gift-tier-tabs|heart-control\.js|event-control\.js/);
 const uploaders=[...html.matchAll(/<input[^>]*type="file"[^>]*>/g)].map(m=>m[0]);assert.equal(uploaders.length,1,'chỉ có ô thêm nhạc');assert.match(uploaders[0],/id="music-file"/);assert.match(uploaders[0],/\.mp3/);
 assert.match(html,/data-panel="scripts"/);assert.match(html,/settings-store\.js/);assert.match(html,/gift-control\.js/);
});

test('one comprehensive simulation is visible without expanding a details section',()=>{const panel=html.slice(html.indexOf('id="panel-test"'),html.indexOf('id="event-library"'));assert.doesNotMatch(panel,/<details|load-presets|load-scenario|sim-coins/);assert.match(panel,/load-duration/);});
