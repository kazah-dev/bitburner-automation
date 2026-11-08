const solvers = new Map([
  ["Algorithmic Stock Trader I", stockProfit],
  ["Encryption I: Caesar Cipher", caesarCipher],
  ["Find Largest Prime Factor", largestPrimeFactor],
  ["Subarray with Maximum Sum", maximumSubarray],
  ["Total Ways to Sum", totalWaysToSum],
]);

/** Unordered integer partitions, excluding the single-part partition. */
export function totalWaysToSum(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1000) return;
  const ways = Array(value + 1).fill(0);
  ways[0] = 1;
  for (let part = 1; part < value; part++) {
    for (let sum = part; sum <= value; sum++) {
      ways[sum] += ways[sum - part];
      if (!Number.isSafeInteger(ways[sum])) return;
    }
  }
  return ways[value];
}

export function maximumSubarray(values) {
  if (!Array.isArray(values) || !values.length || !values.every(Number.isSafeInteger)) return;
  let current = values[0], best = current;
  for (const value of values.slice(1)) {
    current = Math.max(value, current + value);
    if (!Number.isSafeInteger(current)) return;
    best = Math.max(best, current);
  }
  return best;
}

function stockProfit(prices) {
  if (!Array.isArray(prices) || !prices.length || !prices.every(Number.isSafeInteger)) return;
  let lowest = prices[0];
  let profit = 0;
  for (const price of prices) {
    profit = Math.max(profit, price - lowest);
    lowest = Math.min(lowest, price);
  }
  return profit;
}

function caesarCipher(data) {
  if (!Array.isArray(data) || data.length !== 2) return;
  const [message, shift] = data;
  if (typeof message !== "string" || !/^[A-Z ]+$/.test(message) || !Number.isSafeInteger(shift)) return;
  return message.replace(/[A-Z]/g, letter =>
    String.fromCharCode(65 + (letter.charCodeAt(0) - 65 - shift % 26 + 26) % 26));
}

function largestPrimeFactor(value) {
  if (!Number.isSafeInteger(value) || value < 2) return;
  let remainder = value;
  let largest = 1;
  for (let divisor = 2; divisor <= remainder / divisor; divisor += divisor === 2 ? 1 : 2) {
    while (remainder % divisor === 0) {
      largest = divisor;
      remainder /= divisor;
    }
  }
  return Math.max(largest, remainder);
}

/** @param {NS} ns */
export async function main(ns) {
  if (ns.getHostname() !== "home" || ns.args.length) {
    ns.tprint("Start one copy on home: run services/contracts.js");
    return;
  }
  ns.disableLog("ALL");
  if (ns.ps("home").filter(p => p.filename === ns.getScriptName()).length > 1) {
    ns.tprint("A contract scanner is already running.");
    return;
  }
  const rejectedFile = "data/contracts-rejected.txt";
  const rejected = new Set(ns.read(rejectedFile).split("\n").filter(Boolean));
  while (true) {
    const hosts = new Set(["home"]);
    let solved = 0;
    let pending = 0;
    for (const host of hosts) {
      for (const peer of ns.scan(host)) hosts.add(peer);
      for (const file of ns.ls(host, ".cct").filter(name => name.endsWith(".cct"))) {
        const key = host + "/" + file;
        try {
          const type = ns.codingcontract.getContractType(file, host);
          const solve = solvers.get(type);
          if (!solve || rejected.has(key)) {
            pending++;
            continue;
          }
          const answer = solve(ns.codingcontract.getData(file, host));
          if (answer === undefined) {
            pending++;
            continue;
          }
          const reward = ns.codingcontract.attempt(answer, file, host);
          if (reward) {
            solved++;
            ns.tprint(key + " | " + type + " | " + reward);
          } else {
            rejected.add(key);
            await ns.write(rejectedFile, key + "\n", "a");
            pending++;
            ns.tprint(key + " | Answer rejected. Further attempts disabled.");
          }
        } catch (error) {
          ns.print(key + " | " + String(error));
        }
      }
    }
    ns.print(new Date().toLocaleTimeString() + " | Hosts: " + hosts.size +
      " | Solved: " + solved + " | Left for review: " + pending);
    await ns.sleep(60000);
  }
}
