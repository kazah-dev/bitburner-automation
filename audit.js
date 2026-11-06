/** Read-only snapshot for inspecting automation and pending contracts. */
export async function main(ns) {
  const hosts=['home']; const seen=new Set(hosts);
  for(const h of hosts)for(const n of ns.scan(h))if(!seen.has(n)){seen.add(n);hosts.push(n);}
  const servers=hosts.filter(h=>h!=='darkweb').map(h=>({...ns.getServer(h),processes:ns.ps(h)}));
  const contracts=[];
  for(const h of hosts)for(const f of ns.ls(h,'.cct').filter(f=>f.endsWith('.cct'))){
    contracts.push({host:h,file:f,type:ns.codingcontract.getContractType(f,h),
      tries:ns.codingcontract.getNumTriesRemaining(f,h),data:ns.codingcontract.getData(f,h),description:ns.codingcontract.getDescription(f,h)});
  }
  const player=ns.getPlayer();
  const report={time:Date.now(),money:player.money,skills:player.skills,factions:player.factions,
    income:ns.getTotalScriptIncome(),servers,contracts,
    hacknet:Array.from({length:ns.hacknet.numNodes()},(_,i)=>ns.hacknet.getNodeStats(i))};
  await ns.write('audit-status.txt',JSON.stringify(report),'w');
  ns.tprint(servers.length+' servers; '+contracts.length+' contracts. Details: audit-status.txt');
}
