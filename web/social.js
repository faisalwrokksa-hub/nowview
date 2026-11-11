'use strict';
/* NewViewSocial: local-only approved-platform bookmarks; no scraping or impersonated API feeds. */
(function(){
 const SOURCES=Object.freeze({
  x:Object.freeze({label:'X',hosts:['x.com','www.x.com','twitter.com','www.twitter.com'],root:'https://x.com/'}),
  tiktok:Object.freeze({label:'TikTok',hosts:['tiktok.com','www.tiktok.com','m.tiktok.com'],root:'https://www.tiktok.com/'}),
  facebook:Object.freeze({label:'Facebook',hosts:['facebook.com','www.facebook.com','m.facebook.com'],root:'https://www.facebook.com/'}),
  truth:Object.freeze({label:'Truth Social',hosts:['truthsocial.com','www.truthsocial.com'],root:'https://truthsocial.com/'}),
  stocktwits:Object.freeze({label:'Stocktwits',hosts:['stocktwits.com','www.stocktwits.com'],root:'https://stocktwits.com/'}),
  polymarket:Object.freeze({label:'Polymarket',hosts:['polymarket.com','www.polymarket.com'],root:'https://polymarket.com/'})
 });
 const KEY='newview.social.links.v1',PREF_KEY='newview.social.discovery.v1',MAX=24;
 function preferences(){try{const p=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');return {geo:Object.hasOwn(GEO,p.geo)?p.geo:'GLOBAL',topic:Object.hasOwn(TOPICS,p.topic)?p.topic:'all'};}catch{return {geo:'GLOBAL',topic:'all'};}}
 function savePreferences(geo,topic){try{localStorage.setItem(PREF_KEY,JSON.stringify({geo,topic}));}catch{}}
 const GEO=Object.freeze({US:['US','en'],CA:['CA','en'],AU:['AU','en'],GB:['GB','en'],GLOBAL:['US','en']});
 const TOPICS=Object.freeze({all:'trending',business:'business',markets:'financial markets',technology:'technology',ai:'artificial intelligence',news:'breaking news',sports:'sports',entertainment:'entertainment',gaming:'gaming',science:'science'});
 function discoveryUrl(region,topic){
  const geo=GEO[region]||GEO.GLOBAL;
  const q=TOPICS[topic]===undefined?'':TOPICS[topic];
  const url=new URL('https://news.google.com/search');
  url.searchParams.set('q',q||'trending');
  if(region!=='GLOBAL'){url.searchParams.set('hl',geo[1]);url.searchParams.set('gl',geo[0]);url.searchParams.set('ceid',geo[0]+':'+geo[1]);}
  return url.href;
 }
 function discoveryLinks(region,topic){const query=TOPICS[topic]||'trending';return [{label:region==='GLOBAL'?'Global news search':'Regional news search',url:discoveryUrl(region,topic)},{label:'Bluesky — public topic search',url:'https://bsky.app/search?q='+encodeURIComponent(query)},{label:'Mastodon — public hashtag discovery',url:'https://mastodon.social/tags/'+encodeURIComponent((query==='trending'?'news':query).replace(/[^a-z0-9]/gi,''))},{label:'Google Trends — explore region',url:'https://trends.google.com/trends/explore?geo='+encodeURIComponent(region==='GLOBAL'?'':GEO[region]?.[0]||'US')},{label:'Reddit communities',url:'https://www.reddit.com/r/popular/'}];}

 function validate(platform,value){
  const source=SOURCES[platform];if(!source||typeof value!=='string'||value.length>500)return null;
  try{
   const url=new URL(value.trim());
   if(url.protocol!=='https:'||url.username||url.password||url.port||!source.hosts.includes(url.hostname.toLowerCase()))return null;
   if(/[%\\]/.test(url.pathname)||url.pathname.length>180)return null;
   const parts=url.pathname.split('/').filter(Boolean);
   if(!parts.length)return null;
   // Profile links only: no post extraction, shared redirect, URLs or account authentication.
   if(platform==='x'){
    if(parts.length!==1||!/^@[A-Za-z0-9_]{1,15}$/.test('@'+parts[0])||['home','intent','share','i','search','login'].includes(parts[0].toLowerCase()))return null;
    return {platform,url:'https://x.com/'+parts[0],name:'@'+parts[0]};
   }
   if(platform==='tiktok'){
    if(parts.length!==1||!/^@[A-Za-z0-9._]{2,25}$/.test(parts[0]))return null;
    return {platform,url:'https://www.tiktok.com/'+parts[0],name:parts[0]};
   }
   if(platform==='truth'){
    if(parts.length!==1||!/^@[A-Za-z0-9_]{1,30}$/.test(parts[0]))return null;
    return {platform,url:'https://truthsocial.com/'+parts[0],name:parts[0]};
   }
   if(platform==='polymarket'){
    if(parts.length!==2||parts[0]!=='profile'||!/^0x[a-fA-F0-9]{40}$/.test(parts[1]))return null;
    return {platform,url:'https://polymarket.com/profile/'+parts[1],name:'Public profile'};
   }
   if(platform==='stocktwits'){
    if(parts.length!==1||!(/^[A-Za-z0-9_]{1,30}$/.test(parts[0]))||['login','signup','streams','symbol','news','search'].includes(parts[0].toLowerCase()))return null;
    return {platform,url:'https://stocktwits.com/'+parts[0],name:'@'+parts[0]};
   }
   if(parts.length!==1||!(/^[A-Za-z0-9.]{5,70}$/.test(parts[0]))||['login','share','groups','watch','reel','profile.php','plugins'].includes(parts[0].toLowerCase()))return null;
   return {platform,url:'https://www.facebook.com/'+parts[0],name:parts[0]};
  }catch{return null;}
 }
 function sanitize(value){
  if(!Array.isArray(value))return [];
  const result=[],seen=new Set();
  for(const entry of value.slice(0,100)){
   if(!entry||typeof entry!=='object')continue;
   const next=validate(entry.platform,entry.url);
   if(next&&!seen.has(next.url)){result.push(next);seen.add(next.url);}
   if(result.length>=MAX)break;
  }
  return result;
 }
 function load(){try{return sanitize(JSON.parse(localStorage.getItem(KEY)||'[]'));}catch{return [];}}
 function save(items){const safe=sanitize(items);try{localStorage.setItem(KEY,JSON.stringify(safe));return safe;}catch{return null;}}
 const META_KEY='newview.social.metadata.v1';
 function cleanLabel(value){return typeof value==='string'?value.trim().slice(0,32).replace(/[^a-zA-Z0-9 _-]/g,''):'';}
 function loadMetadata(){try{const raw=JSON.parse(localStorage.getItem(META_KEY)||'{}');if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};const result={};for(const [key,value] of Object.entries(raw).slice(0,MAX)){if(typeof key!=='string'||key.length>500||!value||typeof value!=='object')continue;const tag=cleanLabel(value.tag),collection=cleanLabel(value.collection);if(tag||collection)result[key]={tag,collection};}return result;}catch{return {};}}
 function persistMetadata(){try{localStorage.setItem(META_KEY,JSON.stringify(metadata));return true;}catch{return false;}}
 const form=document.getElementById('social-add'),links=document.getElementById('social-links');
 if(!form||!links){window.NewViewSocial={validate,sanitize,load,save,discoveryUrl,discoveryLinks};return;}
 const platform=document.getElementById('social-platform'),url=document.getElementById('social-url'),status=document.getElementById('social-status');
 const geoPicker=document.getElementById('social-geo'),topicPicker=document.getElementById('social-topic'),discovery=document.getElementById('social-discovery'),discoveryStatus=document.getElementById('social-discovery-status');
 let items=load();let metadata=loadMetadata();
 const filter=document.createElement('input');filter.type='search';filter.id='social-saved-search';filter.placeholder='Search saved profiles';filter.setAttribute('aria-label','Search saved social profiles');links.parentElement?.insertBefore(filter,links);
 filter.addEventListener('input',()=>render());
 filter.addEventListener('keydown',event=>{if(event.key==='Escape'&&filter.value){event.preventDefault();filter.value='';render();}});
 const matchStatus=document.createElement('p');matchStatus.id='social-saved-match-count';matchStatus.setAttribute('role','status');matchStatus.setAttribute('aria-live','polite');links.parentElement?.insertBefore(matchStatus,links);
 const collectionFilter=document.createElement('select');collectionFilter.setAttribute('aria-label','Filter saved profiles by collection');links.parentElement?.insertBefore(collectionFilter,links);
 collectionFilter.addEventListener('change',()=>render());
 const tagFilter=document.createElement('select');tagFilter.setAttribute('aria-label','Filter saved profiles by tag');links.parentElement?.insertBefore(tagFilter,links);
 tagFilter.addEventListener('change',()=>render());
 const clearFilters=document.createElement('button');clearFilters.type='button';clearFilters.textContent='Clear search and filters';clearFilters.setAttribute('aria-label','Clear saved profile search, tag and collection filters');links.parentElement?.insertBefore(clearFilters,links);
 clearFilters.addEventListener('click',()=>{filter.value='';collectionFilter.value='';tagFilter.value='';render();filter.focus();});
 const text=(tag,className,value)=>{const e=document.createElement(tag);if(className)e.className=className;e.textContent=value;return e;};
 function renderDiscovery(){
  if(!geoPicker||!topicPicker||!discovery)return;
  const region=Object.hasOwn(GEO,geoPicker.value)?geoPicker.value:'GLOBAL';
  const topic=Object.hasOwn(TOPICS,topicPicker.value)?topicPicker.value:'all';
  savePreferences(region,topic);
  discovery.replaceChildren();
  for(const entry of discoveryLinks(region,topic)){
   const a=text('a','social-profile-link',entry.label);a.href=entry.url;a.target='_blank';a.rel='noopener noreferrer';discovery.append(a);
  }
  if(discoveryStatus)discoveryStatus.textContent='Region: '+geoPicker.options[geoPicker.selectedIndex].text+' · Curated external discovery links only. No live X, TikTok or Facebook trends claimed.';
 }
 geoPicker?.addEventListener('change',renderDiscovery);
 topicPicker?.addEventListener('change',renderDiscovery);
 function render(){
  if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('newview:social',{detail:{count:items.length}}));
  links.replaceChildren();
  const selectedCollection=collectionFilter.value;
  const selectedTag=tagFilter.value;
  const collections=[...new Set(items.map(item=>metadata[item.url]?.collection).filter(Boolean))].sort();
  collectionFilter.replaceChildren(...[['','All collections'],...collections.map(x=>[x,x])].map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));
  collectionFilter.value=collections.includes(selectedCollection)?selectedCollection:'';
  const tags=[...new Set(items.map(item=>metadata[item.url]?.tag).filter(Boolean))].sort();
  tagFilter.replaceChildren(...[['','All tags'],...tags.map(x=>[x,x])].map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));
  tagFilter.value=tags.includes(selectedTag)?selectedTag:'';
  clearFilters.disabled=!filter.value&&!collectionFilter.value&&!tagFilter.value;
  if(!items.length){matchStatus.textContent='0 saved profiles';links.append(text('p','social-empty','No public profiles saved. Add a public profile URL to open it from your dashboard.'));return;}
  const term=filter.value.trim().toLowerCase().slice(0,100);
  const matching=items.filter(item=>(!collectionFilter.value||metadata[item.url]?.collection===collectionFilter.value)&&(!tagFilter.value||metadata[item.url]?.tag===tagFilter.value)&&(!term||(item.name+' '+SOURCES[item.platform].label+' '+item.url+' '+(metadata[item.url]?.tag||'')+' '+(metadata[item.url]?.collection||'')).toLowerCase().includes(term)));
  matchStatus.textContent=matching.length+' of '+items.length+' saved profiles shown';
  if(!matching.length){links.append(text('p','social-empty','No saved profiles match your search.'));return;}
  for(const item of matching){
   const article=text('article','social-link-card','');
   const title=text('h3','',SOURCES[item.platform].label+' · '+item.name);
   const a=text('a','social-profile-link','Open original profile');
   a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';
   const remove=text('button','','Remove');
   remove.type='button';remove.setAttribute('aria-label','Remove '+item.name);
   remove.addEventListener('click',()=>{const next=save(items.filter(x=>x.url!==item.url));if(!next){status.textContent='Could not remove profile: device storage is unavailable.';return;}items=next;const previousMetadata=metadata[item.url];delete metadata[item.url];if(!persistMetadata()){if(previousMetadata)metadata[item.url]=previousMetadata;render();status.textContent='Profile removed, but saved labels could not be cleared from device storage.';return;}render();status.textContent='Profile removed locally.';});
   const tag=document.createElement('input');tag.type='text';tag.maxLength=32;tag.placeholder='Tag (optional)';tag.setAttribute('aria-label','Tag for '+item.name);tag.value=metadata[item.url]?.tag||'';
   const collection=document.createElement('input');collection.type='text';collection.maxLength=32;collection.placeholder='Collection (optional)';collection.setAttribute('aria-label','Collection for '+item.name);collection.value=metadata[item.url]?.collection||'';
   const saveLabels=text('button','','Save labels');saveLabels.type='button';
   saveLabels.addEventListener('click',()=>{const previous=metadata[item.url];const next={tag:cleanLabel(tag.value),collection:cleanLabel(collection.value)};if(next.tag||next.collection)metadata[item.url]=next;else delete metadata[item.url];if(!persistMetadata()){if(previous)metadata[item.url]=previous;else delete metadata[item.url];status.textContent='Could not save labels on this device.';return;}status.textContent='Profile labels saved locally.';render();});
   article.append(title,a,tag,collection,saveLabels,remove);links.append(article);
  }
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const item=validate(platform.value,url.value);
  if(!item){status.textContent='Enter a valid HTTPS public profile URL for the selected platform.';return;}
  if(items.some(x=>x.url===item.url)){status.textContent='This profile is already saved.';return;}
  if(items.length>=MAX){status.textContent='Maximum 24 saved profiles.';return;}
  const next=save([...items,item]);if(!next){status.textContent='Could not save profile: device storage is unavailable.';return;}items=next;url.value='';status.textContent='Profile saved on this device. No social feed has been fetched.';render();
 });
 document.getElementById('social-clear')?.addEventListener('click',()=>{const next=save([]);if(!next){status.textContent='Could not clear profiles: device storage is unavailable.';return;}items=next;const previousMetadata=metadata;metadata={};if(!persistMetadata()){metadata=previousMetadata;status.textContent='Profiles cleared, but saved labels could not be cleared from device storage.';render();return;}status.textContent='All saved profiles cleared from this device.';render();});
 window.NewViewSocial={validate,sanitize,load,save,render,discoveryUrl,discoveryLinks};
 const pref=preferences();if(geoPicker){for(const [value,label] of [['GLOBAL','Global'],['US','United States'],['CA','Canada'],['AU','Australia'],['GB','United Kingdom']]){if(!Array.from(geoPicker.options).some(o=>o.value===value)){const option=document.createElement('option');option.value=value;option.textContent=label;geoPicker.append(option);}}for(const option of Array.from(geoPicker.options)){if(!Object.hasOwn(GEO,option.value))option.remove();}geoPicker.value=pref.geo;}if(topicPicker){for(const [value,label] of [['ai','AI'],['news','Breaking News'],['sports','Sports'],['entertainment','Entertainment'],['gaming','Gaming'],['science','Science']]){if(!Array.from(topicPicker.options).some(o=>o.value===value)){const option=document.createElement('option');option.value=value;option.textContent=label;topicPicker.append(option);}}topicPicker.value=pref.topic;}
 render();renderDiscovery();
})();
