import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../web/support-center.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const build=readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');

class Node {
 constructor(tag='div'){this.tag=tag;this.children=[];this.listeners=new Map();this.attributes=new Map();this.textContent='';this.className='';this.id='';this.disabled=false;this.href='';this.download='';}
 append(...items){this.children.push(...items);}
 setAttribute(k,v){this.attributes.set(k,String(v));}
 removeAttribute(k){this.attributes.delete(k);}
 addEventListener(name,fn){this.listeners.set(name,fn);}
 click(){return this.listeners.get('click')?.();}
}
function walk(node,pred){return [node,...node.children.flatMap(n=>walk(n,pred))].filter(pred);}
function storageFrom(initial){
 const state=new Map(Object.entries(initial));
 return {state,storage:{
  get length(){return state.size;},key:i=>[...state.keys()][i]??null,
  getItem:k=>state.get(k)??null,setItem:(k,v)=>state.set(k,String(v)),
  removeItem:k=>state.delete(k)
 }};
}
function setup({online=true,channel='preview',file=false,fetchImpl=async()=>{throw Error('No mock fetch configured');},confirmed=true}={}){
 const settings=new Node(),data=storageFrom({
  'newview.myview.widgets.v1':'["markets"]','newview.social.links.v1':'[{"url":"private"}]',
  symbol:'SOXLB',alerts:'on',alertCooldowns:'private',
  'unrelated.app':'keep'
 });
 let calls=0,reloads=0,downloadBlob=null,confirmCalls=0;
 const location={protocol:file?'file:':'https:',hash:'#sync=secret-pairing-token',pathname:'/index.html',search:'',
  reload(){reloads++;}};
 const root={confirm(){confirmCalls++;return confirmed;},addEventListener(){}};
 const document={
  readyState:'complete',body:{classList:{contains:()=>false}},
  createElement:t=>new Node(t),
  getElementById:()=>null,
  querySelector:q=>{
   if(q==='#newview-settings .newview-settings-content')return settings;
   if(q==='meta[name="newview-release-channel"]')return {content:channel};
   return null;
  }
 };
 const Url={createObjectURL:b=>{downloadBlob=b;return 'blob:newview-local-report';},revokeObjectURL(){}};
 const history={replaceState(_state,_title,url){location.hash='';location.pathname=url;}};
 const context={window:root,document,localStorage:data.storage,navigator:{onLine:online},
  location,history,fetch:async(...args)=>{calls++;return fetchImpl(...args);},
  URL:Url,Blob,AbortController,setTimeout,clearTimeout,Date,JSON,Set,Error,CustomEvent:class{}};
 vm.runInNewContext(source,context);
 const item=(id)=>walk(settings,e=>e.id===id)[0];
 return {root,settings,item,state:data.state,location,history,
  calls:()=>calls,reloads:()=>reloads,confirmCalls:()=>confirmCalls,
  downloaded:()=>downloadBlob};
}
test('Support Center is an opt-in non-uploading guide and is included in the production asset list',()=>{
 assert.match(html,/<meta name="newview-release-channel" content="preview">/);
 assert.match(html,/<script src="support-center\.js" defer><\/script>/);
 assert.match(build,/'support-center\.js'/);
 const h=setup();
 assert.ok(h.item('newview-support-center'));
 assert.equal(h.calls(),0,'support module must not request network on first launch');
 assert.ok(walk(h.settings,e=>e.tag==='summary'&&/Android TV permissions/.test(e.textContent)).length);
 assert.match(h.root.NewViewSupport.releaseChannel(),/preview/);
});
test('Support snapshot excludes pairing URL, local bookmarks, account identity and device fingerprint',()=>{
 const h=setup();
 const sample=h.root.NewViewSupport.snapshot(new Date('2026-11-12T10:00:00.000Z'));
 const serialized=JSON.stringify(sample);
 assert.equal(sample.sourceRevision,null);
 assert.equal(sample.serverRevisionCheck,'not-checked');
 assert.equal(sample.releaseChannel,'preview');
 assert.equal(sample.generatedAt,'2026-11-12T10:00:00.000Z');
 for(const secret of ['secret-pairing-token','private','SOXLB','userAgent','ipAddress','deviceId','cookies','bookmarks','roomId'])
  assert.ok(!serialized.includes(secret),secret+' must not appear in support summary');
});
test('Version checking is user-initiated, same origin, and accepts only full NewView revision',async()=>{
 const calls=[],sha='a'.repeat(40);
 const h=setup({fetchImpl:async(url,options)=>{
  calls.push({url,method:options.method});
  return {ok:true,json:async()=>({app:'newview',revision:sha})};
 }});
 const btn=h.item('newview-support-check-version');
 assert.equal(h.calls(),0);
 await btn.click();
 assert.deepEqual(calls,[{url:'/version',method:'GET'}]);
 assert.equal(h.root.NewViewSupport.snapshot().sourceRevision,sha);
 assert.equal(h.root.NewViewSupport.snapshot().serverRevisionCheck,'verified');
 assert.match(h.item('newview-support-status').textContent,/Dashboard revision/);
 const offline=setup({online:false});
 await offline.item('newview-support-check-version').click();
 assert.equal(offline.calls(),0);
 assert.equal(offline.root.NewViewSupport.snapshot().serverRevisionCheck,'offline');
});
test('Support report is downloaded locally without disclosing saved values or making an upload',async()=>{
 const h=setup();
 h.item('newview-support-export').click();
 const blob=h.downloaded();
 assert.ok(blob);
 const report=JSON.parse(await blob.text());
 assert.equal(report.app,'NewView');
 assert.equal(h.calls(),0);
 assert.doesNotMatch(JSON.stringify(report),/secret-pairing-token|SOXLB|private/);
});
test('Clear NewView data is scoped, confirmed, excludes unrelated keys, and cannot revoke remote rooms',()=>{
 const h=setup({confirmed:false});
 h.item('newview-clear-local-data').click();
 assert.equal(h.state.get('newview.social.links.v1'),'[{"url":"private"}]');
 assert.equal(h.reloads(),0);
 const owner=setup();
 owner.item('newview-clear-local-data').click();
 assert.deepEqual([...owner.state.entries()],[['unrelated.app','keep']]);
 assert.equal(owner.confirmCalls(),1);
 assert.equal(owner.reloads(),1);
 assert.equal(owner.location.hash,'');
 assert.match(owner.item('newview-clear-local-status').textContent,/Shared pairing rooms remain active/);
});
