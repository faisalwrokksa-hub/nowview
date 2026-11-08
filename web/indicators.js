'use strict';
globalThis.MarketIndicators={
 ema(values,period){
  const out=Array(values.length).fill(null);if(values.length<period)return out;
  let value=values.slice(0,period).reduce((a,b)=>a+b,0)/period;out[period-1]=value;
  for(let i=period;i<values.length;i++){value+=(values[i]-value)*2/(period+1);out[i]=value;}return out;
 },
 rsi(values,period=14){
  const out=Array(values.length).fill(null);if(values.length<=period)return out;
  let gain=0,loss=0;for(let i=1;i<=period;i++){const d=values[i]-values[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0);}gain/=period;loss/=period;
  const score=()=>loss===0?(gain===0?50:100):100-100/(1+gain/loss);out[period]=score();
  for(let i=period+1;i<values.length;i++){const d=values[i]-values[i-1];gain=(gain*(period-1)+Math.max(d,0))/period;loss=(loss*(period-1)+Math.max(-d,0))/period;out[i]=score();}return out;
 },
 calculate(bars){const closes=bars.map(b=>b[4]);return {fast:this.ema(closes,20),slow:this.ema(closes,50),rsi:this.rsi(closes)};},
 seconds(period){return {'1D':300,'5D':1800,'1M':14400,'3M':86400,'1Y':86400}[period];},
 // Confirmed candles only: no intrabar alerts that disappear before candle close.
 signal(bars,period,now=Date.now()/1000){
  const closed=bars.filter(b=>b[0]+this.seconds(period)<=now),i=closed.length-1;
  if(i<1)return {time:closed[i]?.[0]??0,events:[]};
  const a=this.calculate(closed),events=[];
  const cross=(before,after,level,up,down)=>{if(before===null||after===null)return;if(before<=level&&after>level)events.push(up);else if(before>=level&&after<level)events.push(down);};
  if(a.fast[i-1]!==null&&a.slow[i-1]!==null&&a.fast[i]!==null&&a.slow[i]!==null)cross(a.fast[i-1]-a.slow[i-1],a.fast[i]-a.slow[i],0,{id:'ema-up',tone:'up',text:'EMA 20 crossed above EMA 50'},{id:'ema-down',tone:'down',text:'EMA 20 crossed below EMA 50'});
  cross(a.rsi[i-1],a.rsi[i],30,{id:'rsi-30-up',tone:'up',text:'RSI crossed above 30'},{id:'rsi-30-down',tone:'down',text:'RSI crossed below 30'});
  cross(a.rsi[i-1],a.rsi[i],70,{id:'rsi-70-up',tone:'up',text:'RSI crossed above 70'},{id:'rsi-70-down',tone:'down',text:'RSI crossed below 70'});
  return {time:closed[i][0],price:closed[i][4],events};
 },
 accept(previous,signal,now,cooldowns){
  if(previous==null||signal.time<=previous)return [];
  return signal.events.filter(event=>{const last=cooldowns[event.id];if(last!=null&&now-last<300)return false;cooldowns[event.id]=now;return true;});
 }
};
