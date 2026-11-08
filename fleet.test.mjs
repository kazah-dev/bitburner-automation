import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../tools/fleet.js',import.meta.url),'utf8');
const {main}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function fixture(args,cash=158e6){
  const names=[],log=[];let calls=0;
  return {names,log,get calls(){return calls;},get cash(){return cash;},ns:{args,disableLog(){},getHostname:()=> 'home',getScriptName:()=> 'tools/fleet.js',ps:()=>[{filename:'tools/fleet.js'}],
    getServerMoneyAvailable:()=>cash,serverExists:n=>names.includes(n),tprint:s=>log.push(s),
    cloud:{getRamLimit:()=>1048576,getServerLimit:()=>25,getServerNames:()=>names,getServerCost:r=>r*55000,
      purchaseServer:(n,r)=>{calls++;cash-=r*55000;names.push(n);return n;}}}};
}
let f=fixture([1024,2,6e7,9e7]);await main(f.ns);assert.equal(f.calls,0);assert(f.log.some(s=>s.includes('PLAN kazah-01')));
f=fixture([1024,2,6e7,9e7,'apply']);await main(f.ns);assert.equal(f.calls,1);assert.equal(f.cash,101680000);
await main(f.ns);assert.equal(f.calls,1,'Repeat run must preserve reserve and existing names');
f=fixture([1024,1,6e7,9e7,'apply'],10e7);await main(f.ns);assert.equal(f.calls,0);
f=fixture([3]);await assert.rejects(main(f.ns),/power of two/);
f=fixture([1024,1,6e7,9e7,'typo']);await assert.rejects(main(f.ns),/mode/);
f=fixture([1024,2,12e7,0,'apply']);f.ns.cloud.purchaseServer=()=>'';await main(f.ns);assert(f.log.some(s=>s.includes('purchase failed')));
console.log('PASS: preview, spending cap, cash reserve, repeat execution, invalid input and failed purchase.');
