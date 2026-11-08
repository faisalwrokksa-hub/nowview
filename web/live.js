'use strict';
// Shared by the TV WebView and browser. Only timestamped trades change the quote.
globalThis.MarketLive={
 apply(data,event){
  if(!data||event.s!==data.pair)return false;
  const price=Number(event.p),stamp=Number(event.T)/1000;
  if(event.e==='trade'){
   if(!Number.isFinite(price)||price<=0||!Number.isFinite(stamp)||stamp<data.quoteTime||stamp>Date.now()/1000+180)return false;
   data.price=price;data.quoteTime=stamp;return true;
  }
  if(event.e==='24hrTicker'){
   const change=Number(event.P);if(event.P!==null&&event.P!==''&&Number.isFinite(change))data.changePercent=change;
   return true;
  }
  if(event.e==='kline'){
   const k=event.k,interval={'1D':'5m','5D':'30m','1M':'4h','3M':'1d','1Y':'1d'}[data.period];
   if(!k||k.i!==interval||k.s!==data.pair)return false;
   const b=[Number(k.t)/1000,...[k.o,k.h,k.l,k.c,k.v].map(Number)];
   if(!b.every(Number.isFinite)||b.slice(0,5).some(n=>n<=0)||b[5]<0||b[2]<Math.max(b[1],b[3],b[4])||b[3]>Math.min(b[1],b[2],b[4])||b[0]>Date.now()/1000+180)return false;
   const last=data.bars[data.bars.length-1];if(last&&b[0]<last[0])return false;
   if(last&&b[0]===last[0])data.bars[data.bars.length-1]=b;else{data.bars.push(b);if(data.bars.length>1000)data.bars.shift();}
   return true;
  }
  return false;
 },
 connect(symbol,period,onEvent,onState){
  let socket,timer,stopped=false,delay=1000;
  const pair=(symbol+'USDT').toLowerCase(),interval={'1D':'5m','5D':'30m','1M':'4h','3M':'1d','1Y':'1d'}[period];
  function open(){
   if(stopped)return;
   onState('connecting');
   socket=new WebSocket('wss://stream.binance.com:443/stream?streams='+pair+'@trade/'+pair+'@ticker/'+pair+'@kline_'+interval);
   socket.onopen=()=>{delay=1000;onState('live');};
   socket.onmessage=e=>{try{onEvent(JSON.parse(e.data).data);}catch(ignore){}};
   socket.onerror=()=>socket.close();
   socket.onclose=()=>{if(stopped)return;onState('reconnecting');timer=setTimeout(open,delay);delay=Math.min(delay*2,30000);};
  }
  open();return ()=>{stopped=true;clearTimeout(timer);if(socket)socket.close();};
 }
};
