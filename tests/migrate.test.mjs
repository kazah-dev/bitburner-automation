import assert from 'node:assert/strict';
import {main,required,scripts,stateFiles} from '../tools/migrate.js';
function mock(){
 const files=new Map([...required,...scripts,...stateFiles].map(f=>[f,f.endsWith('.txt')?'ledger:'+f:'code']));
 let procs=[{filename:'economy.js',pid:1},{filename:'capital.js',pid:2},{filename:'task.js',pid:3},{filename:'custom.js',pid:4}],ticks=0;
 const events=[];
 const ns={pid:10,args:[],getHostname:()=> 'home',getScriptName:()=> 'tools/migrate.js',disableLog(){},tprint(){},
 getScriptRam:f=>files.has(f)?2:0,fileExists:f=>files.has(f),ps:()=>procs,scan:()=>[],read:f=>files.get(f)||'',
 kill:pid=>{events.push('kill:'+pid);procs=procs.filter(p=>p.pid!==pid);},
 sleep:async()=>{ticks++;events.push('drained');procs=procs.filter(p=>p.pid!==3);},
 mv:(_h,from,to)=>{events.push('move:'+from);files.set(to,files.get(from));files.delete(from);},
 exec:f=>{events.push('start:'+f);return 15;}};
 return {ns,files,events,get procs(){return procs;},get ticks(){return ticks;}};
}
{
 const m=mock();await main(m.ns);assert.deepEqual(m.events,[],'preview must be read-only');
 m.ns.args=['apply'];await main(m.ns);
 assert.equal(m.ticks,1);assert(m.events.indexOf('drained')<m.events.indexOf('move:capital-state.txt'));
 for(const f of stateFiles)assert.equal(m.files.get('data/'+f),'ledger:'+f);
 assert(m.procs.some(p=>p.pid===4),'unrelated work survives');assert(!m.events.includes('kill:3'),'tasks drain');
 for(const f of scripts)assert(m.files.has('archive/pre-folders/'+f));
 assert.equal(m.events.at(-1),'start:economy.js');
 await main(m.ns);assert.equal(m.files.get('data/capital-state.txt'),'ledger:capital-state.txt','repeat preserves budget');
}
for(const kind of ['missing','state','archive']){
 const m=mock();m.ns.args=['apply'];
 if(kind==='missing')m.files.delete(required[2]);
 if(kind==='state')m.files.set('data/capital-state.txt','newer');
 if(kind==='archive')m.files.set('archive/pre-folders/cycle.js','old');
 await assert.rejects(main(m.ns));assert.deepEqual(m.events,[],'preflight must fail before stopping services');
}
{
 const m=mock();m.ns.args=['apply'];const move=m.ns.mv;let once=true;
 m.ns.mv=(h,f,t)=>{if(f==='capital-config.txt'&&once){once=false;throw Error('interrupted');}move(h,f,t);};
 await assert.rejects(main(m.ns),/interrupted/);await main(m.ns);
 assert.equal(m.files.get('data/capital-state.txt'),'ledger:capital-state.txt');
 assert.equal(m.events.at(-1),'start:economy.js');
}
console.log('PASS: preview, preflight conflicts, drain-before-move, byte-preserved state, unrelated work, interrupted migration and repeat execution.');
