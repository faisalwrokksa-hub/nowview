/* Cloudflare KV encrypted device-layout relay.
   This is a capability-link prototype, not a sign-in provider.
   Configure NEWVIEW_SYNC KV binding before enabling on a public deployment.
*/
export async function handleDeviceSync(request,env,url,fetcher=fetch){
 const base={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
 const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:base});
 const fail=()=>reply({error:'Cloud sync unavailable; NEWVIEW_SYNC KV binding is not configured'},503);
 if(!env?.NEWVIEW_SYNC||typeof env.NEWVIEW_SYNC.get!=='function'||typeof env.NEWVIEW_SYNC.put!=='function')return fail();
 const access=await checkNewViewAccess(request,env,fetcher);
 if(!access.configured)return reply({error:'Cloudflare Access authentication must be configured for device sync'},503);
 if(!access.ok)return reply({error:'Sign in through the protected NewView domain before using device sync'},401);
 const match=/^\/api\/device-sync\/([A-Za-z0-9_-]{43})$/.exec(url.pathname);
 if(!match)return reply({error:'Invalid sync room'},404);
 const path='v1:'+match[1],method=request.method;
 if(!['GET','PUT'].includes(method))return new Response('Method not allowed',{status:405,headers:{...base,Allow:'GET, PUT'}});
 if(method==='PUT'){
  const origin=request.headers.get('Origin');
  if(origin&&origin!==url.origin)return reply({error:'Cross-origin changes are not allowed'},403);
  const type=request.headers.get('Content-Type')||'';
  if(!/^application\/json(?:\s*;|$)/i.test(type))return reply({error:'JSON required'},415);
  const size=Number(request.headers.get('Content-Length'));
  if(Number.isFinite(size)&&size>12000)return reply({error:'Request too large'},413);
  let body;
  try{
   const text=await request.text();if(text.length>12000)return reply({error:'Request too large'},413);
   body=JSON.parse(text);
  }catch{return reply({error:'Invalid JSON'},400);}
  if(!body||typeof body.blob!=='string'||body.blob.length>8000||
     !/^[A-Za-z0-9_-]{16,64}\.[A-Za-z0-9_-]{20,7950}$/.test(body.blob))return reply({error:'Invalid encrypted layout'},400);
  // Expire encrypted layout automatically. Only the secret room ID is used as the storage key.
  await env.NEWVIEW_SYNC.put(path,body.blob,{expirationTtl:604800});
  return new Response(null,{status:204,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 const blob=await env.NEWVIEW_SYNC.get(path);
 return blob?reply({blob}):reply({error:'Room empty'},404);
}
