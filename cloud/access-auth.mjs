/* Verify Cloudflare Access JWTs at the Worker boundary.
   Fail closed. Do not trust presence of Cf-Access-Jwt-Assertion without RS256 verification. */
const accessCertCache=new Map();
function decodeAccessPart(part){
 if(typeof part!=='string'||part.length>8192||!/^[A-Za-z0-9_-]+$/.test(part))throw Error('Malformed Access token');
 const raw=atob(part.replace(/-/g,'+').replace(/_/g,'/'));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function parseAccessPart(part){
 return JSON.parse(new TextDecoder().decode(decodeAccessPart(part)));
}
export async function checkNewViewAccess(request,env,fetcher=fetch){
 const issuer=String(env?.NEWVIEW_SYNC_ACCESS_ISSUER||'').replace(/\/$/,'');
 const aud=String(env?.NEWVIEW_SYNC_ACCESS_AUD||'');
 let uri;
 try{uri=new URL(issuer);}catch{return {configured:false,ok:false};}
 if(uri.protocol!=='https:'||!uri.hostname.endsWith('.cloudflareaccess.com')||
   !/^[a-z0-9.-]+$/i.test(uri.hostname)||uri.pathname!=='/'||uri.search||uri.hash||
   !/^[A-Za-z0-9_-]{10,128}$/.test(aud))return {configured:false,ok:false};
 const token=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!token||token.length>12000)return {configured:true,ok:false};
 try{
  const parts=token.split('.');
  if(parts.length!==3)throw Error('Invalid token shape');
  const header=parseAccessPart(parts[0]),payload=parseAccessPart(parts[1]);
  const now=Math.floor(Date.now()/1000);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>180||
    payload.iss!==issuer||!(Array.isArray(payload.aud)?payload.aud.includes(aud):payload.aud===aud)||
    typeof payload.sub!=='string'||!payload.sub||!Number.isFinite(payload.exp)||payload.exp<=now||
    (payload.nbf!==undefined&&(!Number.isFinite(payload.nbf)||payload.nbf>now+30)))throw Error('Invalid token claims');
  let jwks=fetcher===fetch?accessCertCache.get(issuer):null;
  if(!jwks||jwks.expires<=now){
   const response=await fetcher(issuer+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(7000),redirect:'error',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Cannot load Access certs');
   const text=await response.text();if(text.length>80000)throw Error('Oversized certificate response');
   const parsed=JSON.parse(text);
   if(!Array.isArray(parsed.keys))throw Error('Invalid Access certs');
   jwks={keys:parsed.keys,expires:now+300};
   if(fetcher===fetch)accessCertCache.set(issuer,jwks);
  }
  const jwk=jwks.keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&k.n&&k.e);
  if(!jwk)throw Error('Unknown Access key');
  const publicKey=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const signature=decodeAccessPart(parts[2]);
  const message=new TextEncoder().encode(parts[0]+'.'+parts[1]);
  const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',publicKey,signature,message);
  return ok?{configured:true,ok:true,subject:payload.sub}:{configured:true,ok:false};
 }catch{return {configured:true,ok:false};}
}
