import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseNewsXml,loadNews,NEWS_SOURCES} from '../cloud/news.mjs';

const feed='<?xml version="1.0"?><rss version="2.0"><channel><item><title>Rate &amp; Policy Update</title><link>https://www.federalreserve.gov/newsevents/pressreleases/monetary20261108a.htm</link><pubDate>Sun, 08 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>';
test('official RSS keeps clean titles and canonical same-host links',()=>{
 const items=parseNewsXml(feed,'fed');
 assert.equal(items.length,1);
 assert.equal(items[0].title,'Rate & Policy Update');
 assert.equal(items[0].source,'Federal Reserve');
 assert.match(items[0].url,/federalreserve\.gov/);
});
test('unknown or non allowlisted sources rejected before network',async()=>{
 assert.throws(()=>parseNewsXml(feed,'other'),/Unknown/);
 await assert.rejects(loadNews('other',()=>{throw Error('should not fetch')}),/Unknown/);
});
test('untrusted redirects, different hosts and script are not exposed',()=>{
 const malicious='<rss><channel><item><title><![CDATA[<img src=x onerror=alert(1)>News]]></title><link>https://evil.example/bad</link></item><item><title>Safe</title><link>javascript:alert(1)</link></item></channel></rss>';
 assert.equal(parseNewsXml(malicious,'fed').length,0);
 assert.throws(()=>parseNewsXml('not rss','fed'),/Invalid/);
});
test('successful async fetch returns tagged verified announcements',async()=>{
 const bytes=new TextEncoder().encode(feed);
 const fake=async url=>{assert.equal(url,NEWS_SOURCES.fed.url);return {ok:true,status:200,redirected:false,headers:{get:()=>null},body:{getReader:()=>({read:(()=>{let n=0;return async()=>n++?{done:true}:{done:false,value:bytes};})(),releaseLock:()=>{}})}};};
 const result=await loadNews('fed',fake);
 assert.equal(result.items.length,1);assert.ok(result.fetchedAt);
});
test('responses over 512 KB rejected',()=>assert.throws(()=>parseNewsXml('<rss>'+('x'.repeat(524290))+'</rss>','fed'),/oversized/));

test('browser news view ignores stale responses after source changes',()=>{
 const source=readFileSync(new URL('../web/news.js',import.meta.url),'utf8');
 assert.match(source,/const current=controller/);
 assert.match(source,/if\(current!==controller\)return/);
 assert.match(source,/if\(current!==controller\|\|err\.name==='AbortError'\)return/);
});

test('browser news rejects malformed article URLs without dropping the entire feed',()=>{
 const source=readFileSync(new URL('../web/news.js',import.meta.url),'utf8');
 assert.match(source,/try\{url=new URL\(item\.url\);\}catch\{continue;\}/);
 assert.match(source,/url\.username\|\|url\.password\|\|url\.port/);
 assert.match(source,/No valid announcements returned by this source/);
});

test('Stocktwits publisher RSS is allowlisted and keeps same-host article links',()=>{
 assert.equal(NEWS_SOURCES.stocktwits.url,'https://stocktwits.com/sitemap/rss_feed.xml');
 const xml='<rss><channel><item><title>Market update</title><link>https://stocktwits.com/news/markets</link></item><item><title>Unsafe</title><link>https://evil.example/post</link></item></channel></rss>';
 assert.equal(parseNewsXml(xml,'stocktwits').length,1);
 assert.equal(parseNewsXml(xml,'stocktwits')[0].source,'Stocktwits News');
});

test('RSS article links reject credentials and nonstandard ports',()=>{
 const xml='<rss><channel><item><title>Bad port</title><link>https://stocktwits.com:8443/news</link></item><item><title>Credentials</title><link>https://user:pass@stocktwits.com/news</link></item><item><title>Good</title><link>https://stocktwits.com/news</link></item></channel></rss>';
 const items=parseNewsXml(xml,'stocktwits');
 assert.equal(items.length,1);assert.equal(items[0].title,'Good');
});
