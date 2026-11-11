import test from 'node:test';
import assert from 'node:assert/strict';
import {checkNewViewAccess} from '../cloud/access-auth.mjs';
import {ACCESS_ISSUER,ACCESS_AUD,signedAccessToken,accessCertFetch,accessRequest,withAccess} from './access-fixture.mjs';

const url='https://newview.example/api/device-sync/'+'A'.repeat(43);
test('Access JWT verifies an authentic RS256 signature and matching claims',async()=>{
 const result=await checkNewViewAccess(accessRequest(new Request(url)),withAccess(),accessCertFetch);
 assert.deepEqual(result,{configured:true,ok:true,subject:'test-user-123'});
});
test('Access fails closed without issuer or audience configuration',async()=>{
 const result=await checkNewViewAccess(accessRequest(new Request(url)),{},accessCertFetch);
 assert.deepEqual(result,{configured:false,ok:false});
 const invalid=await checkNewViewAccess(accessRequest(new Request(url)),{NEWVIEW_SYNC_ACCESS_ISSUER:'http://untrusted.test',NEWVIEW_SYNC_ACCESS_AUD:ACCESS_AUD},accessCertFetch);
 assert.equal(invalid.configured,false);
});
test('Access rejects absent, expired, wrong-issuer and wrong-audience JWTs',async()=>{
 const missing=await checkNewViewAccess(new Request(url),withAccess(),accessCertFetch);
 assert.equal(missing.ok,false);
 const now=Math.floor(Date.now()/1000);
 for(const overrides of [{exp:now-30},{aud:['wrong-app-audience']},{iss:'https://other-team.cloudflareaccess.com'},{nbf:now+3600},{sub:''}]){
  const result=await checkNewViewAccess(accessRequest(new Request(url),signedAccessToken(overrides)),withAccess(),accessCertFetch);
  assert.equal(result.ok,false,JSON.stringify(overrides));
 }
});
test('Access rejects forged, malformed and unsupported algorithm headers',async()=>{
 const token=signedAccessToken();
 const forged=token.slice(0,-3)+'abc';
 const bad=[forged,'not-a-jwt',token.replace(/\./g,''),''];
 for(const value of bad){
  const result=await checkNewViewAccess(accessRequest(new Request(url),value),withAccess(),accessCertFetch);
  assert.equal(result.ok,false);
 }
});
test('Access refuses missing certificates or untrusted JWKS',async()=>{
 const badFetch=async()=>new Response(JSON.stringify({keys:[]}),{status:200});
 const result=await checkNewViewAccess(accessRequest(new Request(url)),withAccess(),badFetch);
 assert.equal(result.ok,false);
});
