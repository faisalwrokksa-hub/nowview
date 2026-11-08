'use strict';
const symbols=['SOXLB','SOXSB','NVDAB','AMDB','AVGOB','TSMB','MUB','ASMLB','SMHB','INTCB','AMATB','ARMB','MRVLB','SMCIB','BMNRB','TQQQB','SQQQB','BTC','ETH'];
const ranges=['1D','5D','1M','3M','1Y'];
const $=id=>document.getElementById(id);
const compact=new URLSearchParams(location.search).get('home')==='1';
if(compact)document.body.classList.add('home-panel');
let selected=localStorage.getItem('symbol')||'SOXLB',period='1D',candles=false,data=null,generation=0;
if(!symbols.includes(selected))selected='SOXLB';
const pending=new Map();let nativeId=0;
let alertsEnabled=localStorage.getItem('alerts')!=='off',alertTimer,lightTimer;
const signalTimes=new Map();let cooldowns={};
try{cooldowns=JSON.parse(localStorage.getItem('alertCooldowns')||'{}')||{};}catch(ignore){}
function alertControls(){
 $('alerts').textContent='Alerts: '+(alertsEnabled?'on':'off');$('alerts').setAttribute('aria-pressed',String(alertsEnabled));
 $('alert-label').textContent=alertsEnabled?'Crossing alerts on · candle close':'Crossing alerts off';
 $('alert-light').classList.toggle('disabled',!alertsEnabled);
}
function notify(event,demo=false){
 const light=$('alert-light'),toast=$('alert-toast');clearTimeout(alertTimer);clearTimeout(lightTimer);
 light.className='alert-light '+event.tone;toast.className=event.tone;
 $('alert-title').textContent=demo?'Test alert light':data.symbol+' · '+event.text;
 $('alert-detail').textContent=demo?'Preview only · no market crossing detected':money(event.price)+' · confirmed '+event.interval+' candle · '+date(event.time)+' Riyadh';
 toast.hidden=false;alertTimer=setTimeout(()=>{toast.hidden=true;},6500);
 lightTimer=setTimeout(()=>{light.className='alert-light';alertControls();},15000);
}
function checkSignals(){
 const key=data.symbol+':'+data.period,signal=MarketIndicators.signal(data.bars,data.period),previous=signalTimes.get(key);
 signalTimes.set(key,signal.time);
 if(!alertsEnabled||Date.now()/1000-data.quoteTime>120||Date.now()/1000-(signal.time+MarketIndicators.seconds(data.period))>120)return;
 const saved=cooldowns[key]||{},events=MarketIndicators.accept(previous,signal,Date.now()/1000,saved);cooldowns[key]=saved;
 if(events.length){localStorage.setItem('alertCooldowns',JSON.stringify(cooldowns));notify({...events[0],price:signal.price,time:signal.time+MarketIndicators.seconds(data.period),interval:{'1D':'5m','5D':'30m','1M':'4h','3M':'1d','1Y':'1d'}[data.period]});}
}
let stopLive=null,liveKey='',liveState='connecting',liveDirty=false;
function subscribe(){
 const key=selected+':'+period;if(key===liveKey)return;
 if(stopLive)stopLive();liveKey=key;liveState='connecting';
 stopLive=MarketLive.connect(selected,period,event=>{if(data&&key===selected+':'+period&&MarketLive.apply(data,event))liveDirty=true;},state=>{liveState=state;liveDirty=true;});
}
window.__fintechResult=(id,payload)=>{const p=pending.get(id);if(!p)return;clearTimeout(p.timer);pending.delete(id);payload.error?p.reject(new Error(payload.error)):p.resolve(payload);};
function request(symbol,range){
 if(window.Fintech&&window.Fintech.requestChart)return new Promise((resolve,reject)=>{const id=++nativeId;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Market source timed out. Try Refresh.'));},45000);pending.set(id,{resolve,reject,timer});window.Fintech.requestChart(symbol,range,id);});
 return import('./market-data.mjs').then(m=>m.getChart(symbol,range));
}
function nav(){
 const symbolNav=$('symbols'),rangeNav=$('ranges');
 // Build each TV remote target once: rebuilding buttons every refresh loses D-pad focus.
 if(!symbolNav.children.length)symbolNav.replaceChildren(...symbols.map(s=>button(s,false,()=>{selected=s;localStorage.setItem('symbol',s);load();})));
 if(!rangeNav.children.length)rangeNav.replaceChildren(...ranges.map(r=>button(r,false,()=>{period=r;load();})));
 [...symbolNav.children].forEach((b,i)=>{const active=symbols[i]===selected;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 [...rangeNav.children].forEach((b,i)=>{const active=ranges[i]===period;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
function button(text,active,onClick){const b=document.createElement('button');b.textContent=text;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));b.onclick=onClick;return b;}
const date=(t,zone='Asia/Riyadh',short=false)=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',...(short?{}:{year:'numeric'})}).format(new Date(t*1000));
function money(value,currency='USDT'){return new Intl.NumberFormat('en-US',{maximumFractionDigits:2,minimumFractionDigits:2}).format(value)+' '+currency;}
function render(){
 $('security').textContent=data.symbol+' / USDT · '+data.name;
 $('price').textContent=money(data.price,data.currency);
 const c=data.changePercent;$('change').textContent=c==null?'24-hour change unavailable':(c>=0?'+':'')+c.toFixed(2)+'% · rolling 24h';$('change').className=c==null?'':c>=0?'positive':'negative';
 const age=Math.max(0,Date.now()/1000-data.quoteTime);$('status').textContent=age>120?'Historical / stale':liveState==='live'?'Live · 1s display':'Reconnecting · 30s fallback';
 $('session').textContent=data.session;$('asof').textContent='Quote: '+date(data.quoteTime)+' Riyadh';
 $('received').textContent='Fetched '+date(data.fetchedAt,'Asia/Riyadh',true)+' · '+data.bars.length+' bars';
 $('bar-caption').textContent=period+' · '+data.currency+' · '+(candles?'OHLC candles':'Close prices')+' · EMA 20/50 · RSI 14';checkSignals();draw();
}
async function load(quiet=false){
 const ticket=++generation;nav();
 if(!quiet||!data||data.symbol!==selected||data.period!==period){data=null;$('price').textContent='—';$('security').textContent=selected;$('change').textContent='Loading historical prices…';$('change').className='';$('asof').textContent='Waiting for a quote';$('session').textContent='—';$('status').textContent='Loading';$('received').textContent='—';$('bar-caption').textContent='Historical prices';$('message').textContent='Connecting to the market source…';$('message').classList.remove('hidden');}
 try{const result=await request(selected,period);if(ticket!==generation)return;if(!result.bars||!result.bars.length||!Number.isFinite(result.price))throw new Error('No valid market data received');data=result;subscribe();$('message').classList.add('hidden');render();}
 catch(error){if(ticket!==generation)return;if(data){$('status').textContent='Refresh failed / cached';$('received').textContent='Refresh failed · last fetched '+date(data.fetchedAt,'Asia/Riyadh',true);draw();}else{$('status').textContent='Unavailable';$('message').textContent=error.message+'\nUse Refresh to retry. No substitute prices are shown.';$('message').classList.remove('hidden');}}
}
function draw(){
 if(!data)return;const canvas=$('chart'),rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const w=rect.width,h=rect.height,pad={l:10,r:78,t:12,b:30},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;if(cw<10||ch<10)return;
 const bars=data.bars,ind=MarketIndicators.calculate(bars),last=bars.length-1;
 const number=v=>v==null?'—':v.toLocaleString('en-US',{maximumFractionDigits:2});
 $('ema-fast').textContent=number(ind.fast[last]);$('ema-slow').textContent=number(ind.slow[last]);$('rsi-value').textContent=number(ind.rsi[last]);
 const values=[...bars.map(b=>candles?b[3]:b[4]),...bars.map(b=>candles?b[2]:b[4]),...ind.fast.filter(v=>v!==null),...ind.slow.filter(v=>v!==null)];
 let lo=Math.min(...values),hi=Math.max(...values);const span=hi-lo||hi*.02||1;lo-=span*.09;hi+=span*.09;
 const priceH=ch*.7,rsiTop=pad.t+ch*.79,rsiH=ch*.21;
 const x=i=>pad.l+(i/(bars.length-1||1))*cw,y=v=>pad.t+(hi-v)/(hi-lo)*priceH,ry=v=>rsiTop+(100-v)/100*rsiH;
 ctx.font=Math.max(10,Math.min(14,w/90))+'px Arial';ctx.lineWidth=1;
 for(let i=0;i<5;i++){const yy=pad.t+priceH*i/4;ctx.strokeStyle='#263444';ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(pad.l+cw,yy);ctx.stroke();ctx.fillStyle='#94a6bd';ctx.textAlign='left';ctx.fillText((hi-(hi-lo)*i/4).toLocaleString('en-US',{maximumFractionDigits:2}),pad.l+cw+10,yy+4);}
 const dateFmt=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Riyadh',...(period==='1D'?{hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric'})});
 for(let k=0;k<4;k++){const i=Math.round(k*(bars.length-1)/3);ctx.textAlign=k===0?'left':k===3?'right':'center';ctx.fillText(dateFmt.format(new Date(bars[i][0]*1000)),x(i),h-6);}
 if(candles){const bw=Math.max(1,Math.min(12,cw/bars.length*.65));bars.forEach((b,i)=>{ctx.strokeStyle=ctx.fillStyle=b[4]>=b[1]?'#73e4aa':'#ff8a93';ctx.beginPath();ctx.moveTo(x(i),y(b[2]));ctx.lineTo(x(i),y(b[3]));ctx.stroke();ctx.fillRect(x(i)-bw/2,Math.min(y(b[1]),y(b[4])),bw,Math.max(1,Math.abs(y(b[1])-y(b[4]))));});}
 else{ctx.strokeStyle='#56e0d0';ctx.lineWidth=2.5;ctx.beginPath();bars.forEach((b,i)=>{const gap=i&&['1D','5D'].includes(period)&&b[0]-bars[i-1][0]>(period==='1D'?900:5400);if(i===0||gap)ctx.moveTo(x(i),y(b[4]));else ctx.lineTo(x(i),y(b[4]));});ctx.stroke();const last=bars[bars.length-1];ctx.fillStyle='#56e0d0';ctx.beginPath();ctx.arc(x(bars.length-1),y(last[4]),4,0,Math.PI*2);ctx.fill();}
 function line(series,color,scale){ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();let started=false;series.forEach((v,i)=>{if(v===null){started=false;return;}if(started)ctx.lineTo(x(i),scale(v));else{ctx.moveTo(x(i),scale(v));started=true;}});ctx.stroke();}
 line(ind.fast,'#f5c76a',y);line(ind.slow,'#a9a1ff',y);
 ctx.fillStyle='#a9a1ff0c';ctx.fillRect(pad.l,ry(70),cw,ry(30)-ry(70));
 ctx.font='10px Arial';ctx.textAlign='left';
 for(const level of [30,70]){ctx.strokeStyle='#3c4059';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(pad.l,ry(level));ctx.lineTo(pad.l+cw,ry(level));ctx.stroke();ctx.fillStyle='#94a6bd';ctx.fillText('RSI '+level,pad.l+cw+8,ry(level)+3);}ctx.setLineDash([]);
 line(ind.rsi,'#b5adff',ry);
}
function clocks(){const now=new Date();$('riyadh').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now)+'  Riyadh';$('newyork').textContent=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',minute:'2-digit'}).format(now)+'  New York';}
$('refresh').onclick=()=>load();$('mode').onclick=()=>{candles=!candles;$('mode').textContent=candles?'Candles':'Line chart';if(data)render();};
$('alerts').onclick=()=>{alertsEnabled=!alertsEnabled;localStorage.setItem('alerts',alertsEnabled?'on':'off');signalTimes.clear();if(!alertsEnabled){$('alert-toast').hidden=true;clearTimeout(lightTimer);$('alert-light').className='alert-light';}alertControls();};
$('test-alert').onclick=()=>notify({tone:'up'},true);alertControls();
document.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;const buttons=[...document.querySelectorAll('button:not(:disabled)')];const current=document.activeElement;if(!buttons.includes(current)){buttons[0].focus();event.preventDefault();return;}const r=current.getBoundingClientRect(),cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;let best=null,score=Infinity;buttons.forEach(b=>{if(b===current)return;const q=b.getBoundingClientRect(),dx=(q.left+q.right)/2-cx,dy=(q.top+q.bottom)/2-cy;const horizontal=event.key==='ArrowLeft'||event.key==='ArrowRight',forward=event.key==='ArrowLeft'?dx< -2:event.key==='ArrowRight'?dx>2:event.key==='ArrowUp'?dy< -2:dy>2;if(!forward)return;const s=horizontal?Math.abs(dx)+Math.abs(dy)*5:Math.abs(dy)+Math.abs(dx)*.2;if(s<score){score=s;best=b;}});if(best){best.focus();best.scrollIntoView({block:'nearest',inline:'nearest'});}event.preventDefault();});
if(window.Fintech&&window.Fintech.getPanelEnabled&&!compact){const ready=window.Fintech.getPanelReady();const b=button(ready?'Home panel: '+(window.Fintech.getPanelEnabled()?'on':'off'):'Home panel: setup needed',false,()=>{if(!window.Fintech.getPanelReady())return;const enabled=!window.Fintech.getPanelEnabled();window.Fintech.setPanelEnabled(enabled);b.textContent='Home panel: '+(enabled?'on':'off');});b.disabled=!ready;document.querySelector('.chart-tools').prepend(b);}
window.addEventListener('resize',draw);clocks();setInterval(clocks,1000);setInterval(()=>{if(!document.hidden&&liveState!=='live')load(true);},30000);
setInterval(()=>{if(data&&!document.hidden){render();liveDirty=false;}},1000);
window.addEventListener('pagehide',()=>{if(stopLive)stopLive();liveKey='';});
window.addEventListener('pageshow',()=>{if(data)subscribe();});
if(compact){
  setInterval(()=>{
    if(document.hidden)return;
    selected=symbols[(symbols.indexOf(selected)+1)%symbols.length];
    load();
  },20000);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)load(true);
  });
}
load();

