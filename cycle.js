/** Coordinate sequential network-wide preparation and capped hacking phases.
 * Usage: run cycle.js sigma-cosmetics
 * Requires task.js on home. Owns task.js processes and replaces inicio.js workers.
 * Stops only inicio.js workers during startup. Other scripts are preserved.
 * @param {NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  const target = String(ns.args[0] ?? "sigma-cosmetics");
  const task = "task.js";
  if (ns.getHostname() !== "home") throw new Error("Run cycle.js from home.");
  if (ns.ps("home").filter(p => p.filename === ns.getScriptName()).length > 1) {
    throw new Error("Only one cycle.js controller may run at a time.");
  }
  const targetServer = ns.getServer(target);
  if (!targetServer.hasAdminRights || targetServer.moneyMax <= 0 ||
      targetServer.requiredHackingSkill > ns.getHackingLevel()) {
    throw new Error("Target must have root access, money and a reachable hacking level.");
  }
  const taskRam = ns.getScriptRam(task, "home");
  if (taskRam <= 0) throw new Error("Missing task.js on home.");
  const openers = [
    ["BruteSSH.exe", h => ns.brutessh(h)],
    ["FTPCrack.exe", h => ns.ftpcrack(h)],
    ["relaySMTP.exe", h => ns.relaysmtp(h)],
    ["HTTPWorm.exe", h => ns.httpworm(h)],
    ["SQLInject.exe", h => ns.sqlinject(h)],
  ].filter(([file]) => ns.fileExists(file, "home"));
  let initialized = false;
  ns.tprint("Coordinating network against " + target + ". See script log for phase reports.");
  while (true) {
    const hosts = ["home"];
    const seen = new Set(hosts);
    for (const host of hosts) {
      for (const neighbor of ns.scan(host)) {
        if (!seen.has(neighbor)) { seen.add(neighbor); hosts.push(neighbor); }
      }
    }
    const pool = [];
    for (const host of hosts) {
      if (host === "home" || host === "darkweb") continue;
      let server = ns.getServer(host);
      if (!server.hasAdminRights && server.numOpenPortsRequired <= openers.length) {
        try {
          for (const [, open] of openers) open(host);
          ns.nuke(host);
          server = ns.getServer(host);
        } catch (error) {
          ns.print("Access failed on " + host + ": " + String(error));
        }
      }
      if (!server.hasAdminRights || server.maxRam < taskRam) continue;
      if (!initialized) {
        for (const process of ns.ps(host)) {
          if (process.filename === "inicio.js") ns.kill(process.pid);
        }
      }
      pool.push(host);
    }
    initialized = true;
    const pending = pool.flatMap(host => ns.ps(host).filter(p => p.filename === task));
    while (pending.some(p => ns.isRunning(p.pid))) await ns.sleep(200);

    const server = ns.getServer(target);
    let operation = "hack";
    let budget = Math.max(1, Math.floor(0.20 / Math.max(ns.hackAnalyze(target), 0.000001)));
    if (server.hackDifficulty > server.minDifficulty + 0.10) {
      operation = "weaken"; budget = Infinity;
    } else if (server.moneyAvailable < server.moneyMax * 0.99) {
      operation = "grow"; budget = Infinity;
    }
    const pids = [];
    let allocated = 0;
    for (const host of pool) {
      if (budget <= 0) break;
      const current = ns.getServer(host);
      const threads = Math.min(budget, Math.floor((current.maxRam - current.ramUsed) / taskRam));
      if (threads < 1) continue;
      if (!await ns.scp(task, host, "home")) {
        ns.print("Copy failed on " + host); continue;
      }
      const pid = ns.exec(task, host, threads, operation, target);
      if (pid === 0) { ns.print("Launch failed on " + host); continue; }
      pids.push(pid); allocated += threads; budget -= threads;
    }
    ns.print(operation + " target=" + target + " threads=" + allocated +
      " money=" + Math.round(server.moneyAvailable) + "/" + server.moneyMax +
      " security=" + server.hackDifficulty.toFixed(3));
    if (pids.length === 0) { await ns.sleep(5000); continue; }
    while (pids.some(pid => ns.isRunning(pid))) await ns.sleep(200);
    await ns.sleep(50);
  }
}

