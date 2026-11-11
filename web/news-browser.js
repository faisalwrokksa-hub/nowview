'use strict';
/* Remote-first News Browser. Native Android users open a bridge-free WebView.
   Website users open trusted HTTPS URLs in a new browser tab: most publishers
   cannot legally/technically be embedded in iframes. DNS is OS/network policy. */
(function(){
 const MAX_URL=2048;
 const defaultSites=Object.freeze([
  {name:'BBC World',url:'https://www.bbc.com/news'},
  {name:'Reuters',url:'https://www.reuters.com/world/'},
  {name:'Al Jazeera',url:'https://www.aljazeera.com/'},
  {name:'Arab News',url:'https://www.arabnews.com/'},
  {name:'CNBC',url:'https://www.cnbc.com/world/'},
  {name:'Federal Reserve',url:'https://www.federalreserve.gov/newsevents/pressreleases.htm'}
 ]);
 function safeUrl(input){
  if(typeof input!=='string'||!input.trim()||input.length>MAX_URL)return null;
  try{
   let value=input.trim();
   if(!/^https?:\/\//i.test(value))value='https://'+value;
   const url=new URL(value);
   if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
   const host=url.hostname.toLowerCase();
   if(!host.includes('.')||host==='localhost'||host.endsWith('.localhost')||
      host.endsWith('.local')||host.endsWith('.internal')||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)||host.includes(':'))return null;
   return url.href;
  }catch{return null;}
 }
 function browse(raw){
  const url=safeUrl(raw);if(!url)return false;
  if(typeof window.NewViewNative?.openNewsBrowser==='function'){
   window.NewViewNative.openNewsBrowser(url);return true;
  }
  window.open(url,'_blank','noopener,noreferrer');
  return true;
 }
 function install(){
  const panel=document.getElementById('nv-watch-headlines')||document.querySelector('[data-workspace="news"]');
  const items=document.getElementById('news-items');
  if(!panel||!items||document.getElementById('newview-news-browser'))return;
  const section=document.createElement('section');section.className='news-browser-tools shell-card';section.id='newview-news-browser';
  const eyebrow=document.createElement('span');eyebrow.className='shell-eyebrow';eyebrow.textContent='NEWS BROWSER · REMOTE READY';
  const heading=document.createElement('h3');heading.textContent='Browse the news';
  const intro=document.createElement('p');intro.textContent='Open articles using the remote. Android TV uses a separate in-app HTTPS browser; the web dashboard opens a new tab. Publisher paywalls and content rights still apply.';
  const form=document.createElement('form');form.className='news-browser-form';
  const label=document.createElement('label');label.htmlFor='newview-news-address';label.textContent='Website address';
  const input=document.createElement('input');input.id='newview-news-address';input.type='url';input.placeholder='https://www.bbc.com/news';input.autocomplete='url';input.inputMode='url';input.maxLength=MAX_URL;
  const submit=document.createElement('button');submit.type='submit';submit.textContent='Browse site';
  const latest=document.createElement('button');latest.type='button';latest.textContent='Focus headlines';latest.id='newview-news-focus';
  const result=document.createElement('p');result.id='newview-news-browser-status';result.setAttribute('role','status');result.setAttribute('aria-live','polite');
  form.append(label,input,submit,latest);const sites=document.createElement('nav');sites.className='news-browser-sites';sites.setAttribute('aria-label','News website shortcuts');
  for(const site of defaultSites){
   const btn=document.createElement('button');btn.type='button';btn.textContent=site.name;
   btn.addEventListener('click',()=>{input.value=site.url;browse(site.url);result.textContent='Opening '+site.name;});
   sites.append(btn);
  }
  const dns=document.createElement('p');dns.className='news-browser-dns';
  dns.textContent='DNS/ad filtering: use a Cloudflare Gateway policy on your network or device. Public 1.1.1.1 does not block advertising. NewView does not change system DNS or claim ads are blocked.';
  const guide=document.createElement('a');guide.href='https://developers.cloudflare.com/cloudflare-one/traffic-controls/dns-policies/';
  guide.target='_blank';guide.rel='noopener noreferrer';guide.textContent='Cloudflare Gateway DNS policy setup';
  section.append(eyebrow,heading,intro,form,sites,result,dns,guide);
  panel.insertBefore(section,panel.firstChild);
  form.addEventListener('submit',event=>{
   event.preventDefault();
   if(!browse(input.value)){result.textContent='Enter a public HTTPS website address (not a local address or IP).';input.focus();return;}
   result.textContent='Opening the requested website';
  });
  latest.addEventListener('click',()=>{
   const first=items.querySelector('a.news-link');
   if(first)first.focus();else{document.getElementById('news-refresh')?.click();result.textContent='Refreshing headlines';}
  });
  items.addEventListener('click',event=>{
   const link=event.target.closest('a.news-link');
   if(!link||typeof window.NewViewNative?.openNewsBrowser!=='function')return;
   const url=safeUrl(link.href);
   if(!url)return;
   event.preventDefault();browse(url);
  });
  items.addEventListener('keydown',event=>{
   if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
   const links=[...items.querySelectorAll('a.news-link')];
   if(!links.length)return;
   const current=links.indexOf(document.activeElement);
   if(current<0)return;
   const next=event.key==='Home'?0:event.key==='End'?links.length-1:
    (current+(event.key==='ArrowDown'?1:-1)+links.length)%links.length;
   event.preventDefault();links[next].focus();
  });
  window.NewViewNewsBrowser=Object.freeze({safeUrl,browse});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
