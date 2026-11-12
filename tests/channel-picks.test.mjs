import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../web/channel-picks.js',import.meta.url),'utf8');
function harness(saved={}){
 let active=0,peak=0,probes=0;const events=[];
 const context={URL,Date,JSON,Promise,setTimeout,clearTimeout,navigator:{onLine:true},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},localStorage:{getItem:()=>JSON.stringify(saved),setItem(){}},document:{hidden:false,createElement:()=>({muted:false,playsInline:false,preload:'',pause(){},removeAttribute(name){delete this[name];},remove(){},load(){if(this.src){active++;peak=Math.max(peak,active);probes++;setTimeout(()=>{active--;this.onloadeddata?.();},2);} }})}};
 context.window=context;context.dispatchEvent=e=>events.push(e);vm.createContext(context);vm.runInContext(code,context);return {api:context.NewViewChannelPicks,events,stats:()=>({peak,probes})};
}
const channel=(name,id)=>({name,url:'https://example.com/'+id+'.m3u8'});
test('playing and decoded-ready streams outrank unchecked channels; failed streams sort last',()=>{
 const a=channel('Unknown','a'),b=channel('Previously played','b'),c=channel('Unavailable','c'),d=channel('Ready','d');
 const h=harness();h.api.mark(b.url,'playing');h.api.mark(c.url,'unavailable');h.api.mark(d.url,'ready');
 assert.deepEqual(Array.from(h.api.rank([a,c,d,b]),x=>x.name),['Previously played','Ready','Unknown','Unavailable']);
});
test('expired and future-dated results cannot be presented as active',()=>{
 const a=channel('Expired','a'),b=channel('Future','b');const h=harness({[a.url]:{time:Date.now()-31*60000,status:'playing'},[b.url]:{time:Date.now()+120000,status:'ready'}});
 assert.equal(h.api.state(a.url),'unchecked');assert.equal(h.api.state(b.url),'unchecked');
});
test('catalog scan is limited to eight checks, two at once, and does not repeat for the same catalog',async()=>{
 const h=harness();const items=Array.from({length:30},(_,i)=>channel('Channel '+i,i));h.api.setCatalog(items);
 await new Promise(r=>setTimeout(r,60));assert.equal(h.stats().probes,8);assert.equal(h.stats().peak,2);h.api.setCatalog(items);await new Promise(r=>setTimeout(r,20));assert.equal(h.stats().probes,8);
 assert.equal(h.api.state(items[0].url),'ready');assert.notEqual(h.api.state(items[0].url),'playing');
});
test('credentials, custom ports and insecure URLs are excluded before probes',()=>{
 const h=harness();assert.equal(h.api.rank([{name:'Bad',url:'http://example.com/a.m3u8'},{name:'Credentials',url:'https://u:p@example.com/a.m3u8'},{name:'Port',url:'https://example.com:8080/a.m3u8'}]).length,0);
});
