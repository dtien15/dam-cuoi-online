'use strict';
// Tắt server game đang giữ cổng để chay-game.bat mở lại bản mới.
// Phiên chơi đã được lưu mỗi giây nên điểm số không mất. Chỉ gọi sau khi check-game.js xác nhận cổng là của game.
const {execFileSync}=require('node:child_process'),net=require('node:net');
const port=Number(process.env.PORT||3000);
const run=(file,args)=>execFileSync(file,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']});
function listeningPid(){
 const row=run('netstat',['-ano','-p','TCP']).split(/\r?\n/).map(line=>line.trim().split(/\s+/)).find(cols=>cols[0]==='TCP'&&cols[1]?.endsWith(':'+port)&&cols[3]==='LISTENING');
 return row?Number(row[4]):null;
}
// Cửa sổ chay-game.bat cũ đang dừng ở "pause" sau khi server tắt nên đóng luôn cho gọn.
function launcherWindow(pid){
 try{
  const script=`$p=Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}';$q=Get-CimInstance Win32_Process -Filter ('ProcessId='+$p.ParentProcessId);if($q.Name -eq 'cmd.exe' -and $q.CommandLine -like '*chay-game*'){$q.ProcessId}`;
  return Number(run('powershell',['-NoProfile','-Command',script]).trim())||null;
 }catch{return null;}
}
const portFree=()=>new Promise(resolve=>{const probe=net.connect({host:'127.0.0.1',port});probe.once('connect',()=>{probe.destroy();resolve(false);});probe.once('error',()=>resolve(true));});
(async()=>{
 const pid=listeningPid();
 if(pid){
  const target=launcherWindow(pid)||pid;
  run('taskkill',['/PID',String(target),'/T','/F']);
 }
 for(let i=0;i<40;i++){if(await portFree())return;await new Promise(r=>setTimeout(r,250));}
 console.error('Khong tat duoc server cu tren cong '+port+'.');process.exit(1);
})().catch(error=>{console.error(error.message);process.exit(1);});
