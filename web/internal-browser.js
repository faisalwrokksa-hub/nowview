'use strict';
/* Shared dark browsing controller. Native Android opens isolated WebView;
   web mode is sandboxed and may be blocked by publisher frame policies. */
(function(root){
 const KEY='newview.browser.bookmarks.web.v1', LIMIT=100;
 const youtube=/^(?:www\.|m\.)?youtube\.com$|^youtu\.be$|^www\.youtube-nocookie\.com$/;
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
  const external=make('button','','Open publisher'),close=make('button','','✕');
  for(const b of [back,next,reload,star,external,close])b.type='button';
  back.setAttribute('aria-label','Browser back');next.setAttribute('aria-label','Browser forward');
  reload.setAttribute('aria-label','Reload current page');star.setAttribute('aria-label','Save or remove bookmark');
  close.setAttribute('aria-label','Close internal browser');
  toolbar.append(back,next,reload,form,star,bookmarks,external,close);
  const status=make('p','nv-browser-status');status.setAttribute('role','status');
  const frame=make('iframe','nv-browser-frame');frame.title='Sandboxed website preview';
  frame.referrerPolicy='no-referrer';frame.loading='lazy';
  frame.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin allow-popups');
  const excerpt=make('div','nv-browser-excerpt');excerpt.hidden=true;
  panel.append(toolbar,status,excerpt,frame);
  (document.getElementById('nv-read-hub')||document.getElementById('nv-watch-headlines')||document.body).append(panel);
  let history=[],cursor=-1,current='',area='read';
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
   if(typeof root.NewViewNative?.openNewsBrowser==='function'){
    root.NewViewNative.openNewsBrowser(url);return true;
   }
   mount(requested);
   current=url;address.value=url;
   if(!replace){history=history.slice(0,cursor+1);history.push(url);cursor=history.length-1;}
   const video=parseYouTube(url);
   excerpt.replaceChildren();
   if(title||summary){
    if(title)excerpt.append(make('h3','',title));
    if(summary)excerpt.append(make('p','',summary));
   }
   excerpt.hidden=!(title||summary);
   // A YouTube homepage cannot be framed; full website navigation will use an
   // external tab, while a video URL may use YouTube's official embed.
   if(youtube.test(new URL(url).hostname)&&!video){
    frame.hidden=true;frame.removeAttribute('src');
    status.textContent='YouTube does not permit embedding its homepage. Open publisher to browse the full site. Video links can play in this panel.';
   }else{
    frame.hidden=false;
    frame.src=video?'https://www.youtube-nocookie.com/embed/'+video+'?rel=0':url;
    status.textContent=video?'Official YouTube video · playback controlled by YouTube':
     'Website preview · some publishers block embedded pages. Use Open publisher if blank.';
   }
   external.textContent=video?'Open YouTube':'Open publisher';
   renderMarks();
   return true;
  }
  function closeBrowser(){
   const previous=area;
   panel.hidden=true;frame.removeAttribute('src');
   if(typeof CustomEvent==='function')document.dispatchEvent(new CustomEvent('newview:browser-close',{detail:{area:previous}}));
  }
  form.addEventListener('submit',e=>{e.preventDefault();if(!show(address.value,{area}))status.textContent='Enter a valid public HTTPS website.';});
  back.addEventListener('click',()=>{if(cursor>0){cursor--;show(history[cursor],{area,replace:true});}});
  next.addEventListener('click',()=>{if(cursor<history.length-1){cursor++;show(history[cursor],{area,replace:true});}});
  reload.addEventListener('click',()=>{if(current)show(current,{area,replace:true});});
  external.addEventListener('click',()=>{if(current)root.open(current,'_blank','noopener,noreferrer');});
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
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 }
})(typeof window!=='undefined'?window:globalThis);
