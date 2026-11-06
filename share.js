/** Share spare home RAM to increase faction reputation gain.
 * Usage: run share.js -t 2
 * @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  const managed = ns.args[0] === "cycle-fill";
  const owner = Number(ns.args[1]);
  if (managed && (!Number.isInteger(owner) || owner <= 0)) throw new Error("Invalid controller PID.");
  while (!managed || ns.isRunning(owner)) await ns.share();
}

