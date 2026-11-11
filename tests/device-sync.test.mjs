import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {handleDeviceSync} from '../cloud/device-sync.mjs';
import {secured,withAccess,accessCertFetch,signedAccessToken,accessRequest} from './access-fixture.mjs';

const room='A'.repeat(43);
const url='https://newview.example/api/device-sync/'+room;
const blob='B'.repeat(16)+'.'+'C'.repeat(40);
function authoritativeRooms(){
 const rooms=new Map(),operations=[];
 const namespace={
  getByName(name){
   if(!rooms.has(name))rooms.set(name,{blob:null,expiresAt:0,revoked:false});
   const state=rooms.get(name);
   return {
    async read(){operations.push({name,op:'read'});if(state.revoked)return {status:410};return state.blob&&Date.now()<state.expiresAt?{status:200,blob:state.blob}:{status:404};},
    async create(value){operations.push({name,op:'create'});if(state.revoked)return {status:410};if(state.blob&&Date.now()<state.expiresAt)return {status:409};state.blob=value;state.expiresAt=Date.now()+604800000;return {status:204};},
    async update(value){operations.push({name,op:'update'});if(state.revoked)return {status:410};if(!state.blob||Date.now()>=state.expiresAt)return {status:404};state.blob=value;state.expiresAt=Date.now()+604800000;return {status:204};},
    async revoke(){operations.push({name,op:'revoke'});if(state.revoked)return {status:410};state.revoked=true;state.blob=null;return {status:204};}
   };
  }
 };
 return {namespace,operations};
}
const mutation=(method,body)=>new Request(url,{method,headers:{'Origin':'https://newview.example','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
test('device sync fails closed without configured Durable Object even when old KV exists',async()=>{
 const request=new Request(url);
 const r=await handleDeviceSync(request,{NEWVIEW_SYNC:{get:async()=>blob}},new URL(url));
 assert.equal(r.status,503);
 assert.match((await r.json()).error,/Durable Object/);
});
test('unknown/expired room requires explicit creation instead of adopting from linked client',async()=>{
 const store=authoritativeRooms(),env={NEWVIEW_SYNC_ROOMS:store.namespace};
 assert.equal((await secured(new Request(url),env,new URL(url))).status,404);
 assert.equal((await secured(mutation('PUT',{blob}),env,new URL(url))).status,404);
 const invalid='https://newview.example/api/device-sync/not-a-room';
 assert.equal((await secured(new Request(invalid),env,new URL(invalid))).status,404);
 assert.equal(store.operations.some(x=>x.op==='create'),false);
});
test('create/update/read/revoke use one authoritative room; revocation cannot be undone',async()=>{
 const store=authoritativeRooms(),env={NEWVIEW_SYNC_ROOMS:store.namespace};
 assert.equal((await secured(mutation('POST',{blob}),env,new URL(url))).status,204);
 assert.equal((await secured(mutation('POST',{blob}),env,new URL(url))).status,409);
 const loaded=await secured(new Request(url),env,new URL(url));
 assert.deepEqual(await loaded.json(),{blob});
 assert.equal(loaded.headers.get('cache-control'),'no-store');
 const replacement='D'.repeat(16)+'.'+'E'.repeat(40);
 assert.equal((await secured(mutation('PUT',{blob:replacement}),env,new URL(url))).status,204);
 assert.deepEqual(await (await secured(new Request(url),env,new URL(url))).json(),{blob:replacement});
 assert.equal((await secured(new Request(url,{method:'DELETE',headers:{Origin:'https://newview.example'}}),env,new URL(url))).status,204);
 for(const request of [new Request(url),mutation('POST',{blob}),mutation('PUT',{blob}),new Request(url,{method:'DELETE'})]){
  assert.equal((await secured(request,env,new URL(url))).status,410);
 }
 assert.equal(new Set(store.operations.map(x=>x.name)).size,1,'same room must always route to the same Durable Object');
});
test('reject foreign origins, bad encrypted layout and unsupported methods',async()=>{
 const store=authoritativeRooms(),env={NEWVIEW_SYNC_ROOMS:store.namespace};
 const badOrigin=new Request(url,{method:'POST',headers:{Origin:'https://attacker.test','Content-Type':'application/json'},body:JSON.stringify({blob})});
 assert.equal((await secured(badOrigin,env,new URL(url))).status,403);
 assert.equal((await secured(mutation('PUT',{blob:'plain layout'}),env,new URL(url))).status,400);
 assert.equal((await secured(new Request(url,{method:'PATCH'}),env,new URL(url))).status,405);
 assert.equal(store.operations.length,0);
});
test('Cloudflare Access must be configured and cryptographically verified before Durable Object routing',async()=>{
 const store=authoritativeRooms(),env={NEWVIEW_SYNC_ROOMS:store.namespace};
 assert.equal((await handleDeviceSync(new Request(url),env,new URL(url),accessCertFetch)).status,503);
 assert.equal((await handleDeviceSync(new Request(url),withAccess(env),new URL(url),accessCertFetch)).status,401);
 assert.equal(store.operations.length,0);
});
test('room identifier is isolated by Access subject and not stored in readable form',async()=>{
 const store=authoritativeRooms(),env=withAccess({NEWVIEW_SYNC_ROOMS:store.namespace}),endpoint=new URL(url);
 const first=accessRequest(mutation('POST',{blob}),signedAccessToken({sub:'user-one'}));
 assert.equal((await handleDeviceSync(first,env,endpoint,accessCertFetch)).status,204);
 const other=accessRequest(new Request(url),signedAccessToken({sub:'user-two'}));
 assert.equal((await handleDeviceSync(other,env,endpoint,accessCertFetch)).status,404);
 const owner=accessRequest(new Request(url),signedAccessToken({sub:'user-one'}));
 assert.equal((await handleDeviceSync(owner,env,endpoint,accessCertFetch)).status,200);
 assert.equal(store.operations.length,3);
 assert.notEqual(store.operations[0].name,store.operations[1].name);
 assert.doesNotMatch(store.operations[0].name,/user-one|A{10}/);
});
test('Sqlite-backed implementation makes permanent tombstones and serializes state changes',async()=>{
 const raw=readFileSync(new URL('../cloud/sync-room.mjs',import.meta.url),'utf8');
 assert.match(raw,/extends DurableObject/);
 assert.match(raw,/this\.ctx\.storage\.sql\.exec/);
 assert.match(raw,/revoked=1/);
 assert.doesNotMatch(raw,/NEWVIEW_SYNC\.|expirationTtl/);
 // Execute the actual room class with a synchronous fake SQLite backend.
 const context={Date,globalThis:null};context.globalThis=context;
 const compiled=raw.replace(/^import .*?;$/gm,'').replace('export class NewViewSyncRoom','class NewViewSyncRoom')+'\n globalThis.Room=NewViewSyncRoom;';
 context.DurableObject=class {constructor(ctx){this.ctx=ctx;}};
 vm.runInNewContext(compiled,context,{timeout:2000});
 let row=null;
 const storage={sql:{exec(query,...params){
  if(query.startsWith('CREATE TABLE'))return {toArray:()=>[]};
  if(query.startsWith('SELECT'))return {toArray:()=>row?[{...row}]:[]};
  if(query.startsWith('INSERT INTO room')&&query.includes('revoked=1')){row={blob:null,expires_at:0,revoked:1};return {toArray:()=>[]};}
  if(query.startsWith('INSERT INTO room')){row={blob:params[0],expires_at:params[1],revoked:0};return {toArray:()=>[]};}
  if(query.startsWith('UPDATE room')){if(row?.revoked!==1){row={blob:params[0],expires_at:params[1],revoked:0};}return {toArray:()=>[]};}
  throw Error('Unknown SQL query');
 }}};
 const live=new context.Room({storage},{});
 assert.equal((await live.read()).status,404);
 assert.equal((await live.create(blob)).status,204);
 assert.equal((await live.update(blob)).status,204);
 assert.equal((await live.revoke()).status,204);
 assert.equal(row.revoked,1);
 assert.equal((await live.read()).status,410);
 assert.equal((await live.create(blob)).status,410);
 assert.equal((await live.update(blob)).status,410);
 assert.equal((await live.revoke()).status,410);
});
test('frontend preserves encryption and explicitly creates rooms; an old link never silently recreates',()=>{
 const js=readFileSync(new URL('../web/device-sync.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const build=readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
 const wrangler=JSON.parse(readFileSync(new URL('../wrangler.json',import.meta.url),'utf8'));
 assert.match(js,/AES-GCM/);
 assert.match(js,/crypto\.getRandomValues/);
 assert.match(js,/request\('POST',sealed\)/);
 assert.match(js,/if\(!createdRoom\)/);
 assert.match(js,/Revoke pairing for all devices/);
 assert.match(js,/history\.replaceState\(null,'',location\.pathname\+location\.search\)/);
 assert.doesNotMatch(js,/getDisplayMedia|MediaRecorder|screenrecord/);
 assert.match(html,/src="device-sync\.js"/);
 assert.match(build,/handleDeviceSync\(request,env,url\)/);
 assert.match(build,/syncRoom\+news/);
 assert.equal(wrangler.durable_objects.bindings[0].name,'NEWVIEW_SYNC_ROOMS');
 assert.deepEqual(wrangler.migrations[0].new_sqlite_classes,['NewViewSyncRoom']);
});
