'use strict';
/* NowViewSocial: local-only approved-platform bookmarks; no scraping or impersonated API feeds. */
(function(){
 const SOURCES=Object.freeze({
  x:Object.freeze({label:'X',hosts:['x.com','www.x.com','twitter.com','www.twitter.com'],root:'https://x.com/'}),
  tiktok:Object.freeze({label:'TikTok',hosts:['tiktok.com','www.tiktok.com','m.tiktok.com'],root:'https://www.tiktok.com/'}),
  facebook:Object.freeze({label:'Facebook',hosts:['facebook.com','www.facebook.com','m.facebook.com'],root:'https://www.facebook.com/'})
 });
 const KEY='nowview.social.links.v1',MAX=24;
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
 function save(items){const safe=sanitize(items);try{localStorage.setItem(KEY,JSON.stringify(safe));}catch{}return safe;}
 const form=document.getElementById('social-add'),links=document.getElementById('social-links');
 if(!form||!links){window.NowViewSocial={validate,sanitize,load,save};return;}
 const platform=document.getElementById('social-platform'),url=document.getElementById('social-url'),status=document.getElementById('social-status');
 let items=load();
 const text=(tag,className,value)=>{const e=document.createElement(tag);if(className)e.className=className;e.textContent=value;return e;};
 function render(){
  links.replaceChildren();
  if(!items.length){links.append(text('p','social-empty','No public profiles saved. Add a public profile URL to open it from your dashboard.'));return;}
  for(const item of items){
   const article=text('article','social-link-card','');
   const title=text('h3','',SOURCES[item.platform].label+' · '+item.name);
   const a=text('a','social-profile-link','Open original profile');
   a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';
   const remove=text('button','','Remove');
   remove.type='button';remove.setAttribute('aria-label','Remove '+item.name);
   remove.addEventListener('click',()=>{items=save(items.filter(x=>x.url!==item.url));render();status.textContent='Profile removed locally.';});
   article.append(title,a,remove);links.append(article);
  }
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const item=validate(platform.value,url.value);
  if(!item){status.textContent='Enter an HTTPS profile URL for X, TikTok or Facebook. Public profiles only.';return;}
  if(items.some(x=>x.url===item.url)){status.textContent='This profile is already saved.';return;}
  if(items.length>=MAX){status.textContent='Maximum 24 saved profiles.';return;}
  items=save([...items,item]);url.value='';status.textContent='Profile saved on this device. No social feed has been fetched.';render();
 });
 document.getElementById('social-clear')?.addEventListener('click',()=>{items=save([]);status.textContent='All saved profiles cleared from this device.';render();});
 window.NowViewSocial={validate,sanitize,load,save,render};
 render();
})();
