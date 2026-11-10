/** Worker for Bitburner's fictional Darknet puzzle network. */
export function passwords(d) {
  if(!d.isOnline)return [];
  const n=d.passwordLength;
  switch(d.modelId){
    case 'ZeroLogon':return [''];
    case 'Pr0verFl0':return [' '.repeat(n*2)];
    case 'DeskMemo_3.1':return [d.passwordHint.slice(-n)];
    case 'FreshInstall_1.0':return d.passwordFormat==='alphabetic'?(n===5?['admin']:n===8?['password']:[]):(n===4?['0000']:n===5?['12345']:[]);
    case 'CloudBlare(tm)':return [(d.data.match(/\d/g)??[]).join('')];
    case 'OctantVoxel':{const [base,value]=d.data.split(','),result=parseInt(value,Number(base));return Number.isSafeInteger(result)?[String(result)]:[];}
    case 'Laika4':return n===3?['max']:n===4?['fido','spot']:n===5?['rover']:[];
    default:return [];
  }
}
export async function main(ns) {
  ns.disableLog('ALL');
  const owner=Number(ns.args[0]),file=ns.getScriptName(),host=ns.getHostname();
  if(ns.ps(host).some(p=>p.filename===file&&p.pid<ns.pid))return;
  const tried=new Map();let caches=0;
  while(ns.isRunning(owner)){
    ns.writePort(owner,{host,pid:ns.pid,caches,time:Date.now()});
    try{
      if(ns.dnet.getBlockedRam()>0)await ns.dnet.memoryReallocation();
      for(const f of ns.ls(host,'.cache'))if(f.endsWith('.cache')){const r=ns.dnet.openCache(f,true);if(r.success)caches++;}
      const peers=ns.dnet.probe();
      for(const peer of peers){
        if(!ns.isRunning(owner))return;
        const d=ns.dnet.getServerDetails(peer);
        if(!d.isOnline)continue;
        const signature=JSON.stringify([d.modelId,d.passwordHint,d.data,d.passwordLength]);
        const previous=tried.get(peer);
        if(previous?.signature===signature&&Date.now()-previous.time<60000)continue;
        tried.set(peer,{signature,time:Date.now()});
        for(const password of passwords(d)){
          const session=ns.dnet.connectToSession(peer,password);
          if(!session.success&&!(await ns.dnet.authenticate(peer,password)).success)continue;
          if(ns.ps(peer).some(p=>p.filename===file&&p.args[0]===owner))break;
          if(ns.dnet.getBlockedRam(peer)>0)await ns.dnet.memoryReallocation(peer);
          if(await ns.scp(file,peer,'home'))ns.exec(file,peer,{threads:1,temporary:true,preventDuplicates:true},owner);
          break;
        }
        await ns.sleep(50);
      }
      for(const key of tried.keys())if(!peers.includes(key))tried.delete(key);
    }catch(e){ns.print(String(e));}
    await ns.sleep(5000);
  }
}
