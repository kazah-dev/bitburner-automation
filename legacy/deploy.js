/** Discover accessible servers and deploy the existing no-argument worker.
 * @param {NS} ns
 */
export async function main(ns) {
  const worker = "legacy/inicio.js";
  if (ns.ps("home").some(p => p.filename === "services/cycle.js")) {
    ns.tprint("Stop services/cycle.js before using legacy deployment.");
    return;
  }
  if (ns.getHostname() !== "home") {
    ns.tprint("Run legacy/deploy.js from home.");
    return;
  }
  const workerRam = ns.getScriptRam(worker, "home");
  if (workerRam <= 0) {
    ns.tprint("Missing worker: legacy/inicio.js on home.");
    return;
  }

  const openers = [
    ["BruteSSH.exe", host => ns.brutessh(host)],
    ["FTPCrack.exe", host => ns.ftpcrack(host)],
    ["relaySMTP.exe", host => ns.relaysmtp(host)],
    ["HTTPWorm.exe", host => ns.httpworm(host)],
    ["SQLInject.exe", host => ns.sqlinject(host)],
  ].filter(([program]) => ns.fileExists(program, "home"));
  const servers = ["home"];
  const discovered = new Set(servers);
  for (const host of servers) {
    for (const neighbor of ns.scan(host)) {
      if (!discovered.has(neighbor)) {
        discovered.add(neighbor);
        servers.push(neighbor);
      }
    }
  }

  let launched = 0;
  let threadsAdded = 0;
  for (const host of servers) {
    if (host === "home" || host === "darkweb") continue;
    if (!ns.hasRootAccess(host)) {
      if (ns.getServerNumPortsRequired(host) > openers.length) continue;
      try {
        for (const [, openPort] of openers) openPort(host);
        ns.nuke(host);
      } catch (error) {
        ns.tprint("Access failed on " + host + ": " + String(error));
        continue;
      }
    }
    if (ns.isRunning(worker, host)) continue;
    const freeRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
    const threads = Math.floor(freeRam / workerRam);
    if (threads < 1) continue;
    if (!ns.fileExists(worker, host) && !await ns.scp(worker, host, "home")) {
      ns.tprint("Copy failed on " + host);
      continue;
    }
    const pid = ns.exec(worker, host, threads);
    if (pid === 0) {
      ns.tprint("Launch failed on " + host + ". Retry after checking free RAM.");
      continue;
    }
    launched++;
    threadsAdded += threads;
    ns.tprint(host + ": started " + threads + " threads (PID " + pid + ").");
  }
  ns.tprint("Discovered " + servers.length + " hosts. Started " + launched +
    " workers with " + threadsAdded + " additional threads.");
}

