import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../web/business.js',import.meta.url),'utf8');
const valid='date,revenue,cost,orders,customers\n2026-11-10,120,40,3,8\n';

class Element {
 constructor(){this.listeners=new Map();this.attributes=new Map();this.children=[];this.parentNode={insertBefore(){}};this.style={};this.value='';this.hidden=false;this.files=[];}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 setAttribute(k,v){this.attributes.set(k,String(v));}
 removeAttribute(k){this.attributes.delete(k);}
 addEventListener(event,fn){this.listeners.set(event,fn);}
}
function create(){
 const ids={};
 for(const name of ['business-status','business-file','business-kpis','business-trend','business-clear'])ids[name]=new Element();
 const picker=ids['business-file'],cards=ids['business-kpis'],status=ids['business-status'];
 const events=[];
 const document={getElementById:id=>ids[id]||null,createElement:()=>new Element()};
 const window={dispatchEvent:e=>events.push(e.detail)};
 const context={document,window,Intl,Date,Set,Error,TextEncoder,CustomEvent:class{constructor(name,opts){this.name=name;this.detail=opts.detail;}}};
 vm.runInNewContext(source,context);
 return {ids,picker,cards,status,events,api:window.NewViewBusiness,select:file=>{
  picker.files=[file];return picker.listeners.get('change')();
 }};
}
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};

test('reset during pending local CSV read clears busy state and ignores late file resolution',async()=>{
 const h=create(),wait=deferred();
 const pending=h.select({size:valid.length,text:()=>wait.promise});
 assert.equal(h.picker.attributes.get('aria-busy'),'true');
 assert.equal(h.cards.attributes.get('aria-busy'),'true');
 h.api.reset();
 assert.equal(h.picker.attributes.has('aria-busy'),false);
 assert.equal(h.cards.attributes.has('aria-busy'),false);
 wait.resolve(valid);await pending;
 assert.equal(h.cards.children.length,0);
 assert.match(h.status.textContent,/No company data loaded/);
 assert.equal(h.picker.attributes.has('aria-busy'),false);
});

test('oversized file replacement must release old CSV busy indicators even if the previous read settles last',async()=>{
 const h=create(),wait=deferred();
 const pending=h.select({size:valid.length,text:()=>wait.promise});
 await h.select({size:1048577,text:async()=>valid});
 assert.equal(h.picker.attributes.has('aria-busy'),false);
 assert.equal(h.cards.attributes.has('aria-busy'),false);
 assert.match(h.status.textContent,/File too large/);
 wait.resolve(valid);await pending;
 assert.equal(h.cards.children.length,0);
 assert.match(h.status.textContent,/File too large/);
});

test('invalid CSV clears picker for same-file retry, then valid CSV restores summary and clears busy',async()=>{
 const h=create();
 h.picker.value='bad.csv';
 await h.select({size:21,text:async()=> 'date,revenue\nbad,row'});
 assert.equal(h.picker.value,'');
 assert.equal(h.picker.attributes.has('aria-busy'),false);
 assert.match(h.status.textContent,/CSV rejected: Expected columns/);
 await h.select({size:valid.length,text:async()=>valid});
 assert.equal(h.cards.children.length,6);
 assert.equal(h.picker.attributes.has('aria-busy'),false);
 assert.match(h.status.textContent,/1 dated records loaded locally/);
});
