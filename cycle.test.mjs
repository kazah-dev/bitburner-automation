// Run outside Bitburner: node cycle.test.mjs
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('./cycle.js', import.meta.url), 'utf8');
const {main, estimateTarget, chooseTarget, freeThreads} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const base = {name:'quick', maxMoney:1e6, money:1e6, percent:.01, chance:.9, growth:30,
  hackTime:10, growTime:32, weakenTime:40, currentWeakenTime:40, securityDebt:0,
  weaken:.05, hackSecurity:.002, growSecurity:.004};
const ready = estimateTarget(base,100);
assert(ready.score > estimateTarget({...base,money:1,securityDebt:20},100).score, 'Preparation must lower rank');
assert(ready.score > estimateTarget({...base,name:'rich-slow',maxMoney:1e8,money:1e8,growth:1e8},100).score, 'Gross wealth cannot hide recovery costs');
assert.equal(estimateTarget(base,0),null);
assert.equal(estimateTarget({...base,growth:Infinity},100),null);
assert(Number.isFinite(estimateTarget({...base,money:0},1).score));
assert(estimateTarget(base,2).threads <= 2);
assert.equal(freeThreads({hostname:'home',maxRam:64,ramUsed:20},2,16),14);
assert.equal(freeThreads({hostname:'x',maxRam:16,ramUsed:20},2,16),0);
assert.equal(chooseTarget([{name:'b',score:124},{name:'a',score:100}],'a',true).name,'a');
assert.equal(chooseTarget([{name:'b',score:126},{name:'a',score:100}],'a',false).name,'a');
assert.equal(chooseTarget([{name:'b',score:126},{name:'a',score:100}],'a',true).name,'b');

async function simulate({failCopy=false,failExec=false,noFaction=false}={}) {
  let pid=20, ticks=0, hacks=0, drained=false, opener=false, exit;
  const targets = {fast:{hostname:'fast',hasAdminRights:true,maxRam:64,ramUsed:0,cpuCores:4,moneyMax:1e6,moneyAvailable:1e6,
    serverGrowth:100,requiredHackingSkill:1,hackDifficulty:1,minDifficulty:1,numOpenPortsRequired:0}};
  const hosts = {home:{hostname:'home',hasAdminRights:true,maxRam:128,ramUsed:0,cpuCores:1,moneyMax:0},
    fast:targets.fast,locked:{hostname:'locked',hasAdminRights:false,maxRam:32,ramUsed:0,cpuCores:1,moneyMax:0,numOpenPortsRequired:1}};
  const procs = new Map([
    [1,{pid:1,host:'home',filename:'cycle.js',threads:1,args:['auto'],ram:20}],
    [2,{pid:2,host:'home',filename:'contracts.js',threads:1,args:[],ram:22}],
    [3,{pid:3,host:'home',filename:'share.js',threads:1,args:[],ram:4}],
    [4,{pid:4,host:'fast',filename:'task.js',threads:1,args:['weaken','fast'],ram:2,end:2}],
    [5,{pid:5,host:'fast',filename:'share.js',threads:1,args:['cycle-fill',999],ram:4}],
  ]);
  let copied=false, failed=false; const writes=[], events=[], messages=[];
  const ram=s=>({...s,ramUsed:[...procs.values()].filter(p=>p.host===s.hostname).reduce((n,p)=>n+p.ram,0)});
  const ns={args:['auto',16,'share'],pid:1, disableLog(){},getHostname:()=> 'home',getScriptName:()=> 'cycle.js',
    ps:h=>[...procs.values()].filter(p=>p.host===h),getServer:h=>ram(hosts[h]),scan:h=>h==='home'?['fast','locked']:['home'],
    getScriptRam:f=>f==='task.js'?2:4,serverExists:h=>!!hosts[h],getHackingLevel:()=>100,getPlayer:()=>({factions:noFaction?[]:['CyberSec']}),
    fileExists:f=>opener&&f==='BruteSSH.exe',brutessh(){},nuke:h=>{hosts[h].hasAdminRights=true;events.push('root');},
    ftpcrack(){},relaysmtp(){},httpworm(){},sqlinject(){},
    hackAnalyze:()=>.01,hackAnalyzeChance:()=>.9,growthAnalyze:(_h,m,c=1)=>Math.log(m)*30/(1+(c-1)/16),
    weakenAnalyze:(n,c=1)=>.05*n*(1+(c-1)/16),hackAnalyzeSecurity:n=>n*.002,growthAnalyzeSecurity:n=>n*.004,
    getHackTime:()=>10000,getGrowTime:()=>32000,getWeakenTime:()=>40000,
    isRunning:p=>procs.has(p),kill:p=>{assert(![2,3].includes(p),'Unrelated scripts must survive');events.push('kill:'+p);return procs.delete(p);},
    atExit:f=>{exit=f;},write:async(_f,s)=>writes.push(JSON.parse(s)),print:s=>messages.push(s),tprint(){},
    scp:async()=>{if(failCopy&&!copied){copied=true;return false;}return true;},
    exec(f,h,n,...args){
      assert(drained,'Must drain existing tasks before launching work');
      if(failExec&&!failed&&f==='task.js'){failed=true;return 0;}
      const cost=(f==='task.js'?2:4)*n;
      assert(ram(hosts[h]).ramUsed+cost <= hosts[h].maxRam-(h==='home'?16:0)+1e-8,'Reserve exceeded');
      if(f==='task.js') assert(![...procs.values()].some(p=>p.filename==='share.js'&&p.args[0]==='cycle-fill'),'Filler must be reclaimed first');
      const p=++pid; procs.set(p,{pid:p,host:h,filename:f,threads:n,args,ram:cost,end:f==='task.js'?ticks+3:Infinity});
      events.push(f); return p;
    },
    async sleep(){
      ticks++; if(ticks>120)throw new Error('Controller stalled');
      opener=true;
      for(const [p,proc] of [...procs])if(proc.end<=ticks){
        procs.delete(p); if(p===4){drained=true;continue;}
        const t=targets[proc.args[1]]; const cores=hosts[proc.host].cpuCores;
        if(proc.args[0]==='hack'){t.moneyAvailable*=1-.01*proc.threads;t.hackDifficulty+=proc.threads*.002;hacks++;}
        if(proc.args[0]==='grow'){t.moneyAvailable=Math.min(t.moneyMax,(t.moneyAvailable+proc.threads)*Math.exp(proc.threads*(1+(cores-1)/16)/30));t.hackDifficulty+=proc.threads*.004;}
        if(proc.args[0]==='weaken')t.hackDifficulty=Math.max(1,t.hackDifficulty-ns.weakenAnalyze(proc.threads,cores));
      }
      if(hacks>=4)throw new Error('SIMULATION_COMPLETE');
    },
  };
  await assert.rejects(main(ns),/SIMULATION_COMPLETE/);
  exit();
  assert(procs.has(2)&&procs.has(3));
  assert(![...procs.values()].some(p=>p.filename==='share.js'&&p.args[0]==='cycle-fill'),'Exit must release owned filler');
  assert(events.includes('root'),'New opener must be detected without restart');
  assert(writes.some(s=>s.target==='fast'&&s.capacityThreads>0&&s.controllerPid===1));
  assert(noFaction?!events.includes('share.js'):events.includes('share.js'));
  if(failCopy)assert(messages.some(s=>s.startsWith('Copy failed')));
  if(failExec)assert(messages.some(s=>s.startsWith('Launch failed')));
}
await simulate(); await simulate({failCopy:true,failExec:true}); await simulate({noFaction:true});
console.log('PASS: ranking, preparation costs, hysteresis, RAM reserve, core-aware allocation, restart draining, sharing ownership, opener refresh and launch/copy recovery.');
