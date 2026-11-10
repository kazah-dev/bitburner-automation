/** Optional bounded purchases. Select 'market' or 'nodes', then add 'apply'. */
export async function main(ns){
  const apply=ns.args.includes('apply'),cash=ns.getPlayer().money,budget=Math.min(1e11,cash*.03),reserve=cash-budget;
  ns.tprint(`Spending cap: ${ns.format.money(budget)}. ${apply?'Applying purchases.':'Preview only; add apply to buy.'}`);
  if(!apply)return;
  const costs=ns.stock.getConstants();
  let marketCost=Infinity;
  const reset=ns.getResetInfo();
  if(reset.currentNode===5||reset.ownedSF.has(5))marketCost=costs.MarketDataTixApi4SCost*ns.getBitNodeMultipliers().FourSigmaMarketDataApiCost;
  else if(ns.args.includes('market'))ns.tprint('Market purchase skipped: exact BitNode cost unavailable. Buy 4S API in the Stock Market UI.');
  if(ns.args.includes('market')&&ns.stock.hasTixApiAccess()&&!ns.stock.has4SDataTixApi()&&cash-marketCost>=reserve){
    ns.stock.purchase4SMarketDataTixApi();
  }
  while(ns.args.includes('nodes')&&ns.hacknet.numNodes()<30){
    const cost=ns.hacknet.getPurchaseNodeCost();
    if(!Number.isFinite(cost)||ns.getPlayer().money-cost<reserve)break;
    if(ns.hacknet.purchaseNode()<0)break;
    await ns.sleep(20);
  }
  ns.tprint(`Hacknet nodes: ${ns.hacknet.numNodes()}. 4S API: ${ns.stock.has4SDataTixApi()}. Spent: ${ns.format.money(cash-ns.getPlayer().money)}.`);
}
