import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../web/source-monitor.js',import.meta.url),'utf8');

function setup({offline=false}={}){
 const callbacks=new Map(),requests=[];
 const window={addEventListener(){},dispatchEvent(){}};
 const document={
  readyState:'loading',hidden:false,
  body:{classList:{contains:()=>true},dataset:{currentWorkspace:'myview'}},
  addEventListener:(name,handler)=>callbacks.set(name,handler),
  getElementById:()=>null,
 };
 const fetch=async url=>{
  requests.push(String(url));
  if(String(url)==='/api/source-health')return {ok:false,status:503};
  return {ok:true,json:async()=>({items:[{url:'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260729a.htm'}]})};
 };
 const navigator={onLine:!offline};
 const ctx={window,document,location:{protocol:'https:'},navigator,
  localStorage:{getItem:()=>null,setItem(){}},fetch,Date,Map,Set,JSON,AbortController,CustomEvent:class{constructor(name,options){this.detail=options?.detail;this.name=name;}},
  setTimeout,clearTimeout,setInterval:()=>1,clearInterval:()=>{}};
 vm.runInNewContext(code,ctx);
 callbacks.get('DOMContentLoaded')();
 return {api:window.NewViewSourceMonitor,requests,navigator};
}
const urls=req=>req.filter(x=>x.startsWith('/api/news?source=')).map(x=>new URL(x,'https://newview.example').searchParams.get('source'));
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('background health monitor checks three rotating feeds each 2-minute cycle',async()=>{
 const {api,requests}=setup();
 await settle();await settle();
 assert.deepEqual(urls(requests),['fed','sec','stocktwits']);
 await api.checkNews();
 assert.deepEqual(urls(requests).slice(3),['bbc','npr','guardian']);
 await api.checkNews();
 assert.deepEqual(urls(requests).slice(6),['aljazeera','dw','pbs']);
 await api.checkNews();
 assert.deepEqual(urls(requests).slice(9),['fed','sec','stocktwits']);
 assert.equal(urls(requests).length,12);
});

test('explicit health check may scan all feeds; regular monitoring retains bounded defaults',async()=>{
 const {api,requests}=setup();
 await settle();await settle();
 await api.checkNews(true);
 assert.equal(urls(requests).length,12);
 assert.deepEqual(urls(requests).slice(3),Array.from(api.feeds));
 assert.equal(api.defaults.newsMs,120000);
 assert.equal(api.defaults.iptvMs,10800000);
 assert.match(code,/News batch every 2m \(all feeds ~6m\)/);
 assert.match(code,/refresh\.addEventListener\('click',\(\)=>\{checkNews\(true\)/);
});

test('offline mode does not probe feeds, then resumes bounded checks on reconnect',async()=>{
 const {api,requests,navigator}=setup({offline:true});
 await settle();await settle();
 assert.equal(requests.length,0,'offline startup should not make news or health requests');
 assert.equal(api.status('api','market'),'unknown');
 await api.checkNews(true);
 assert.equal(requests.length,0);
 navigator.onLine=true;
 await api.checkNews();
 assert.deepEqual(urls(requests),['fed','sec','stocktwits']);
});
test('offline recovery updates are explicit and cloud health is not called while offline',()=>{
 assert.match(code,/Device offline · source checks paused/);
 assert.match(code,/cloudHealth=null;mark\('api','market','unknown'/);
 assert.match(code,/if\(navigator\.onLine===false\)\{mark\('news',id,'unknown'/);
 assert.match(code,/checkNews\(\);checkCloud\(\);checkMarket\(\);/);
});

test('in-flight cloud replies cannot reintroduce a healthy badge after network loss',()=>{
 assert.match(code,/if\(navigator\.onLine===false\)\{cloudHealth=null;render\(\);return;\}/);
 assert.match(code,/if\(typeof navigator!=='undefined'&&navigator\.onLine===false\)\{/);
});
