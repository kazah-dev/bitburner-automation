/** Read-only corporation and market snapshot. Kept locally in the game. */
export async function main(ns) {
  const c=ns.corporation;
  const report={updatedAt:Date.now(),reset:ns.getResetInfo(),money:ns.getPlayer().money,processes:ns.ps('home')};
  if(c.hasCorporation()) {
    report.corporation=c.getCorporation();
    report.offer=c.getInvestmentOffer();
    report.divisions=report.corporation.divisions.map(name=>{
      const d=c.getDivision(name);
      return {...d,research:c.getConstants().researchNames.filter(r=>c.hasResearched(name,r)),cities:d.cities.map(city=>({
        name:city,office:c.getOffice(name,city),warehouse:c.hasWarehouse(name,city)?c.getWarehouse(name,city):null,
        materials:c.hasWarehouse(name,city)?c.getConstants().materialNames.map(m=>c.getMaterial(name,city,m)):[],
        products:c.hasWarehouse(name,city)?d.products.map(p=>c.getProduct(name,city,p)):[]
      }))};
    });
  }
  report.stock={wse:ns.stock.hasWseAccount(),tix:ns.stock.hasTixApiAccess(),forecast:ns.stock.has4SDataTixApi()};
  await ns.write('data/business-audit.txt',JSON.stringify(report),'w');
  ns.tprint('Business snapshot saved to data/business-audit.txt');
}
