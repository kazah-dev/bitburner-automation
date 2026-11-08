/** @param {NS} ns */
export async function main(ns) {
  const objetivo = "n00dles";
  const seguridadMinima = ns.getServerMinSecurityLevel(objetivo);
  const dineroMaximo = ns.getServerMaxMoney(objetivo);
  while (true) {
    if (ns.getServerSecurityLevel(objetivo) > seguridadMinima + 3) {
      await ns.weaken(objetivo);
    } else if (ns.getServerMoneyAvailable(objetivo) < dineroMaximo * 0.75) {
      await ns.grow(objetivo);
    } else {
      await ns.hack(objetivo);
    }
  }
}

