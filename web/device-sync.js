'use strict';
/* Opt-in cross-device MyView sync. The server sees only encrypted layouts.
   Pairing links are bearer credentials, not account login or screen streaming. */
(function(){
 const PREFIX='newview-sync-', INTERVAL=15000, encoder=new TextEncoder(),decoder=new TextDecoder();
 const allowed=new Set(['myview','markets','business','media','social']);
 let room=null, key=null, timer=null, busy=false, previousLocal=null, previousVersion=null;
 const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
 function unb64(s){if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('Invalid pairing key');const str=atob(s.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(str,c=>c.charCodeAt(0));}
 function snapshot(){
  return {widgets:window.NewViewPersonal?.load?.()||[],workspace:allowed.has(document.body.dataset.currentWorkspace)?document.body.dataset.currentWorkspace:'myview'};
 }
 function validate(data){
  if(!data||!Array.isArray(data.widgets)||data.widgets.length>5||!data.widgets.every(w=>typeof w==='string'&&['market','news','media','business','social'].includes(w))||typeof data.workspace!=='string'||!allowed.has(data.workspace))throw Error('Invalid paired dashboard data');
  return {widgets:window.NewViewPersonal?.sanitize?.(data.widgets)||[],workspace:data.workspace};
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
  const headers={Accept:'application/json'};
  if(blob!==undefined)headers['Content-Type']='application/json';
  const response=await fetch(endpoint(),{method,cache:'no-store',credentials:'same-origin',headers,body:blob===undefined?undefined:JSON.stringify({blob})});
  if(response.status===404)return null;
  if(response.status===503)throw Error('Cloud sync not configured on this server');
  if(!response.ok)throw Error('Sync request failed (HTTP '+response.status+')');
  return response.status===204?null:response.json();
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
  if(!globalThis.crypto?.subtle||!globalThis.crypto?.getRandomValues)return;
  const settings=document.querySelector('#newview-settings .newview-settings-content');if(!settings||document.getElementById(PREFIX+'panel'))return;
  const section=document.createElement('section');section.className='shell-card device-sync';section.id=PREFIX+'panel';
  const title=document.createElement('h3');title.textContent='Mirror MyView across devices';
  const description=document.createElement('p');description.textContent='Pair your own devices to synchronize widget order and selected workspace. Only encrypted settings are stored in the cloud; no camera, screen, files, media or private CSV data is shared.';
  const actions=document.createElement('div');actions.className='device-sync-actions';
  const create=document.createElement('button');create.type='button';create.textContent='Create pairing link';
  const pairing=document.createElement('input');pairing.type='text';pairing.id=PREFIX+'link';pairing.placeholder='Paste pairing link from another device';pairing.setAttribute('aria-label','Device pairing link');pairing.autocomplete='off';pairing.spellcheck=false;
  const join=document.createElement('button');join.type='button';join.textContent='Join';
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copy link';copy.hidden=true;
  const push=document.createElement('button');push.type='button';push.textContent='Sync now';push.hidden=true;
  const leave=document.createElement('button');leave.type='button';leave.textContent='Disconnect';leave.hidden=true;
  const status=document.createElement('p');status.id=PREFIX+'status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Not connected. Pairing is not account sign-in.';
  actions.append(create,pairing,join,copy,push,leave);section.append(title,description,actions,status);settings.append(section);
  function report(message){status.textContent=message;}
  function connected(value){copy.hidden=push.hidden=leave.hidden=!value;create.hidden=join.hidden=value;pairing.hidden=value;}
  async function update(force=false){
   if(!room||busy||document.hidden)return;
   busy=true;
   try{
    const current=snapshot(),local=JSON.stringify(current);
    const remote=await request('GET');
    if(!remote){
     await request('PUT',await encrypt(current));previousLocal=local;previousVersion=null;
     report('Encrypted dashboard initialized in cloud · sharing layouts only');
    }else if(remote.blob!==previousVersion){
     const incoming=await decrypt(remote.blob),serialized=JSON.stringify(incoming);
     if(force||previousLocal===null||local===previousLocal){
      if(serialized!==local){window.NewViewPersonal.save(incoming.widgets);window.NewViewPersonal.render();window.NewViewShell?.select(incoming.workspace);}
      previousLocal=serialized;previousVersion=remote.blob;
      report('Dashboard updated from paired device · no screen video');
     }else{
      await request('PUT',await encrypt(current));previousLocal=local;previousVersion=null;
      report('Local layout sent to paired devices');
     }
    }else if(force||local!==previousLocal){
     await request('PUT',await encrypt(current));previousLocal=local;previousVersion=null;
     report('Local layout sent to paired devices');
    }
   }catch(error){report(error?.message==='OperationError'?'Unable to decrypt: incorrect pairing link':(error?.message||'Unable to synchronize right now'));}
   finally{busy=false;}
  }
  function disconnect(){
   if(timer)clearInterval(timer);timer=null;room=null;key=null;previousLocal=previousVersion=null;
   if(location.hash.startsWith('#sync='))history.replaceState(null,'',location.pathname+location.search);
   connected(false);report('Disconnected on this device; other devices keep their copies');
  }
  async function pair(value,isNew){
   if(timer)clearInterval(timer);timer=null;
   room=value.room;key=value.key;previousLocal=previousVersion=null;connected(true);
   pairing.value=link();report('Pairing…');
   await update(!isNew);
   timer=setInterval(()=>update(),INTERVAL);timer.unref?.();
  }
  create.addEventListener('click',()=>{
   const random=crypto.getRandomValues(new Uint8Array(32));const secret=crypto.getRandomValues(new Uint8Array(32));
   pair({room:b64(random),key:secret},true);
  });
  join.addEventListener('click',()=>{try{pair(readPair(pairing.value),false);}catch(e){report(e.message);}});
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(link());report('Private pairing link copied. Anyone with this link can view and change your synced layout.');}catch{pairing.hidden=false;pairing.value=link();pairing.select();report('Copy the link shown in the field.');}});
  push.addEventListener('click',()=>update(true));
  leave.addEventListener('click',disconnect);
  if(location.hash.startsWith('#sync=')){
   try{pair(readPair(location.hash.slice(1)),false);}catch{report('Invalid pairing link. Create a fresh one.');}
  }
  window.addEventListener('pagehide',()=>{if(timer)clearInterval(timer);},{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
