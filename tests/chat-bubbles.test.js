const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../game/game.js'),'utf8');
const fn=source.slice(source.indexOf('function positionChat('),source.indexOf('setInterval(()=>{for(const [id,item]of chatBubbles)'));
test('comment follows seated, waiting, walking and wedding role guests at display scale',()=>{
 for(const kind of ['seated','waiting','walking','holder']){
  const target={getBoundingClientRect:()=>({left:100,top:200,width:50})},layer={offsetWidth:1080,getBoundingClientRect:()=>({left:0,top:0,width:540})};
  const item={el:{style:{}}};
  const context={item,$:id=>id==='walkers'?{children:kind==='walking'?[{...target,dataset:{userId:'a'}}]:[]}:layer,document:{querySelectorAll:()=>kind==='holder'?[{dataset:{userId:'a'},closest:()=>target}]:[]},findGuestElement:()=>['seated','waiting'].includes(kind)?target:null};
  vm.runInNewContext(fn+"positionChat('a',item)",context);
  assert.equal(item.el.hidden,false,kind);assert.equal(item.el.style.left,'250px');assert.equal(item.el.style.top,'372px');
 }
});
