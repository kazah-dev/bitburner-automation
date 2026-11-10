/** Continuous corporation maintenance. No investment acceptance, IPO or resets. */
const STATUS='data/corporation-status.txt';
const JOBS=['Operations','Engineer','Business','Management','Research & Development','Intern'];
// Bitburner 3.0.1 industry production exponents; see official IndustryData.ts.
const BOOSTS=['Hardware','Robots','AI Cores','Real Estate'];
const FACTORS={Agriculture:[.2,.3,.3,.72],Chemical:[.2,.25,.2,.25],Tobacco:[.15,.2,.15,.15]};
export function boostTargets(space,sizes,factors){
  if(!(space>0)||!sizes.every(x=>x>0))return sizes.map(()=>0);
  const values=lambda=>factors.map((f,i)=>Math.max(0,f/(lambda*sizes[i])-500));
  let low=0,high=1;
  for(let i=0;i<80;i++){const mid=(low+high)/2,used=values(mid).reduce((n,x,j)=>n+x*sizes[j],0);if(used>space)low=mid;else high=mid;}
  return values(high).map(Math.floor);
}

export function staffing(count,product=false,headquarters=false) {
  const jobs=Object.fromEntries(JOBS.map(j=>[j,0]));
  if(count<3){jobs['Research & Development']=count;return jobs;}
  jobs.Operations=Math.max(1,Math.floor(count*(product && headquarters ? 0.18 : 0.25)));
  jobs.Engineer=Math.max(1,Math.floor(count*(product && headquarters ? 0.30 : 0.25)));
  jobs.Business=Math.max(1,Math.floor(count*.10));
  jobs.Management=Math.floor(count*.15);
  jobs['Research & Development']=count-Object.values(jobs).reduce((a,b)=>a+b,0);
  return jobs;
}
export function cycleBudget(funds,expenses) {
  const reserve=Math.max(1e9,Math.max(0,expenses)*600,funds*.20);
  return {reserve,remaining:Math.max(0,Math.min(funds*.05,funds-reserve))};
}
export function productPrice(product) {
  const match=String(product.desiredSellPrice).match(/^MP\*([\d.]+)$/);
  let multiplier=match?Number(match[1]):1;
  if(product.stored>Math.max(1,product.productionAmount)*20)multiplier*=.85;
  else if(product.productionAmount>0&&product.actualSellAmount>=product.productionAmount*.98&&product.stored<product.productionAmount*2)multiplier*=1.08;
  return 'MP*'+Math.max(.1,Math.min(1e6,multiplier)).toFixed(4);
}
export function assignOffice(ns,name,city,product,hq) {
  let o=ns.corporation.getOffice(name,city);
  // A failed hire must not become an infinite loop.
  for(let i=o.numEmployees;i<o.size;i++)if(!ns.corporation.hireEmployee(name,city))break;
  o=ns.corporation.getOffice(name,city);
  const desired=staffing(o.numEmployees,product,hq);
  for(const job of JOBS)if((o.employeeJobs[job]??0)>desired[job])ns.corporation.setJobAssignment(name,city,job,desired[job]);
  for(const job of JOBS)if((o.employeeJobs[job]??0)<desired[job])ns.corporation.setJobAssignment(name,city,job,desired[job]);
}
export function maintain(ns) {
  const initial=ns.corporation.getCorporation(), budget=cycleBudget(initial.funds,initial.expenses),events=[],errors=[];
  const spend=(cost,label,action)=>{
    if(!Number.isFinite(cost)||cost<0||cost>budget.remaining||ns.corporation.getCorporation().funds-cost<budget.reserve)return false;
    action(); budget.remaining-=cost; events.push(label);return true;
  };
  for(const unlock of ['Smart Supply','Export'])if(!ns.corporation.hasUnlock(unlock))spend(ns.corporation.getUnlockCost(unlock),unlock,()=>ns.corporation.purchaseUnlock(unlock));
  const summaries=[];
  for(const name of initial.divisions) {
    try {
      let d=ns.corporation.getDivision(name);
      const industry=ns.corporation.getIndustryData(d.industry),hq=d.cities.includes('Sector-12')?'Sector-12':d.cities[0];
      for(const city of d.cities) {
        if(!ns.corporation.hasWarehouse(name,city))spend(ns.corporation.getConstants().warehouseInitialCost,`${name}: warehouse ${city}`,()=>ns.corporation.purchaseWarehouse(name,city));
        if(!ns.corporation.hasWarehouse(name,city))continue;
        let o=ns.corporation.getOffice(name,city);
        const target=d.makesProducts?(city===hq?120:30):Math.max(9,o.size);
        if(o.size<target){const n=Math.min(15,target-o.size);spend(ns.corporation.getOfficeSizeUpgradeCost(name,city,n),`${name}: office ${city}`,()=>ns.corporation.upgradeOfficeSize(name,city,n));}
        assignOffice(ns,name,city,d.makesProducts,city===hq);
        o=ns.corporation.getOffice(name,city);
        if(o.avgEnergy<o.maxEnergy-1)spend(o.numEmployees*ns.corporation.getConstants().teaCostPerEmployee,'Tea',()=>ns.corporation.buyTea(name,city));
        if(o.avgMorale<o.maxMorale-1)spend(o.numEmployees*5e5,'Party',()=>ns.corporation.throwParty(name,city,5e5));
        if(ns.corporation.hasUnlock('Smart Supply')){
          ns.corporation.setSmartSupply(name,city,true);
          for(const material of Object.keys(industry.requiredMaterials))ns.corporation.setSmartSupplyOption(name,city,material,'leftovers');
        }
        // Retire persistent manual purchase rates left by interrupted setup scripts.
        for(const material of new Set([...Object.keys(industry.requiredMaterials),...(industry.producedMaterials??[]),'Hardware','Robots','AI Cores','Real Estate'])){
          ns.corporation.buyMaterial(name,city,material,0);
          // Existing cross-city fan-in can overfill the product warehouse.
          // Smart Supply supplies demand while existing excess inputs are consumed.
          if(ns.corporation.hasUnlock('Export'))for(const route of ns.corporation.getMaterial(name,city,material).exports)
            if(initial.divisions.includes(route.division))ns.corporation.cancelExportMaterial(name,city,route.division,route.city,material);
        }
        const w=ns.corporation.getWarehouse(name,city);
        if(w.sizeUsed>w.size*.75)spend(ns.corporation.getUpgradeWarehouseCost(name,city),`${name}: storage ${city}`,()=>ns.corporation.upgradeWarehouse(name,city));
        if(FACTORS[d.industry]){
          const sizes=BOOSTS.map(m=>ns.corporation.getMaterialData(m).size);
          const targets=boostTargets(w.size*.60,sizes,FACTORS[d.industry]);
          for(let i=0;i<BOOSTS.length;i++){
            const material=ns.corporation.getMaterial(name,city,BOOSTS[i]);
            const warehouse=ns.corporation.getWarehouse(name,city);
            const amount=Math.max(0,Math.min(targets[i]-material.stored,Math.floor((warehouse.size*.80-warehouse.sizeUsed)/sizes[i]),Math.floor(initial.funds*.001/material.marketPrice)));
            if(amount>=1)spend(amount*material.marketPrice,`${name}: boost ${city}`,()=>ns.corporation.bulkPurchase(name,city,BOOSTS[i],amount));
          }
        }
        for(const material of industry.producedMaterials??[]) {
          ns.corporation.sellMaterial(name,city,material,'MAX','MP');
          if(ns.corporation.hasResearched(name,'Market-TA.II'))ns.corporation.setMaterialMarketTA2(name,city,material,true);
        }
      }
      for(const research of ['Hi-Tech R&D Laboratory','Market-TA.I','Market-TA.II','AutoBrew','AutoPartyManager']) {
        if(ns.corporation.hasResearched(name,research))continue;
        const cost=ns.corporation.getResearchCost(name,research),points=ns.corporation.getDivision(name).researchPoints;
        if(points>=cost*2){ns.corporation.research(name,research);events.push(`${name}: ${research}`);}else break;
      }
      d=ns.corporation.getDivision(name);
      let products=d.products.map(p=>ns.corporation.getProduct(name,hq,p));
      for(const p of products.filter(p=>p.developmentProgress>=100)) {
        for(const city of d.cities)if(ns.corporation.hasWarehouse(name,city))ns.corporation.sellProduct(name,city,p.name,'MAX',productPrice(ns.corporation.getProduct(name,city,p.name)),false);
        if(ns.corporation.hasResearched(name,'Market-TA.II'))ns.corporation.setProductMarketTA2(name,p.name,true);
      }
      if(d.makesProducts&&ns.corporation.hasWarehouse(name,hq)&&!products.some(p=>p.developmentProgress<100)) {
        const investment=Math.min(5e9,ns.corporation.getCorporation().funds*.01,budget.remaining/2);
        const worst=[...products].sort((a,b)=>a.rating-b.rating)[0];
        const canReplace=products.length>=d.maxProducts&&products.length>1&&investment*2>=(worst.designInvestment+worst.advertisingInvestment)*1.5;
        if(investment>=1e8&&(products.length<d.maxProducts||canReplace))spend(investment*2,`${name}: develop product`,()=>{
          if(canReplace)ns.corporation.discontinueProduct(name,worst.name);
          ns.corporation.makeProduct(name,hq,'Series-'+Date.now(),investment,investment);
        });
      }
      if(d.makesProducts&&ns.corporation.getHireAdVertCount(name)<20)spend(ns.corporation.getHireAdVertCost(name),`${name}: advertising`,()=>ns.corporation.hireAdVert(name));
      summaries.push({name,industry:d.industry,research:d.researchPoints,products:ns.corporation.getDivision(name).products.map(p=>{const x=ns.corporation.getProduct(name,hq,p);return {name:p,progress:x.developmentProgress,rating:x.rating};})});
    }catch(e){errors.push(`${name}: ${String(e)}`);}
  }
  const corp=ns.corporation.getCorporation();
  return {funds:corp.funds,revenue:corp.revenue,expenses:corp.expenses,profit:corp.revenue-corp.expenses,dividends:corp.dividendEarnings,reserve:budget.reserve,events,errors,divisions:summaries};
}
export async function main(ns) {
  ns.disableLog('ALL');
  if(ns.ps('home').some(p=>p.filename===ns.getScriptName()&&p.pid<ns.pid))return;
  while(true){
    let status;
    try{status=ns.corporation.hasCorporation()?maintain(ns):{reason:'No corporation'};}
    catch(e){status={errors:[String(e)]};}
    await ns.write(STATUS,JSON.stringify({...status,pid:ns.pid,updatedAt:Date.now()}),'w');
    if(ns.corporation.hasCorporation()){
      do{await ns.corporation.nextUpdate();}while(ns.corporation.getCorporation().prevState!=='START');
    }else await ns.sleep(60000);
  }
}
