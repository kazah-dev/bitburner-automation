/** Adaptive concurrent hacking with reclaimable faction-sharing workers.
 * Usage: run cycle.js [auto|hostname] [home-reserve-GB=16] [share|off] [max-targets=4]
 * Owns task.js and share.js processes tagged cycle-fill. No purchases or resets.
 */
const TAG = "cycle-fill";
const STATUS = "cycle-status.txt";
const HORIZON = 1800;

// Pure policy helpers are exported for the offline regression suite.
export function chooseTarget(ranked, current, canSwitch) {
  const best = ranked[0];
  const previous = ranked.find(x => x.name === current);
  if (!previous) return best;
  return canSwitch && best && best.score > previous.score * 1.25 ? best : previous;
}

export function freeThreads(server, ram, reserve) {
  return Math.max(0, Math.floor((server.maxRam - server.ramUsed -
    (server.hostname === "home" ? reserve : 0) + 1e-9) / ram));
}

/** Approximate complete-cycle revenue, including preparation and RAM-limited waves.
 * Inputs describe a minimum-security target and one-core workers. Not a guarantee.
 */
export function estimateTarget(m, capacity) {
  if (capacity < 1 || !(m.percent > 0) || !(m.growth > 0) || !(m.chance > 0)) return null;
  const waves = threads => Math.ceil(Math.max(0, threads) / capacity);
  const growCost = threads => {
    const rounds = waves(threads);
    return rounds * m.growTime + rounds * waves(Math.min(threads, capacity) * m.growSecurity / m.weaken) * m.weakenTime;
  };
  const prepGrow = Math.ceil(Math.log(m.maxMoney / Math.max(1, m.money)) * m.growth);
  const prepSeconds = waves(m.securityDebt / m.weaken) * m.currentWeakenTime + growCost(prepGrow);
  let best = null;
  for (const fraction of [0.05, 0.10, 0.20, 0.35, 0.50]) {
    const threads = Math.min(capacity, Math.max(1, Math.floor(fraction / m.percent)));
    const stolen = Math.min(0.90, threads * m.percent);
    const growThreads = Math.ceil(-Math.log1p(-stolen) * m.growth);
    const seconds = m.hackTime + waves(threads * m.hackSecurity / m.weaken) * m.weakenTime + growCost(growThreads);
    const steady = m.maxMoney * stolen * m.chance / Math.max(0.001, seconds);
    const score = steady * HORIZON / (HORIZON + prepSeconds);
    if (Number.isFinite(score) && (!best || score > best.score)) {
      best = {name: m.name, score, steady, prepSeconds, cycleSeconds: seconds, fraction, threads};
    }
  }
  return best;
}

function discover(ns) {
  const hosts = ["home"], seen = new Set(hosts);
  for (const host of hosts) for (const peer of ns.scan(host)) {
    if (!seen.has(peer)) { seen.add(peer); hosts.push(peer); }
  }
  return hosts.filter(h => h !== "darkweb");
}

function model(ns, s, capacity) {
  // Normalize live API measurements to minimum security. See the source links
  // in OPERATIONS.md for the game's time, security and growth relationships.
  const security = Math.max(1, s.hackDifficulty), min = Math.max(1, s.minDifficulty);
  if (security >= 100) return null;
  const ratio = (100 - min) / (100 - security);
  const timeRatio = (2.5 * s.requiredHackingSkill * min + 500) /
    (2.5 * s.requiredHackingSkill * security + 500);
  const growthRatio = Math.min(Math.log1p(0.03 / security), Math.log1p(0.0035)) /
    Math.min(Math.log1p(0.03 / min), Math.log1p(0.0035));
  return estimateTarget({name:s.hostname, maxMoney:s.moneyMax, money:s.moneyAvailable,
    percent: Math.min(1, ns.hackAnalyze(s.hostname) * ratio),
    chance: Math.min(1, ns.hackAnalyzeChance(s.hostname) * ratio),
    growth: ns.growthAnalyze(s.hostname, Math.E, 1) * growthRatio,
    hackTime: ns.getHackTime(s.hostname) * timeRatio / 1000,
    growTime: ns.getGrowTime(s.hostname) * timeRatio / 1000,
    weakenTime: ns.getWeakenTime(s.hostname) * timeRatio / 1000,
    currentWeakenTime: ns.getWeakenTime(s.hostname) / 1000,
    securityDebt: Math.max(0, security - min), weaken: ns.weakenAnalyze(1, 1),
    hackSecurity: ns.hackAnalyzeSecurity(1), growSecurity: ns.growthAnalyzeSecurity(1),
  }, capacity);
}

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  const mode=String(ns.args[0]??"auto"), reserve=Number(ns.args[1]??32);
  const fillerMode=String(ns.args[2]??"share");
  const lanes=mode==="auto"?Number(ns.args[3]??4):1;
  if(!Number.isFinite(reserve)||reserve<8)throw Error("Reserve must be at least 8 GB.");
  if(!["share","off"].includes(fillerMode))throw Error("Expected share or off.");
  if(!Number.isInteger(lanes)||lanes<1||lanes>8)throw Error("Use 1 to 8 targets.");
  if(ns.getHostname()!=="home")throw Error("Run cycle.js on home.");
  if(ns.ps('home').filter(p=>p.filename===ns.getScriptName()).length>1)throw Error("Only one controller may run.");
  if(mode!=="auto"&&!ns.serverExists(mode))throw Error("Unknown target: "+mode);
  const taskRam=ns.getScriptRam('task.js','home'),shareRam=ns.getScriptRam('share.js','home');
  if(!(taskRam>0)||fillerMode==='share'&&!(shareRam>0))throw Error("Missing workers.");
  const openers=[['BruteSSH.exe',h=>ns.brutessh(h)],['FTPCrack.exe',h=>ns.ftpcrack(h)],
    ['relaySMTP.exe',h=>ns.relaysmtp(h)],['HTTPWorm.exe',h=>ns.httpworm(h)],['SQLInject.exe',h=>ns.sqlinject(h)]];
  let shares=[],lastWrite=0,lastNetwork='',nextRefresh=0,ranked=[],capacity=0;
  const slots=Array.from({length:lanes},()=>({target:null,pids:[],phase:'waiting',selectedAt:0,completedHack:false,threads:0}));
  const release=()=>{for(const pid of shares)ns.kill(pid);shares=[];};
  ns.atExit(release);
  const report=async(force=false)=>{
    if(!force&&Date.now()-lastWrite<2000)return;
    lastWrite=Date.now(); const active=slots.filter(s=>s.target);
    const first=active[0]??{};
    await ns.write(STATUS,JSON.stringify({mode,target:first.target??null,phase:first.phase??'waiting',
      reason:'Independent target cycles; 25% switch threshold',controllerPid:ns.pid,updatedAt:lastWrite,
      reserve,capacityThreads:capacity,hackFraction:first.choice?.fraction??0,
      estimatedIncome:active.reduce((n,s)=>n+(s.choice?.score??0),0),
      workerThreads:active.reduce((n,s)=>n+s.threads,0),candidates:ranked.slice(0,5),
      targets:active.map(s=>({name:s.target,phase:s.phase,threads:s.threads,estimate:s.choice?.score??0,fraction:s.choice?.fraction??0}))}),'w');
  };
  // Stop only obsolete workers owned by this system; drain all existing tasks.
  const initial=discover(ns);
  for(const h of initial)for(const p of ns.ps(h))if(p.filename==='inicio.js'||p.filename==='share.js'&&p.args[0]===TAG)ns.kill(p.pid);
  const pending=initial.flatMap(h=>ns.ps(h).filter(p=>p.filename==='task.js'));
  // Keep reputation support alive while an update waits for old hacking work.
  if(pending.length&&fillerMode==='share'&&ns.getPlayer().factions.length)for(const host of initial){
    const s=ns.getServer(host);if(!s.hasAdminRights)continue;
    const threads=freeThreads(s,shareRam,reserve);if(!threads)continue;
    if(host!=='home'&&!await ns.scp('share.js',host,'home'))continue;
    const pid=ns.exec('share.js',host,threads,TAG,ns.pid);if(pid)shares.push(pid);
  }
  while(pending.some(p=>ns.isRunning(p.pid))){await report();await ns.sleep(250);}
  ns.tprint('Controller online: up to '+lanes+' independent targets. Home reserve '+reserve+' GB.');
  while(true){
    let changed=false;
    for(const s of slots)if(s.pids.length&&!s.pids.some(p=>ns.isRunning(p))){
      if(s.phase==='hack')s.completedHack=true;s.pids=[];s.threads=0;changed=true;
    }
    const hosts=discover(ns),network=hosts.join('|');
    const idle=slots.some(s=>!s.pids.length);
    if(changed||network!==lastNetwork||idle&&Date.now()>=nextRefresh){
      lastNetwork=network;nextRefresh=Date.now()+15000;release();
      const availableOpeners=openers.filter(([file])=>ns.fileExists(file,'home'));
      for(const h of hosts){const s=ns.getServer(h);if(!s.hasAdminRights&&s.numOpenPortsRequired<=availableOpeners.length){
        try{for(const [,open]of availableOpeners)open(h);ns.nuke(h);}catch(e){ns.print('Access failed: '+h+' '+e);}
      }}
      const pool=hosts.map(h=>ns.getServer(h)).filter(s=>s.hasAdminRights&&s.maxRam>=taskRam)
        .sort((a,b)=>b.cpuCores-a.cpuCores||b.maxRam-a.maxRam);
      const activeThreads=pool.reduce((n,s)=>n+ns.ps(s.hostname)
        .filter(p=>p.filename==='task.js').reduce((count,p)=>count+p.threads,0),0);
      capacity=pool.reduce((n,s)=>n+freeThreads(s,taskRam,reserve),0)+activeThreads;
      // Keep at least 25% of usable capacity available to faction sharing.
      const laneCap=Math.max(1,Math.floor(capacity*(fillerMode==='share'?.75:1)/lanes));
      const candidates=hosts.map(h=>ns.getServer(h)).filter(s=>s.hasAdminRights&&s.moneyMax>0&&s.serverGrowth>0&&s.requiredHackingSkill<=ns.getHackingLevel());
      ranked=candidates.map(s=>model(ns,s,laneCap)).filter(Boolean).sort((a,b)=>b.score-a.score);
      for(const slot of slots){
        if(slot.pids.length)continue;
        const excluded=new Set(slots.filter(s=>s!==slot).map(s=>s.target).filter(Boolean));
        const choices=ranked.filter(c=>!excluded.has(c.name));
        let choice=mode==='auto'?chooseTarget(choices,slot.target,slot.completedHack&&Date.now()-slot.selectedAt>=120000):choices.find(c=>c.name===mode);
        if(!choice&&mode!=='auto'&&candidates.some(s=>s.hostname===mode))choice={name:mode,fraction:.2};
        if(!choice){slot.target=null;slot.phase='waiting';continue;}
        if(choice.name!==slot.target){slot.selectedAt=Date.now();slot.completedHack=false;ns.print('SELECT '+choice.name+' estimate $'+Math.round(choice.score??0)+'/s');}
        slot.target=choice.name;slot.choice=choice;
        const target=ns.getServer(slot.target);
        let op='hack',remaining=Math.max(1,Math.floor(choice.fraction/Math.max(1e-12,ns.hackAnalyze(slot.target))));
        if(target.hackDifficulty>target.minDifficulty+.05){op='weaken';remaining=target.hackDifficulty-target.minDifficulty;}
        else if(target.moneyAvailable<target.moneyMax*.99){op='grow';remaining=Math.log(target.moneyMax/Math.max(1,target.moneyAvailable));}
        slot.phase=op;let assigned=0;
        for(const machine of pool){
          if(remaining<=1e-9||assigned>=laneCap)break;
          const current=ns.getServer(machine.hostname),available=Math.min(laneCap-assigned,freeThreads(current,taskRam,reserve));
          if(!available)continue;
          let effect=1;
          if(op==='weaken')effect=ns.weakenAnalyze(1,current.cpuCores);
          if(op==='grow')effect=1/ns.growthAnalyze(slot.target,Math.E,current.cpuCores);
          const threads=Math.min(available,effect>0?Math.ceil(remaining/effect):0);
          if(!(threads>0))continue;
          if(machine.hostname!=='home'&&!await ns.scp('task.js',machine.hostname,'home')){ns.print('Copy failed: '+machine.hostname);continue;}
          const pid=ns.exec('task.js',machine.hostname,threads,op,slot.target);
          if(!pid){ns.print('Launch failed: '+machine.hostname);continue;}
          slot.pids.push(pid);assigned+=threads;remaining-=threads*effect;
        }
        slot.threads=assigned;
        ns.print(op+' '+slot.target+' threads='+assigned+' money='+Math.round(target.moneyAvailable)+'/'+target.moneyMax);
      }
      if(fillerMode==='share'&&ns.getPlayer().factions.length)for(const machine of pool){
        const threads=freeThreads(ns.getServer(machine.hostname),shareRam,reserve);
        if(!threads)continue;
        if(machine.hostname!=='home'&&!await ns.scp('share.js',machine.hostname,'home'))continue;
        const pid=ns.exec('share.js',machine.hostname,threads,TAG,ns.pid);if(pid)shares.push(pid);
      }
      await report(true);
    }
    await report();await ns.sleep(1000);
  }
}
