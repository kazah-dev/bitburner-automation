// Run outside Bitburner: node monitor.test.mjs
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../ui/monitor.js', import.meta.url), 'utf8');
const {snapshot} = await import('data:text/javascript;base64,' + Buffer.from(source + '\nexport {snapshot};').toString('base64'));
let raw='', running=true, workers=true;
const ns={
  scan:h=>h==='home'?['foodnstuff']:['home'],
  getServer:h=>({hostname:h,hasAdminRights:true,maxRam:64,ramUsed:10,moneyAvailable:100,moneyMax:100}),
  ps:h=>h==='home'?[...(running?[{pid:7,filename:'services/cycle.js',args:['auto']}]:[]),
    ...(workers?[{pid:8,filename:'workers/task.js',args:['grow','foodnstuff'],threads:3}]:[])]:[],
  ls:()=>[],read:()=>raw,getPlayer:()=>({factions:[],skills:{hacking:1}}),fileExists:()=>false,
  hacknet:{numNodes:()=>0},getHackTime:()=>100,getGrowTime:()=>320,getWeakenTime:()=>400,getTotalScriptIncome:()=>[0,0],
};
assert.equal(snapshot(ns).target.name,'foodnstuff');
raw='{invalid'; assert.equal(snapshot(ns).phase,'grow');
raw=JSON.stringify({controllerPid:99,updatedAt:Date.now(),target:'wrong'});
assert.equal(snapshot(ns).policy,null);
raw=JSON.stringify({controllerPid:7,updatedAt:Date.now()-30000,target:'wrong'});
assert.equal(snapshot(ns).target.name,'foodnstuff');
raw=JSON.stringify({controllerPid:7,updatedAt:Date.now(),target:'foodnstuff',mode:'auto'});
workers=false; assert.equal(snapshot(ns).target.name,'foodnstuff');
assert.equal(snapshot(ns).phase,'waiting');
running=false; assert.equal(snapshot(ns).policy,null);assert.equal(snapshot(ns).phase,'idle');
console.log('PASS: automatic target, missing/corrupt/stale/wrong-PID telemetry, phase transitions and stopped controller.');

running=true;workers=true;
const originalPs=ns.ps;
ns.ps=host=>host==='home'?originalPs(host):[
  {filename:'workers/task.js',args:['weaken','n00dles'],threads:7},
  {filename:'workers/task.js',args:['hack','foodnstuff'],threads:2},
  {filename:'workers/share.js',args:['cycle-fill',7],threads:20},
];
const all=snapshot(ns);
assert.equal(all.farmingWorkers.reduce((n,w)=>n+w.threads,0),12);
assert.equal(all.workers.reduce((n,w)=>n+w.threads,0),5);
assert.equal(all.shares,20);
console.log('PASS: network-wide farming workload includes multiple servers and phases, excludes sharing, and preserves per-target details.');
