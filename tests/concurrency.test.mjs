import test from 'node:test';
import assert from 'node:assert/strict';
import {main} from '../tools/concurrency.js';

function fixture(mode='apply', failAt=-1) {
  const killed=[], launched=[]; let exit;
  return {killed, launched, ns: {
    args:[mode], pid:42, disableLog(){}, getHostname:()=> 'home',
    getScriptName:()=> 'tools/concurrency.js',
    ps:()=>[{filename:'tools/concurrency.js',pid:42,threads:1,args:[]},
      {filename:'workers/share.js',pid:50,threads:500,args:['cycle-fill',10]},
      {filename:'workers/task.js',pid:60,threads:10,args:[]},
      {filename:'workers/share.js',pid:70,threads:1,args:['manual']}],
    getScriptRam:f=>f.includes('share')?4:1.6,
    getServerMaxRam:()=>2048, getServerUsedRam:()=>2030,
    fileExists:()=>false, read:()=>'', async write(){}, tprint(){},
    atExit:fn=>{exit=fn;}, kill:pid=>killed.push(pid),
    exec:()=>{if(launched.length===failAt)return 0; const pid=100+launched.length;launched.push(pid);return pid;},
    async sleep(){assert.equal(launched.length,1000);},
  }};
}
test('preview does not launch or stop anything',async()=>{const f=fixture('preview');await main(f.ns);assert.deepEqual(f.killed,[]);assert.deepEqual(f.launched,[]);});
test('successful run stops only owned shares and temporary workers',async()=>{const f=fixture();await main(f.ns);assert.equal(f.launched.length,1000);assert.deepEqual(f.killed,[50,...f.launched]);});
test('failed launch cleans every created worker',async()=>{const f=fixture('apply',4);await assert.rejects(main(f.ns),/Launch stopped at 4/);assert.deepEqual(f.killed,[50,...f.launched]);});
test('insufficient memory leaves all processes untouched',async()=>{const f=fixture();f.ns.getServerMaxRam=()=>128;await assert.rejects(main(f.ns),/Insufficient RAM/);assert.deepEqual(f.killed,[]);});
