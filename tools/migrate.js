/** One-time flat-layout migration. Preview by default; apply explicitly.
 * Export a game save and upload the entire new layout first. */
export const scripts=['cycle','contracts','capital','monitor','task','share','inspect','audit','fleet','hacknet','deploy','inicio'].map(n=>n+'.js');
export const required=['economy.js','services/cycle.js','services/contracts.js','services/capital.js','ui/monitor.js','workers/task.js','workers/share.js'];
export const stateFiles=['capital-state.txt','capital-config.txt','capital-status.txt','cycle-status.txt','audit-status.txt','contracts-rejected.txt'];
function hosts(ns){const out=['home'];for(const h of out)for(const n of ns.scan(h))if(!out.includes(n))out.push(n);return out;}
export function preflight(ns){
  for(const f of required)if(!(ns.getScriptRam(f,'home')>0))throw Error('Missing or invalid script: '+f);
  for(const f of stateFiles)if(ns.fileExists(f,'home')&&ns.fileExists('data/'+f,'home'))throw Error('Conflicting state files: '+f+'; keep the authoritative copy before retrying.');
  for(const f of scripts)if(ns.fileExists(f,'home')&&ns.fileExists('archive/pre-folders/'+f,'home'))throw Error('Archive conflict: '+f);
}
export async function main(ns){
  if(ns.getHostname()!=='home')throw Error('Run on home.');
  ns.disableLog('ALL');
  if(ns.ps('home').some(p=>p.filename===ns.getScriptName()&&p.pid<ns.pid))throw Error('Migration already running.');
  preflight(ns);
  if(ns.args[0]!=='apply'){ns.tprint('Preview: stop owned services, drain old tasks, move state into data/, archive flat scripts, restart economy.js. Run tools/migrate.js apply to proceed.');return;}
  // Stop both layouts so no writer can recreate the old ledger while it moves.
  const owned=new Set(['economy.js','cycle.js','contracts.js','capital.js','monitor.js',...required.slice(1,5)]);
  for(const p of ns.ps('home'))if(owned.has(p.filename))ns.kill(p.pid);
  const network=hosts(ns).filter(h=>h!=='darkweb');
  for(const h of network)for(const p of ns.ps(h))if(p.filename==='inicio.js'||p.filename==='legacy/inicio.js'||(['share.js','workers/share.js'].includes(p.filename)&&p.args[0]==='cycle-fill'))ns.kill(p.pid);
  ns.tprint('Waiting for existing hacking operations to finish...');
  while(network.some(h=>ns.ps(h).some(p=>['task.js','workers/task.js'].includes(p.filename))))await ns.sleep(1000);
  preflight(ns);
  for(const f of stateFiles)if(ns.fileExists(f,'home')){
    const before=ns.read(f);ns.mv('home',f,'data/'+f);
    if(ns.fileExists(f,'home')||ns.read('data/'+f)!==before)throw Error('State move failed: '+f);
  }
  for(const f of scripts)if(ns.fileExists(f,'home'))ns.mv('home',f,'archive/pre-folders/'+f);
  for(const h of network.filter(h=>h!=='home'))for(const f of ['task.js','share.js','inicio.js'])
    if(ns.fileExists(f,h)&&!ns.fileExists('archive/pre-folders/'+f,h))ns.mv(h,f,'archive/pre-folders/'+f);
  const pid=ns.exec('economy.js','home',1);
  if(!pid)throw Error('Migration complete, but startup needs RAM. Run economy.js manually.');
  ns.tprint('Migration complete. Supervisor PID '+pid+'. Original scripts remain in archive/pre-folders/.');
}
