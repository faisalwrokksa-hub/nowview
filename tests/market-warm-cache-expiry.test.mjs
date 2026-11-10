import test from 'node:test';
import assert from 'node:assert/strict';
import {getChart} from '../web/market-data.mjs';

test('warm chart cache never returns a trade that crossed the 24-hour expiry', async () => {
 const realFetch=globalThis.fetch,realNow=Date.now;
 const clock=Date.now(),pair='ETHUSDT';
 let fail=false,requests=0;
 const payloads={
  exchangeInfo:{symbols:[{symbol:pair,baseAsset:'ETH',quoteAsset:'USDT',status:'TRADING'}]},
  klines:[[clock-60000,'100','110','90','105','10','0']],
  'ticker/24hr':{symbol:pair,priceChangePercent:'1.2'},
  trades:[{price:'105',time:clock-86390000}]
 };
 try{
  globalThis.fetch=async url=>{
   requests++;
   if(fail)throw new Error('upstream offline');
   const name=new URL(url).pathname.replace('/api/v3/','');
   return {ok:true,status:200,json:async()=>payloads[name]};
  };
  const first=await getChart('ETH','1D');
  assert.equal(first.price,105);
  fail=true;
  Date.now=()=>clock+20000;
  await assert.rejects(()=>getChart('ETH','1D'),/upstream offline/);
  assert.ok(requests>4,'must attempt refresh instead of returning expired warm-cache quote');
 }finally{
  globalThis.fetch=realFetch;
  Date.now=realNow;
 }
});
