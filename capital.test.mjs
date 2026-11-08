import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const src=await readFile(new URL('./capital.js',import.meta.url),'utf8');
const {tick,ledgerFrom,updateLedger,allowance,configFrom}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
let s=ledgerFrom('', '1:2', 1000);
assert.equal(allowance(s,1000,0),50);
s.spent=50;updateLedger(s,950);assert.equal(s.earned,0);
updateLedger(s,500);updateLedger(s,950);assert.equal(s.earned,0,'external spend and recovery must not create credit');
updateLedger(s,1950);assert.equal(s.earned,1000);
const restart=ledgerFrom(JSON.stringify(s),'1:2',1950);assert.deepEqual(restart,s);
assert.equal(ledgerFrom(JSON.stringify(s),'1:3',1000).spent,0);
for(const input of ['null','{}','bad','{"version":1,"epoch":"1","seed":-1}'])assert.throws(()=>ledgerFrom(input,'1',0));
for(const input of ['{"enabled":"false"}','{"maxServerRam":3}','{"typo":1}','{"paybackSeconds":100000}'])assert.throws(()=>configFrom(input));

function mock({cash=1e9,load=0.7,hash=false,empty=false}={}) {
  const files=new Map(), buys=[], events=[], hosts={home:1024,owned:1024};
  const node={level:54,ram:8,cores:1,production:54*1.5*Math.pow(1.035,7)};
  const state={cash,load,fail:false,crash:false,epoch:2,controller:true,node:!empty,ramQuote:Infinity};
  const ns={pid:7,read:f=>files.get(f)||'',write:async(f,t)=>{files.set(f,t);events.push('write:'+f);},
    getResetInfo:()=>({lastNodeReset:1,lastAugReset:state.epoch,currentNode:1}),
    getServerMoneyAvailable:()=>state.cash,fileExists:()=>true,tprint(){},
    getScriptRam:()=>2,scan:h=>h==='home'?['owned']:['home'],hasRootAccess:()=>true,
    getServerMaxRam:h=>hosts[h]||0,serverExists:h=>h in hosts,
    ps:h=>h==='home'?[...(state.controller?[{filename:'cycle.js'}]:[]),
      {filename:'task.js',threads:state.load*(2048-32)/2},{filename:'share.js',threads:100000}]:[],
    cloud:{getServerNames:()=>Object.keys(hosts).filter(h=>h!=='home'),getRamLimit:()=>8192,getServerLimit:()=>1,
      getServerUpgradeCost:(h,r)=>(r-hosts[h])*55000,getServerCost:r=>r*55000,
      upgradeServer(h,r){events.push('buy');if(state.crash)throw Error('interrupted');if(state.fail)return false;
        const cost=(r-hosts[h])*55000;state.cash-=cost;hosts[h]=r;buys.push('cloud');return true;},
      purchaseServer(h,r){state.cash-=r*55000;hosts[h]=r;buys.push('new');return h;}},
    hacknet:{numNodes:()=>state.node?1:0,getNodeStats:()=>({...node,...(hash?{hashCapacity:64}:{})}),
      getPurchaseNodeCost:()=>state.node?Infinity:1000,purchaseNode(){state.node=true;state.cash-=1000;buys.push('seed');return 0;},
      getLevelUpgradeCost:()=>Infinity,getCoreUpgradeCost:()=>Infinity,getRamUpgradeCost:()=>state.ramQuote,
      upgradeRam(){state.cash-=state.ramQuote;state.ramQuote=Infinity;node.ram*=2;node.production*=Math.pow(1.035,node.ram/2);buys.push('ram');return true;}}};
  return {ns,state,files,buys,events,hosts};
}
// Demand gate ignores sharing, requires three consecutive samples, and respects budget.
{
 const m=mock(), r={};await tick(m.ns,r);await tick(m.ns,r);assert.equal(m.buys.length,0);
 m.state.cash+=1e9;await tick(m.ns,r);assert.deepEqual(m.buys,['cloud']);
 assert(m.events.lastIndexOf('write:capital-state.txt')<m.events.lastIndexOf('buy'));
 const spent=JSON.parse(m.files.get('capital-state.txt')).spent;
 await tick(m.ns,{});assert.equal(JSON.parse(m.files.get('capital-state.txt')).spent,spent,'restart does not duplicate purchases');
}
{
 const m=mock({load:0.1});for(let i=0;i<5;i++)await tick(m.ns,m.runtime??={});assert.equal(m.buys.length,0,'sharing is not demand');
 m.files.set('capital-config.txt','{"enabled":false}');m.state.load=0.9;
 for(let i=0;i<4;i++)await tick(m.ns,m.runtime);assert.equal(m.buys.length,0);
}
{
 const m=mock({cash:1e7});m.ns.fileExists=()=>false;m.state.ramQuote=1000;
 m.ns.fileExists=f=>f!=='SQLInject.exe';await tick(m.ns,{});assert.equal(m.buys.length,0,'reserve missing port program');
}
{
 const m=mock();m.state.ramQuote=100000;await tick(m.ns,{});assert.equal(m.buys.length,0,'reject slow payback');
 m.state.ramQuote=1000;await tick(m.ns,{});assert.deepEqual(m.buys,['ram']);
 const hash=mock({hash:true});hash.state.ramQuote=1;await tick(hash.ns,{});assert.equal(hash.buys.length,0);
 const seed=mock({empty:true});await tick(seed.ns,{});assert.deepEqual(seed.buys,['seed']);
}
for(const crash of [false,true]){
 const m=mock({cash:2e9}),r={};m.state.fail=!crash;m.state.crash=crash;
 await tick(m.ns,r);await tick(m.ns,r);
 if(crash)await assert.rejects(tick(m.ns,r),/interrupted/);else await tick(m.ns,r);
 const charged=JSON.parse(m.files.get('capital-state.txt')).spent;
 assert.equal(charged,crash?56320000:0,'failed quote refunded; crash conservatively charged');
}
{
 const m=mock({cash:2e9}),r={};m.files.set('capital-config.txt','{"maxFleetRam":1024}');
 for(let i=0;i<4;i++)await tick(m.ns,r);assert.equal(m.buys.length,0);
 m.files.set('capital-state.txt','broken');await assert.rejects(tick(m.ns,r));assert.equal(m.buys.length,0);
}
// Fresh augmentation epoch discards old credit; a missing controller blocks spending.
{
 const m=mock({cash:2e9}),r={};await tick(m.ns,r);m.state.epoch=3;m.state.cash=1000;
 await tick(m.ns,r);const saved=JSON.parse(m.files.get('capital-state.txt'));assert.equal(saved.seed,50);assert.equal(saved.spent,0);
 const offline=mock({empty:true});offline.state.controller=false;await tick(offline.ns,{});assert.equal(offline.buys.length,0);
}
console.log('PASS: budget persistence, reset identity, reserve, pause, cloud demand/caps, Hacknet ROI, failure and crash accounting.');

{
 const m=mock({cash:2e9}),r={};m.ns.cloud.getServerLimit=()=>25;
 m.files.set('capital-config.txt','{"maxServerRam":64}');
 m.hosts['worker-01']=64;
 for(let i=0;i<3;i++)await tick(m.ns,r);
 assert.equal(m.hosts['worker-02'],64,'new nodes use collision-free generic names');
 assert.deepEqual(m.buys,['new']);
}
{
 const m=mock({cash:1000,empty:true});await tick(m.ns,{});assert.equal(m.buys.length,0,'do not spend fresh-reset seed cash');
}
console.log('PASS: automatic cloud creation and fresh-reset cash protection.');
