import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const src=read('web/channel-filters.js'),media=read('web/media.js'),
 java=read('android/src/dev/fintech/marketcharts/ChartsView.java'),build=read('cloud/build.mjs');
const window={};vm.runInNewContext(src,{window,URL});
const api=window.NewViewChannels;

test('IPTV catalog uses a single vetted public GitHub directory and bounded codes',()=>{
 assert.equal(api.MAIN_PLAYLIST,'https://iptv-org.github.io/iptv/index.m3u');
 assert.equal(api.catalogUrl('country'),'https://iptv-org.github.io/api/countries.json');
 assert.equal(api.catalogUrl('language'),'https://iptv-org.github.io/api/languages.json');
 assert.equal(api.catalogUrl('category'),'https://iptv-org.github.io/api/categories.json');
 assert.equal(api.catalogUrl('bad'),null);
 assert.equal(api.scopedPlaylist('country','sa'),'https://iptv-org.github.io/iptv/countries/sa.m3u');
 assert.equal(api.scopedPlaylist('language','ara'),'https://iptv-org.github.io/iptv/languages/ara.m3u');
 assert.equal(api.scopedPlaylist('category','news'),'https://iptv-org.github.io/iptv/categories/news.m3u');
 for(const [kind,code] of [['country','../../bad'],['language','ara/../'],['category','news?x=1'],['country','ABC'],['bad','news']]){
  assert.equal(api.scopedPlaylist(kind,code),null);
 }
});
test('live IPTV catalogs validate entries, deduplicate codes and prevent injection',()=>{
 const entries=api.parseCatalog('country',[
  {code:'sa',name:'Saudi Arabia'},{code:'sa',name:'Duplicate'},
  {code:'gb',name:'United Kingdom'},{code:'../',name:'Danger'},{code:'US',name:'Invalid uppercase'}
 ]);
 assert.equal(entries.length,2);
 assert.equal(entries.find(x=>x.code==='sa').name,'Saudi Arabia');
 assert.equal(api.parseCatalog('unknown',[{code:'sa',name:'Saudi Arabia'}]).length,0);
 assert.equal(api.parseCatalog('language',[{code:'ara',name:'Arabic'}]).length,1);
 assert.equal(api.parseCatalog('category',[{id:'news',name:'News'}]).length,1);
});
test('M3U list refresh deduplicates streaming URLs',()=>{
 const sample='#EXTM3U\n#EXTINF:-1 group-title="News",One\nhttps://tv.example/live.m3u8\n#EXTINF:-1 group-title="News",Duplicate\nhttps://tv.example/live.m3u8\n#EXTINF:-1 group-title="Sports",Two\nhttps://tv.example/sports.m3u8\n';
 const found=api.parseM3U(sample);
 assert.equal(found.length,2);
 assert.equal(found[0].category,'news');
 assert.equal(found[1].category,'sports');
});
test('web IPTV browser automatically fetches selected live playlists and refreshes every three hours',()=>{
 assert.match(media,/newview-iptv-scope/);
 assert.match(media,/newview-iptv-scope-value/);
 assert.match(media,/readCatalog\(kind,force\)/);
 assert.match(media,/preferred\.parseCatalog\(kind,JSON\.parse\(raw\)\)/);
 assert.match(media,/const url=selectedPlaylist\(\)/);
 assert.match(media,/fetch\(url,\{cache:'no-store'/);
 assert.match(media,/newview:iptv-refresh/);
 assert.match(media,/Date\.now\(\)-lastFetch<10800000/);
 assert.match(media,/newview-iptv-hide-failed/);
 assert.doesNotThrow(()=>new Function(media));
});
test('native Android IPTV browser fetches grouped playlists and catalogs only from IPTV-org',()=>{
 assert.match(java,/fetchPublicCatalog\(String kind,int id\)/);
 assert.match(java,/fetchPublicPlaylist\(int id,String scope,String code\)/);
 assert.match(java,/https:\/\/iptv-org\.github\.io\/iptv\//);
 assert.match(java,/https:\/\/iptv-org\.github\.io\/api\//);
 assert.match(java,/setInstanceFollowRedirects\(false\)/);
 assert.match(media,/NewViewNative\.fetchPublicCatalog\(kind,id\)/);
 assert.match(media,/NewViewNative\.fetchPublicPlaylist\(id,scope\.value/);
 assert.match(build,/connect-src 'self' [^;]*https:\/\/iptv-org\.github\.io;/);
});

test('periodic IPTV refresh re-fetches online scope choices instead of using stale catalog metadata',()=>{
 assert.match(media,/async function readCatalog\(kind,force=false\)/);
 assert.match(media,/if\(!force&&cached&&Date\.now\(\)-cached\.time<10800000\)/);
 assert.match(media,/async function updateScope\(force=false\)/);
 assert.match(media,/readCatalog\(kind,force\)/);
 assert.match(media,/newview:iptv-refresh',\(\)=>scope\.value==='all'\?loadDirectory\(true\):updateScope\(true\)/);
 assert.match(media,/window\.NewViewSourceMonitor\?\.notify\?\.\('IPTV'/);
 assert.match(media,/newly listed streams/);
});
