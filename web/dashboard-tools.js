'use strict';
/* Homepage-style navigation without a plugin trust surface:
   local quick links, keyboard/TV command palette and truthful source summary.
   No external URL is fetched or embedded by these controls. */
(function(root){
 const STORAGE='newview.dashboard.quick-links.v1',MAX_LINKS=12,MAX_RESULTS=18;
 const workspaces=Object.freeze([
  {title:'MyView dashboard',view:'myview',keywords:'home widgets layout'},
  {title:'Markets',view:'markets',keywords:'charts crypto stock prices'},
  {title:'Discover',view:'media',keywords:'news rss IPTV YouTube video browser'},
  {title:'NewViewDevice',view:'devices',keywords:'cast pairing TV phone'}
 ]);
 const clean=s=>typeof s==='string'?s.replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').trim():'';
 function normalizeLink(item){
  if(!item||typeof item!=='object')return null;
  const title=clean(item.title).slice(0,48);
  if(!title)return null;
  try{
   const url=new URL(String(item.url||'').trim());
   if(url.protocol!=='https:'||url.username||url.password||url.port||url.href.length>1024||!url.hostname.includes('.'))return null;
   if(/(?:^|\.)localhost$|(?:^|\.)local$/.test(url.hostname))return null;
   return {title,url:url.href};
  }catch{return null;}
 }
 function sanitizeLinks(raw){
  if(!Array.isArray(raw))return [];
  const links=[],seen=new Set();
  for(const item of raw){
   const link=normalizeLink(item);
   if(!link||seen.has(link.url))continue;
   seen.add(link.url);links.push(link);
   if(links.length>=MAX_LINKS)break;
  }
  return links;
 }
 function readLinks(){
  try{return sanitizeLinks(JSON.parse(localStorage.getItem(STORAGE)||'[]'));}
  catch{return [];}
 }
 function writeLinks(links){
  const safe=sanitizeLinks(links);
  try{localStorage.setItem(STORAGE,JSON.stringify(safe));}catch{}
  return safe;
 }
 function commands(links){
  const widgets=(root.NewViewPersonal?.catalog||[]).map(w=>({title:w.title+' widget',kind:'widget',view:w.view||'myview',section:w.section||null,keywords:w.description||''}));
  const sources=(root.NewViewPublicSources?.sources||[]).slice(0,30)
   .filter(x=>x&&x.type&&typeof x.url==='string'&&x.url.startsWith('https://'))
   .map(x=>({title:x.name,kind:'source',url:x.url,keywords:x.type+' '+x.view}));
  return [
   ...workspaces.map(x=>({...x,kind:'workspace'})),
   ...widgets,
   ...sources,
   ...links.map(x=>({...x,kind:'shortcut',keywords:'saved favorite link'}))
  ];
 }
 function findCommands(query,items=commands(readLinks())){
  const needle=clean(query).toLocaleLowerCase();
  if(needle.length>100)return [];
  return items.filter(item=>!needle||(item.title+' '+(item.keywords||'')).toLocaleLowerCase().includes(needle)).slice(0,MAX_RESULTS);
 }
 function install(){
  if(document.body.classList.contains('home-panel'))return;
  if(document.getElementById('newview-command-search'))return;
  const header=document.querySelector('main > header');
  if(!header)return;
  const open=document.createElement('button');open.id='newview-command-open';open.className='newview-command-open';open.type='button';open.textContent='⌕ Search dashboard';open.title='Search commands (Ctrl+K)';
  const overlay=document.createElement('section');overlay.id='newview-command-overlay';overlay.className='newview-command-overlay';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Search dashboard commands');
  const panel=document.createElement('div');panel.className='newview-command-panel';
  const label=document.createElement('label');label.htmlFor='newview-command-search';label.textContent='Find a workspace, widget or public link';
  const input=document.createElement('input');input.type='search';input.id='newview-command-search';input.maxLength=100;input.autocomplete='off';input.placeholder='Search NewView…';
  const results=document.createElement('div');results.id='newview-command-results';results.setAttribute('role','listbox');results.setAttribute('aria-label','Matching dashboard commands');
  const help=document.createElement('p');help.className='newview-command-help';help.textContent='Enter opens the first result · Esc closes · Ctrl+K searches';
  const close=document.createElement('button');close.type='button';close.textContent='Close search';
  panel.append(label,input,results,help,close);overlay.append(panel);document.body.append(overlay);header.append(open);
  let origin=null,links=readLinks();
  function hide(){overlay.hidden=true;input.value='';if(origin?.isConnected)origin.focus();else open.focus();}
  function show(){origin=document.activeElement;overlay.hidden=false;updateResults();input.focus();}
  function activate(item){
   hide();
   if(item.kind==='workspace'||item.kind==='widget'){
    root.NewViewShell?.select(item.view);
    if(item.section)root.NewViewWatch?.select(item.section);
   }else if(item.kind==='shortcut'||item.kind==='source'){
    const safe=normalizeLink({title:item.title,url:item.url});if(!safe)return;
    const a=document.createElement('a');a.href=safe.url;a.target='_blank';a.rel='noopener noreferrer';a.click();
   }
  }
  function updateResults(){
   const found=findCommands(input.value,commands(links));
   results.replaceChildren();
   for(const item of found){
    const button=document.createElement('button');button.type='button';button.className='newview-command-result';button.setAttribute('role','option');
    const title=document.createElement('strong');title.textContent=item.title;
    const kind=document.createElement('span');kind.textContent=item.kind;
    button.append(title,kind);button.addEventListener('click',()=>activate(item));results.append(button);
   }
   if(!found.length){const empty=document.createElement('p');empty.textContent='No matching commands';results.append(empty);}
  }
  open.addEventListener('click',show);close.addEventListener('click',hide);
  input.addEventListener('input',updateResults);
  input.addEventListener('keydown',e=>{
   if(e.key==='Enter'){const first=results.querySelector('button');if(first){e.preventDefault();first.click();}}
   if(e.key==='ArrowDown'){const first=results.querySelector('button');if(first){e.preventDefault();first.focus();}}
  });
  overlay.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();hide();}
   // Keep the modal keyboard focus inside visible controls.
   if(e.key==='Tab'){
    const focusable=[input,...results.querySelectorAll('button'),close];
    const index=focusable.indexOf(document.activeElement);
    if(e.shiftKey&&index<=0){e.preventDefault();close.focus();}
    if(!e.shiftKey&&index===focusable.length-1){e.preventDefault();input.focus();}
   }
  });
  overlay.addEventListener('click',e=>{if(e.target===overlay)hide();});
  document.addEventListener('keydown',e=>{
   if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();overlay.hidden?show():hide();}
  });
  const home=document.querySelector('[data-workspace="myview"]');if(!home)return;
  const card=document.createElement('section');card.className='shell-card newview-quicklinks';card.id='newview-quicklinks';
  const heading=document.createElement('h3');heading.textContent='Quick links';
  const note=document.createElement('p');note.textContent='Save up to 12 HTTPS bookmarks on this device. Links open directly; NewView does not crawl or authenticate them.';
  const items=document.createElement('div');items.className='newview-quicklinks-list';
  const form=document.createElement('form');form.className='newview-quicklinks-form';
  const title=document.createElement('input');title.type='text';title.maxLength=48;title.placeholder='Link name';title.setAttribute('aria-label','Quick link name');title.required=true;
  const url=document.createElement('input');url.type='url';url.maxLength=1024;url.placeholder='https://example.com';url.setAttribute('aria-label','HTTPS quick link URL');url.required=true;
  const add=document.createElement('button');add.type='submit';add.textContent='Add link';
  const message=document.createElement('p');message.setAttribute('role','status');message.className='newview-quicklinks-status';
  function draw(){
   items.replaceChildren();
   for(const link of links){
    const row=document.createElement('div');row.className='newview-quicklink-row';
    const anchor=document.createElement('a');anchor.href=link.url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.textContent=link.title;anchor.title=link.url;
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+link.title);
    remove.addEventListener('click',()=>{links=writeLinks(links.filter(x=>x.url!==link.url));draw();message.textContent='Quick link removed';});
    row.append(anchor,remove);items.append(row);
   }
   if(!links.length){const empty=document.createElement('p');empty.textContent='No saved links yet.';items.append(empty);}
   add.disabled=links.length>=MAX_LINKS;
  }
  form.append(title,url,add);card.append(heading,note,items,form,message);home.append(card);
  form.addEventListener('submit',e=>{
   e.preventDefault();const link=normalizeLink({title:title.value,url:url.value});
   if(!link){message.textContent='Enter a name and an ordinary HTTPS URL without credentials or custom ports.';return;}
   if(links.some(x=>x.url===link.url)){message.textContent='This link is already saved.';return;}
   if(links.length>=MAX_LINKS){message.textContent='Maximum of 12 saved links reached.';return;}
   links=writeLinks([...links,link]);title.value='';url.value='';draw();message.textContent='Quick link saved locally';title.focus();
  });
  draw();
 }
 root.NewViewDashboardTools=Object.freeze({normalizeLink,sanitizeLinks,findCommands});
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 }
})(typeof window!=='undefined'?window:globalThis);
