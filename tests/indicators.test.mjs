import test from 'node:test';
import assert from 'node:assert/strict';
import '../web/indicators.js';
const I=MarketIndicators;
test('EMA uses an SMA seed and the standard smoothing factor',()=>{
 assert.deepEqual(I.ema([1,2,3,4,5],3),[null,null,2,3,4]);
 assert.deepEqual(I.ema([1,2],3),[null,null]);
});
test('Wilder RSI matches a reference sequence and handles flat/up/down markets',()=>{
 const prices=[44.34,44.09,44.15,43.61,44.33,44.83,45.10,45.42,45.84,46.08,45.89,46.03,45.61,46.28,46.28,46.00];
 const values=I.rsi(prices);assert.ok(Math.abs(values[14]-70.464135)<.00001);assert.ok(Math.abs(values[15]-66.249619)<.00001);
 assert.equal(I.rsi(Array(20).fill(10)).at(-1),50);
 assert.equal(I.rsi(Array.from({length:20},(_,i)=>i)).at(-1),100);
 assert.equal(I.rsi(Array.from({length:20},(_,i)=>20-i)).at(-1),0);
});
const bars=()=>Array.from({length:56},(_,i)=>[300*(i+1),100,101,99,i===55?110:100,1]);
test('only closed candles trigger crossings and retain direction',()=>{
 const b=bars(),last=b.at(-1)[0];
 assert.equal(I.signal(b,'1D',last+299).events.length,0);
 const s=I.signal(b,'1D',last+300);assert.ok(s.events.some(e=>e.id==='ema-up'));assert.ok(s.events.some(e=>e.id==='rsi-70-up'));
 assert.equal(s.time,last);
});
test('initial load, repeated candle and cooldown cannot repeat alerts',()=>{
 const s={time:100,events:[{id:'ema-up'}]},cooldowns={};
 assert.deepEqual(I.accept(undefined,s,1000,cooldowns),[]);
 assert.deepEqual(I.accept(100,s,1000,cooldowns),[]);
 assert.equal(I.accept(99,s,1000,cooldowns).length,1);
 assert.equal(I.accept(100,{...s,time:200},1100,cooldowns).length,0);
 assert.equal(I.accept(200,{...s,time:300},1300,cooldowns).length,1);
});
