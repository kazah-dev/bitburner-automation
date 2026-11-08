import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../economy.js',import.meta.url),'utf8');
const {main}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const failure of [false,true]){
 let cycles=0,id=20; const starts=[],killed=[];
 const procs=[{filename:'economy.js',pid:1,args:[]},{filename:'workers/share.js',pid:2,args:['cycle-fill',99]},{filename:'custom.js',pid:3,args:[]}];
 const ns={pid:1,disableLog(){},getHostname:()=> 'home',getScriptName:()=> 'economy.js',ps:()=>procs,
 getScriptRam:()=>10,getServerMaxRam:()=>64,getServerUsedRam:()=>procs.some(p=>p.pid===2)?60:10,
 kill(pid){killed.push(pid);procs.splice(procs.findIndex(p=>p.pid===pid),1);},
 exec(f,_h,_t,...args){starts.push(f);if(failure)return 0;procs.push({filename:f,pid:++id,args});return id;},
 tprint(){},sleep:async()=>{if(++cycles===4)throw Error('STOP');}};
 await assert.rejects(main(ns),/STOP/);
 assert.deepEqual(starts,['services/cycle.js','services/contracts.js','ui/monitor.js','services/capital.js']);assert.deepEqual(killed,[2]);
 assert(procs.some(p=>p.filename==='custom.js'));
}
// Simulate Autoexec and a saved supervisor starting before either can exit.
// Exactly one must survive, independent of which main() runs first.
for(const order of [[1,2],[2,1]]){
 const procs=[{filename:'economy.js',pid:1},{filename:'economy.js',pid:2}];
 const owners=[],starts=[];
 const ns={disableLog(){},getHostname:()=> 'home',getScriptName:()=> 'economy.js',ps:()=>procs,
 getScriptRam:()=>4,getServerMaxRam:()=>1024,getServerUsedRam:()=>8,
 exec(file){starts.push(file);procs.push({filename:file,pid:20+starts.length});return 20+starts.length;},
 tprint(){},sleep:async()=>{throw Error('ALIVE');}};
 for(const pid of order){
   try{await main({...ns,pid});}catch(e){assert.equal(e.message,'ALIVE');owners.push(pid);}
 }
 assert.deepEqual(owners,[1]);assert.deepEqual(starts,['services/cycle.js','services/contracts.js','ui/monitor.js','services/capital.js']);
}
console.log('PASS: reload ownership, ordered startup, no duplicate services, failure backoff and preservation of unrelated processes.');

// Insufficient RAM is retried on the next sweep, not delayed five minutes.
{
 let pass=0;const started=[],procs=[{filename:'economy.js',pid:1,args:[]}];
 const ns={pid:1,disableLog(){},getHostname:()=> 'home',getScriptName:()=> 'economy.js',ps:()=>procs,
 getScriptRam:()=>10,getServerMaxRam:()=>64,getServerUsedRam:()=>pass?0:64,tprint(){},
 exec(file){started.push(file);procs.push({filename:file,pid:20+started.length});return 20+started.length;},
 sleep:async()=>{if(++pass===2)throw Error('STOP');}};
 await assert.rejects(main(ns),/STOP/);
 assert.deepEqual(started,['services/cycle.js','services/contracts.js','ui/monitor.js','services/capital.js']);
}
console.log('PASS: recovery immediately retries when previously unavailable RAM returns.');

