/** Adopt an imported scripts/ layout without deleting its source. Preview first. */
const required=['economy.js','services/cycle.js','services/contracts.js','services/capital.js','services/corporation.js','services/stocks.js','services/darknet.js','workers/darknet.js','workers/task.js','workers/share.js','ui/monitor.js'];
export async function main(ns){
  if(ns.getHostname()!=='home')throw Error('Run on home.');
  const files=ns.ls('home','scripts/').filter(f=>f.startsWith('scripts/')&&/\.(ts|tsx|js|jsx)$/.test(f));
  for(const file of required)if(!(ns.getScriptRam(file,'home')>0))throw Error('Missing or invalid runtime: '+file);
  for(const file of files)if(ns.fileExists('archive/imported/'+file,'home'))throw Error('Archive already exists: '+file);
  ns.tprint(`Adoption plan: preserve ${files.length} imported source files in archive/imported/, stop imported processes and start economy.js.`);
  if(ns.args[0]!=='apply')return;
  const owned=new Set(files),hosts=['home'];
  for(const host of hosts)for(const peer of ns.scan(host))if(!hosts.includes(peer))hosts.push(peer);
  // Stop owners before their workers, so their exit handlers can clean up.
  for(const f of ['scripts/controller.ts','scripts/corp/controller.ts','scripts/darknet/controller.ts'])
    for(const p of ns.ps('home'))if(p.filename===f)ns.kill(p.pid);
  for(const host of hosts)for(const p of ns.ps(host))if(owned.has(p.filename))ns.kill(p.pid);
  for(const file of files){
    const original=ns.read(file);
    ns.mv('home',file,'archive/imported/'+file);
    if(ns.fileExists(file,'home')||ns.read('archive/imported/'+file)!==original)throw Error('Archive verification failed: '+file);
  }
  const pid=ns.run('economy.js');
  if(!pid)throw Error('Files archived; start economy.js after freeing home RAM.');
  ns.tprint('Adoption complete. Set economy.js in Options > System > Autoexec. Archive is local; do not publish game saves.');
}
