#!/usr/bin/env node
// Non-destructive public deployment smoke test. No credentials, uploads, or mutation.
import assert from 'node:assert/strict';

const target=process.env.NEWVIEW_URL||'https://nowview.faisalwrokksa.workers.dev';
const base=new URL(target);
if(base.protocol!=='https:'||base.username||base.password||base.port||
 !/^(?:[a-z0-9-]+\.)+workers\.dev$/.test(base.hostname)){
 console.error('NEWVIEW_URL must be an HTTPS workers.dev deployment URL');process.exit(2);
}
const required=[
 ['/',/text\/html/i,/<(?:!doctype\s+html|html\b)/i],
 ['/index.html',/text\/html/i,/NewView/i],
 ['/workspace-shell.js',/javascript/i,/myview/i],
 ['/watch.js',/javascript/i,/Watch & News/i],
 ['/myview.js',/javascript/i,/myview/i],
 ['/connectivity.js',/javascript/i,/online/i],
 ['/healthz',/application\/json/i,null]
];
const failures=[];
for(const [path,type,bodyPattern] of required){
 try{
  const res=await fetch(new URL(path,base),{signal:AbortSignal.timeout(10000),redirect:'manual',headers:{'Accept':'*/*'}});
  const body=await res.text();
  assert.equal(res.status,200,'HTTP status');
  assert.match(res.headers.get('content-type')||'',type,'content-type');
  if(bodyPattern)assert.match(body,bodyPattern,'response body');
  if(path==='/healthz'){
   const health=JSON.parse(body);
   assert.equal(health.status,'ok');
   assert.equal(health.app,'newview');
   assert.equal(health.upstreamsChecked,false,'health endpoint must not claim feed availability');
  }
  console.log('PASS',path,'HTTP',res.status);
 }catch(e){failures.push(path+': '+e.message);console.error('FAIL',path,e.message);}
}
// Only mark a release verified if the live SHA matches the version being released.
const expected=process.env.NEWVIEW_EXPECTED_SHA||'';
if(expected&&!/^[a-f0-9]{40}$/.test(expected)){failures.push('NEWVIEW_EXPECTED_SHA must be a 40-character commit SHA');}
try{
 const response=await fetch(new URL('/version',base),{redirect:'manual',signal:AbortSignal.timeout(10000)});
 assert.equal(response.status,200);
 const version=await response.json();
 assert.equal(version.app,'newview');
 if(expected)assert.equal(version.revision,expected,'Live revision differs from the release commit');
 console.log('PASS /version',version.revision||'(unconfigured build revision)');
}catch(error){failures.push('/version: '+error.message);console.error('FAIL /version',error.message);}
if(process.env.NEWVIEW_REQUIRE_SOURCE_HEALTH==='1'){
 try{
  const response=await fetch(new URL('/api/source-health',base),{redirect:'manual',signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,200,'Scheduled source-health backend must be active');
  const health=await response.json();
  const age=Date.now()-Date.parse(health.updatedAt);
  assert.ok(Number.isFinite(age)&&age>=0&&age<=10*60*1000,'Scheduled health snapshot must be recent');
  assert.ok(health.feeds&&typeof health.feeds==='object'&&Object.keys(health.feeds).length===6,'Six allowlisted feeds must be checked');
  assert.ok(health.iptv&&['ok','failed'].includes(health.iptv.status),'IPTV directory must have been checked');
  console.log('PASS /api/source-health fresh Cron snapshot');
 }catch(error){failures.push('/api/source-health: '+error.message);console.error('FAIL /api/source-health',error.message);}
}
for(const path of ['/api/chart?symbol=%2Fetc%2Fpasswd&range=1D','/api/chart?symbol=SOXLB&range=invalid']){
 try{
  const res=await fetch(new URL(path,base),{signal:AbortSignal.timeout(10000),redirect:'manual'});
  assert.equal(res.status,400,'invalid market input must be rejected');
  console.log('PASS',path,'HTTP',res.status);
 }catch(e){failures.push(path+': '+e.message);console.error('FAIL',path,e.message);}
}
try{
 const res=await fetch(new URL('/totally-missing-newview-resource',base),{signal:AbortSignal.timeout(10000),redirect:'manual'});
 assert.equal(res.status,404);
 console.log('PASS missing resource HTTP 404');
}catch(e){failures.push('missing resource: '+e.message);}
if(process.env.NEWVIEW_CHECK_UPSTREAMS==='1'){
 for(const path of ['/api/chart?symbol=BTC&range=1D','/api/news?source=fed']){
  try{
   const res=await fetch(new URL(path,base),{signal:AbortSignal.timeout(15000)});
   const json=await res.json();
   if(res.status!==200){console.warn('UPSTREAM UNAVAILABLE',path,res.status,json.error||'');continue;}
   assert.equal(typeof json,'object');
   console.log('UPSTREAM AVAILABLE',path);
  }catch(e){console.warn('UPSTREAM UNAVAILABLE',path,e.message);}
 }
}
if(failures.length){
 console.error(failures.length+' critical smoke check(s) failed.');process.exitCode=1;
}else console.log('All public routing and deployment smoke checks passed. Upstream status is separate.');
