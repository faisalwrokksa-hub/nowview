'use strict';
/* Shared dark browsing controller. Native Android opens isolated WebView;
   web mode is sandboxed and may be blocked by publisher frame policies. */
(function(root){
 const KEY='newview.browser.bookmarks.web.v1', LIMIT=100;
 const youtube=/^(?:www\.|m\.)?youtube\.com$|^youtu\.be$|^www\.youtube-nocookie\.com$/;
 function clipBounds(frame,clips,width,height){
  let left=Math.max(0,frame.left),top=Math.max(0,frame.top),right=Math.min(width,frame.right),bottom=Math.min(height,frame.bottom);
  for(const clip of clips){left=Math.max(left,clip.left);top=Math.max(top,clip.top);right=Math.min(right,clip.right);bottom=Math.min(bottom,clip.bottom);}
  left=Math.min(width,Math.max(0,Math.ceil(left)));top=Math.min(height,Math.max(0,Math.ceil(top)));
  return [left,top,Math.max(0,Math.floor(right)-left),Math.max(0,Math.floor(bottom)-top),Math.round(width)];
 }
 function safeUrl(raw){
  if(typeof raw!=='string'||!raw.trim()||raw.length>2048)return null;
  try{
   const candidate=/^https?:\/\//i.test(raw.trim())?raw.trim():'https://'+raw.trim();
   const u=new URL(candidate);
   if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
   const h=u.hostname.toLowerCase();
   if(!h.includes('.')||h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||
      h.endsWith('.internal')||h.includes(':')||/^\d+(?:\.\d+){3}$/.test(h))return null;
   return u.href;
  }catch{return null;}
 }
 function parseYouTube(raw){
  try{
   const u=new URL(raw);if(!youtube.test(u.hostname))return null;
   let id=u.hostname==='youtu.be'?u.pathname.slice(1):u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})\/?$/)?.[1];
   return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:null;
  }catch{return null;}
 }
 function saved(){
  try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.filter(x=>x&&safeUrl(x.url)===x.url).slice(0,LIMIT):[];}catch{return [];}
 }
 function install(){
  if(document.getElementById('nv-internal-browser'))return;
  const make=(tag,cls,label)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(label!==undefined)n.textContent=label;return n;};
  const panel=make('section','nv-internal-browser');panel.id='nv-internal-browser';panel.hidden=true;
  panel.setAttribute('aria-label','NewView internal browser');
  const toolbar=make('div','nv-browser-toolbar');
  const back=make('button','','◀'),next=make('button','','▶'),reload=make('button','','↻');
  const form=make('form','nv-browser-address-form'),address=make('input'),go=make('button','','Go');
  address.type='url';address.maxLength=2048;address.placeholder='Enter a public HTTPS address';address.setAttribute('aria-label','Browser website address');
  form.append(address,go);
  const star=make('button','','☆'),bookmarks=make('select');bookmarks.setAttribute('aria-label','Saved browser bookmarks');
  // Use real anchors for publisher navigation: unlike window.open(), their click
  // remains a direct user gesture and works reliably with popup blockers.
  const external=make('a','nv-browser-external','Open publisher'),fullscreen=make('button','','Fullscreen'),close=make('button','','✕');
  external.target='_blank';external.rel='noopener noreferrer';
  for(const b of [back,next,reload,star,fullscreen,close])b.type='button';
  back.setAttribute('aria-label','Browser back');next.setAttribute('aria-label','Browser forward');
  reload.setAttribute('aria-label','Reload current page');star.setAttribute('aria-label','Save or remove bookmark');
  close.setAttribute('aria-label','Close internal browser');
  toolbar.append(back,next,reload,form,star,bookmarks,external,fullscreen,close);
  const status=make('p','nv-browser-status');status.setAttribute('role','status');
  const frame=make('iframe','nv-browser-frame');frame.title='Sandboxed website preview';
  frame.referrerPolicy='no-referrer';frame.loading='lazy';
  frame.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin allow-popups allow-presentation');
  frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;
  const excerpt=make('div','nv-browser-excerpt');excerpt.hidden=true;
  const fallback=make('div','nv-browser-fallback');
  fallback.setAttribute('role','note');
  const fallbackText=make('p','','If this preview is blank or restricted, open the publisher’s full website. Some websites do not allow iframe previews.');
  const openFull=make('a','nv-browser-open-full','Open full website');
  openFull.target='_blank';openFull.rel='noopener noreferrer';
  const retryPreview=make('button','','Try website preview');retryPreview.type='button';retryPreview.hidden=true;
  fallback.append(fallbackText,openFull,retryPreview);
  panel.append(toolbar,status,excerpt,fallback,frame);
  (document.getElementById('nv-read-hub')||document.getElementById('nv-watch-headlines')||document.body).append(panel);
  let history=[],cursor=-1,current='',area='read',returnFocus=null;
  let nativeActive=false;
  const boxed=()=>typeof root.NewViewNative?.openBoxBrowser==='function';
  function nativeBounds(){
   if(!nativeActive)return null;
   const r=frame.getBoundingClientRect(),clips=[];
   for(let p=frame.parentElement;p;p=p.parentElement){
    if(p.hidden||getComputedStyle(p).display==='none'){return [0,0,0,0,Math.round(innerWidth)];}
    const style=getComputedStyle(p),b=p.getBoundingClientRect();
    clips.push({left:/auto|scroll|hidden|clip/.test(style.overflowX)?b.left+p.clientLeft:0,right:/auto|scroll|hidden|clip/.test(style.overflowX)?b.left+p.clientLeft+p.clientWidth:innerWidth,top:/auto|scroll|hidden|clip/.test(style.overflowY)?b.top+p.clientTop:0,bottom:/auto|scroll|hidden|clip/.test(style.overflowY)?b.top+p.clientTop+p.clientHeight:innerHeight});
   }
   return clipBounds(r,clips,innerWidth,innerHeight);
  }
  function positionNative(){const bounds=nativeBounds();if(bounds)root.NewViewNative.moveBoxBrowser(...bounds);}
  document.addEventListener('scroll',positionNative,true);root.addEventListener?.('resize',positionNative);
  if(typeof ResizeObserver==='function')new ResizeObserver(positionNative).observe(panel);
  setInterval(()=>{if(nativeActive)positionNative();},250);
  // Publisher-owned frame policies cannot be detected reliably from a cross-origin
  // iframe. Avoid a known-blank experience; still let users try a preview.
  function prefersFullBrowser(url){
   const host=new URL(url).hostname.toLowerCase();
   return ['reuters.com','bbc.com','sec.gov','federalreserve.gov','cnbc.com']
    .some(domain=>host===domain||host.endsWith('.'+domain));
  }
  function renderMarks(){
   const records=saved();
   bookmarks.replaceChildren();
   const placeholder=make('option','','Bookmarks ('+records.length+')');placeholder.value='';bookmarks.append(placeholder);
   for(const record of records){const o=make('option','',record.title||record.url);o.value=record.url;bookmarks.append(o);}
   bookmarks.value='';
   star.textContent=records.some(x=>x.url===current)?'★':'☆';
   back.disabled=cursor<=0;next.disabled=cursor<0||cursor>=history.length-1;
  }
  function mount(destination){
   area=destination;
   const holder=destination==='home'?document.getElementById('nv-home-article'):
    destination==='watch'?document.getElementById('nv-watch-hub'):document.getElementById('nv-read-hub');
   if(holder&&panel.parentElement!==holder)holder.append(panel);
   panel.hidden=false;
  }
  function show(raw,{area:requested='read',title='',summary='',replace=false}={}){
   const url=safeUrl(raw);if(!url)return false;
   if(!boxed()&&typeof root.NewViewNative?.openNewsBrowser==='function'){
    root.NewViewNative.openNewsBrowser(url);return true;
   }
   if(panel.hidden){const active=document.activeElement;returnFocus=active&&active!==document.body?active:null;}
   mount(requested);
   current=url;address.value=url;
   external.href=url;openFull.href=url;
   retryPreview.hidden=true;
   fallback.hidden=false;
   if(!replace){history=history.slice(0,cursor+1);history.push(url);if(history.length>100)history.shift();cursor=history.length-1;}
   const video=parseYouTube(url);
   excerpt.replaceChildren();
   if(title||summary){
    if(title)excerpt.append(make('h3','',title));
    if(summary)excerpt.append(make('p','',summary));
   }
   excerpt.hidden=!(title||summary);
   if(boxed()){
    nativeActive=true;frame.hidden=false;frame.removeAttribute('src');frame.classList.add('nv-native-browser-slot');
    fallback.hidden=true;excerpt.hidden=true;external.hidden=true;
    status.textContent='Website opens inside this box. Scroll the page here; publisher sign-in and playback rules still apply.';
    renderMarks();back.disabled=false;next.disabled=false;
    frame.scrollIntoView?.({block:'nearest',behavior:'instant'});
    requestAnimationFrame(()=>{const bounds=nativeBounds();if(bounds)root.NewViewNative.openBoxBrowser(url,...bounds);});
    return true;
   }
   // A YouTube homepage cannot be framed; full website navigation will use an
   // external tab, while a video URL may use YouTube's official embed.
   fallbackText.textContent='If this preview is blank or restricted, open the publisher’s full website. Some websites do not allow iframe previews.';
   openFull.textContent='Open full website';
   if(youtube.test(new URL(url).hostname)&&!video){
    frame.hidden=true;frame.removeAttribute('src');
    fallbackText.textContent='YouTube does not allow its full website inside an iframe. Open the full site in a separate tab; individual videos can play in NewView.';
    openFull.textContent='Open YouTube in new tab';
    status.textContent='Full YouTube cannot play in this embedded browser. Choose Open YouTube in new tab.';
    openFull.focus?.({preventScroll:true});
   }else if(!video&&prefersFullBrowser(url)){
    frame.hidden=true;frame.removeAttribute('src');
    retryPreview.hidden=false;
    status.textContent='This publisher commonly restricts embedded pages. Open full website to view the complete page.';
   }else{
    frame.hidden=false;
    frame.src=video?'https://www.youtube-nocookie.com/embed/'+video+'?rel=0':url;
    status.textContent=video?'Official YouTube video · playback controlled by YouTube':
     'Website preview attempted. If blank or blocked by the publisher, choose Open full website.';
   }
   external.textContent=video?'Open YouTube':'Open publisher';
   renderMarks();
   panel.scrollIntoView?.({block:'start',behavior:'smooth'});
   return true;
  }
  function closeBrowser(){
   if(nativeActive){root.NewViewNative?.boxBrowserAction?.('close');nativeActive=false;}
   const previous=area;
   panel.hidden=true;frame.removeAttribute('src');retryPreview.hidden=true;
   const focus=returnFocus;returnFocus=null;
   if(focus?.isConnected&&!focus.closest('[hidden],[inert],[aria-hidden="true"]')){
    try{focus.focus({preventScroll:true});}catch{focus.focus();}
   }
   if(typeof CustomEvent==='function')document.dispatchEvent(new CustomEvent('newview:browser-close',{detail:{area:previous}}));
  }
  form.addEventListener('submit',e=>{e.preventDefault();if(!show(address.value,{area}))status.textContent='Enter a valid public HTTPS website.';});
  back.addEventListener('click',()=>{if(nativeActive){root.NewViewNative.boxBrowserAction('back');return;}if(cursor>0){cursor--;show(history[cursor],{area,replace:true});}});
  next.addEventListener('click',()=>{if(nativeActive){root.NewViewNative.boxBrowserAction('forward');return;}if(cursor<history.length-1){cursor++;show(history[cursor],{area,replace:true});}});
  reload.addEventListener('click',()=>{if(nativeActive){root.NewViewNative.boxBrowserAction('reload');return;}if(current)show(current,{area,replace:true});});
  retryPreview.addEventListener('click',()=>{
   if(!current)return;
   frame.hidden=false;frame.src=current;retryPreview.hidden=true;
   status.textContent='Website preview attempted. If blank, choose Open full website.';
  });
  fullscreen.addEventListener('click',()=>{
   if(document.fullscreenElement===panel){document.exitFullscreen?.();return;}
   if(!panel.requestFullscreen){status.textContent='Fullscreen is not supported here. Use the browser fullscreen option.';return;}
   Promise.resolve(panel.requestFullscreen()).catch(()=>{status.textContent='Fullscreen was denied by this browser.';});
  });
  document.addEventListener('fullscreenchange',()=>{
   fullscreen.textContent=document.fullscreenElement===panel?'Exit fullscreen':'Fullscreen';
  });
  star.addEventListener('click',()=>{
   if(!current)return;
   const data=saved(),index=data.findIndex(x=>x.url===current);
   if(index>=0)data.splice(index,1);else{
    if(data.length>=LIMIT){status.textContent='Bookmark limit reached (100).';return;}
    data.unshift({url:current,title:(excerpt.querySelector('h3')?.textContent||new URL(current).hostname).slice(0,100)});
   }
   try{localStorage.setItem(KEY,JSON.stringify(data));}catch{status.textContent='Bookmarks could not be saved on this device.';}
   renderMarks();
  });
  bookmarks.addEventListener('change',()=>{if(bookmarks.value)show(bookmarks.value,{area});});
  close.addEventListener('click',closeBrowser);
  renderMarks();
  root.NewViewInternalBrowser=Object.freeze({open:show,close:closeBrowser,safeUrl,parseYouTube});
 }
 root.NewViewBrowserSafeUrl=safeUrl;
 root.NewViewBrowserClipBounds=clipBounds;
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 }
})(typeof window!=='undefined'?window:globalThis);
