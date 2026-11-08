/** Read-only network inventory and rough current-state target ranking.
 * Score estimates gross hack income per thread per second and excludes preparation.
 * @param {NS} ns
 */
export async function main(ns) {
  const paths = new Map([["home", ["home"]]]);
  const hosts = ["home"];
  for (const host of hosts) {
    for (const neighbor of ns.scan(host)) {
      if (!paths.has(neighbor)) {
        paths.set(neighbor, [...paths.get(host), neighbor]);
        hosts.push(neighbor);
      }
    }
  }
  const candidates = [];
  for (const host of hosts) {
    const server = ns.getServer(host);
    const files = ns.ls(host, ".cct");
    for (const file of files) ns.tprint("CONTRACT " + host + " " + file + " route=" + paths.get(host).map(name => "connect " + name).join("; "));
    if (["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z"].includes(host)) {
      ns.tprint("FACTION " + host + " skill=" + server.requiredHackingSkill +
        " backdoor=" + server.backdoorInstalled + " route=" +
        paths.get(host).map(name => "connect " + name).join("; "));
    }
    if (!server.hasAdminRights) {
      ns.tprint("ACCESS " + host + " ports=" + server.numOpenPortsRequired +
        " RAM=" + server.maxRam);
    }
    if (server.hasAdminRights && server.moneyMax > 0 &&
        server.requiredHackingSkill <= ns.getHackingLevel()) {
      const score = server.moneyMax * ns.hackAnalyze(host) *
        ns.hackAnalyzeChance(host) / (ns.getHackTime(host) / 1000);
      candidates.push({host, score, maxMoney: server.moneyMax});
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const target of candidates.slice(0, 12)) ns.tprint("TARGET " + JSON.stringify(target));
}

