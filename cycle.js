/** Adaptive sequential hacking with reclaimable faction-sharing workers.
 * Usage: run cycle.js [auto|hostname] [home-reserve-GB=16] [share|off]
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
  const mode = String(ns.args[0] ?? "auto");
  const reserve = Number(ns.args[1] ?? 16);
  const fillerMode = String(ns.args[2] ?? "share");
  if (!Number.isFinite(reserve) || reserve < 8) throw new Error("Reserve must be at least 8 GB.");
  if (!["share", "off"].includes(fillerMode)) throw new Error("Filler mode must be share or off.");
  if (ns.getHostname() !== "home") throw new Error("Run cycle.js on home.");
  if (ns.ps("home").filter(p => p.filename === ns.getScriptName()).length > 1) {
    throw new Error("Only one cycle.js controller may run.");
  }
  const taskRam = ns.getScriptRam("task.js", "home"), shareRam = ns.getScriptRam("share.js", "home");
  if (!(taskRam > 0)) throw new Error("Missing task.js on home.");
  if (fillerMode === "share" && !(shareRam > 0)) throw new Error("Missing share.js on home (or use off).");
  if (mode !== "auto" && !ns.serverExists(mode)) throw new Error("Unknown target: " + mode);
  const openerDefs = [
    ["BruteSSH.exe", h => ns.brutessh(h)], ["FTPCrack.exe", h => ns.ftpcrack(h)],
    ["relaySMTP.exe", h => ns.relaysmtp(h)], ["HTTPWorm.exe", h => ns.httpworm(h)],
    ["SQLInject.exe", h => ns.sqlinject(h)],
  ];
  let target = null, selectedAt = 0, completedHack = false, initialized = false;
  let ownedShares = [], lastStatus = 0, state = {mode, phase:"waiting", target:null};
  const release = () => { for (const pid of ownedShares) ns.kill(pid); ownedShares = []; };
  ns.atExit(release);
  const report = async (force = false) => {
    if (!force && Date.now() - lastStatus < 5000) return;
    lastStatus = Date.now();
    await ns.write(STATUS, JSON.stringify({...state, controllerPid:ns.pid, updatedAt:lastStatus}), "w");
  };
  ns.tprint("Adaptive controller online (" + mode + "). See log and Operations desk.");
  while (true) {
    const hosts = discover(ns);
    const openers = openerDefs.filter(([file]) => ns.fileExists(file, "home"));
    for (const host of hosts) {
      const s = ns.getServer(host);
      if (!s.hasAdminRights && s.numOpenPortsRequired <= openers.length) {
        try { for (const [,open] of openers) open(host); ns.nuke(host); }
        catch (error) { ns.print("Access failed on " + host + ": " + String(error)); }
      }
      if (!initialized) for (const p of ns.ps(host)) {
        if (p.filename === "inicio.js" || (p.filename === "share.js" && p.args[0] === TAG)) ns.kill(p.pid);
      }
    }
    initialized = true;
    release();
    // Adopt outstanding task.js work rather than killing useful progress on restart.
    const pending = hosts.flatMap(h => ns.ps(h).filter(p => p.filename === "task.js"));
    state = {...state, phase:"waiting"};
    while (pending.some(p => ns.isRunning(p.pid))) { await report(); await ns.sleep(200); }
    const pool = hosts.map(h => ns.getServer(h)).filter(s => s.hasAdminRights && s.maxRam >= taskRam)
      .sort((a,b) => b.cpuCores - a.cpuCores || b.maxRam - a.maxRam);
    const capacity = pool.reduce((n,s) => n + freeThreads(s, taskRam, reserve), 0);
    if (!capacity) { state = {...state,phase:"waiting",reason:"Waiting for worker RAM"}; await report(true); await ns.sleep(5000); continue; }
    const candidates = hosts.map(h => ns.getServer(h)).filter(s => s.hasAdminRights && s.moneyMax > 0 &&
      s.serverGrowth > 0 && s.requiredHackingSkill <= ns.getHackingLevel());
    const ranked = candidates.map(s => model(ns,s,capacity)).filter(Boolean).sort((a,b) => b.score - a.score);
    const previous = target;
    let choice = mode === "auto" ? chooseTarget(ranked,target,completedHack && Date.now()-selectedAt >= 120000) : ranked.find(x => x.name === mode);
    if (!choice && mode !== "auto" && candidates.some(s => s.hostname === mode)) choice = {name:mode,fraction:0.20};
    if (!choice) { state = {...state,target:null,phase:"waiting",reason:"No eligible money target"}; await report(true); await ns.sleep(5000); continue; }
    target = choice.name;
    if (target !== previous) {
      selectedAt = Date.now(); completedHack = false;
      ns.print("SELECT " + target + " estimated=$" + Math.round(choice.score ?? 0) + "/s including preparation");
    }
    const s = ns.getServer(target);
    let operation = "hack", remaining = Math.max(1, Math.floor(choice.fraction / Math.max(1e-12,ns.hackAnalyze(target))));
    if (s.hackDifficulty > s.minDifficulty + 0.05) { operation = "weaken"; remaining = s.hackDifficulty-s.minDifficulty; }
    else if (s.moneyAvailable < s.moneyMax * 0.99) { operation = "grow"; remaining = Math.log(s.moneyMax/Math.max(1,s.moneyAvailable)); }
    const pids = []; let allocated = 0;
    for (const machine of pool) {
      if (remaining <= 1e-9) break;
      const host = machine.hostname, current = ns.getServer(host);
      const available = freeThreads(current,taskRam,reserve);
      if (!available) continue;
      let effect = 1;
      if (operation === "weaken") effect = ns.weakenAnalyze(1,current.cpuCores);
      if (operation === "grow") effect = 1/ns.growthAnalyze(target,Math.E,current.cpuCores);
      const required = effect > 0 ? Math.ceil(remaining/effect) : 0;
      const threads = Math.min(available,required);
      if (!(threads > 0)) continue;
      if (host !== "home" && !await ns.scp("task.js",host,"home")) { ns.print("Copy failed: "+host); continue; }
      const pid = ns.exec("task.js",host,threads,operation,target);
      if (!pid) { ns.print("Launch failed: "+host); continue; }
      pids.push(pid); allocated += threads; remaining -= threads*effect;
    }
    state = {mode,target,phase:operation,reason:mode === "auto" ? "Cycle cost + preparation; 25% switch threshold" : "Pinned target",
      estimatedIncome:choice.score ?? null, hackFraction:choice.fraction, capacityThreads:capacity,
      workerThreads:allocated, candidates:ranked.slice(0,3), reserve};
    ns.print(operation+" target="+target+" threads="+allocated+" money="+Math.round(s.moneyAvailable)+"/"+s.moneyMax+" security="+s.hackDifficulty.toFixed(3));
    // Sharing is interruptible: only tagged filler is reclaimed before the next phase.
    if (pids.length && fillerMode === "share" && ns.getPlayer().factions.length) for (const machine of pool) {
      const host=machine.hostname, threads=freeThreads(ns.getServer(host),shareRam,reserve);
      if (!threads) continue;
      if (host !== "home" && !await ns.scp("share.js",host,"home")) continue;
      const pid=ns.exec("share.js",host,threads,TAG,ns.pid);
      if (pid) ownedShares.push(pid);
    }
    await report(true);
    if (!pids.length) { await ns.sleep(5000); continue; }
    while (pids.some(pid => ns.isRunning(pid))) { await report(); await ns.sleep(200); }
    if (operation === "hack") completedHack = true;
    await ns.sleep(50);
  }
}
