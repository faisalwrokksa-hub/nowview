import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../web/ux-preferences.js',import.meta.url),'utf8');
const KEY='newview.ux.preferences.v1',BOX='newview.home.boxes.v2',COUNT='newview.home.box-count.v2';
const initial={density:'comfortable',motion:'system',focus:'visible'};
const valid={version:1,display:{density:'compact',motion:'reduced',focus:'strong'},homeShortcuts:['markets','news'],shortcutCount:2};

class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attributes=new Map();this.events=new Map();this.value='';this.files=[];this.textContent='';this.style={};}
 append(...items){this.children.push(...items);}
 setAttribute(n,v){this.attributes.set(n,String(v));}
 addEventListener(n,f){this.events.set(n,f);}
 click(){}
}
const find=(node,pred)=>pred(node)?node:node.children.map(x=>find(x,pred)).find(Boolean)||null;
function mount({failureKey=null,values={}}={}){
 const state=new Map([[KEY,JSON.stringify(initial)],[BOX,JSON.stringify(['markets'])],[COUNT,'3'],...Object.entries(values)]);
 let failKey=failureKey,blob=null;const host=new Element('div');
 const storage={
  getItem(k){return state.has(k)?state.get(k):null;},
  setItem(k,v){if(k===failKey){failKey=null;throw Error('Storage full');}state.set(k,String(v));},
  removeItem:k=>state.delete(k)
 };
 const body={dataset:{}};
 const document={readyState:'complete',body,getElementById:id=>id==='newview-settings'?host:null,
  querySelector:()=>null,createElement:t=>new Element(t)};
 const listeners=new Map(),root={addEventListener:(n,f)=>listeners.set(n,f),dispatchEvent(){}};
 const context={window:root,document,localStorage:storage,sessionStorage:{setItem(){}},navigator:{onLine:true},
  Blob,URL:{createObjectURL:b=>{blob=b;return 'blob:test';},revokeObjectURL(){}},
  CustomEvent:class{constructor(name,opts){this.name=name;this.detail=opts?.detail;}},setTimeout:()=>0};
 vm.runInNewContext(source,context);
 const input=find(host,x=>x.tag==='input'&&x.attributes.get('aria-label')==='Restore NewView preferences JSON');
 const importStatus=find(host,x=>x.tag==='p'&&x.attributes.get('role')==='status');
 const exportButton=find(host,x=>x.tag==='button'&&x.textContent==='Export preferences');
 assert.ok(input);assert.ok(importStatus);assert.ok(exportButton);
 return {input,importStatus,exportButton,state,root,blob:()=>blob,document,
  async import(data){input.files=[{size:JSON.stringify(data).length,text:async()=>JSON.stringify(data)}];await input.events.get('change')();}};
}

test('preference import rolls back every saved key after an intermediate storage failure',async()=>{
 const h=mount({failureKey:COUNT}),before=new Map(h.state);
 await h.import(valid);
 assert.deepEqual([...h.state.entries()],[...before.entries()]);
 assert.match(h.importStatus.textContent,/Previous preferences were restored/);
 assert.deepEqual(h.root.NewViewUX.get(),initial);
 assert.equal(h.document.body.dataset.nvDensity,'comfortable');
 await h.import(valid);
 assert.equal(h.state.get(BOX),JSON.stringify(valid.homeShortcuts));
 assert.equal(h.state.get(COUNT),'2');
 assert.equal(h.root.NewViewUX.get().density,'compact');
 assert.match(h.importStatus.textContent,/Preferences restored/);
});

test('overlapping imports cannot let older file overwrite a newer import',async()=>{
 const h=mount();
 let resolve;const oldFileText=new Promise(r=>{resolve=r;});
 h.input.files=[{size:100,text:()=>oldFileText}];
 const older=h.input.events.get('change')();
 await h.import(valid);
 resolve(JSON.stringify({version:1,display:initial,homeShortcuts:['devices'],shortcutCount:1}));
 await older;
 assert.equal(h.root.NewViewUX.get().density,'compact');
 assert.equal(h.state.get(BOX),JSON.stringify(['markets','news']));
 assert.equal(h.state.get(COUNT),'2');
});

test('export filters malformed local shortcut storage and uses safe defaults',async()=>{
 const h=mount({values:{[BOX]:'["markets","bad",5,"markets","iptv","news","devices"]',[COUNT]:'99'}});
 h.exportButton.events.get('click')();
 const exported=JSON.parse(await h.blob().text());
 assert.deepEqual(exported.homeShortcuts,['markets','iptv','news','devices']);
 assert.equal(exported.shortcutCount,3);
 assert.deepEqual(exported.display,initial);
 const importer=mount();
 await importer.import(exported);
 assert.match(importer.importStatus.textContent,/Preferences restored/);
});
