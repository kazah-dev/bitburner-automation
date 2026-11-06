/** Invest a bounded budget in Hacknet upgrades with a payback estimate.
 * Usage: run hacknet.js 500000
 * Caps spending at 10% of the current balance and ignores paybacks over 30 minutes.
 * @param {NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  const requested = Number(ns.args[0] ?? 500000);
  if (!Number.isFinite(requested) || requested <= 0) throw new Error("Budget must be positive.");
  const budget = Math.min(requested, ns.getServerMoneyAvailable("home") * 0.10);
  let spent = 0;
  let purchases = 0;
  while (spent < budget) {
    const nodes = Array.from({length: ns.hacknet.numNodes()}, (_, i) => ns.hacknet.getNodeStats(i));
    let baseProduction = 1.5;
    if (nodes.length > 0) {
      const n = nodes[0];
      if ("hashCapacity" in n) throw new Error("Only money-producing Hacknet Nodes are supported.");
      baseProduction = n.production / (n.level * Math.pow(1.035, n.ram - 1) * (n.cores + 5) / 6);
    }
    const choices = [{
      cost: ns.hacknet.getPurchaseNodeCost(),
      gain: baseProduction,
      buy: () => ns.hacknet.purchaseNode() >= 0,
    }];
    nodes.forEach((n, i) => {
      choices.push(
        {cost: ns.hacknet.getLevelUpgradeCost(i, 1), gain: n.production / n.level,
         buy: () => ns.hacknet.upgradeLevel(i, 1)},
        {cost: ns.hacknet.getRamUpgradeCost(i, 1), gain: n.production * (Math.pow(1.035, n.ram) - 1),
         buy: () => ns.hacknet.upgradeRam(i, 1)},
        {cost: ns.hacknet.getCoreUpgradeCost(i, 1), gain: n.production / (n.cores + 5),
         buy: () => ns.hacknet.upgradeCore(i, 1)}
      );
    });
    const affordable = choices.filter(c => Number.isFinite(c.cost) && c.cost > 0 &&
      c.cost <= budget - spent && c.gain > 0 && c.cost / c.gain <= 1800);
    affordable.sort((a, b) => a.cost / a.gain - b.cost / b.gain);
    const next = affordable[0];
    if (!next || !next.buy()) break;
    spent += next.cost;
    purchases++;
    await ns.sleep(0);
  }
  let production = 0;
  for (let i = 0; i < ns.hacknet.numNodes(); i++) production += ns.hacknet.getNodeStats(i).production;
  ns.tprint("Hacknet: " + purchases + " purchases, $" + Math.round(spent) +
    " invested, " + ns.hacknet.numNodes() + " nodes, $" + production.toFixed(2) + "/sec.");
}

