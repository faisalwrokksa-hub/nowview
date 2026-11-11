import test from 'node:test';
import assert from 'node:assert/strict';
import {getChart} from '../web/market-data.mjs';

test('refresh failure keeps last verified trade explicitly stale without inventing a price', async () => {
 const realFetch=globalThis.fetch,realNow=Date.now;
 const clock=Date.now();
 let fail=false;
 const pair='BTCUSDT';
 const payloads={
  exchangeInfo:{symbols:[{symbol:pair,baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING'}]},
  klines:[[clock-60000,'100','110','90','105','10','0']],
  'ticker/24hr':{symbol:pair,priceChangePercent:'1.2'},
  trades:[{price:'105',time:clock-5000}]
 };
 try{
  globalThis.fetch=async url=>{
   if(fail)throw new Error('upstream offline');
   const name=new URL(url).pathname.replace('/api/v3/','');
   return {ok:true,status:200,json:async()=>payloads[name]};
  };
  const first=await getChart('BTC','1D');
  assert.equal(first.price,105);
  fail=true;
  Date.now=()=>clock+31000;
  const fallback=await getChart('BTC','1D');
  assert.equal(fallback.price,first.price);
  assert.equal(fallback.quoteTime,first.quoteTime);
  assert.match(fallback.status,/stale/i);
  assert.match(fallback.refreshError,/unavailable/i);
 }finally{
  globalThis.fetch=realFetch;
  Date.now=realNow;
 }
});
