import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleDeviceSync} from '../cloud/device-sync.mjs';
import {secured,withAccess,accessCertFetch,signedAccessToken,accessRequest} from './access-fixture.mjs';
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
 assert.equal((await secured(new Request(url),env,new URL(url))).status,404);
 const invalid='https://newview.example/api/device-sync/not-a-room';
 assert.equal((await secured(new Request(invalid),env,new URL(invalid))).status,404);
});
test('encrypted layout round trips with bounded expiring KV record and no caching',async()=>{
 const store=kv(),env={NEWVIEW_SYNC:store};
 const update=await secured(new Request(url,{method:'PUT',
  headers:{'Origin':'https://newview.example','Content-Type':'application/json'},
  body:JSON.stringify({blob})}),env,new URL(url));
 assert.equal(update.status,204);
 assert.match(store.writes[0].key,/^v2:[a-f0-9]{64}$/);
 assert.equal(store.writes[0].value,blob);
 assert.deepEqual(store.writes[0].options,{expirationTtl:604800});
 const loaded=await secured(new Request(url),env,new URL(url));
 assert.deepEqual(await loaded.json(),{blob});
 assert.equal(loaded.headers.get('cache-control'),'no-store');
});
test('reject cross-origin updates, bad content, and unsupported methods',async()=>{
 const env={NEWVIEW_SYNC:kv()};
 const foreign=await secured(new Request(url,{method:'PUT',headers:{Origin:'https://attacker.test','Content-Type':'application/json'},body:JSON.stringify({blob})}),env,new URL(url));
 assert.equal(foreign.status,403);
 const plain=await secured(new Request(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({blob:'plain layout'})}),env,new URL(url));
 assert.equal(plain.status,400);
 const unsupported=await secured(new Request(url,{method:'PATCH'}),env,new URL(url));
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

test('secret pairing fragment is cleared before joining and rooms remain unavailable until initialized',()=>{
 const js=readFileSync(new URL('../web/device-sync.js',import.meta.url),'utf8');
 assert.match(js,/const credentials=readPair\(location\.hash\.slice\(1\)\)/);
 assert.match(js,/history\.replaceState\(null,'',location\.pathname\+location\.search\)/);
 assert.match(js,/copy\.disabled=value/);
 assert.match(js,/copy\.disabled=false/);
 assert.match(js,/pairingSession!==session/);
 assert.match(js,/session\+\+/);
 assert.match(js,/new AbortController\(\)/);
 assert.match(js,/10000/);
});
test('simultaneous cloud and local layout changes require visible human conflict resolution',()=>{
 const js=readFileSync(new URL('../web/device-sync.js',import.meta.url),'utf8');
 assert.match(js,/useCloud\.addEventListener\('click'/);
 assert.match(js,/useLocal\.addEventListener\('click'/);
 assert.match(js,/Both devices changed their layouts/);
 assert.match(js,/if\(!room\|\|busy\|\|document\.hidden\|\|conflict\)return/);
 assert.match(js,/const activeSession=session/);
 assert.match(js,/if\(activeSession!==session\)return/);
});

test('cloud sync fails closed without Access configuration and denies unsigned clients before reading KV',async()=>{
 const store=kv();
 const unconfigured=await handleDeviceSync(new Request(url),{NEWVIEW_SYNC:store},new URL(url),accessCertFetch);
 assert.equal(unconfigured.status,503);
 assert.equal((await unconfigured.json()).error,'Cloudflare Access authentication must be configured for device sync');
 const unsigned=await handleDeviceSync(new Request(url),withAccess({NEWVIEW_SYNC:store}),new URL(url),accessCertFetch);
 assert.equal(unsigned.status,401);
 assert.equal(store.writes.length,0);
});

test('same room ID cannot read another Access user encrypted layout',async()=>{
 const store=kv(),env=withAccess({NEWVIEW_SYNC:store}),endpoint=new URL(url);
 const first=accessRequest(new Request(url,{method:'PUT',headers:{'Content-Type':'application/json','Origin':'https://newview.example'},body:JSON.stringify({blob})}),signedAccessToken({sub:'user-one'}));
 assert.equal((await handleDeviceSync(first,env,endpoint,accessCertFetch)).status,204);
 const second=accessRequest(new Request(url),signedAccessToken({sub:'user-two'}));
 assert.equal((await handleDeviceSync(second,env,endpoint,accessCertFetch)).status,404);
 const owner=accessRequest(new Request(url),signedAccessToken({sub:'user-one'}));
 assert.equal((await handleDeviceSync(owner,env,endpoint,accessCertFetch)).status,200);
});
