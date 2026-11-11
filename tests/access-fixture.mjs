import {generateKeyPairSync,sign,webcrypto} from 'node:crypto';
import {handleDeviceSync} from '../cloud/device-sync.mjs';
if(!globalThis.crypto?.subtle)globalThis.crypto=webcrypto;
export const ACCESS_ISSUER='https://newview-team.cloudflareaccess.com';
export const ACCESS_AUD='newview-device-test-audience';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=publicKey.export({format:'jwk'});
Object.assign(jwk,{kid:'newview-test-key',alg:'RS256',use:'sig'});
const encode=x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url');
export function signedAccessToken(overrides={}){
 const now=Math.floor(Date.now()/1000);
 const payload={iss:ACCESS_ISSUER,aud:[ACCESS_AUD],sub:'test-user-123',iat:now-10,exp:now+600,...overrides};
 const message=encode({typ:'JWT',alg:'RS256',kid:jwk.kid})+'.'+encode(payload);
 return message+'.'+sign('RSA-SHA256',Buffer.from(message),privateKey).toString('base64url');
}
export async function accessCertFetch(){return new Response(JSON.stringify({keys:[jwk]}),{status:200,headers:{'Content-Type':'application/json'}});}
export const withAccess=(env={})=>({...env,NEWVIEW_SYNC_ACCESS_ISSUER:ACCESS_ISSUER,NEWVIEW_SYNC_ACCESS_AUD:ACCESS_AUD});
export function accessRequest(request,token=signedAccessToken()){
 const headers=new Headers(request.headers);headers.set('Cf-Access-Jwt-Assertion',token);
 return new Request(request,{headers});
}
export function secured(request,env,url){
 return handleDeviceSync(accessRequest(request),withAccess(env),url,accessCertFetch);
}
