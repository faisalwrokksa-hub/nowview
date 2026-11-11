'use strict';
/* NewView floating screen viewer: user-consented, browser-to-browser WebRTC
   demonstration. Manual SDP exchange, LAN ICE only; NOT an Android phone
   capture app, automatic cloud signaling, account login or remote control. */
(function(){
 const MAX_SIGNAL=120000;
 let peer=null, localCapture=null, currentStream=null, mode=null, minimized=false;
 const el=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value)e.textContent=value;return e;};
 function parseSignal(raw,type){
  if(typeof raw!=='string'||raw.length>MAX_SIGNAL)throw Error('Invalid or oversized connection code');
  const data=JSON.parse(raw);
  if(!data||data.type!==type||typeof data.sdp!=='string'||data.sdp.length<50||data.sdp.length>MAX_SIGNAL||!data.sdp.startsWith('v=0')||!data.sdp.includes('m=video '))throw Error('Invalid '+type+' video connection code');
  if(data.sdp.includes('m=application '))throw Error('Remote-control data channels are disabled');
  return {type,sdp:data.sdp};
 }
 function install(){
  if(document.body.classList.contains('home-panel'))return;
  if(document.getElementById('newview-cast-dock'))return;
  const dock=el('aside','newview-cast-dock');dock.id='newview-cast-dock';dock.hidden=true;dock.setAttribute('aria-label','Floating device screen viewer');
  const top=el('div','newview-cast-bar');const heading=el('strong','','Device screen');const tools=el('div','newview-cast-tools');
  const fold=el('button','','−');fold.type='button';fold.title='Minimize floating screen';fold.setAttribute('aria-label','Minimize floating screen');
  const expand=el('button','','⛶');expand.type='button';expand.title='Fullscreen screen viewer';expand.setAttribute('aria-label','Fullscreen floating screen');
  const close=el('button','','×');close.type='button';close.title='Stop and close device screen';close.setAttribute('aria-label','Stop and close screen sharing');
  const video=document.createElement('video');video.id='newview-cast-video';video.autoplay=true;video.playsInline=true;video.controls=true;
  video.setAttribute('aria-label','Connected screen stream');
  const state=el('p','newview-cast-state','No live video source');state.setAttribute('role','status');
  tools.append(fold,expand,close);top.append(heading,tools);dock.append(top,video,state);document.body.append(dock);
  const trigger=el('button','newview-cast-trigger','▣ Screen cast');trigger.type='button';trigger.id='newview-cast-trigger';
  trigger.setAttribute('aria-label','Open floating screen viewer and device connection controls');
  const header=document.querySelector('main > header');header?.append(trigger);
  const deviceControls=document.querySelector('.newview-device-cards');
  const card=el('article','shell-card newview-cast-setup');card.id='newview-cast-setup';
  const eyebrow=el('span','shell-eyebrow','LIVE VIEW · BROWSER EXPERIMENTAL');
  const title=el('h3','','Floating screen while using Markets');
  const note=el('p','','Open this viewer over any workspace. Connect two supported browsers on the same local network with manually exchanged connection codes. The sending browser must explicitly approve screen capture. Most phone browsers cannot capture their whole screen; native Android integration is still required.');
  const status=el('p','newview-cast-info','Disconnected. Cloud account pairing is separate from live video.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const buttons=el('div','newview-cast-actions');
  const watch=el('button','','1 · Watch another screen');watch.type='button';
  const send=el('button','','2 · Share this screen');send.type='button';
  const stop=el('button','','Stop sharing');stop.type='button';stop.disabled=true;
  const offerLabel=el('label','','Connection offer');offerLabel.htmlFor='newview-cast-offer';
  const offer=document.createElement('textarea');offer.id='newview-cast-offer';offer.rows=3;offer.placeholder='Copy offer from viewer into sender';offer.maxLength=MAX_SIGNAL;offer.spellcheck=false;
  const answerLabel=el('label','','Connection answer');answerLabel.htmlFor='newview-cast-answer';
  const answer=document.createElement('textarea');answer.id='newview-cast-answer';answer.rows=3;answer.placeholder='Copy answer from sender back into viewer';answer.maxLength=MAX_SIGNAL;answer.spellcheck=false;
  const actions=el('div','newview-cast-actions');
  const apply=el('button','','Finish viewer connection');apply.type='button';apply.disabled=true;
  const copyOffer=el('button','','Copy offer');copyOffer.type='button';copyOffer.disabled=true;
  const copyAnswer=el('button','','Copy answer');copyAnswer.type='button';copyAnswer.disabled=true;
  const viewMarket=el('button','','Open Markets with floating screen');viewMarket.type='button';
  const noAuto=el('p','newview-cast-note','No recording, background capture, remote commands, or unattended access. Browser permission and peer connection must both be active.');
  buttons.append(watch,send,stop);actions.append(apply,copyOffer,copyAnswer,viewMarket);
  card.append(eyebrow,title,note,status,buttons,offerLabel,offer,answerLabel,answer,actions,noAuto);deviceControls?.prepend(card);
  const report=text=>{status.textContent=text;state.textContent=text;};
  const showDock=()=>{dock.hidden=false;dock.classList.remove('is-minimized');minimized=false;};
  function attachStream(stream){
   currentStream=stream;video.srcObject=stream;showDock();video.play().catch(()=>report('Screen connected · press Play in the viewer'));
   report('Screen stream connected. Switch to Markets; the viewer stays open.');
  }
  function reset(){
   if(localCapture){localCapture.getTracks().forEach(track=>track.stop());localCapture=null;}
   if(peer){peer.close();peer=null;}
   if(currentStream){video.srcObject=null;currentStream=null;}
   mode=null;offer.value='';answer.value='';apply.disabled=copyOffer.disabled=copyAnswer.disabled=true;stop.disabled=true;watch.disabled=send.disabled=false;report('Disconnected · no screen is being shared');
  }
  function fail(error){report(error instanceof Error?error.message:'Screen connection unavailable');}
  const supported=()=>typeof RTCPeerConnection==='function';
  function createPeer(){
   if(!supported())throw Error('This browser does not support WebRTC');
   const pc=new RTCPeerConnection({iceServers:[]});peer=pc;
   pc.ontrack=e=>{const stream=e.streams[0]||new MediaStream([e.track]);attachStream(stream);};
   pc.onconnectionstatechange=()=>{if(pc!==peer)return;if(pc.connectionState==='failed'||pc.connectionState==='closed')reset();else if(pc.connectionState==='disconnected')report('Connection interrupted; check both devices');};
   return pc;
  }
  async function waitIce(pc){
   if(pc.iceGatheringState==='complete')return;
   await new Promise((resolve,reject)=>{
    let timer;const done=()=>{clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',changed);resolve();};
    const changed=()=>{if(pc.iceGatheringState==='complete')done();};
    timer=setTimeout(()=>{pc.removeEventListener('icegatheringstatechange',changed);reject(Error('Network discovery timed out; retry on the same Wi-Fi'));},15000);
    pc.addEventListener('icegatheringstatechange',changed);changed();
   });
  }
  watch.addEventListener('click',async()=>{
   reset();mode='watch';watch.disabled=send.disabled=true;stop.disabled=false;
   try{
    const pc=createPeer();pc.addTransceiver('video',{direction:'recvonly'});
    await pc.setLocalDescription(await pc.createOffer());await waitIce(pc);
    offer.value=JSON.stringify({type:'offer',sdp:pc.localDescription.sdp});
    copyOffer.disabled=false;apply.disabled=false;showDock();
    report('Offer created. Send it privately to the screen-sharing browser, then paste its answer.');
   }catch(e){fail(e);reset();}
  });
  send.addEventListener('click',async()=>{
   let receivedOffer;
   try{receivedOffer=parseSignal(offer.value,'offer');}catch(error){report('Paste a valid viewer offer before starting screen capture');return;}
   if(!navigator.mediaDevices?.getDisplayMedia){report('Screen capture unavailable in this browser. Use a supported desktop browser or a permission-based native Android sender.');return;}
   let capture;
   try{capture=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});}
   catch{report('Screen permission denied or capture cancelled; nothing was shared');return;}
   reset();offer.value=JSON.stringify(receivedOffer);localCapture=capture;mode='send';watch.disabled=send.disabled=true;stop.disabled=false;
   capture.getVideoTracks()[0]?.addEventListener('ended',reset,{once:true});
   try{
    const pc=createPeer();capture.getTracks().forEach(track=>pc.addTrack(track,capture));
    await pc.setRemoteDescription(receivedOffer);
    await pc.setLocalDescription(await pc.createAnswer());await waitIce(pc);
    answer.value=JSON.stringify({type:'answer',sdp:pc.localDescription.sdp});copyAnswer.disabled=false;
    showDock();video.muted=true;attachStream(capture);
    report('Screen capture active. Copy the answer to the viewer. Stop sharing when finished.');
   }catch(e){fail(e);reset();}
  });
  apply.addEventListener('click',async()=>{
   if(mode!=='watch'||!peer)return;
   try{await peer.setRemoteDescription(parseSignal(answer.value,'answer'));report('Answer accepted. Connecting on the same local network…');}
   catch(e){fail(e);}
  });
  async function copy(value){try{await navigator.clipboard.writeText(value);report('Code copied. Share privately with the other device.');}catch{report('Clipboard unavailable. Select and copy the code manually.');}}
  copyOffer.addEventListener('click',()=>copy(offer.value));copyAnswer.addEventListener('click',()=>copy(answer.value));
  viewMarket.addEventListener('click',()=>{showDock();window.NewViewShell?.select('markets');});
  // Move the persistent viewer out of the way of market charts on desktop/touch.
  let dragging=null;
  top.addEventListener('pointerdown',e=>{
   if(e.button!==0||e.target.closest('button')||document.fullscreenElement===dock)return;
   const rect=dock.getBoundingClientRect();
   dragging={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top};
   try{top.setPointerCapture(e.pointerId);}catch{}
  });
  top.addEventListener('pointermove',e=>{
   if(!dragging)return;
   const left=Math.max(0,Math.min(window.innerWidth-dock.offsetWidth,dragging.left+e.clientX-dragging.x));
   const y=Math.max(0,Math.min(window.innerHeight-dock.offsetHeight,dragging.top+e.clientY-dragging.y));
   dock.style.left=left+'px';dock.style.top=y+'px';dock.style.right='auto';dock.style.bottom='auto';
  });
  const releaseDrag=()=>{dragging=null;};
  top.addEventListener('pointerup',releaseDrag);top.addEventListener('pointercancel',releaseDrag);
  window.addEventListener('resize',()=>{if(dock.hidden)return;const rect=dock.getBoundingClientRect();if(rect.left>window.innerWidth-50||rect.top>window.innerHeight-50){dock.style.removeProperty('left');dock.style.removeProperty('top');dock.style.removeProperty('right');dock.style.removeProperty('bottom');}});
  trigger.addEventListener('click',()=>{showDock();window.NewViewShell?.select('devices');});
  fold.addEventListener('click',()=>{minimized=!minimized;dock.classList.toggle('is-minimized',minimized);fold.textContent=minimized?'+':'−';fold.setAttribute('aria-label',minimized?'Restore floating screen':'Minimize floating screen');});
  expand.addEventListener('click',()=>{if(dock.requestFullscreen)Promise.resolve(dock.requestFullscreen()).catch(()=>report('Fullscreen unavailable'));});
  close.addEventListener('click',()=>{reset();dock.hidden=true;window.NewViewShell?.select('devices');});
  stop.addEventListener('click',()=>{reset();dock.hidden=true;});
  window.addEventListener('pagehide',reset,{once:true});
  window.NewViewCast={attachStream,stop:reset,open:showDock};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
