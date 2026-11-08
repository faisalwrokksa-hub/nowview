import test from 'node:test';
import assert from 'node:assert/strict';
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
