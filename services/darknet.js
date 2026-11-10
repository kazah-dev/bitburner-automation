/** Supervise bounded exploration and cache collection in the in-game Darknet. */
export async function main(ns) {
  ns.disableLog('ALL');
  if(ns.ps('home').some(p=>p.filename===ns.getScriptName()&&p.pid<ns.pid))return;
  const port=ns.getPortHandle(ns.pid),nodes=new Map(),file='workers/darknet.js';
  ns.atExit(()=>{for(const node of nodes.values())ns.kill(node.pid);});
  while(true){
    let reason='Exploring supported puzzle models';
    try{
      if(!ns.fileExists('DarkscapeNavigator.exe','home'))reason='DarkscapeNavigator required';
      else{
        const session=ns.dnet.connectToSession('darkweb','');
        if(session.success||(await ns.dnet.authenticate('darkweb','')).success){
          if(!ns.ps('darkweb').some(p=>p.filename===file&&p.args[0]===ns.pid)){
            await ns.scp(file,'darkweb','home');
            const pid=ns.exec(file,'darkweb',{threads:1,temporary:true,preventDuplicates:true},ns.pid);
            if(!pid)reason='Waiting for Darknet entry-server RAM';
          }
        }
      }
      while(!port.empty()){const item=port.read();if(item&&typeof item.host==='string')nodes.set(item.host,item);}
      for(const [host,item]of nodes)if(!ns.isRunning(item.pid))nodes.delete(host);
    }catch(e){reason=String(e);}
    await ns.write('data/darknet-status.txt',JSON.stringify({pid:ns.pid,updatedAt:Date.now(),reason,servers:nodes.size,caches:[...nodes.values()].reduce((n,x)=>n+x.caches,0)}),'w');
    await ns.sleep(5000);
  }
}
