import test from 'node:test';
import assert from 'node:assert/strict';
import {getChart} from '../web/market-data.mjs';

test('mismatched exchangeInfo prevents downstream chart, ticker and trade fetches',async()=>{
 const originalFetch=globalThis.fetch,calls=[];
 try{
  globalThis.fetch=async url=>{calls.push(String(url));return {ok:true,status:200,json:async()=>({symbols:[{symbol:'ETHUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING'}]})};};
  await assert.rejects(getChart('ETH','3M'),/instrument identity mismatch/i);
  assert.equal(calls.length,1);
  assert.match(calls[0],/exchangeInfo/);
 }finally{globalThis.fetch=originalFetch;}
});
