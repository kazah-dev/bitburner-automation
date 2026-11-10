/** Keep the core services running. Stop this first before intentionally stopping a service.
 * services/capital.js performs bounded purchases. No resets or faction changes. */
export async function main(ns) {
  ns.disableLog('ALL');
  if(ns.getHostname()!=='home')throw Error('Run economy.js on home.');
  // Reloading can start both Autoexec and a saved instance together. Elect one
  // owner deterministically so simultaneous copies cannot both exit.
  if(ns.ps('home').some(p=>p.filename===ns.getScriptName()&&p.pid<ns.pid))return;
  const services=[['services/cycle.js',['auto',32,'share',4]],['services/contracts.js',[]],['ui/monitor.js',[2000]],['services/capital.js',[]]];
  if(ns.fileExists?.('services/stocks.js','home'))services.push(['services/stocks.js',[]]);
  if(ns.fileExists?.('DarkscapeNavigator.exe','home')&&ns.fileExists?.('services/darknet.js','home'))services.push(['services/darknet.js',[]]);
  if(ns.corporation?.hasCorporation()&&ns.fileExists?.('services/corporation.js','home'))services.unshift(['services/corporation.js',[]]);
  const retry=new Map();
  while(true){
    for(const [file,args]of services){
      if(ns.ps('home').some(p=>p.filename===file)||Date.now()<(retry.get(file)??0))continue;
      const required=ns.getScriptRam(file,'home');
      if(!(required>0)){retry.set(file,Date.now()+300000);ns.tprint('Missing service: '+file);continue;}
      // Release only managed sharing on home if it prevents recovery.
      if(ns.getServerMaxRam('home')-ns.getServerUsedRam('home')<required){
        for(const p of ns.ps('home'))if(p.filename==='workers/share.js'&&p.args[0]==='cycle-fill')ns.kill(p.pid);
      }
      if(ns.getServerMaxRam('home')-ns.getServerUsedRam('home')<required){ns.tprint('Waiting for RAM: '+file);continue;}
      retry.set(file,Date.now()+300000);
      const pid=ns.exec(file,'home',1,...args);
      ns.tprint(pid?'Started '+file+' (PID '+pid+')':'Launch failed: '+file);
    }
    await ns.sleep(30000);
  }
}
