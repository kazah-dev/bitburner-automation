/** Bounded concurrency check; also meets the 1,000-script achievement condition.
 * Usage: run tools/concurrency.js [apply]
 * Needs 1,600 GB of home RAM after reclaiming cycle-owned shares, plus 32 GB spare.
 * Preview is the default. Never stops farming tasks or unrelated processes.
 * Creates a small, self-expiring helper and cleans up only its own worker PIDs.
 */
const WORKER = "workers/concurrency-wait.js";
const SOURCE = "export async function main(ns) { await ns.sleep(60000); }\n";
const COUNT = 1000;
export async function main(ns) {
  ns.disableLog("ALL");
  if (ns.getHostname() !== "home") throw Error("Run this tool on home.");
  const mode = String(ns.args[0] ?? "preview");
  if (!["preview", "apply"].includes(mode)) throw Error("Use preview or apply.");
  if (ns.ps("home").filter(p => p.filename === ns.getScriptName()).length > 1)
    throw Error("Only one concurrency check may run.");
  const shares = ns.ps("home").filter(p => p.filename === "workers/share.js" && p.args[0] === "cycle-fill");
  const reclaimed = shares.reduce((total, p) => total + p.threads * ns.getScriptRam(p.filename, "home"), 0);
  const free = ns.getServerMaxRam("home") - ns.getServerUsedRam("home") + reclaimed - 32;
  ns.tprint(`Concurrency check: ${COUNT} workers, 1,600 GB required; ${free.toFixed(1)} GB available after reclaiming managed shares.`);
  if (free < COUNT * 1.6) throw Error("Insufficient RAM; no processes changed.");
  if (mode !== "apply") { ns.tprint("Preview only. Add apply to run the 20-second check."); return; }
  if (ns.fileExists(WORKER, "home") && ns.read(WORKER) !== SOURCE)
    throw Error("Helper path is occupied by different content; no processes changed.");
  await ns.write(WORKER, SOURCE, "w");
  const ram = ns.getScriptRam(WORKER, "home");
  if (!(ram > 0) || free < COUNT * ram) throw Error("Worker RAM preflight failed.");
  const pids = [];
  const cleanup = () => { for (const pid of pids) ns.kill(pid); };
  ns.atExit(cleanup);
  try {
    for (const p of shares) ns.kill(p.pid);
    for (let i = 0; i < COUNT; i++) {
      const pid = ns.exec(WORKER, "home", 1, ns.pid, i);
      if (!pid) throw Error(`Launch stopped at ${pids.length}; cleaning up owned workers.`);
      pids.push(pid);
    }
    ns.tprint(`${pids.length} workers running together for 20 seconds. Check Achievements afterwards.`);
    await ns.sleep(20000);
  } finally { cleanup(); }
  ns.tprint("Concurrency check complete. Temporary workers stopped; the controller will reuse the RAM.");
}
