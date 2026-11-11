import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
async function importBuiltWorker(){
 // Node cannot import cloudflare:workers; isolate the DO base without changing the deployed bundle.
 const file=fs.readFileSync(path.join(root,'dist/server/index.js'),'utf8');
 const nodeSafe=file.replace("import { DurableObject } from 'cloudflare:workers';",'const DurableObject = class { constructor(ctx,env){this.ctx=ctx;this.env=env;} };');
 if(nodeSafe===file)throw Error('Durable Object module import not found in Worker bundle');
 return import('data:text/javascript;base64,'+Buffer.from(nodeSafe).toString('base64'));
}
test('Cloudflare Worker build has explicit Wrangler entrypoint and valid bundle',()=>{
 const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.json'),'utf8'));
 assert.equal(config.name,'nowview');
 assert.equal(config.main,'dist/server/index.js');
 assert.equal(config.workers_dev,true);
 assert.match(config.compatibility_date,/^20\d{2}-\d{2}-\d{2}$/);
 execFileSync(process.execPath,[path.join(root,'cloud/build.mjs')],{cwd:root,stdio:'pipe'});
 const generated=fs.readFileSync(path.join(root,config.main),'utf8');
 assert.match(generated,/export default \{async fetch\(request,env\)/);
 for(const asset of ['/index.html','/style.css','/watch.js','/myview.js','/connectivity.js','/tv-home.js','/offline-agents.js','/offline-controls.js'])assert.ok(generated.includes(asset),asset);
});

test('built Worker health endpoint reports only application readiness, not upstream success',async()=>{
 execFileSync(process.execPath,[path.join(root,'cloud/build.mjs')],{cwd:root,stdio:'pipe'});
 const {default:worker}=await importBuiltWorker();
 const response=await worker.fetch(new Request('https://example.test/healthz'));
 assert.equal(response.status,200);
 assert.match(response.headers.get('content-type')||'',/application\/json/);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const data=await response.json();
 assert.deepEqual(data,{status:'ok',app:'newview',scope:'worker-only',upstreamsChecked:false});
 const blocked=await worker.fetch(new Request('https://example.test/healthz',{method:'POST'}));
 assert.equal(blocked.status,405);
 assert.equal(response.headers.get('x-frame-options'),'DENY');
 const invalidNews=await worker.fetch(new Request('https://example.test/api/news?source=untrusted'));
 assert.equal(invalidNews.status,400);
 const invalidMarket=await worker.fetch(new Request('https://example.test/api/chart?symbol=NOT-A-PAIR&range=1D'));
 assert.equal(invalidMarket.status,400);
});

test('every local HTML script and stylesheet is included in the published Worker',()=>{
 const html=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
 execFileSync(process.execPath,[path.join(root,'cloud/build.mjs')],{cwd:root,stdio:'pipe'});
 const generated=fs.readFileSync(path.join(root,'dist/server/index.js'),'utf8');
 const refs=[
  ...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g),
  ...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css)["']/g)
 ].map(match=>match[1]).filter(ref=>!/^https?:|^\/\//.test(ref));
 for(const ref of refs){
  const asset='/'+ref.replace(/^\.\//,'').split(/[?#]/)[0];
  assert.ok(fs.existsSync(path.join(root,'web',asset.slice(1))),`Missing local asset: ${asset}`);
  assert.ok(generated.includes(JSON.stringify(asset)),`Asset omitted from Worker: ${asset}`);
 }
 assert.ok(refs.length>=18,'Expected all core NewView script and stylesheet references');
});

test('Worker version is public commit metadata with no caching',async()=>{
 const {default:worker}=await importBuiltWorker();
 const response=await worker.fetch(new Request('https://example.test/version'));
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const data=await response.json();
 assert.equal(data.app,'newview');
 assert.ok(data.revision===null||/^[a-f0-9]{40}$/.test(data.revision));
});
