/** Bounded infrastructure investment without Singularity. Run on home. */
const STATE = 'capital-state.txt', CONFIG = 'capital-config.txt', STATUS = 'capital-status.txt';
export const defaults = Object.freeze({enabled:true, minCash:1e6, maxFleetRam:65536,
  maxServerRam:8192, paybackSeconds:1800});
const finite = n => Number.isFinite(n) && n >= 0;

export function configFrom(text) {
  const input = text ? JSON.parse(text) : {};
  if (!input || Array.isArray(input) || typeof input !== 'object' ||
      Object.keys(input).some(k => !Object.hasOwn(defaults,k))) throw Error('Invalid capital configuration');
  const c = {...defaults,...input};
  if (typeof c.enabled !== 'boolean' || !finite(c.minCash) ||
      !Number.isSafeInteger(c.maxFleetRam) || c.maxFleetRam < 0 ||
      !Number.isSafeInteger(c.maxServerRam) || c.maxServerRam < 2 || !Number.isInteger(Math.log2(c.maxServerRam)) ||
      !finite(c.paybackSeconds) || c.paybackSeconds > 86400) throw Error('Invalid capital limits');
  return c;
}

export function ledgerFrom(text, epoch, cash) {
  if (!finite(cash)) throw Error('Invalid cash balance');
  const old = text ? JSON.parse(text) : null;
  // An unreadable ledger must never silently mint a new spending allowance.
  if (text && (!old || old.version !== 1 || typeof old.epoch !== 'string' ||
      !['seed','peak','earned','spent'].every(k=>finite(old[k])))) throw Error('Invalid investment ledger');
  return old?.epoch === epoch ? old : {version:1,epoch,seed:cash*0.05,peak:cash,earned:0,spent:0};
}

export function updateLedger(s, cash) {
  // Only new wealth highs earn credit. Our own spending is added back; external
  // spending/recovery cannot repeatedly replenish the same allowance.
  const wealth = cash + s.spent;
  if (wealth > s.peak) { s.earned += wealth - s.peak; s.peak = wealth; }
  return s;
}
export function allowance(s, cash, reserve) {
  return Math.max(0, Math.min(s.seed + 0.20*s.earned - s.spent, cash-reserve, cash*0.05));
}
export function programReserve(ns, minCash) {
  const prices = [['BruteSSH.exe',7e5],['FTPCrack.exe',1.5e6],['relaySMTP.exe',5e6],
    ['HTTPWorm.exe',3e7],['SQLInject.exe',2.5e8]];
  return Math.max(minCash, prices.find(([f])=>!ns.fileExists(f,'home'))?.[1] ?? 1e8);
}

function cloudChoices(ns, c) {
  const names = ns.cloud.getServerNames();
  const total = names.reduce((a,n)=>a+ns.getServerMaxRam(n),0);
  const cap = Math.min(c.maxServerRam,ns.cloud.getRamLimit());
  const choices = [];
  for (const host of names) {
    const old = ns.getServerMaxRam(host), ram = old*2;
    if (ram<=cap && total+old<=c.maxFleetRam) choices.push({kind:'cloud',label:`Upgrade ${host} to ${ram} GB`,
      cost:ns.cloud.getServerUpgradeCost(host,ram),gain:old,buy:()=>ns.cloud.upgradeServer(host,ram)});
  }
  const ram = Math.min(64,cap);
  if (names.length<ns.cloud.getServerLimit() && total+ram<=c.maxFleetRam) {
    let i=1; while(ns.serverExists('worker-'+String(i).padStart(2,'0'))) i++;
    const name='worker-'+String(i).padStart(2,'0');
    choices.push({kind:'cloud',label:`Purchase ${name} (${ram} GB)`,cost:ns.cloud.getServerCost(ram),gain:ram,
      buy:()=>Boolean(ns.cloud.purchaseServer(name,ram))});
  }
  return choices.filter(x=>Number.isFinite(x.cost)&&x.cost>0)
    .sort((a,b)=>a.cost/a.gain-b.cost/b.gain || a.cost-b.cost);
}

function hacknetChoices(ns, c) {
  const nodes=Array.from({length:ns.hacknet.numNodes()},(_,i)=>ns.hacknet.getNodeStats(i));
  if(nodes.some(n=>'hashCapacity' in n)) return []; // Never treat hashes as dollars.
  // One small BN1 seed purchase supplies a real production measurement.
  // Other BitNodes may use hashes or different production rules.
  if(!nodes.length) {
    const cost=ns.hacknet.getPurchaseNodeCost();
    return ns.getResetInfo().currentNode===1 && c.paybackSeconds>0 && cost>0 && cost<=5000
      ? [{kind:'hacknet',label:'Seed first Hacknet node',cost,buy:()=>ns.hacknet.purchaseNode()>=0}] : [];
  }
  const n=nodes[0], base=n.production/(n.level*Math.pow(1.035,n.ram-1)*(n.cores+5)/6);
  const choices=[{kind:'hacknet',label:'Purchase Hacknet node',cost:ns.hacknet.getPurchaseNodeCost(),gain:base,
    buy:()=>ns.hacknet.purchaseNode()>=0}];
  nodes.forEach((n,i)=>choices.push(
    {kind:'hacknet',label:`Hacknet ${i}: level`,cost:ns.hacknet.getLevelUpgradeCost(i,1),gain:n.production/n.level,buy:()=>ns.hacknet.upgradeLevel(i,1)},
    {kind:'hacknet',label:`Hacknet ${i}: RAM`,cost:ns.hacknet.getRamUpgradeCost(i,1),gain:n.production*(Math.pow(1.035,n.ram)-1),buy:()=>ns.hacknet.upgradeRam(i,1)},
    {kind:'hacknet',label:`Hacknet ${i}: core`,cost:ns.hacknet.getCoreUpgradeCost(i,1),gain:n.production/(n.cores+5),buy:()=>ns.hacknet.upgradeCore(i,1)}));
  return choices.filter(x=>Number.isFinite(x.cost)&&x.cost>0&&Number.isFinite(x.gain)&&x.gain>0&&x.cost/x.gain<=c.paybackSeconds)
    .sort((a,b)=>a.cost/a.gain-b.cost/b.gain);
}

function demand(ns) {
  const hosts=['home'],seen=new Set(hosts);
  for(const h of hosts) for(const peer of ns.scan(h)) if(!seen.has(peer)){seen.add(peer);hosts.push(peer);}
  let capacity=0,busy=0;
  const unit=ns.getScriptRam('task.js','home');
  for(const host of hosts) if(ns.hasRootAccess(host)) {
    capacity+=Math.max(0,ns.getServerMaxRam(host)-(host==='home'?32:0));
    busy+=ns.ps(host).filter(p=>p.filename==='task.js').reduce((n,p)=>n+p.threads*unit,0);
  }
  return capacity>0?busy/capacity:0;
}

export async function tick(ns, runtime) {
  const c=configFrom(ns.read(CONFIG));
  const reset=ns.getResetInfo();
  if(!finite(reset.lastAugReset)||!finite(reset.lastNodeReset)) throw Error('Reset identity unavailable');
  const epoch=reset.lastNodeReset+':'+reset.lastAugReset;
  const cash=()=>ns.getServerMoneyAvailable('home');
  const s=updateLedger(ledgerFrom(ns.read(STATE),epoch,cash()),cash());
  if(runtime.epoch!==epoch){runtime.epoch=epoch;runtime.pressure=0;}
  const load=demand(ns), reserve=programReserve(ns,c.minCash);
  runtime.pressure=load>=0.60?runtime.pressure+1:0;
  await ns.write(STATE,JSON.stringify(s),'w');
  let budget=allowance(s,cash(),reserve), spentThisPass=0, purchases=0;
  const controller=ns.ps('home').some(p=>p.filename==='cycle.js');
  let reason=!c.enabled?'Purchases paused':!controller?'Waiting for hacking controller':'Waiting for affordable investment';
  if(c.enabled&&controller) for(let step=0;step<8;step++) {
    // Prefer short-payback Hacknet opportunities. Cloud expansion requires
    // three consecutive high-demand samples, excluding reputation sharing.
    const options=[...hacknetChoices(ns,c),...(runtime.pressure>=3?cloudChoices(ns,c):[])];
    const available=Math.min(budget-spentThisPass,allowance(s,cash(),reserve));
    const choice=options.find(x=>x.cost<=available);
    if(!choice){reason=runtime.pressure<3?'No qualifying Hacknet investment; farming capacity sufficient':'Waiting for budget or capacity limits';break;}
    // Charge before mutation. A crash can overcount, never re-spend this credit.
    s.spent+=choice.cost;
    await ns.write(STATE,JSON.stringify(s),'w');
    const success=choice.buy();
    if(!success){s.spent-=choice.cost;await ns.write(STATE,JSON.stringify(s),'w');reason='Purchase failed; retry next minute';break;}
    spentThisPass+=choice.cost;purchases++;
    reason=choice.label;ns.tprint(choice.label+' | $'+Math.round(choice.cost));
    if(choice.kind==='cloud') break; // At most one capacity change per minute.
  }
  const status={updatedAt:Date.now(),pid:ns.pid,enabled:c.enabled,reason,reserve,
    remainingBudget:allowance(s,cash(),reserve),spent:s.spent,spentThisPass,purchases,
    farmingRamFraction:load,pressureSamples:runtime.pressure,maxFleetRam:c.maxFleetRam};
  await ns.write(STATUS,JSON.stringify(status),'w');
  return status;
}

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  if(ns.getHostname()!=='home')throw Error('Run capital.js on home');
  if(ns.ps('home').some(p=>p.filename===ns.getScriptName()&&p.pid<ns.pid))return;
  const runtime={};let previous='';
  while(true){
    try{const s=await tick(ns,runtime);if(s.reason!==previous){ns.print(s.reason);previous=s.reason;}}
    catch(e){const message=String(e);await ns.write(STATUS,JSON.stringify({updatedAt:Date.now(),pid:ns.pid,enabled:false,error:message}),'w');
      if(message!==previous){ns.tprint('Investment paused: '+message);previous=message;}}
    await ns.sleep(60000);
  }
}
