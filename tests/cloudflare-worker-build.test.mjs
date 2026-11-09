import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
test('Cloudflare Worker build has explicit Wrangler entrypoint and valid bundle',()=>{
 const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.json'),'utf8'));
 assert.equal(config.name,'nowview');
 assert.equal(config.main,'dist/server/index.js');
 assert.equal(config.workers_dev,false);
 assert.match(config.compatibility_date,/^20\d{2}-\d{2}-\d{2}$/);
 execFileSync(process.execPath,[path.join(root,'cloud/build.mjs')],{cwd:root,stdio:'pipe'});
 const generated=fs.readFileSync(path.join(root,config.main),'utf8');
 assert.match(generated,/export default \{async fetch\(request\)/);
 for(const asset of ['/index.html','/style.css','/watch.js','/myview.js','/connectivity.js'])assert.ok(generated.includes(asset),asset);
});
