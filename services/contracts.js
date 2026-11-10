export const solvers = new Map([
  ["Algorithmic Stock Trader I", stockProfit],
  ["Encryption I: Caesar Cipher", caesarCipher],
  ["Find Largest Prime Factor", largestPrimeFactor],
  ["Subarray with Maximum Sum", maximumSubarray],
  ["Total Ways to Sum", totalWaysToSum],
  ["Total Ways to Sum II", coinWays],
  ["Algorithmic Stock Trader II", stockUnlimited],
  ["Algorithmic Stock Trader III", values=>stockLimited(2,values)],
  ["Algorithmic Stock Trader IV", ([k,values])=>stockLimited(k,values)],
  ["Array Jumping Game", values=>Number(values.length===1||jumpCount(values)>0)],
  ["Array Jumping Game II", jumpCount],
  ["Compression I: RLE Compression", rle],
  ["Compression II: LZ Decompression", decompress],
  ["Encryption II: Vigenère Cipher", vigenere],
  ["Generate IP Addresses", ipAddresses],
  ["Merge Overlapping Intervals", mergeIntervals],
  ["Minimum Path Sum in a Triangle", trianglePath],
  ["Spiralize Matrix", spiral],
  ["Square Root", squareRoot],
  ["Total Number of Primes", primeCount],
  ["Unique Paths in a Grid I", ([rows,cols])=>gridPaths(Array.from({length:rows},()=>Array(cols).fill(0)))],
  ["Unique Paths in a Grid II", gridPaths],
]);

export function coinWays([total,coins]) {
  const ways=Array(total+1).fill(0);ways[0]=1;
  for(const coin of [...new Set(coins)])for(let i=coin;i<=total;i++){
    ways[i]+=ways[i-coin];if(!Number.isSafeInteger(ways[i]))return;
  }
  return ways[total];
}
export function stockUnlimited(prices){return prices.slice(1).reduce((n,p,i)=>n+Math.max(0,p-prices[i]),0);}
export function stockLimited(k,prices){
  if(k>=prices.length/2)return stockUnlimited(prices);
  let profits=Array(prices.length).fill(0);
  for(let t=0;t<k;t++){
    let balance=-prices[0];const next=Array(prices.length).fill(0);
    for(let i=1;i<prices.length;i++){next[i]=Math.max(next[i-1],prices[i]+balance);balance=Math.max(balance,profits[i]-prices[i]);}
    profits=next;
  }
  return profits.at(-1)??0;
}
export function jumpCount(a){
  let end=0,farthest=0,jumps=0;
  for(let i=0;i<a.length-1;i++){
    farthest=Math.max(farthest,i+a[i]);
    if(i===end){if(farthest<=i)return 0;jumps++;end=farthest;if(end>=a.length-1)return jumps;}
  }
  return 0;
}
export function rle(s){let out='';for(let i=0;i<s.length;){let n=1;while(n<9&&s[i+n]===s[i])n++;out+=n+s[i];i+=n;}return out;}
export function decompress(s){
  let out='',i=0,literal=true;
  while(i<s.length){const n=Number(s[i++]);if(!Number.isInteger(n))return;
    if(n){if(literal){if(i+n>s.length)return;out+=s.slice(i,i+n);i+=n;}
      else{const offset=Number(s[i++]);if(!(offset>0&&offset<=out.length))return;for(let j=0;j<n;j++)out+=out[out.length-offset];}}
    literal=!literal;
  }return out;
}
export function vigenere([text,key]){if(!/^[A-Z]+$/.test(key))return;return [...text].map((c,i)=>String.fromCharCode(65+(c.charCodeAt(0)+key.charCodeAt(i%key.length)-130)%26)).join('');}
export function ipAddresses(s){
  const result=[],valid=s=>s.length>0&&s.length<=3&&(s.length===1||s[0]!=='0')&&Number(s)<=255;
  for(let a=1;a<=3;a++)for(let b=a+1;b<=a+3;b++)for(let c=b+1;c<=b+3;c++){
    const parts=[s.slice(0,a),s.slice(a,b),s.slice(b,c),s.slice(c)];if(parts.every(valid))result.push(parts.join('.'));
  }return result;
}
export function mergeIntervals(intervals){
  const result=[];for(const [start,end]of [...intervals].sort((a,b)=>a[0]-b[0])){
    if(result.length&&start<=result.at(-1)[1])result.at(-1)[1]=Math.max(end,result.at(-1)[1]);else result.push([start,end]);
  }return result;
}
export function trianglePath(t){let row=[...t.at(-1)];for(let i=t.length-2;i>=0;i--)row=t[i].map((v,j)=>v+Math.min(row[j],row[j+1]));return row[0];}
export function spiral(matrix){
  const a=matrix.map(row=>[...row]),out=[];
  while(a.length){out.push(...a.shift());for(const row of a)if(row.length)out.push(row.pop());if(a.length)out.push(...a.pop().reverse());for(let i=a.length-1;i>=0;i--)if(a[i].length)out.push(a[i].shift());}
  return out;
}
export function squareRoot(value){
  const n=BigInt(value);if(n<0n)return;if(n<2n)return String(n);
  let root=1n<<BigInt(Math.ceil(n.toString(2).length/2));
  for(;;){const next=(root+n/root)/2n;if(next>=root)break;root=next;}
  return String(n-root*root>root?root+1n:root);
}
export function primeCount([low,high]){
  if(!Number.isSafeInteger(low)||!Number.isSafeInteger(high)||low<0||high<low||high>6000000)return;
  const marked=new Uint8Array(high+1);let count=0;
  for(let p=2;p*p<=high;p++)if(!marked[p])for(let i=p*p;i<=high;i+=p)marked[i]=1;
  for(let p=Math.max(2,low);p<=high;p++)if(!marked[p])count++;
  return count;
}
export function gridPaths(grid){
  const ways=Array(grid[0].length).fill(0);ways[0]=1;
  for(const row of grid)for(let j=0;j<row.length;j++){
    ways[j]=row[j]?0:ways[j]+(j?ways[j-1]:0);if(!Number.isSafeInteger(ways[j]))return;
  }return ways.at(-1);
}

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
  if (ns.ps("home").some(p => p.filename === ns.getScriptName() && p.pid < ns.pid)) {
    ns.tprint("A contract scanner is already running.");
    return;
  }
  const rejectedFile = "data/contracts-rejected.txt";
  const rejected = new Set(ns.read(rejectedFile).split("\n").filter(Boolean));
  let solvedTotal=0;
  while (true) {
    const hosts = new Set(["home"]);
    let solved = 0;
    let pending = 0;
    for (const host of hosts) {
      for (const peer of ns.scan(host)) hosts.add(peer);
      for (const file of ns.ls(host, ".cct").filter(name => name.endsWith(".cct"))) {
        await ns.sleep(5);
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
            solvedTotal++;
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
    await ns.write('data/contracts-status.txt',JSON.stringify({pid:ns.pid,updatedAt:Date.now(),solved,solvedTotal,pending,quarantined:rejected.size}),'w');
    await ns.sleep(60000);
  }
}
