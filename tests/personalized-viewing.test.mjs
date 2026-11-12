import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function harness(){
 const store=new Map(),events=[];
 const context={URL,Date,JSON,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)},dispatchEvent:event=>events.push(event)};
 context.window=context;vm.runInNewContext(read('web/viewing-history.js'),context);
 return {api:context.NewViewViewing,store,events};
}
test('viewing history records confirmed streams only, stays private and is bounded',()=>{
 const h=harness();
 assert.equal(h.api.confirmed('http://example.com/test.m3u8','insecure'),false);
 assert.equal(h.api.confirmed('https://user:pass@example.com/live.mp4','secret'),false);
 assert.equal(h.api.confirmed('https://example.com:9443/live.mp4','port'),false);
 assert.equal(h.api.confirmed('https://example.com/other.txt','invalid'),false);
 assert.equal(h.api.confirmed('https://example.com/one.m3u8','News'),true);
 assert.equal(h.api.confirmed('https://example.com/one.m3u8','News updated'),true);
 assert.equal(h.api.read().length,1);
 assert.equal(h.api.read()[0].name,'News updated');
 for(let i=0;i<40;i++)h.api.confirmed('https://example.com/'+i+'.m3u8','Channel '+i);
 assert.equal(h.api.read().length,30);
 assert.equal(h.events.length,42);
 h.api.clear();assert.equal(h.api.read().length,0);
});
test('home includes explicit channel selection, preferences and continue watching without autoplaying probe results',()=>{
 const ui=read('web/simplified-ui.js'),media=read('web/media.js'),cast=read('web/cast-overlay.js');
 assert.match(ui,/featuredLabel\.append\(featuredSelect\)/);
 assert.match(ui,/featured\.append\(featuredHeading,featuredLabel,preferences,featuredPlay/);
 assert.match(ui,/Continue watching/);
 assert.match(ui,/newview\.recommendation\.preferences\.v1/);
 assert.match(ui,/newview:viewing-history/);
 assert.doesNotMatch(ui,/suggestedStarted=true/);
 assert.match(media,/NewViewViewing\?\.confirmed/);
 assert.match(cast,/NewViewViewing\?\.confirmed/);
 assert.match(read('web/index.html'),/src="viewing-history\.js" defer/);
 assert.match(read('web/tv-fit.css'),/nv-home-recommendation-controls/);
});
test('recommendations use live evidence and opt-in local preferences, not invented programme listings',()=>{
 const picks=read('web/channel-picks.js');
 assert.match(picks,/newview\.media\.channel-favorites\.v1/);
 assert.match(picks,/NewViewViewing\?\.read/);
 assert.match(picks,/newview\.recommendation\.preferences\.v1/);
 assert.match(picks,/MAX_CHECKS=8/);
 assert.match(picks,/video\.onloadeddata=\(\)=>finish\('ready'\)/);
 assert.doesNotMatch(picks,/random\(|fakeProgramme|samplePrice/);
});
