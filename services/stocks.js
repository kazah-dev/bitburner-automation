/** Long-only 4S trading with a cash reserve, exposure limits and commission checks. */
const STATUS='data/stocks-status.txt';
export function affordableShares(budget,maximum,cost) {
  let low=0,high=Math.max(0,Math.floor(maximum));
  while(low<high){const mid=Math.ceil((low+high)/2);if(cost(mid)<=budget)low=mid;else high=mid-1;}
  return low;
}
export async function main(ns) {
  ns.disableLog('ALL');
  if(ns.ps('home').some(p=>p.filename===ns.getScriptName()&&p.pid<ns.pid))return;
  let realized=0;
  while(true){
    const status={pid:ns.pid,updatedAt:Date.now(),realized,positions:[],reason:''};
    try{
      if(!ns.stock.hasTixApiAccess()||!ns.stock.has4SDataTixApi())status.reason='Waiting for TIX and 4S API access';
      else {
        const symbols=ns.stock.getSymbols(),fee=ns.stock.getConstants().StockMarketCommission;
        for(const symbol of symbols){
          const [shares,average]=ns.stock.getPosition(symbol);
          if(shares&&ns.stock.getForecast(symbol)<.50){
            const price=ns.stock.sellStock(symbol,shares);
            if(price>0)realized+=(price-average)*shares-fee;
          }
        }
        const positions=()=>symbols.map(symbol=>({symbol,shares:ns.stock.getPosition(symbol)[0],bid:ns.stock.getBidPrice(symbol)}));
        let held=positions().reduce((n,p)=>n+p.shares*p.bid,0);
        const wealth=ns.getPlayer().money+held,reserve=Math.max(1e9,wealth*.80);
        for(const symbol of symbols.filter(s=>ns.stock.getForecast(s)>=.60).sort((a,b)=>(ns.stock.getForecast(b)-.5)*ns.stock.getVolatility(b)-(ns.stock.getForecast(a)-.5)*ns.stock.getVolatility(a))){
          const [shares]=ns.stock.getPosition(symbol),bid=ns.stock.getBidPrice(symbol);
          const budget=Math.max(0,Math.min(ns.getPlayer().money-reserve,wealth*.20-held,wealth*.04-shares*bid));
          if(budget<fee*100)continue;
          const quantity=affordableShares(budget,ns.stock.getMaxShares(symbol)-shares,n=>ns.stock.getPurchaseCost(symbol,n,'L'));
          if(quantity<1)continue;
          const cost=ns.stock.getPurchaseCost(symbol,quantity,'L');
          const edge=(2*ns.stock.getForecast(symbol)-1)*ns.stock.getVolatility(symbol)*30;
          if(cost*edge<2*fee+quantity*(ns.stock.getAskPrice(symbol)-bid))continue;
          const price=ns.stock.buyStock(symbol,quantity);
          if(price>0){held+=quantity*bid;realized-=fee;}
        }
        status.positions=positions().filter(p=>p.shares);
        status.exposure=held;status.reserve=reserve;status.reason='4S long-only trading';status.realized=realized;
      }
    }catch(e){status.reason=String(e);status.error=true;}
    await ns.write(STATUS,JSON.stringify(status),'w');
    await ns.sleep(6000);
  }
}
