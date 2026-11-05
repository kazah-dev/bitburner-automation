/** Live, read-only operations dashboard. Usage: run monitor.js [refresh-ms]
 * Uses the supported tail UI; requires no DOM access or Singularity API.
 * @param {NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  if (ns.getHostname() !== "home") throw new Error("Run monitor.js from home.");
  if (ns.ps("home").filter(p => p.filename === ns.getScriptName()).length > 1) {
    throw new Error("Only one monitor may run at a time. Reopen it with tail monitor.js.");
  }
  const requested = Number(ns.args[0] ?? 2000);
  const refresh = Number.isFinite(requested) ? Math.max(1000, requested) : 2000;
  const started = Date.now();
  const reset = ns.getResetInfo();
  const samples = [];
  const cyan = "\u001b[36m", green = "\u001b[32m", yellow = "\u001b[33m", dim = "\u001b[90m", normal = "\u001b[0m";
  const compact = n => {
    if (!Number.isFinite(n)) return "--";
    const units = [[1e15,"q"],[1e12,"t"],[1e9,"b"],[1e6,"m"],[1e3,"k"]];
    const unit = units.find(([scale]) => Math.abs(n) >= scale);
    return unit ? (n / unit[0]).toFixed(2) + unit[1] : n.toFixed(2);
  };
  const money = n => "$" + compact(n);
  const pct = n => (Math.max(0, Math.min(1, n)) * 100).toFixed(1) + "%";
  const bar = n => { const k = Math.round(Math.max(0, Math.min(1, n)) * 20); return "[" + "#".repeat(k) + "-".repeat(20-k) + "]"; };
  const duration = ms => {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(seconds / 3600) + "h " + String(Math.floor(seconds / 60) % 60).padStart(2,"0") + "m " + String(seconds % 60).padStart(2,"0") + "s";
  };
  const programs = [
    ["BruteSSH.exe",500000], ["FTPCrack.exe",1500000], ["relaySMTP.exe",5000000],
    ["HTTPWorm.exe",30000000], ["SQLInject.exe",250000000],
  ];
  const gates = [["CyberSec","CSEC"],["NiteSec","avmnite-02h"],["The Black Hand","I.I.I.I"],["BitRunners","run4theh111z"]];
  ns.ui.openTail();
  const [width, height] = ns.ui.windowSize();
  ns.ui.resizeTail(Math.min(1160, width - 40), Math.min(890, height - 90));
  ns.ui.moveTail(Math.max(10, Math.min(270, width - 1180)), 35);
  ns.ui.setTailFontSize(14);
  while (true) {
    const now = Date.now();
    const player = ns.getPlayer();
    const paths = new Map([["home",["home"]]]);
    const hosts = ["home"];
    for (const host of hosts) for (const neighbor of ns.scan(host)) {
      if (!paths.has(neighbor)) { paths.set(neighbor,[...paths.get(host),neighbor]); hosts.push(neighbor); }
    }
    const servers = hosts.map(host => ({host, server:ns.getServer(host), processes:ns.ps(host)}));
    const home = servers.find(s => s.host === "home");
    const rooted = servers.filter(s => s.server.hasAdminRights && s.host !== "darkweb");
    const ramHosts = rooted.filter(s => s.server.maxRam > 0);
    const totalRam = ramHosts.reduce((n,s) => n + s.server.maxRam,0);
    const usedRam = ramHosts.reduce((n,s) => n + s.server.ramUsed,0);
    const processes = servers.flatMap(s => s.processes.map(p => ({...p, host:s.host})));
    const controllers = processes.filter(p => p.filename === "cycle.js");
    const workers = processes.filter(p => p.filename === "task.js");
    const activeTarget = controllers[0] ? String(controllers[0].args[0] ?? "sigma-cosmetics") : null;
    const target = servers.find(s => s.host === activeTarget)?.server;
    const operations = [...new Set(workers.map(p => String(p.args[0])))];
    const phase = operations.length ? operations.join(" + ").toUpperCase() : "BETWEEN PHASES";
    const threads = workers.reduce((n,p) => n+p.threads,0);
    const owned = programs.filter(([file]) => ns.fileExists(file,"home"));
    const nextProgram = programs.find(([file]) => !ns.fileExists(file,"home"));
    const contracts = servers.flatMap(s => ns.ls(s.host,".cct").map(file => ({host:s.host,file})));
    const income = ns.getTotalScriptIncome();
    const nodes = ns.hacknet.numNodes();
    let nodeRate = 0;
    for (let i=0; i<nodes; i++) nodeRate += ns.hacknet.getNodeStats(i).production;
    samples.push({time:now,cash:player.money});
    while (samples.length > 1 && samples[1].time < now - 60000) samples.shift();
    const elapsed = (now - samples[0].time) / 1000;
    const netRate = elapsed >= 5 ? (player.money-samples[0].cash)/elapsed : null;
    const lines = [];
    const line = text => lines.push(text);
    const section = title => { line(""); line(cyan + "  " + title + normal + dim + "  " + "─".repeat(Math.max(1,78-title.length)) + normal); };
    line(cyan + "  KAZAH  /  OPERATIONS MONITOR" + normal + "                 LIVE  •  " + new Date(now).toLocaleTimeString("en-GB"));
    line(dim + "  Read-only  |  Refresh " + (refresh/1000).toFixed(1) + "s  |  Session " + duration(now-started) + "  |  BitNode " + reset.currentNode + normal);
    section("OVERVIEW");
    line("  CASH " + green + money(player.money).padEnd(19) + normal + "HACK " + String(player.skills.hacking).padEnd(10) + "CITY " + player.city);
    line("  Script income (active avg) " + money(income[0]) + "/s     Since-reset avg " + money(income[1]) + "/s");
    line("  Cash flow (last " + Math.floor(elapsed) + "s, includes spending) " + (netRate === null ? "warming up" : money(netRate)+"/s") + "     Hacknet " + money(nodeRate) + "/s (" + nodes + " nodes)");
    line("  HP " + player.hp.current.toFixed(1) + "/" + player.hp.max + "   STR " + player.skills.strength + "   DEF " + player.skills.defense + "   DEX " + player.skills.dexterity + "   AGI " + player.skills.agility + "   CHA " + player.skills.charisma);
    section("AUTOMATION & TARGET");
    line("  Controller " + (controllers.length === 1 ? green+"ONLINE" : yellow+(controllers.length ? "MULTIPLE CONTROLLERS" : "OFFLINE")) + normal + "   Target " + (activeTarget ?? "none") + "   Phase " + phase);
    line("  Workers " + workers.length + "   Active threads " + threads + "   All processes " + processes.length);
    if (target) {
      const fill = target.moneyMax > 0 ? target.moneyAvailable/target.moneyMax : 0;
      line("  Target money " + bar(fill) + " " + pct(fill) + "   " + money(target.moneyAvailable) + " / " + money(target.moneyMax));
      line("  Security " + target.hackDifficulty.toFixed(2) + " / min " + target.minDifficulty.toFixed(2) + "   Excess +" + Math.max(0,target.hackDifficulty-target.minDifficulty).toFixed(2));
      line("  Duration estimates  H " + duration(ns.getHackTime(activeTarget)) + "   G " + duration(ns.getGrowTime(activeTarget)) + "   W " + duration(ns.getWeakenTime(activeTarget)));
    } else line(yellow + "  No managed target detected. Start cycle.js to enable target tracking." + normal);
    section("NETWORK & CAPACITY");
    line("  Rooted " + rooted.length + "/" + hosts.filter(h=>h!=="darkweb").length + "   RAM hosts " + ramHosts.length + "   Openers " + owned.length + "/5   Contracts " + contracts.length);
    line("  Network RAM " + bar(totalRam ? usedRam/totalRam : 0) + " " + compact(usedRam) + " / " + compact(totalRam) + " GB used");
    line("  Home " + home.server.maxRam + " GB   Free " + (home.server.maxRam-home.server.ramUsed).toFixed(2) + " GB   Monitor " + ns.getScriptRam(ns.getScriptName(),"home").toFixed(2) + " GB");
    line("  Programs " + programs.map(([file]) => (ns.fileExists(file,"home") ? green+"✓ " : dim+"· ")+file.replace(".exe","")+normal).join("  "));
    const busiest = ramHosts.slice().sort((a,b)=>b.server.ramUsed-a.server.ramUsed).slice(0,4);
    line("  Busiest " + busiest.map(s=>s.host+" "+s.server.ramUsed.toFixed(0)+"/"+s.server.maxRam+"GB").join("  |  "));
    section("FACTIONS & NEXT UNLOCKS");
    line("  Memberships: " + (player.factions.join(", ") || "none"));
    for (const [faction,host] of gates) {
      const gate = servers.find(s=>s.host===host)?.server;
      if (!gate) continue;
      const joined = player.factions.includes(faction);
      const ready = player.skills.hacking >= gate.requiredHackingSkill && gate.hasAdminRights;
      line("  " + faction.padEnd(15) + " Lv " + String(gate.requiredHackingSkill).padEnd(5) + "Root " + (gate.hasAdminRights?"YES":"NO ") + "   Backdoor " + (gate.backdoorInstalled?"YES":"NO ") + "   " + (joined ? green+"JOINED" : gate.backdoorInstalled ? yellow+"CHECK INVITATIONS" : ready ? yellow+"BACKDOOR READY" : "LOCKED") + normal);
    }
    if (nextProgram) line((player.money>=nextProgram[1] ? green : yellow) + "  NEXT: " + nextProgram[0] + "  " + money(nextProgram[1]) + "  " + bar(player.money/nextProgram[1]) + "  " + (player.money>=nextProgram[1]?"AFFORDABLE":"Need "+money(nextProgram[1]-player.money)) + normal);
    else line(green + "  All five port-opening programs acquired." + normal);
    line(dim + "  Faction work, exact reputation & queued augmentations: use Factions / Augmentations." + normal);
    if (contracts.length) line(yellow + "  CONTRACTS: " + contracts.slice(0,3).map(c=>c.host+" / "+c.file).join(" | ") + (contracts.length>3?" (+"+(contracts.length-3)+" more)":"") + normal);
    line(dim + "  Durations are current estimates. Script averages are not a forecast. Close hides; Stop ends." + normal);
    ns.clearLog();
    ns.print(lines.join("\n"));
    ns.ui.setTailTitle("Kazah | " + money(player.money) + " | H " + player.skills.hacking + " | " + phase);
    await ns.sleep(refresh);
  }
}
