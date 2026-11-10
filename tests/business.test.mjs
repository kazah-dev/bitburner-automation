import assert from 'node:assert/strict';
import {staffing,cycleBudget,productPrice,assignOffice,boostTargets,storagePressure} from '../services/corporation.js';
import {affordableShares} from '../services/stocks.js';
import {passwords} from '../workers/darknet.js';
for(let n=0;n<3000;n++)for(const product of [false,true]){
 const jobs=staffing(n,product,true);assert.equal(Object.values(jobs).reduce((a,b)=>a+b,0),n);assert(Object.values(jobs).every(x=>Number.isInteger(x)&&x>=0));
}
for(const funds of [0,1e8,1e9,1e12]){const b=cycleBudget(funds,1e6);assert(b.remaining>=0&&b.remaining<=funds*.05);assert(b.remaining===0||funds-b.remaining>=b.reserve);}
let hires=0;assignOffice({corporation:{getOffice:()=>({size:10,numEmployees:0,employeeJobs:{}}),hireEmployee:()=>{hires++;return false;},setJobAssignment(){throw Error('No employees');}}},'T','A',true,true);assert.equal(hires,1);
assert.equal(productPrice({desiredSellPrice:'MP*2',stored:1000,productionAmount:1,actualSellAmount:0}),'MP*1.7000');
assert.equal(affordableShares(100,100,n=>5+n*10),9);assert.equal(affordableShares(4,100,n=>5+n*10),0);
assert.deepEqual(passwords({isOnline:true,modelId:'DeskMemo_3.1',passwordLength:3,passwordHint:'PIN 486'}),['486']);
assert.deepEqual(passwords({isOnline:true,modelId:'Unknown'}),[]);
for(const space of [0,1,100,1000,10000]){
 const sizes=[.06,.5,.1,.005],q=boostTargets(space,sizes,[.15,.2,.15,.15]);
 assert(q.every(n=>Number.isFinite(n)&&n>=0));assert(q.reduce((n,x,i)=>n+x*sizes[i],0)<=space+1e-8);
}
console.log('PASS: staffing totals, spending reserves, failed-hire termination, portfolio affordability and supported game puzzles.');

// Imported warehouses may contain years of unsold output; clear it at an adaptive price.
assert.equal(productPrice({desiredSellPrice:'MP',stored:28803,productionAmount:303,actualSellAmount:305}),'MP*0.8500');
assert.equal(productPrice({desiredSellPrice:'MP*0.8500',stored:100,productionAmount:303,actualSellAmount:303}),'MP*0.9180');

assert.equal(storagePressure({size:100,sizeUsed:95},[{stored:28803,productionAmount:303}]),false);
assert.equal(storagePressure({size:100,sizeUsed:95},[{stored:100,productionAmount:303}]),true);
assert.equal(storagePressure({size:100,sizeUsed:50},[]),false);
