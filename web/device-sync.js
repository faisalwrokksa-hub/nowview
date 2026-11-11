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
 async function request(method,blob){
  const requestRoom=room;
  if(!requestRoom)throw Error('No paired room active');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  const headers={Accept:'application/json'};
  if(blob!==undefined)headers['Content-Type']='application/json';
  try{
   const response=await fetch('/api/device-sync/'+requestRoom,{method,cache:'no-store',credentials:'same-origin',signal:controller.signal,headers,body:blob===undefined?undefined:JSON.stringify({blob})});
   if(response.status===404)return null;
   if(response.status===503)throw Error('Cloud sync not configured on this server');
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
  const description=document.createElement('p');description.textContent='Pair your own devices to synchronize widget order and selected workspace. Only encrypted settings are stored in the cloud; no camera, screen, files, media or private CSV data is shared.';
  const actions=document.createElement('div');actions.className='device-sync-actions';
  const create=document.createElement('button');create.type='button';create.textContent='Create pairing link';
  const pairing=document.createElement('input');pairing.type='text';pairing.id=PREFIX+'link';pairing.placeholder='Paste pairing link from another device';pairing.setAttribute('aria-label','Device pairing link');pairing.autocomplete='off';pairing.spellcheck=false;
  const join=document.createElement('button');join.type='button';join.textContent='Join';
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copy link';copy.hidden=true;
  const push=document.createElement('button');push.type='button';push.textContent='Check for updates';push.hidden=true;
  const useCloud=document.createElement('button');useCloud.type='button';useCloud.textContent='Use cloud layout';useCloud.hidden=true;
  const useLocal=document.createElement('button');useLocal.type='button';useLocal.textContent='Keep this layout';useLocal.hidden=true;
  const leave=document.createElement('button');leave.type='button';leave.textContent='Disconnect';leave.hidden=true;
  const status=document.createElement('p');status.id=PREFIX+'status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Not connected. Pairing is not account sign-in.';
  actions.append(create,pairing,join,copy,push,useCloud,useLocal,leave);section.append(title,description,actions,status);settings.append(section);
  function report(message){status.textContent=message;const badge=document.getElementById('newview-device-status');if(badge)badge.textContent=message;}
  function connected(value){copy.hidden=push.hidden=leave.hidden=!value;create.hidden=join.hidden=value;pairing.hidden=value;if(!value){useCloud.hidden=useLocal.hidden=true;conflict=null;}}
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
   busy=true;
   try{
    const current=snapshot(),local=JSON.stringify(current);
    const remote=await request('GET');
    if(activeSession!==session)return;
    if(!remote){
     if(!createdRoom){report('Pairing room not found or expired. Create a fresh link on the first device.');return;}
     const sealed=await encrypt(current);if(activeSession!==session)return;
     await request('PUT',sealed);if(activeSession!==session)return;
     previousLocal=local;previousVersion=sealed;createdRoom=false;
     report('Encrypted room created · sharing layouts only, no screen video');
    }else if(remote.blob!==previousVersion){
     const incoming=await decrypt(remote.blob);if(activeSession!==session)return;
     const serialized=JSON.stringify(incoming);
     if(previousLocal!==null&&local!==previousLocal&&serialized!==local){
      conflict={incoming,cloudVersion:remote.blob};
      resolveConflict();
      report('Both devices changed their layouts. Choose which version to keep before syncing.');
      return;
     }
     if(serialized!==local)applyCloud(incoming);
     previousLocal=serialized;previousVersion=remote.blob;
     report('Cloud layout checked · no screen video');
    }else if(local!==previousLocal){
     const sealed=await encrypt(current);if(activeSession!==session)return;
     await request('PUT',sealed);if(activeSession!==session)return;
     previousLocal=local;previousVersion=sealed;
     report('Local layout sent to paired devices');
    }else report('Up to date · encrypted layout only');
   }catch(error){
    if(activeSession===session)report(error?.name==='AbortError'?'Cloud sync timed out; retry':(error?.message||'Unable to synchronize right now'));
   }finally{busy=false;}
  }
  useCloud.addEventListener('click',()=>{
   if(!conflict)return;
   applyCloud(conflict.incoming);
   previousLocal=JSON.stringify(conflict.incoming);previousVersion=conflict.cloudVersion;
   conflict=null;resolveConflict();report('Cloud layout selected');update();
  });
  useLocal.addEventListener('click',()=>{
   if(!conflict)return;
   previousVersion=conflict.cloudVersion;previousLocal=null;
   conflict=null;resolveConflict();
   // The next sync pass will propose this local layout after checking cloud again.
   report('Keeping this layout. Synchronizing the selected version…');update();
  });
  function disconnect(){
   session++;if(timer)clearInterval(timer);timer=null;room=null;key=null;previousLocal=previousVersion=null;createdRoom=false;conflict=null;
   if(location.hash.startsWith('#sync='))history.replaceState(null,'',location.pathname+location.search);
   connected(false);report('Disconnected on this device; other devices keep their copies');
  }
  async function pair(value,isNew){
   session++;if(timer)clearInterval(timer);timer=null;conflict=null;
   room=value.room;key=value.key;previousLocal=previousVersion=null;createdRoom=isNew;connected(true);
   pairing.value=link();report('Pairing…');
   await update();
   timer=setInterval(()=>update(),INTERVAL);timer.unref?.();
  }
  create.addEventListener('click',()=>{
   const random=crypto.getRandomValues(new Uint8Array(32));const secret=crypto.getRandomValues(new Uint8Array(32));
   pair({room:b64(random),key:secret},true);
  });
  join.addEventListener('click',()=>{try{pair(readPair(pairing.value),false);}catch(e){report(e.message);}});
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(link());report('Private pairing link copied. Anyone with this link can view and change your synced layout.');}catch{pairing.hidden=false;pairing.value=link();pairing.select();report('Copy the link shown in the field.');}});
  push.addEventListener('click',()=>update());
  leave.addEventListener('click',disconnect);
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
  window.addEventListener('pagehide',()=>{if(timer)clearInterval(timer);},{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
