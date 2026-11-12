import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../web/device-sync.js',import.meta.url),'utf8');

class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.listeners=new Map();this.attributes=new Map();this.hidden=false;this.disabled=false;this.value='';this.textContent='';}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 setAttribute(k,v){this.attributes.set(k,String(v));}
 removeAttribute(k){this.attributes.delete(k);}
 addEventListener(k,f){this.listeners.set(k,f);}
 focus(){}
 select(){}
}
const walk=(e)=>[e,...e.children.flatMap(x=>walk(x))];
const flush=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));};
const until=async(test,label)=>{for(let i=0;i<120;i++){if(test())return;await new Promise(r=>setTimeout(r,15));}throw Error('Timed out: '+label);};
const defer=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {resolve,promise};};

function mount(fetchImpl){
 const host=new Element(),events=new Map();
 let selected=['market'];
 const window={
  NewViewPersonal:{load:()=>[...selected],save:v=>{selected=[...v];},sanitize:v=>v,render(){}},
  NewViewShell:{select(){}},addEventListener:(k,f)=>events.set(k,f),
  confirm:()=>true
 };
 const document={readyState:'complete',hidden:false,body:{dataset:{currentWorkspace:'myview'}},
  getElementById:id=>id==='newview-device-controls'?host:null,
  createElement:tag=>new Element(tag),addEventListener(){}};
 const location=new URL('https://newview.example/');
 const ctx={window,document,location,history:{replaceState(){}},navigator:{onLine:true,clipboard:{writeText:async()=>{}}},
  crypto:webcrypto,TextEncoder,TextDecoder,URL,Response,AbortController,Error,Uint8Array,btoa,atob,fetch:fetchImpl,
  setTimeout,clearTimeout,setInterval:()=>({unref(){}}),clearInterval};
 vm.runInNewContext(source,ctx);
 const els=walk(host);
 const button=label=>{const b=els.find(x=>x.tag==='button'&&x.textContent===label);assert.ok(b,'button '+label);return b;};
 const control=id=>{const v=els.find(x=>x.id===id);assert.ok(v,'control '+id);return v;};
 return {window,button,control,updateLocal:v=>{selected=[...v];},current:()=>[...selected],elements:els};
}

test('re-pair while earlier room GET is unresolved does not block new room or revert new status',async()=>{
 const oldRoom='A'.repeat(43),oldKey='B'.repeat(43),stale=defer(),requests=[];
 const h=mount(async(url,opt)=>{
  requests.push({url:String(url),method:opt.method});
  if(String(url).endsWith(oldRoom))return stale.promise;
  if(opt.method==='GET')return new Response(null,{status:404});
  if(opt.method==='POST')return new Response(null,{status:204});
  throw Error('Unexpected method');
 });
 h.control('newview-sync-link').value='sync='+oldRoom+'.'+oldKey;
 h.button('Join').listeners.get('click')();
 await flush();
 h.button('Create pairing link').listeners.get('click')();
 await until(()=>/Encrypted room created/.test(h.control('newview-sync-status').textContent),'new room created');
 assert.match(h.control('newview-sync-status').textContent,/Encrypted room created/);
 assert.equal(h.button('Check for updates').disabled,false);
 stale.resolve(new Response(null,{status:404}));
 await flush();
 assert.match(h.control('newview-sync-status').textContent,/Encrypted room created/);
 assert.equal(h.button('Check for updates').disabled,false);
 assert.equal(requests.filter(x=>x.method==='POST').length,1);
});

test('client sends previous encrypted cloud blob with changed layout and reports conflict on 409',async()=>{
 let saved=null,receivedExpected=null;
 const h=mount(async(url,opt)=>{
  if(opt.method==='GET')return saved?new Response(JSON.stringify({blob:saved}),{headers:{'content-type':'application/json'}}):new Response(null,{status:404});
  if(opt.method==='POST'){
   saved=JSON.parse(opt.body).blob;
   return new Response(null,{status:204});
  }
  if(opt.method==='PUT'){
   const request=JSON.parse(opt.body);
   receivedExpected=request.expected;
   return new Response(JSON.stringify({error:'conflict'}),{status:409,headers:{'content-type':'application/json'}});
  }
  throw Error('Unexpected method');
 });
 h.button('Create pairing link').listeners.get('click')();
 await until(()=>saved?.includes('.'),'encrypted room created');
 assert.ok(saved?.includes('.'),'expected encrypted room blob');
 h.updateLocal(['news']);
 h.button('Check for updates').listeners.get('click')();
 await until(()=>receivedExpected!==null,'conflict write attempted');
 assert.equal(receivedExpected,saved,'compare-and-swap must refer to prior server blob');
 assert.match(h.control('newview-sync-status').textContent,/Room changed on another device/);
 assert.equal(h.button('Check for updates').disabled,false);
});


test('joining an existing encrypted room never silently replaces local widgets',async()=>{
 const room='A'.repeat(43),encodedKey='B'.repeat(43);
 const key=Buffer.from(encodedKey,'base64url');
 assert.equal(key.length,32);
 const nonce=webcrypto.getRandomValues(new Uint8Array(12));
 const aes=await webcrypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']);
 const ciphertext=await webcrypto.subtle.encrypt({name:'AES-GCM',iv:nonce},aes,new TextEncoder().encode(JSON.stringify({widgets:['news'],workspace:'myview'})));
 const encrypted=Buffer.from(nonce).toString('base64url')+'.'+Buffer.from(ciphertext).toString('base64url');
 const h=mount(async(_url,options)=>{
  if(options.method==='GET')return new Response(JSON.stringify({blob:encrypted}),{status:200,headers:{'content-type':'application/json'}});
  throw Error('Unexpected write before user resolves pairing conflict');
 });
 h.control('newview-sync-link').value='sync='+room+'.'+encodedKey;
 h.button('Join').listeners.get('click')();
 await until(()=>/Paired layout differs/.test(h.control('newview-sync-status').textContent),'join conflict prompt');
 assert.deepEqual(h.current(),['market'],'local layout must be preserved before consent');
 assert.equal(h.button('Use cloud layout').hidden,false);
 assert.equal(h.button('Keep this layout').hidden,false);
});
