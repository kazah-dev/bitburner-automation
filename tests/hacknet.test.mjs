import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../tools/hacknet.js',import.meta.url),'utf8');
const {main}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
let purchases=[]; const node={level:54,ram:8,cores:1,production:54*1.5*Math.pow(1.035,7)};
const ns={args:[1000000],disableLog(){},getServerMoneyAvailable:()=>1e9,sleep:async()=>{},tprint(){},
 hacknet:{numNodes:()=>1,getNodeStats:()=>node,getPurchaseNodeCost:()=>1e99,
 getLevelUpgradeCost:()=>1e99,getCoreUpgradeCost:()=>1e99,
 getRamUpgradeCost:()=>purchases.length?Infinity:100000,
 upgradeRam(){purchases.push('RAM');return true;}}};
await main(ns); assert.equal(purchases.length,0,'An 8 GB RAM upgrade taking over 30 minutes to repay must be rejected');
ns.hacknet.getRamUpgradeCost=()=>purchases.length?Infinity:1000;
await main(ns);assert.deepEqual(purchases,['RAM']);
ns.hacknet.getNodeStats=()=>({...node,hashCapacity:64});
await assert.rejects(main(ns),/Only money-producing/);
console.log('PASS: correct RAM marginal production, payback rejection and Hash server guard.');
