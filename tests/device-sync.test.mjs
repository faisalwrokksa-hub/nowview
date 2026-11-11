import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleDeviceSync} from '../cloud/device-sync.mjs';
const room='A'.repeat(43);
const url='https://newview.example/api/device-sync/'+room;
const blob='B'.repeat(16)+'.'+'C'.repeat(40);
const kv=()=>{
 const map=new Map(),writes=[];
 return {writes,async get(key){return map.get(key)||null;},
  async put(key,value,options){map.set(key,value);writes.push({key,value,options});}};
};
test('device sync is disabled without explicit cloud storage binding',async()=>{
 const result=await handleDeviceSync(new Request(url),{},new URL(url));
 assert.equal(result.status,503);
});
test('capability room is validated and unknown rooms have no data',async()=>{
 const store=kv();const env={NEWVIEW_SYNC:store};
 assert.equal((await handleDeviceSync(new Request(url),env,new URL(url))).status,404);
 const invalid='https://newview.example/api/device-sync/not-a-room';
 assert.equal((await handleDeviceSync(new Request(invalid),env,new URL(invalid))).status,404);
});
test('encrypted layout round trips with bounded expiring KV record and no caching',async()=>{
 const store=kv(),env={NEWVIEW_SYNC:store};
 const update=await handleDeviceSync(new Request(url,{method:'PUT',
  headers:{'Origin':'https://newview.example','Content-Type':'application/json'},
  body:JSON.stringify({blob})}),env,new URL(url));
 assert.equal(update.status,204);
 assert.deepEqual(store.writes[0],{key:'v1:'+room,value:blob,options:{expirationTtl:604800}});
 const loaded=await handleDeviceSync(new Request(url),env,new URL(url));
 assert.deepEqual(await loaded.json(),{blob});
 assert.equal(loaded.headers.get('cache-control'),'no-store');
});
test('reject cross-origin updates, bad content, and unsupported methods',async()=>{
 const env={NEWVIEW_SYNC:kv()};
 const foreign=await handleDeviceSync(new Request(url,{method:'PUT',headers:{Origin:'https://attacker.test','Content-Type':'application/json'},body:JSON.stringify({blob})}),env,new URL(url));
 assert.equal(foreign.status,403);
 const plain=await handleDeviceSync(new Request(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({blob:'plain layout'})}),env,new URL(url));
 assert.equal(plain.status,400);
 const unsupported=await handleDeviceSync(new Request(url,{method:'DELETE'}),env,new URL(url));
 assert.equal(unsupported.status,405);
 assert.equal(env.NEWVIEW_SYNC.writes.length,0);
});
test('client uses authenticated encryption and syncs only allowlisted layout settings',()=>{
 const js=readFileSync(new URL('../web/device-sync.js',import.meta.url),'utf8');
 const index=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const build=readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
 assert.match(js,/AES-GCM/);
 assert.match(js,/crypto\.getRandomValues/);
 assert.match(js,/widgets:window\.NewViewPersonal/);
 assert.match(js,/workspace:allowed\.has/);
 assert.match(js,/location\.hash/);
 assert.match(js,/navigator\.clipboard\.writeText/);
 assert.doesNotMatch(js,/getDisplayMedia|MediaRecorder|screenrecord/);
 assert.match(index,/src="device-sync\.js"/);
 assert.match(build,/handleDeviceSync\(request,env,url\)/);
});

test('joining an expired or unknown pairing room never initializes storage with local layout',()=>{
 const client=readFileSync(new URL('../web/device-sync.js',import.meta.url),'utf8');
 assert.match(client,/if\(!createdRoom\)\{report\('Pairing room not found or expired/);
 assert.match(client,/createdRoom=isNew/);
 assert.match(client,/createdRoom=false/);
});

test('encrypted layout sync pauses offline and resumes after reconnect or returning to tab',()=>{
 const client=readFileSync(new URL('../web/device-sync.js',import.meta.url),'utf8');
 assert.match(client,/navigator\.onLine===false/);
 assert.match(client,/window\.addEventListener\('online'/);
 assert.match(client,/window\.addEventListener\('offline'/);
 assert.match(client,/document\.addEventListener\('visibilitychange'/);
 assert.match(client,/if\(!document\.hidden&&room\)update\(\)/);
});
