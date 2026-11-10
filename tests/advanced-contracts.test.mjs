import assert from 'node:assert/strict';
import {solvers,stockLimited,jumpCount,primeCount,squareRoot,gridPaths} from '../services/contracts.js';
const examples=[
 ['Total Ways to Sum II',[10,[2,5,3,6]],5],
 ['Algorithmic Stock Trader II',[7,1,5,3,6,4],7],
 ['Algorithmic Stock Trader III',[3,3,5,0,0,3,1,4],6],
 ['Algorithmic Stock Trader IV',[2,[3,2,6,5,0,3]],7],
 ['Array Jumping Game',[3,2,1,0,4],0],['Array Jumping Game',[0],1],
 ['Array Jumping Game II',[2,3,1,1,4],2],
 ['Compression I: RLE Compression','aaaaaaaaaaabb','9a2a2b'],
 ['Compression II: LZ Decompression','5aaabb450723abb','aaabbaaababababaabb'],
 ['Compression II: LZ Decompression','3abc0','abc'],
 ['Encryption II: Vigenère Cipher',['ATTACKATDAWN','LEMON'],'LXFOPVEFRNHR'],
 ['Generate IP Addresses','25525511135',['255.255.11.135','255.255.111.35']],
 ['Generate IP Addresses','0000',['0.0.0.0']],
 ['Merge Overlapping Intervals',[[1,3],[2,6],[8,10],[15,18]],[[1,6],[8,10],[15,18]]],
 ['Minimum Path Sum in a Triangle',[[2],[3,4],[6,5,7],[4,1,8,3]],11],
 ['Spiralize Matrix',[[1,2,3],[4,5,6],[7,8,9]],[1,2,3,6,9,8,7,4,5]],
 ['Unique Paths in a Grid I',[3,7],28],
 ['Unique Paths in a Grid II',[[0,0,0],[0,1,0],[0,0,0]],2],
 ['Total Number of Primes',[0,20],8],['Square Root',15n,'4']
];
for(const [type,input,wanted]of examples)assert.deepEqual(solvers.get(type)(input),wanted,type);
for(let n=0;n<5000;n++)assert.equal(squareRoot(BigInt(n)),String(Math.round(Math.sqrt(n))));
const large=10n**100n;assert.equal(squareRoot(large*large+large),String(large));assert.equal(squareRoot(large*large+large+1n),String(large+1n));
const prime=n=>{if(n<2)return false;for(let k=2;k*k<=n;k++)if(n%k===0)return false;return true;};
for(let low=0;low<100;low++)assert.equal(primeCount([low,low+30]),Array.from({length:31},(_,i)=>low+i).filter(prime).length);
function stockBrute(a,k,i=0,holding=false){if(i===a.length)return holding?-Infinity:0;return Math.max(stockBrute(a,k,i+1,holding),holding?a[i]+stockBrute(a,k-1,i+1,false):k>0?-a[i]+stockBrute(a,k,i+1,true):-Infinity);}
for(let seed=0;seed<100;seed++){
 const a=Array.from({length:6},(_,i)=>(seed*13+i*i*17+i*seed)%10);
 for(let k=1;k<4;k++)assert.equal(stockLimited(k,a),stockBrute(a,k));
 const hops=a.map(n=>n%4),dist=Array(hops.length).fill(Infinity);dist[0]=0;
 for(let i=0;i<hops.length;i++)for(let j=i+1;j<=Math.min(hops.length-1,i+hops[i]);j++)dist[j]=Math.min(dist[j],dist[i]+1);
 assert.equal(jumpCount(hops),Number.isFinite(dist.at(-1))?dist.at(-1):0);
}
assert.equal(gridPaths([[1]]),0);
console.log('PASS: contract examples, exact large square roots, prime ranges and brute-force trading/jump comparisons.');
