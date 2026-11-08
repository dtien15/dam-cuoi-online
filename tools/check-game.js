'use strict';
// 0: game đang chạy đúng bản mới, 1: cổng trống, 2: ứng dụng khác giữ cổng,
// 3: game đang chạy bản cũ, 4: game đang chạy bản cũ và có thể đang nối TikTok.
const http=require('node:http'),path=require('node:path');
const {codeVersion}=require('../lib/code-version');
const port=Number(process.env.PORT||3000);
const request=http.get({host:'127.0.0.1',port,path:'/health',timeout:2000},response=>{
 let body='';response.on('data',chunk=>{body+=chunk;if(body.length>65536)request.destroy();});
 response.on('end',()=>{
  let health;try{health=JSON.parse(body);}catch{process.exit(2);}
  if(response.statusCode!==200||!health.ok||health.voice!=='vieneu-local-onnx')process.exit(2);
  if(health.code===codeVersion(path.join(__dirname,'..')))process.exit(0);
  // Server rất cũ không báo trạng thái live: coi như đang live để luôn hỏi trước khi tắt.
  process.exit(health.live===false?3:4);
 });
});
request.on('timeout',()=>request.destroy(new Error('timeout')));
request.on('error',error=>process.exit(error.code==='ECONNREFUSED'?1:2));
