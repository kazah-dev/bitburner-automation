import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./economy.js',import.meta.url),'utf8');
const {main}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const failure of [false,true]){
 let cycles=0,id=20; const starts=[],killed=[];
 const procs=[{filename:'economy.js',pid:1,args:[]},{filename:'share.js',pid:2,args:['cycle-fill',99]},{filename:'custom.js',pid:3,args:[]}];
 const ns={disableLog(){},getHostname:()=> 'home',getScriptName:()=> 'economy.js',ps:()=>procs,
 getScriptRam:()=>10,getServerMaxRam:()=>64,getServerUsedRam:()=>procs.some(p=>p.pid===2)?60:10,
 kill(pid){killed.push(pid);procs.splice(procs.findIndex(p=>p.pid===pid),1);},
 exec(f,_h,_t,...args){starts.push(f);if(failure)return 0;procs.push({filename:f,pid:++id,args});return id;},
 tprint(){},sleep:async()=>{if(++cycles===4)throw Error('STOP');}};
 await assert.rejects(main(ns),/STOP/);
 assert.deepEqual(starts,['contracts.js','monitor.js','cycle.js']);assert.deepEqual(killed,[2]);
 assert(procs.some(p=>p.filename==='custom.js'));
}
console.log('PASS: ordered startup, no duplicate services, failure backoff and preservation of unrelated processes.');
