import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../web/news.js',import.meta.url),'utf8');

class FakeElement {
 constructor(tag='div'){
  this.tagName=tag;this.children=[];this.listeners=new Map();this.attributes=new Map();
  this.textContent='';this.hidden=false;this.value='';this.options=[];this.parentElement=null;
  this.classList={toggle(){}};this.style={};
 }
 append(...nodes){this.children.push(...nodes);}
 insertBefore(node){this.children.push(node);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(key,value){this.attributes.set(key,String(value));}
 removeAttribute(key){this.attributes.delete(key);}
 addEventListener(name,listener){this.listeners.set(name,listener);}
 querySelector(){return null;}
 focus(){this.focused=true;}
 blur(){this.focused=false;}
 get selectedOptions(){return this.options.filter(x=>x.value===this.value);}
}
const article=(title,url)=>({title,url,source:'Federal Reserve',summary:'Official release summary',publishedAt:'2026-11-12T09:00:00Z'});

function harness(responses){
 const elements={};
 for(const id of ['news-items','news-status','news-source','news-refresh','news-original'])elements[id]=new FakeElement();
 const container=elements['news-items'],refresh=elements['news-refresh'],choose=elements['news-source'];
 container.parentElement=new FakeElement('section');
 refresh.parentElement=new FakeElement('section');
 choose.options=[{value:'fed',hidden:false},{value:'sec',hidden:false}];
 choose.value='fed';
 const marks=[];
 const window={
  NewViewSourceMonitor:{getSettings:()=>({hideFailed:false}),status:()=> 'unknown',mark:(...p)=>marks.push(p)},
  addEventListener(){},dispatchEvent(){},
 };
 const document={
  body:{dataset:{currentWorkspace:'myview'}},
  createElement:tag=>new FakeElement(tag),
  getElementById:id=>elements[id]||null,
  addEventListener(){},
 };
 let calls=0;
 const fetch=async()=>{
  calls++;const response=responses.shift();
  if(response instanceof Error)throw response;
  if(!response)throw Error('No mock response');
  return {ok:true,json:async()=>response};
 };
 vm.runInNewContext(script,{
  window,document,location:{protocol:'https:'},URL,Date,fetch,AbortController,DOMException,
  setTimeout,clearTimeout,setInterval:()=>0,CustomEvent:class{constructor(name,options){this.name=name;this.detail=options?.detail;}}
 });
 return {elements,marks,window,refresh:()=>refresh.listeners.get('click')(),choose,calls:()=>calls};
}

test('failed news refresh keeps only source-matched verified articles and labels them stale',async()=>{
 const item=article('Federal Reserve policy release','https://www.federalreserve.gov/newsevents/pressreleases/monetary20260729a.htm');
 const h=harness([{items:[item],fetchedAt:'2026-11-12T09:00:00Z'},new Error('Network unreachable'),new Error('SEC network failed')]);
 await h.refresh();
 assert.equal(h.window.NewViewNewsReader.getItems().length,1);
 assert.equal(h.elements['news-items'].children.length,1);
 await h.refresh();
 assert.equal(h.window.NewViewNewsReader.getItems()[0].url,item.url);
 assert.equal(h.elements['news-items'].children.length,1);
 assert.match(h.elements['news-status'].textContent,/Live headlines unavailable.*previously verified/);
 assert.equal(h.marks.at(-1)[2],'unknown','never mark cached data as current');
 assert.equal(h.elements['news-refresh'].disabled,false);
 assert.equal(h.elements['news-items'].attributes.has('aria-busy'),false);
 h.choose.value='sec';
 await h.refresh();
 assert.equal(h.window.NewViewNewsReader.getItems().length,0,'never reuse another publisher cache');
 assert.equal(h.elements['news-items'].children.length,0);
 assert.match(h.elements['news-status'].textContent,/Headlines unavailable/);
 assert.equal(h.marks.at(-1)[2],'failed');
});

test('timeouts show recoverable news state and reject hostile link payloads',async()=>{
 const item=article('Official','https://www.sec.gov.evil.example/newsroom/press-releases/fake');
 const h=harness([{items:[item],fetchedAt:'2026-11-12T09:00:00Z'},new DOMException('The operation was aborted.','AbortError')]);
 await h.refresh();
 assert.match(h.elements['news-status'].textContent,/No valid source-linked articles/);
 assert.equal(h.window.NewViewNewsReader.getItems().length,0);
 await h.refresh();
 assert.match(h.elements['news-status'].textContent,/Request timed out/);
 assert.equal(h.elements['news-refresh'].disabled,false);
});

test('source-specific cache cannot be mislabelled current when a refresh fails',async()=>{
 const fed=article('Fed','https://www.federalreserve.gov/newsevents/pressreleases/monetary20260729a.htm');
 const sec=article('SEC','https://www.sec.gov/newsroom/press-releases/2026-111');
 const h=harness([
  {items:[fed],fetchedAt:'2026-11-12T09:00:00Z'},
  {items:[sec],fetchedAt:'2026-11-12T09:00:00Z'},
  new Error('Fail fed')
 ]);
 await h.refresh();h.choose.value='sec';await h.refresh();h.choose.value='fed';await h.refresh();
 assert.equal(h.window.NewViewNewsReader.getItems()[0].url,fed.url);
 assert.equal(h.marks.at(-1)[1],'fed');
 assert.equal(h.marks.at(-1)[2],'unknown');
});
