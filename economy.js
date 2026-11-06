/** Keep the core services running. Stop this first before intentionally stopping a service.
 * No purchases, resets, faction changes or save edits. */
export async function main(ns) {
  ns.disableLog('ALL');
  if(ns.getHostname()!=='home')throw Error('Run economy.js on home.');
  if(ns.ps('home').filter(p=>p.filename===ns.getScriptName()).length>1)return;
  const services=[['contracts.js',[]],['monitor.js',[2000]],['cycle.js',['auto',32,'share',4]]];
  const retry=new Map();
  while(true){
    for(const [file,args]of services){
      if(ns.ps('home').some(p=>p.filename===file)||Date.now()<(retry.get(file)??0))continue;
      const required=ns.getScriptRam(file,'home');
      retry.set(file,Date.now()+300000);
      if(!(required>0)){ns.tprint('Missing service: '+file);continue;}
      // Release only managed sharing on home if it prevents recovery.
      if(ns.getServerMaxRam('home')-ns.getServerUsedRam('home')<required){
        for(const p of ns.ps('home'))if(p.filename==='share.js'&&p.args[0]==='cycle-fill')ns.kill(p.pid);
      }
      if(ns.getServerMaxRam('home')-ns.getServerUsedRam('home')<required){ns.tprint('Waiting for RAM: '+file);continue;}
      const pid=ns.exec(file,'home',1,...args);
      ns.tprint(pid?'Started '+file+' (PID '+pid+')':'Launch failed: '+file);
    }
    await ns.sleep(30000);
  }
}
