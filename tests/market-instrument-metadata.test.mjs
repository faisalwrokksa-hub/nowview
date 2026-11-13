import test from 'node:test';
import assert from 'node:assert/strict';
import {getChart,normalise} from '../web/market-data.mjs';

test('mismatched exchangeInfo prevents downstream chart, ticker and trade fetches',async()=>{
 const originalFetch=globalThis.fetch,calls=[];
 try{
  globalThis.fetch=async url=>{calls.push(String(url));return {ok:true,status:200,json:async()=>({symbols:[{symbol:'ETHUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING'}]})};};
  await assert.rejects(getChart('ETH','3M'),/instrument identity mismatch/i);
  assert.equal(calls.length,1);
  assert.match(calls[0],/exchangeInfo/);
 }finally{globalThis.fetch=originalFetch;}
});

test('future Binance trade timestamps are not misrepresented as recent quotes',()=>{
 const now=Date.UTC(2026,10,13,12,0,0)/1000;
 const info={symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING'};
 const ticker={symbol:'BTCUSDT',priceChangePercent:'1.0'};
 const bar=t=>[t*1000,'100','110','90','105','1',t*1000+1000];
 const valid=[bar(now-60)];
 assert.throws(()=>normalise(valid,ticker,[{price:'105',time:(now+60)*1000}],info,'BTC','1D',now),/timestamped Binance trade/);
 assert.throws(()=>normalise([bar(now+60)],ticker,[{price:'105',time:(now-5)*1000}],info,'BTC','1D',now),/valid Binance historical bars/);
 const quote=normalise(valid,ticker,[{price:'105',time:(now+3)*1000}],info,'BTC','1D',now);
 assert.equal(quote.symbol,'BTC');
 assert.equal(quote.ageSeconds,0);
});
