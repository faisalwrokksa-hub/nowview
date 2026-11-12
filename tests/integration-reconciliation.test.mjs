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

test('integration MyView: publisher deep links only resolve official announcement articles',()=>{
 assert.ok(myview.includes('function officialAnnouncementUrl(source,raw)'));
 assert.ok(myview.includes("url.protocol!=='https:'"));
 assert.ok(myview.includes('url.username||url.password||url.port'));
 assert.ok(myview.includes("www.federalreserve.gov"));
 assert.ok(myview.includes("www.sec.gov"));
 assert.ok(myview.includes('press-releases|press-release|speeches-statements|public-statement'));
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

test('short landscape TV rail is scoped and does not override simplified or home layouts',()=>{
 assert.match(css,/@media \(min-width:1200px\) and \(min-height:480px\) and \(max-height:649px\) and \(orientation:landscape\)/);
 assert.match(css,/body:not\(\.home-panel\):not\(\.nv-simple\)>main>\.workspace-switcher/);
 assert.match(css,/grid-template-rows:auto auto minmax\(0,1fr\) auto/);
 assert.match(css,/body:not\(\.home-panel\):not\(\.nv-simple\)>main :is\(\.shell-page,\.workspace,\[data-workspace\],#market-shell\)/);
 const simple=read('web/simplified-ui.css');
 assert.match(simple,/@media\(min-width:1200px\)\{body\.nv-simple>main\{display:flex;flex-direction:column\}/);
});

test('Cloudflare previews declare isolated sync Durable Object binding without deployment routes',()=>{
 const config=JSON.parse(read('wrangler.json'));
 assert.equal(config.name,'nowview');
 assert.equal(config.build.command,'npm run build');
 assert.deepEqual(config.previews.durable_objects.bindings,config.durable_objects.bindings);
 for(const restricted of ['routes','triggers','kv_namespaces','d1_databases','vars']){
  assert.equal(config.previews[restricted],undefined,'Preview must not inherit '+restricted+' into configuration');
 }
});
