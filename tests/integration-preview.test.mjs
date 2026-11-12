import test from 'node:test';
import assert from 'node:assert/strict';
import {PREVIEW_URL,validateTarget,checkRevision,waitForPreview} from '../tools/verify-integration-preview.mjs';

const sha='a'.repeat(40);
const good=()=>new Response(JSON.stringify({app:'newview',revision:sha}),{status:200,headers:{'content-type':'application/json'}});

test('integration preview rejects unexpected hosts, schemes, hashes, query and short commits',()=>{
 assert.equal(validateTarget(PREVIEW_URL,sha).hostname,'integration-ux-media-business-20261112-nowview.faisalwrokksa.workers.dev');
 for(const url of [
  'https://evil.example/',
  'https://integration-ux-media-business-20261112-nowview.faisalwrokksa.workers.dev.evil.example/',
  'http://integration-ux-media-business-20261112-nowview.faisalwrokksa.workers.dev/',
  PREVIEW_URL+'?x=1',PREVIEW_URL+'#t',PREVIEW_URL.replace('https://','https://attacker@'),
  'https://nowview.faisalwrokksa.workers.dev/'
 ])assert.throws(()=>validateTarget(url,sha));
 assert.throws(()=>validateTarget(PREVIEW_URL,'a'.repeat(7)));
});

test('read-only preview verifier requires exact live commit, status and content type',async()=>{
 const calls=[];
 assert.equal(await checkRevision({sha,fetchImpl:async(url,init)=>{
  calls.push({url:String(url),method:init.method,redirect:init.redirect});return good();
 }}),sha);
 assert.equal(calls[0].url,PREVIEW_URL+'version');
 assert.equal(calls[0].method,undefined);
 assert.equal(calls[0].redirect,'manual');
 await assert.rejects(checkRevision({sha,fetchImpl:async()=>new Response('not found',{status:404})}),/HTTP 404/);
 await assert.rejects(checkRevision({sha,fetchImpl:async()=>new Response('<html/>',{headers:{'content-type':'text/html'}})}),/JSON/);
 await assert.rejects(checkRevision({sha,fetchImpl:async()=>new Response(JSON.stringify({app:'newview',revision:'b'.repeat(40)}),{headers:{'content-type':'application/json'}})}),/mismatch/);
});

test('preview verifier retries stale preview and fails closed when revision stays old',async()=>{
 let attempts=0;
 const stale=async()=>{
  attempts++;return new Response(JSON.stringify({app:'newview',revision:attempts<3?'b'.repeat(40):sha}),{headers:{'content-type':'application/json'}});
 };
 const r=await waitForPreview({sha,fetchImpl:stale,attempts:3,intervalMs:0,sleep:async()=>{}});
 assert.deepEqual(r,{revision:sha,attempts:3});
 await assert.rejects(waitForPreview({sha,fetchImpl:async()=>new Response(JSON.stringify({app:'newview',revision:null}),{headers:{'content-type':'application/json'}}),attempts:2,intervalMs:0,sleep:async()=>{}}),/did not serve expected SHA/);
});
