'use strict';
// Dấu vân tay của mã server. chay-game.bat so với server đang chạy để biết có cần khởi động lại không.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function codeVersion(root){
 const files=['server.js'];
 for(const dir of ['lib','game'])for(const name of fs.readdirSync(path.join(root,dir)).sort())if(name.endsWith('.js'))files.push(dir+'/'+name);
 const hash=crypto.createHash('sha1');
 for(const file of files)hash.update(file+'\0').update(fs.readFileSync(path.join(root,file)));
 return hash.digest('hex').slice(0,16);
}
module.exports={codeVersion};
