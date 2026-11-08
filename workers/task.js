/** Execute one operation with all threads allocated by services/cycle.js.
 * @param {NS} ns
 */
export async function main(ns) {
  const [operation, target] = ns.args;
  if (typeof target !== "string") throw new Error("Expected a target hostname.");
  switch (operation) {
    case "weaken": await ns.weaken(target); break;
    case "grow": await ns.grow(target); break;
    case "hack": await ns.hack(target); break;
    default: throw new Error("Expected weaken, grow or hack.");
  }
}

