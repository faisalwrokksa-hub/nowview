import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
test('Cloudflare Worker build has explicit Wrangler entrypoint and valid bundle',()=>{
 const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.json'),'utf8'));
 assert.equal(config.name,'nowview');
 assert.equal(config.main,'dist/server/index.js');
 assert.equal(config.workers_dev,true);
 assert.match(config.compatibility_date,/^20\d{2}-\d{2}-\d{2}$/);
 execFileSync(process.execPath,[path.join(root,'cloud/build.mjs')],{cwd:root,stdio:'pipe'});
 const generated=fs.readFileSync(path.join(root,config.main),'utf8');
 assert.match(generated,/export default \{async fetch\(request\)/);
 for(const asset of ['/index.html','/style.css','/watch.js','/myview.js','/connectivity.js'])assert.ok(generated.includes(asset),asset);
});

test('built Worker health endpoint reports only application readiness, not upstream success',async()=>{
 execFileSync(process.execPath,[path.join(root,'cloud/build.mjs')],{cwd:root,stdio:'pipe'});
 const {default:worker}=await import(pathToFileURL(path.join(root,'dist/server/index.js')).href+'?health-test='+Date.now());
 const response=await worker.fetch(new Request('https://example.test/healthz'));
 assert.equal(response.status,200);
 assert.match(response.headers.get('content-type')||'',/application\/json/);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const data=await response.json();
 assert.deepEqual(data,{status:'ok',app:'newview',scope:'worker-only',upstreamsChecked:false});
 const blocked=await worker.fetch(new Request('https://example.test/healthz',{method:'POST'}));
 assert.equal(blocked.status,405);
});
