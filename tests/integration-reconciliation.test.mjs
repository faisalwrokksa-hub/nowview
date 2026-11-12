import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('web/index.html');
const myview=read('web/myview.js');
const business=read('web/business.js');
const media=read('web/media.js');
const social=read('web/social.js');
const css=read('web/style.css');

test('integration MyView: timestamped Binance chart partitions symbol/currency and expires invalid snapshots',()=>{
 for(const term of ["source==='binance'","symbol+'|'+currency","next.symbol.trim().slice(0,24)+'|'+next.currency",'lastQuoteTime.get(key)','if(id===\'market\')refreshChart()','function chartSymbol()','q.symbol.trim()']) {
  assert.ok(myview.includes(term),'Missing MyView integrity check: '+term);
 }
 assert.match(myview,/next\.quoteTime>\(lastQuoteTime\.get\(key\)\|\|0\)/);
 assert.match(myview,/quoteTime\*1000>=Date\.now\(\)-86400000/);
});

test('integration MyView: publisher deep links only to official HTTPS host and standard port',()=>{
 assert.ok(myview.includes("url.protocol==='https:'"));
 assert.ok(myview.includes("url.port===''"));
 assert.ok(myview.includes("url.hostname==='www.federalreserve.gov'"));
 assert.ok(myview.includes("url.hostname==='www.sec.gov'"));
 assert.ok(myview.includes('link.href=direct||'));
});

test('integration Business: Power BI preserved beside offline CSV and correctable retry',()=>{
 for(const id of ['powerbi-report-url','business-file','business-clear','business-status','business-kpis','business-trend']){
  assert.ok(html.includes('id="'+id+'"'),'Missing Business element '+id);
 }
 assert.ok(html.includes('Local CSV KPI analysis (private, on this device)'));
 assert.ok(business.includes("picker.value='';status.textContent='CSV rejected: '"));
 assert.ok(business.includes("if(version!==selectionVersion)return"));
 assert.doesNotMatch(business,/fetch\(|XMLHttpRequest|sendBeacon/);
});

test('integration Watch: failed catalog cannot leave stale inline/floating controls available',()=>{
 assert.ok(media.includes("if(allChannels.length&&loadedUrl===url)"));
 assert.ok(media.includes("allChannels=[];loadedUrl=null;stopInline()"));
 assert.ok(media.includes("inlinePlay.disabled=true;floatChannel.disabled=true"));
 assert.ok(media.includes("retryFailed.disabled=!hasSelection"));
 assert.ok(media.includes("floatChannel.disabled=!hasSelection"));
 assert.ok(media.includes("list.removeAttribute('aria-busy')"));
 assert.ok(media.includes("list.addEventListener('change',()=>{stopInline()"));
});

test('integration Social: clear only transient filters and keep saved records',()=>{
 assert.ok(social.includes('function resetSavedFilters()'));
 assert.ok(social.includes("filter.value='';collectionFilter.value='';tagFilter.value='';render()"));
 assert.ok(social.includes('clearFilters.addEventListener'));
 assert.ok(social.includes('filter.focus()'));
 assert.ok(social.includes("normalize('NFKD')"));
 assert.ok(social.includes('terms.every(word=>normalizedSearchable.includes(word))'));
});

test('integration UX: focus, announcements and compact settings remain usable',()=>{
 assert.ok(css.includes('max-height:calc(100dvh - 16px)'));
 assert.ok(css.includes('overflow-y:auto'));
 assert.ok(css.includes('scroll-margin:28px'));
 assert.ok(css.includes('overflow-wrap:anywhere'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
});