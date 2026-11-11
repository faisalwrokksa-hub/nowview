export const symbols=['SOXLB','SOXSB','NVDAB','AMDB','AVGOB','TSMB','MUB','ASMLB','SMHB','INTCB','AMATB','ARMB','MRVLB','SMCIB','BMNRB','TQQQB','SQQQB','BTC','ETH'];
const ranges={'1D':['5m',86400],'5D':['30m',432000],'1M':['4h',2592000],'3M':['1d',7776000],'1Y':['1d',31536000]};
const positive=v=>v!==null&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))&&Number(v)>0;
export function normalise(klines,ticker,trades,info,symbol,period,now){
 const pair=symbol+'USDT';
 if(info.symbol!==pair||info.baseAsset!==symbol||info.quoteAsset!=='USDT'||ticker.symbol!==pair)throw new Error('Binance instrument identity mismatch');
 if(info.status!=='TRADING')throw new Error('This exact Binance token pair is not trading');
 const points=new Map();for(const r of klines){if(!Array.isArray(r)||r.length<7||!positive(r[0])||Number(r[0])/1000>now+180||!r.slice(1,5).every(positive))continue;const [o,h,l,c]=r.slice(1,5).map(Number);if(h<Math.max(o,l,c)||l>Math.min(o,h,c))continue;const stamp=Math.floor(Number(r[0])/1000),v=Number(r[5]);points.set(stamp,[stamp,o,h,l,c,r[5]!==null&&Number.isFinite(v)&&v>=0?v:null]);}
 const bars=[...points.values()].sort((a,b)=>a[0]-b[0]);if(!bars.length)throw new Error('No valid Binance historical bars');
 const trade=trades.filter(t=>positive(t.price)&&positive(t.time)&&Number(t.time)/1000<=now+180).sort((a,b)=>Number(b.time)-Number(a.time))[0];if(!trade)throw new Error('No timestamped Binance trade');
 const quoteTime=Math.floor(Number(trade.time)/1000),ageSeconds=Math.max(0,Math.floor(now-quoteTime)),change=ticker.priceChangePercent;
 return {symbol,pair,name:symbol==='BTC'?'Bitcoin':symbol==='ETH'?'Ethereum':'Tokenized stock / ETF',currency:'USDT',period,price:Number(trade.price),quoteTime,fetchedAt:Math.floor(now),ageSeconds,status:ageSeconds>120?'Historical / stale':'Recent exchange trade',session:'Binance Spot · TRADING · 24/7 market',changePercent:change!==null&&change!==''&&Number.isFinite(Number(change))?Number(change):null,changeBasis:'24h',bars,source:'Binance public market-data API',delay:'Last-trade timestamp shown; no account or trading connection'};
}
const cache=new Map(),pending=new Map();let blockedUntil=0;
export async function getChart(symbol,period){
 if(!symbols.includes(symbol)||!ranges[period])throw new Error('Unsupported token or range');
 const key=symbol+':'+period,previous=cache.get(key),now=Date.now()/1000;
 if(previous&&now-previous.fetchedAt<30&&Number.isFinite(previous.quoteTime)&&previous.quoteTime>0&&now-previous.quoteTime<=86400){
  // Cached quotes must not retain a frozen freshness label as wall-clock time advances.
  const ageSeconds=Math.max(0,Math.floor(now-previous.quoteTime));
  return {...previous,ageSeconds,status:ageSeconds>120?'Historical / stale':'Recent exchange trade'};
 }
 if(pending.has(key))return pending.get(key);
 const promise=(async()=>{
  const read=async(path,params)=>{
   if(Date.now()/1000<blockedUntil)throw new Error('Binance rate-limit cooldown; try again later');
   const response=await fetch('https://data-api.binance.vision/api/v3/'+path+'?'+new URLSearchParams(params),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
   if(response.status===418||response.status===429){const retryAfter=response.headers.get('Retry-After');const seconds=retryAfter===null?NaN:Number(retryAfter);const dateSeconds=retryAfter===null?NaN:(Date.parse(retryAfter)-Date.now())/1000;const wait=Number.isFinite(seconds)?seconds:dateSeconds;blockedUntil=Date.now()/1000+Math.max(60,Math.min(86400,Number.isFinite(wait)?wait:60));}
   if(!response.ok)throw new Error('Binance data unavailable or rate-limited');return response.json();
  };
  const pair=symbol+'USDT',metadata=await read('exchangeInfo',{symbol:pair}),info=metadata.symbols?.[0];
  if(!info||info.symbol!==pair||info.baseAsset!==symbol||info.quoteAsset!=='USDT')throw new Error('Binance instrument identity mismatch');
  if(info.status!=='TRADING')throw new Error('This exact token pair is not trading on Binance Spot');
  const [interval,seconds]=ranges[period];
  const [klines,ticker,trades]=await Promise.all([read('klines',{symbol:pair,interval,limit:'1000',startTime:String(Math.floor((now-seconds)*1000))}),read('ticker/24hr',{symbol:pair}),read('trades',{symbol:pair,limit:'1'})]);
  const answer=normalise(klines,ticker,trades,info,symbol,period,Date.now()/1000);cache.set(key,answer);return answer;
 })();pending.set(key,promise);try{return await promise;}catch(error){
  // Preserve the last *verified* exchange trade when an upstream request fails.
  // Never present it as a fresh quote or silently substitute a different asset.
  // Discard trades older than 24 hours rather than display indefinitely stale prices.
  if(previous&&previous.symbol===symbol&&previous.period===period&&Number.isFinite(previous.quoteTime)&&previous.quoteTime>0&&Date.now()/1000-previous.quoteTime<=86400){
   const ageSeconds=Math.max(0,Math.floor(Date.now()/1000-previous.quoteTime));
   return {...previous,ageSeconds,status:'Historical / stale · live refresh unavailable',refreshError:'Binance data temporarily unavailable; showing last verified trade'};
  }
  throw error;
 }finally{pending.delete(key);}
}
