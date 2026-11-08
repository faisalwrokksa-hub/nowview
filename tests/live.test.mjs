import test from 'node:test';
import assert from 'node:assert/strict';
import '../web/live.js';
const fresh=()=>({pair:'BTCUSDT',period:'1D',price:10,quoteTime:100,bars:[[100,10,12,9,11,2]]});
test('live quotes reject other symbols, old trades and invalid prices',()=>{
 const d=fresh();
 for(const e of [{s:'ETHUSDT',T:101000,p:'12'},{s:'BTCUSDT',T:99000,p:'12'},{s:'BTCUSDT',T:101000,p:'NaN'}])assert.equal(MarketLive.apply(d,{e:'trade',...e}),false);
 assert.equal(d.price,10);
 assert.equal(MarketLive.apply(d,{e:'trade',s:'BTCUSDT',T:101000,p:'12'}),true);
 assert.equal(d.quoteTime,101);assert.equal(d.price,12);
});
test('rolling ticker updates change without inventing a fresh trade time',()=>{
 const d=fresh();MarketLive.apply(d,{e:'24hrTicker',s:'BTCUSDT',P:'2.3',c:'99',E:999000});
 assert.equal(d.changePercent,2.3);assert.equal(d.quoteTime,100);assert.equal(d.price,10);
});
test('live candles replace current bar, append next bar and reject wrong intervals',()=>{
 const d=fresh(),k={s:'BTCUSDT',i:'5m',t:100000,o:'10',h:'13',l:'9',c:'12',v:'3'};
 assert.equal(MarketLive.apply(d,{e:'kline',s:'BTCUSDT',k}),true);assert.equal(d.bars.length,1);assert.equal(d.bars[0][4],12);
 assert.equal(MarketLive.apply(d,{e:'kline',s:'BTCUSDT',k:{...k,t:400000}}),true);assert.equal(d.bars.length,2);
 assert.equal(MarketLive.apply(d,{e:'kline',s:'BTCUSDT',k:{...k,i:'1m'}}),false);
 assert.equal(MarketLive.apply(d,{e:'kline',s:'BTCUSDT',k:{...k,t:700000,h:'8'}}),false);
});
