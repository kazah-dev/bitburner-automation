import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./contracts.js',import.meta.url),'utf8');
const {maximumSubarray,totalWaysToSum,main}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
// Independent recurrence: partitions with/without the largest allowed part.
const memo = new Map();
function partitions(n, largest) {
  if (n === 0) return 1;
  if (n < 0 || largest === 0) return 0;
  const key = n + ':' + largest;
  if (!memo.has(key)) memo.set(key, partitions(n, largest - 1) + partitions(n - largest, largest));
  return memo.get(key);
}
for (let n = 1; n <= 100; n++) assert.equal(totalWaysToSum(n), partitions(n, n) - 1);
assert.equal(totalWaysToSum(4), 4);
assert.equal(totalWaysToSum(100), 190569291);
for (const n of [0, -1, 2.5, NaN, Infinity, '29', 1001, 1000]) assert.equal(totalWaysToSum(n), undefined);
const brute=a=>Math.max(...a.flatMap((_,i)=>a.slice(i).map((_,j)=>a.slice(i,i+j+1).reduce((x,y)=>x+y,0))));
for(let size=1;size<=7;size++)for(let seed=0;seed<100;seed++){
  const a=Array.from({length:size},(_,i)=>((seed*17+i*13+i*i)%23)-11);
  assert.equal(maximumSubarray(a),brute(a));
}
assert.equal(maximumSubarray([-9,-1,-4]),-1); assert.equal(maximumSubarray([0,0]),0);
assert.equal(maximumSubarray([]),undefined);assert.equal(maximumSubarray([1,Infinity]),undefined);
let attempts=0,written='',ticks=0;
const ns={args:[],getHostname:()=> 'home',getScriptName:()=> 'contracts.js',ps:()=>[{filename:'contracts.js'}],
 disableLog(){},read:()=>'',scan:()=>[],ls:()=>['bad.cct','unknown.cct'],tprint(){},print(){},
 codingcontract:{getContractType:f=>f==='bad.cct'?'Subarray with Maximum Sum':'Unknown',getData:()=>[-1,3,-1],attempt:()=>{attempts++;return '';}},
 write:async(_f,s)=>{written+=s;},sleep:async()=>{if(++ticks===3)throw Error('STOP');}};
await assert.rejects(main(ns),/STOP/);assert.equal(attempts,1);assert.equal(written,'home/bad.cct\n');
console.log('PASS: 700 subarray comparisons, 100 partition recurrence comparisons, numeric guards and rejected-answer quarantine.');
