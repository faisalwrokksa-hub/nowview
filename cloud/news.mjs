// Read-only source-allowlisted news. Never serve arbitrary remote URLs.
export const NEWS_SOURCES=Object.freeze({
 fed:Object.freeze({name:'Federal Reserve',url:'https://www.federalreserve.gov/feeds/press_all.xml',host:'www.federalreserve.gov',homepage:'https://www.federalreserve.gov/newsevents/pressreleases.htm'}),
 sec:Object.freeze({name:'U.S. SEC',url:'https://www.sec.gov/news/pressreleases.rss',host:'www.sec.gov',homepage:'https://www.sec.gov/newsroom/press-releases'}),
 stocktwits:Object.freeze({name:'Stocktwits News',url:'https://stocktwits.com/sitemap/rss_feed.xml',host:'stocktwits.com',homepage:'https://stocktwits.com/'})
});
const xmlDecode=s=>String(s).replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi,(whole,key)=>{
 if(key[0]==='#'){const n=key[1]?.toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);
  return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';}
 return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[key.toLowerCase()]||whole;
});
const cleanText=s=>xmlDecode(String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim()).slice(0,210);
const tag=(xml,name)=>{const m=xml.match(new RegExp('<(?:[a-z]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-z]+:)?'+name+'>','i'));return m?m[1]:'';};
const validArticleLink=(value,source)=>{
 try{const u=new URL(xmlDecode(value).trim());return u.protocol==='https:'&&(u.hostname===source.host)&&u.username===''&&u.password===''&&u.port===''?u.href:null;}catch{return null;}
};
export function parseNewsXml(xml,sourceId){
 const source=NEWS_SOURCES[sourceId];if(!source)throw new Error('Unknown news source');
 if(typeof xml!=='string'||xml.length>524288||!/<(?:rss|feed)\b/i.test(xml))throw new Error('Invalid or oversized RSS feed');
 const chunks=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
 const seen=new Set(),items=[];
 for(const chunk of chunks.slice(0,50)){
  const title=cleanText(tag(chunk,'title')),url=validArticleLink(cleanText(tag(chunk,'link')),source);
  if(!title||!url||seen.has(url))continue;
  seen.add(url);
  const rawDate=cleanText(tag(chunk,'pubDate')||tag(chunk,'updated')||tag(chunk,'published'));
  const parsedDate=Date.parse(rawDate);
  items.push({title,url,publishedAt:Number.isFinite(parsedDate)?new Date(parsedDate).toISOString():null,source:source.name});
  if(items.length>=12)break;
 }
 return items;
}
export async function loadNews(sourceId,fetcher=fetch){
 const source=NEWS_SOURCES[sourceId];
 if(!source)throw new Error('Unknown news source');
 const response=await fetcher(source.url,{redirect:'manual',headers:{Accept:'application/rss+xml, application/xml, text/xml'},signal:AbortSignal.timeout(9000)});
 if(!response.ok||response.redirected||response.status>=300&&response.status<400)throw new Error('News feed unavailable');
 const contentType=response.headers.get('content-type')||'';
 if(contentType&&!/xml|rss/i.test(contentType))throw new Error('Unexpected news content type');
 if(Number(response.headers.get('content-length'))>524288)throw new Error('Feed too large');
 const reader=response.body?.getReader();
 if(!reader)throw new Error('Feed body unavailable');
 let bytes=0;const chunks=[];
 try{
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;
   if(bytes>524288)throw new Error('Feed too large');
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const content=new Uint8Array(bytes);let offset=0;
 for(const chunk of chunks){content.set(chunk,offset);offset+=chunk.byteLength;}
 const items=parseNewsXml(new TextDecoder().decode(content),sourceId);
 return {source:source.name,sourceUrl:source.homepage,fetchedAt:new Date().toISOString(),items};
}
