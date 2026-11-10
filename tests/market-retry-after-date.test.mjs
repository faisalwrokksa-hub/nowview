import test from 'node:test';
import assert from 'node:assert/strict';
import {getChart} from '../web/market-data.mjs';

test('Binance HTTP-date Retry-After prevents repeated requests beyond minimum cooldown', async () => {
 const originalFetch=globalThis.fetch,originalNow=Date.now;
 const start=Date.UTC(2026,10,10,12,0,0);
 let calls=0;
 try {
  Date.now=()=>start;
  globalThis.fetch=async ()=>{
   calls++;
   return {ok:false,status:429,headers:{get:()=>new Date(start+300000).toUTCString()}};
  };
  await assert.rejects(getChart('ETH','1D'),/unavailable|rate-limit/i);
  Date.now=()=>start+61000;
  await assert.rejects(getChart('ETH','1D'),/cooldown/i);
  assert.equal(calls,1,'HTTP-date cooldown must prevent a retry after 61 seconds');
 } finally {
  globalThis.fetch=originalFetch;
  Date.now=originalNow;
 }
});
