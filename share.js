/** Share spare home RAM to increase faction reputation gain.
 * Usage: run share.js -t 2
 * @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  while (true) await ns.share();
}

