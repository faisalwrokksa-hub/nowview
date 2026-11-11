'use strict';
/* Public-source directory: external links only; no scraping, credentials, or inferred API permissions. */
(function(){
 const sources=[
  {name:'BBC World',type:'RSS',view:'news',url:'https://feeds.bbci.co.uk/news/world/rss.xml'},
  {name:'BBC Business',type:'RSS',view:'business',url:'https://feeds.bbci.co.uk/news/business/rss.xml'},
  {name:'NPR News',type:'RSS',view:'news',url:'https://feeds.npr.org/1001/rss.xml'},
  {name:'The Guardian World',type:'RSS',view:'news',url:'https://www.theguardian.com/world/rss'},
  {name:'Al Jazeera English',type:'RSS',view:'news',url:'https://www.aljazeera.com/xml/rss/all.xml'},
  {name:'DW English',type:'RSS',view:'news',url:'https://rss.dw.com/xml/rss-en-all'},
  {name:'PBS NewsHour',type:'RSS',view:'news',url:'https://www.pbs.org/newshour/feeds/rss/headlines'},
  {name:'CNBC Top News',type:'RSS',view:'markets',url:'https://www.cnbc.com/id/100003114/device/rss/rss.html'},
  {name:'Federal Reserve',type:'RSS',view:'markets',url:'https://www.federalreserve.gov/feeds/press_all.xml'},
  {name:'SEC Announcements',type:'RSS',view:'markets',url:'https://www.sec.gov/news/pressreleases.rss'},
  {name:'ABC News Australia',type:'Publisher',view:'news',url:'https://www.abc.net.au/news'},
  {name:'CBC News',type:'Publisher',view:'news',url:'https://www.cbc.ca/news'},
  {name:'Bluesky Public Discovery',type:'Social',view:'social',url:'https://bsky.app/'},
  {name:'Mastodon Explore',type:'Social',view:'social',url:'https://mastodon.social/explore'},
  {name:'Reddit Popular',type:'Social',view:'social',url:'https://www.reddit.com/r/popular/'},
  {name:'YouTube',type:'Video',view:'media',url:'https://www.youtube.com/'},
  {name:'Google Trends',type:'Trends',view:'social',url:'https://trends.google.com/trends/explore/'}
 ];
 function render(){
  const host=document.getElementById('newview-public-sources');if(!host)return;
  const view=document.body.dataset.currentWorkspace||'myview';
  host.replaceChildren();
  for(const source of sources.filter(x=>view==='myview'||x.view===view||view==='news'&&x.view==='markets')){
   const link=document.createElement('a');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';
   link.textContent=source.name+' · '+source.type;link.className='source-directory-link';host.append(link);
  }
 }
 window.NewViewPublicSources=Object.freeze({sources:sources.map(x=>Object.freeze({...x})),render});
 document.addEventListener('newview:workspace-change',render);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
