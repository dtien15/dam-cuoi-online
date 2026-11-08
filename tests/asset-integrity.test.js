'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),info=require('./webp-info');
const root=path.join(__dirname,'..');const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
test('shipped image assets are valid WebP and retired character sets are absent',()=>{
 const files=walk(path.join(root,'assets'));assert.equal(files.filter(f=>/\.(png|jpe?g)$/i.test(f)).length,0);
 for(const file of files.filter(f=>f.endsWith('.webp'))){const meta=info(fs.readFileSync(file));assert.ok(meta.width>0&&meta.height>0,file);assert.ok(fs.statSync(file).size<600000,file);}
 for(const old of ['characters/comic','characters/funny-v2','characters/couple','characters/mc','events/hearts','events/rollcall'])assert.equal(fs.existsSync(path.join(root,'assets',old)),false);
});
test('all literal game asset references and JSON sprite frames resolve after cleanup',()=>{
 const files=fs.readdirSync(path.join(root,'game')).filter(f=>/\.(js|css|html)$/.test(f)).map(f=>path.join(root,'game',f));const checked=new Set();
 function check(src){src=src.split('?')[0];if(checked.has(src))return;checked.add(src);const file=path.join(root,src.slice(1));assert.ok(fs.existsSync(file),src);if(src.endsWith('.json'))scan(fs.readFileSync(file,'utf8'));}
 function scan(text){for(const m of text.matchAll(/\/assets\/[\w/.-]+\.(?:webp|svg|mp3|json)/g))check(m[0]);}
 for(const f of files)scan(fs.readFileSync(f,'utf8'));for(const gift of ['rose','gg','ice-cream','tiktok'])check('/assets/tiktok-gift-'+gift+'.webp');assert.ok(checked.size>=30);
});
test('wedding entertainment retains the original four-person sheet and song, without the retired paid trigger',()=>{
 const css=fs.readFileSync(path.join(root,'game/style.css'),'utf8');assert.match(css,/\/assets\/characters\/park-dance\.webp/);assert.doesNotMatch(css,/cute-v3\/park-dance|park-expression/);
 for(const f of ['assets/characters/park-dance.webp','assets/music/cong-vien-lam-lang.mp3','assets/music/park-applause.mp3'])assert.ok(fs.statSync(path.join(root,f)).size>1000);
 const gift=require('../game/gift-events');assert.equal(gift.parkDance,undefined);assert.equal(gift.defaults().events.some(e=>e.coins===10),false);
});
