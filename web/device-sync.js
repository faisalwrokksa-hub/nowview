'use strict';
/* Opt-in cross-device MyView sync. The server sees only encrypted layouts.
   Pairing links are bearer credentials, not account login or screen streaming. */
(function(){
 const PREFIX='newview-sync-', INTERVAL=15000, encoder=new TextEncoder(),decoder=new TextDecoder();
 const allowed=new Set(['myview','markets','media','devices']);
 const mapWorkspace=v=>v==='business'?'myview':v==='news'||v==='social'?'media':v;
 let room=null, key=null, timer=null, busy=false, previousLocal=null, previousVersion=null, createdRoom=false, session=0, conflict=null;
 const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
 function unb64(s){if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('Invalid pairing key');const str=atob(s.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(str,c=>c.charCodeAt(0));}
 function snapshot(){
  return {widgets:window.NewViewPersonal?.load?.()||[],workspace:allowed.has(mapWorkspace(document.body.dataset.currentWorkspace))?mapWorkspace(document.body.dataset.currentWorkspace):'myview'};
 }
 function validate(data){
  if(!data||!Array.isArray(data.widgets)||data.widgets.length>5||!data.widgets.every(w=>typeof w==='string'&&['market','news','media','business','social'].includes(w))||typeof data.workspace!=='string'||!allowed.has(mapWorkspace(data.workspace)))throw Error('Invalid paired dashboard data');
  return {widgets:window.NewViewPersonal?.sanitize?.(data.widgets)||[],workspace:mapWorkspace(data.workspace)};
 }
 async function encrypt(data){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const material=await crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']);
  const result=await crypto.subtle.encrypt({name:'AES-GCM',iv},material,encoder.encode(JSON.stringify(validate(data))));
  return b64(iv)+'.'+b64(result);
 }
 async function decrypt(value){
  const [iv,cipher,...extra]=String(value||'').split('.');
  if(extra.length||!iv||!cipher)throw Error('Invalid encrypted dashboard');
  const nonce=unb64(iv);if(nonce.length!==12)throw Error('Invalid encryption nonce');
  const material=await crypto.subtle.importKey('raw',key,'AES-GCM',false,['decrypt']);
  const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},material,unb64(cipher));
  return validate(JSON.parse(decoder.decode(clear)));
 }
 const endpoint=()=>'/api/device-sync/'+room;
 async function request(method,blob,expected){
  const requestRoom=room;
  if(!requestRoom)throw Error('No paired room active');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  const headers={Accept:'application/json'};
  if(blob!==undefined)headers['Content-Type']='application/json';
  try{
   const response=await fetch('/api/device-sync/'+requestRoom,{method,cache:'no-store',credentials:'same-origin',signal:controller.signal,headers,body:blob===undefined?undefined:JSON.stringify(expected===undefined?{blob}:{blob,expected})});
   if(response.status===404){if(method==='GET')return null;throw Error('Pairing room expired or was not found. Create a fresh pairing link.');}
   if(response.status===410)throw Error('This pairing room has been revoked. Create a new pairing link.');
   if(response.status===409)throw Error(method==='PUT'?'Room changed on another device. Check for updates to resolve the conflict.':'This pairing room already exists. Create another pairing link.');
   if(response.status===428)throw Error('Sync update missing its expected room version; retry from an updated client.');
   if(response.status===401||response.status===403)throw Error('Cloud sync requires an authorized Cloudflare Access sign-in');
   if(response.status===503)throw Error('Cloud sync Durable Object or Access policy is not configured on this server');
   if(!response.ok)throw Error('Sync request failed (HTTP '+response.status+')');
   return response.status===204?null:response.json();
  }finally{clearTimeout(timeout);}
 }
 function link(){const uri=new URL(location.href);uri.hash='sync='+room+'.'+b64(key);return uri.toString();}
 function readPair(text){
  const raw=String(text||'').trim();
  let token=raw;
  if(raw.includes('#')){const url=new URL(raw);if(url.origin!==location.origin)throw Error('Use a pairing link for this NewView website');token=url.hash.slice(1);}
  token=token.replace(/^sync=/,'');
  const match=/^([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if(!match)throw Error('Enter a valid NewView pairing link');
  const material=unb64(match[2]);if(material.length!==32)throw Error('Invalid encryption key');
  return {room:match[1],key:material};
 }
 function install(){
  // The native APK uses file: URLs; pairing requires the deployed HTTPS Worker host.
  if(location.protocol!=='https:'&&!(location.protocol==='http:'&&['localhost','127.0.0.1'].includes(location.hostname)))return;
  if(!globalThis.crypto?.subtle||!globalThis.crypto?.getRandomValues)return;
  const settings=document.getElementById('newview-device-controls');if(!settings||document.getElementById(PREFIX+'panel'))return;
  settings.replaceChildren();
  const section=document.createElement('section');section.className='shell-card device-sync';section.id=PREFIX+'panel';
  const title=document.createElement('h4');title.textContent='Encrypted pairing';
  const description=document.createElement('p');description.textContent='Pair your authorized devices after signing in through the protected NewView site. Only encrypted widget settings and the active workspace are relayed; no camera, screen, files, media or passwords are shared. Pairing is not a substitute for account sign-in.';
  const actions=document.createElement('div');actions.className='device-sync-actions';
  const create=document.createElement('button');create.type='button';create.textContent='Create pairing link';
  const pairing=document.createElement('input');pairing.type='text';pairing.id=PREFIX+'link';pairing.placeholder='Paste pairing link from another device';pairing.setAttribute('aria-label','Device pairing link');pairing.autocomplete='off';pairing.spellcheck=false;
  const join=document.createElement('button');join.type='button';join.textContent='Join';
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copy link';copy.hidden=true;
  const push=document.createElement('button');push.type='button';push.textContent='Check for updates';push.hidden=true;
  const useCloud=document.createElement('button');useCloud.type='button';useCloud.textContent='Use cloud layout';useCloud.hidden=true;
  const useLocal=document.createElement('button');useLocal.type='button';useLocal.textContent='Keep this layout';useLocal.hidden=true;
  const leave=document.createElement('button');leave.type='button';leave.textContent='Disconnect this device';leave.hidden=true;
  const revoke=document.createElement('button');revoke.type='button';revoke.textContent='Revoke pairing for all devices';revoke.hidden=true;
  const status=document.createElement('p');status.id=PREFIX+'status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Not connected. Pairing is not account sign-in.';
  actions.append(create,pairing,join,copy,push,useCloud,useLocal,leave,revoke);section.append(title,description,actions,status);settings.append(section);
  function report(message){status.textContent=message;const badge=document.getElementById('newview-device-status');if(badge)badge.textContent=message;}
  function connected(value){copy.hidden=push.hidden=leave.hidden=revoke.hidden=!value;copy.disabled=value;create.hidden=join.hidden=value;pairing.hidden=value;if(!value){useCloud.hidden=useLocal.hidden=true;conflict=null;pairing.value='';}}
  function resolveConflict(){useCloud.hidden=useLocal.hidden=!conflict;}
  function applyCloud(incoming){
   window.NewViewPersonal?.save?.(incoming.widgets);
   window.NewViewPersonal?.render?.();
   window.NewViewShell?.select?.(incoming.workspace);
  }
  async function update(){
   if(!room||busy||document.hidden||conflict)return;
   if(navigator.onLine===false){report('Browser offline · local dashboard available; cloud layout sync paused');return;}
   const activeSession=session;
   busy=true;push.disabled=true;push.setAttribute('aria-busy','true');report('Checking encrypted device layout…');
   try{
    const current=snapshot(),local=JSON.stringify(current);
    const remote=await request('GET');
    if(activeSession!==session)return;
    if(!remote){
     if(!createdRoom){report('Pairing room not found or expired. Create a fresh link on the first device.');return;}
     const sealed=await encrypt(current);if(activeSession!==session)return;
     await request('POST',sealed);if(activeSession!==session)return;
     previousLocal=local;previousVersion=sealed;createdRoom=false;copy.disabled=false;
     report('Encrypted room created · sharing layouts only, no screen video');
    }else if(remote.blob!==previousVersion){
     const incoming=await decrypt(remote.blob);if(activeSession!==session)return;
     const serialized=JSON.stringify(incoming);
     // Joining an existing room must never silently replace this device's layout.
     // Ask before overwriting local preferences, even on the first sync.
     if(previousLocal===null&&!createdRoom&&serialized!==local){
      conflict={incoming,cloudVersion:remote.blob};
      resolveConflict();
      report('Paired layout differs from this device. Choose the cloud layout or keep this layout.');
      return;
     }
     if(previousLocal!==null&&local!==previousLocal&&serialized!==local){
      conflict={incoming,cloudVersion:remote.blob};
      resolveConflict();
      report('Both devices changed their layouts. Choose which version to keep before syncing.');
      return;
     }
     if(serialized!==local)applyCloud(incoming);
     previousLocal=serialized;previousVersion=remote.blob;copy.disabled=false;
     report('Cloud layout checked · no screen video');
    }else if(local!==previousLocal){
     const sealed=await encrypt(current);if(activeSession!==session)return;
     await request('PUT',sealed,previousVersion);if(activeSession!==session)return;
     previousLocal=local;previousVersion=sealed;
     report('Local layout sent to paired devices');
    }else report('Up to date · encrypted layout only');
   }catch(error){
    if(activeSession===session&&/room has been revoked/.test(String(error?.message||''))){disconnect();report('This room was revoked. The pairing link is no longer valid.');}
    else if(activeSession===session)report(error?.name==='AbortError'?'Cloud sync timed out; retry':(error?.message||'Unable to synchronize right now'));
   }finally{if(activeSession===session){busy=false;push.disabled=false;push.removeAttribute('aria-busy');}}
  }
  useCloud.addEventListener('click',()=>{
   if(!conflict)return;
   applyCloud(conflict.incoming);
   previousLocal=JSON.stringify(conflict.incoming);previousVersion=conflict.cloudVersion;
   conflict=null;resolveConflict();report('Cloud layout selected');update();
  });
  useLocal.addEventListener('click',()=>{
   if(!conflict)return;
   previousVersion=conflict.cloudVersion;previousLocal=JSON.stringify(conflict.incoming);
   conflict=null;resolveConflict();
   // The next sync pass will propose this local layout after checking cloud again.
   report('Keeping this layout. Synchronizing the selected version…');update();
  });
  function disconnect(){
   session++;busy=false;if(timer)clearInterval(timer);timer=null;room=null;key=null;previousLocal=previousVersion=null;createdRoom=false;conflict=null;push.disabled=false;push.removeAttribute('aria-busy');
   if(location.hash.startsWith('#sync='))history.replaceState(null,'',location.pathname+location.search);
   connected(false);report('Disconnected on this device; other devices keep their copies');
  }
  async function pair(value,isNew){
   session++;busy=false;if(timer)clearInterval(timer);timer=null;conflict=null;push.disabled=false;push.removeAttribute('aria-busy');
   room=value.room;key=value.key;previousLocal=previousVersion=null;createdRoom=isNew;connected(true);
   const pairingSession=session;pairing.value='';report('Pairing…');
   await update();
   if(pairingSession!==session)return;
   timer=setInterval(()=>update(),INTERVAL);timer.unref?.();
  }
  create.addEventListener('click',()=>{
   const random=crypto.getRandomValues(new Uint8Array(32));const secret=crypto.getRandomValues(new Uint8Array(32));
   pair({room:b64(random),key:secret},true);
  });
  join.addEventListener('click',()=>{try{pair(readPair(pairing.value),false);}catch(e){report(e.message);}});
  copy.addEventListener('click',async()=>{if(copy.disabled||!room)return;try{await navigator.clipboard.writeText(link());report('Private pairing link copied. Only a user authorized through Cloudflare Access can join this account-scoped room.');}catch{pairing.hidden=false;pairing.value=link();pairing.select();report('Copy the link shown in the field.');}});
  push.addEventListener('click',()=>update());
  leave.addEventListener('click',disconnect);
  revoke.addEventListener('click',async()=>{
   if(!room||busy)return;
   if(!window.confirm('Revoke this encrypted pairing room for every device? This cannot be undone.'))return;
   const revokeSession=session;
   revoke.disabled=true;
   try{await request('DELETE');if(revokeSession===session){disconnect();report('Pairing room revoked. Old links will no longer work.');}}
   catch(error){if(revokeSession===session)report(error?.message||'Could not revoke pairing. Retry.');}
   finally{revoke.disabled=false;}
  });
  if(location.hash.startsWith('#sync=')){
   try{
    const credentials=readPair(location.hash.slice(1));
    history.replaceState(null,'',location.pathname+location.search);
    pair(credentials,false);
   }catch{report('Invalid pairing link. Create a fresh one.');}
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&room)update();});
  window.addEventListener('online',()=>{if(room)update();});
  window.addEventListener('offline',()=>{if(room)report('Browser offline · cloud sync paused; local dashboard available');});
  window.addEventListener('pagehide',()=>{session++;if(timer)clearInterval(timer);timer=null;},{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
