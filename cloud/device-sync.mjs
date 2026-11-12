import {checkNewViewAccess} from './access-auth.mjs';
/* Authenticated encrypted layout relay:
   Cloudflare Access verifies identity before routing to one SQLite Durable Object
   per (subject, secret room ID). Revocation is authoritative and fail-closed.
   Legacy KV rooms are intentionally NOT read or migrated.
*/
export async function handleDeviceSync(request,env,url,fetcher=fetch){
 const base={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
 const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:base});
 if(!env?.NEWVIEW_SYNC_ROOMS||typeof env.NEWVIEW_SYNC_ROOMS.getByName!=='function')
  return reply({error:'Cloud sync unavailable; NEWVIEW_SYNC_ROOMS Durable Object binding is not configured'},503);
 const access=await checkNewViewAccess(request,env,fetcher);
 if(!access.configured)return reply({error:'Cloudflare Access authentication must be configured for device sync'},503);
 if(!access.ok)return reply({error:'Sign in through the protected NewView domain before using device sync'},401);
 const match=/^\/api\/device-sync\/([A-Za-z0-9_-]{43})$/.exec(url.pathname);
 if(!match)return reply({error:'Invalid sync room'},404);
 const method=request.method;
 if(!['GET','POST','PUT','DELETE'].includes(method))
  return new Response('Method not allowed',{status:405,headers:{...base,Allow:'GET, POST, PUT, DELETE'}});
 if(method!=='GET'){
  const origin=request.headers.get('Origin');
  if(origin&&origin!==url.origin)return reply({error:'Cross-origin changes are not allowed'},403);
 }
 let blob,expectedBlob;
 if(method==='POST'||method==='PUT'){
  const type=request.headers.get('Content-Type')||'';
  if(!/^application\/json(?:\s*;|$)/i.test(type))return reply({error:'JSON required'},415);
  const size=Number(request.headers.get('Content-Length'));
  if(Number.isFinite(size)&&size>18000)return reply({error:'Request too large'},413);
  let body;
  try{const text=await request.text();if(text.length>18000)return reply({error:'Request too large'},413);body=JSON.parse(text);}
  catch{return reply({error:'Invalid JSON'},400);}
  if(!body||typeof body.blob!=='string'||body.blob.length>8000||
     !/^[A-Za-z0-9_-]{16,64}\.[A-Za-z0-9_-]{20,7950}$/.test(body.blob))
   return reply({error:'Invalid encrypted layout'},400);
  if(method==='PUT'&&(typeof body.expected!=='string'||body.expected.length>8000||
    !/^[A-Za-z0-9_-]{16,64}\.[A-Za-z0-9_-]{20,7950}$/.test(body.expected)))
    return reply({error:'An expected encrypted room version is required for updates'},428);
  blob=body.blob;
  if(method==='PUT')expectedBlob=body.expected;
 }
 // Partition is an unguessable client-generated room scoped to a verified Access subject.
 // Do not include a raw Access subject or room secret in storage/DO identifiers.
 const material=new TextEncoder().encode(access.subject+String.fromCharCode(0)+match[1]);
 const digest=await crypto.subtle.digest('SHA-256',material);
 const partition=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 try{
  const room=env.NEWVIEW_SYNC_ROOMS.getByName('sync-v3:'+partition);
  const result=method==='GET'?await room.read():
   method==='POST'?await room.create(blob):
   method==='PUT'?await room.update(blob,expectedBlob):
   await room.revoke();
  if(result.status===204)return new Response(null,{status:204,headers:base});
  if(result.status===200&&typeof result.blob==='string')return reply({blob:result.blob});
  if(result.status===410)return reply({error:'This pairing room has been revoked. Create a new room.'},410);
  if(result.status===409)return reply({error:method==='PUT'?'Room changed on another device; refresh before updating':'This pairing room already exists'},409);
  if(result.status===428)return reply({error:'Expected room version required'},428);
  if(result.status===404)return reply({error:'Room empty or expired'},404);
  return reply({error:'Unable to process encrypted layout'},400);
 }catch{
  return reply({error:'Cloud sync temporarily unavailable; authoritative room state could not be reached'},503);
 }
}
