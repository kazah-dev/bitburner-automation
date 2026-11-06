/** One-shot cloud capacity purchase with spending and cash-reserve limits.
 * Usage: run fleet.js [GB=1024] [desired-count=1] [budget=60000000]
 *                    [cash-reserve=90000000] [preview|apply]
 * Names are kazah-01, kazah-02, ... Existing names are never modified.
 * @param {NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  if (ns.getHostname() !== "home") throw new Error("Run fleet.js on home.");
  if (ns.ps("home").filter(p=>p.filename===ns.getScriptName()).length>1) throw new Error("Only one fleet planner may run.");
  const ram=Number(ns.args[0]??1024), count=Number(ns.args[1]??1);
  const budget=Number(ns.args[2]??60000000), reserve=Number(ns.args[3]??90000000);
  const mode=String(ns.args[4]??"preview");
  if (!Number.isSafeInteger(ram) || ram<2 || !Number.isInteger(Math.log2(ram)) || ram>ns.cloud.getRamLimit()) throw new Error("RAM must be an allowed power of two.");
  if (!Number.isInteger(count) || count<1 || count>ns.cloud.getServerLimit()) throw new Error("Invalid desired server count.");
  if (![budget,reserve].every(n=>Number.isFinite(n)&&n>=0) || !["preview","apply"].includes(mode)) throw new Error("Invalid budget, reserve or mode.");
  let spent=0, purchased=0, slots=ns.cloud.getServerLimit()-ns.cloud.getServerNames().length;
  const initialCash=ns.getServerMoneyAvailable("home");
  for (let i=1;i<=count;i++) {
    const name="kazah-"+String(i).padStart(2,"0");
    if (ns.serverExists(name)) { ns.tprint("SKIP "+name+": name already exists; unchanged."); continue; }
    const cost=ns.cloud.getServerCost(ram);
    const cash=mode==="apply"?ns.getServerMoneyAvailable("home"):initialCash-spent;
    if (!slots || !Number.isFinite(cost) || cost>budget-spent || cash-cost<reserve) {
      ns.tprint("STOP: server limit, spending cap or cash reserve reached."); break;
    }
    if (mode==="apply") {
      const actual=ns.cloud.purchaseServer(name,ram);
      if (!actual) { ns.tprint("STOP: purchase failed; no further orders placed."); break; }
      ns.tprint("PURCHASED "+actual+" | "+ram+" GB | $"+cost);
    } else ns.tprint("PLAN "+name+" | "+ram+" GB | $"+cost);
    spent+=cost; purchased++; slots--;
  }
  ns.tprint(mode.toUpperCase()+": "+purchased+" server(s), $"+spent+" total. Cash reserve: $"+reserve+".");
  ns.tprint("cycle.js discovers added capacity at its next phase. External purchases can affect the cash reserve.");
}
