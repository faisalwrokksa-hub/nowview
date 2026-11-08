import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../web/social.js',import.meta.url),'utf8');
const window={},document={getElementById:()=>null};const store=new Map();
const localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
vm.runInNewContext(source,{window,document,localStorage,URL});
const {validate,sanitize,save,load}=window.NewViewSocial;
test('accepts HTTPS platform profile links only',()=>{
 assert.equal(validate('x','https://x.com/OpenAI').url,'https://x.com/OpenAI');
 assert.equal(validate('tiktok','https://www.tiktok.com/@example').name,'@example');
 assert.equal(validate('facebook','https://www.facebook.com/example.page').url,'https://www.facebook.com/example.page');
});
test('rejects redirects, fake hosts, non profiles and insecure schemes',()=>{
 for(const [platform,url] of [
 ['x','https://x.com.evil.example/OpenAI'],['x','http://x.com/OpenAI'],
 ['x','https://x.com/intent/tweet'],['x','https://x.com/OpenAI/status/123'],
 ['x','https://x.com/%2fadmin'],['tiktok','https://www.tiktok.com/@example/video/111'],
 ['facebook','https://www.facebook.com/login'],['facebook','https://www.facebook.com/groups/a'],
 ['facebook','javascript:alert(1)']
 ])assert.equal(validate(platform,url),null);
});
test('rejects invalid duplicates and does not fetch social data',()=>{
 const one={platform:'x',url:'https://x.com/OpenAI'};
 const saved=sanitize([one,one,{platform:'fake',url:'https://evil.example'}]);
 assert.equal(saved.length,1);assert.equal(save([one]).length,1);assert.equal(load().length,1);
 assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|eval\(|innerHTML|Math\.random/);
});
test('Social workspace and assets included for web and Android',()=>{
 const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const cloud=fs.readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
 for(const id of ['social-add','social-platform','social-url','social-status','social-links'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(cloud,/social\.js/);
});

test('geo and topic selection produces regional discovery links without claiming live social trends',()=>{
 const {discoveryUrl,discoveryLinks}=window.NewViewSocial;
 const sa=new URL(discoveryUrl('SA','markets'));
 assert.equal(sa.hostname,'news.google.com');assert.equal(sa.searchParams.get('gl'),'SA');
 assert.equal(sa.searchParams.get('q'),'financial markets');
 assert.equal(new URL(discoveryUrl('US','technology')).searchParams.get('gl'),'US');
 assert.equal(new URL(discoveryUrl('UNKNOWN','all')).searchParams.get('gl'),'SA');
 assert.equal(discoveryLinks('GB','all').length,3);
 const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 for(const id of ['social-geo','social-topic','social-discovery'])assert.match(html,new RegExp('id="'+id+'"'));
});

test('Truth Social and Stocktwits allow only canonical public profile URLs',()=>{
 assert.equal(validate('truth','https://truthsocial.com/@example').url,'https://truthsocial.com/@example');
 assert.equal(validate('stocktwits','https://stocktwits.com/example').url,'https://stocktwits.com/example');
 assert.equal(validate('truth','https://truthsocial.com/@example/posts/123'),null);
 assert.equal(validate('stocktwits','https://stocktwits.com/symbol/BTC'),null);
 assert.equal(validate('truth','https://truthsocial.com.evil.example/@example'),null);
});

test('Polymarket only permits canonical public wallet profiles, never market or trade URLs',()=>{
 const wallet='0x'+'a'.repeat(40);
 assert.equal(validate('polymarket','https://polymarket.com/profile/'+wallet).url,'https://polymarket.com/profile/'+wallet);
 assert.equal(validate('polymarket','https://polymarket.com/event/example'),null);
 assert.equal(validate('polymarket','https://polymarket.com/profile/not-a-wallet'),null);
 assert.equal(validate('polymarket','https://polymarket.com.evil.example/profile/'+wallet),null);
});

test('external browser policies cover discovery and Polymarket on web and Android',()=>{
 const web=fs.readFileSync(new URL('../web/external-links.js',import.meta.url),'utf8');
 const android=fs.readFileSync(new URL('../android/src/dev/fintech/marketcharts/ChartsView.java',import.meta.url),'utf8');
 for(const host of ['polymarket.com','stocktwits.com','truthsocial.com','news.google.com','trends.google.com','www.reddit.com']){
  assert.ok(web.includes("'"+host+"'"),host+' missing from web');
  assert.ok(android.includes('host.equals("'+host+'")'),host+' missing from Android');
 }
 assert.match(web,/u\.protocol==='https:'&&!u\.username&&!u\.password&&!u\.port/);
 assert.match(android,/"https"\.equalsIgnoreCase\(uri\.getScheme\(\)\)/);
});

test('Global geography does not silently force US news localization',()=>{
 const global=new URL(window.NewViewSocial.discoveryUrl('GLOBAL','markets'));
 assert.equal(global.searchParams.get('gl'),null);
 assert.equal(global.searchParams.get('ceid'),null);
 assert.equal(global.searchParams.get('q'),'financial markets');
 assert.match(window.NewViewSocial.discoveryLinks('GLOBAL','all')[0].label,/Global/);
});

test('region and topic preferences persist locally and fall back safely',()=>{
 assert.match(source,/newview\.social\.discovery\.v1/);
 assert.match(source,/localStorage\.setItem\(PREF_KEY/);
 assert.match(source,/Object\.hasOwn\(GEO,p\.geo\)/);
 assert.match(source,/Object\.hasOwn\(TOPICS,p\.topic\)/);
});

test('display profiles validate workspace IDs, refresh intervals and persistence controls',()=>{
 const shell=fs.readFileSync(new URL('../web/workspace-shell.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 for(const id of ['display-profile','display-save','display-fullscreen','display-next','display-refresh','display-status'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(shell,/newview\.display\.profiles\.v1/);
 assert.match(shell,/list\.filter\(v=>views\.includes\(v\)\)/);
 assert.match(shell,/\[0,30,60,120,300\]\.includes\(seconds\)/);
 assert.match(shell,/profiles\.slice\(0,5\)/);
 assert.match(shell,/document\.hidden/);
});

test('customer wallpaper controls are local and constrained',()=>{
 const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const personal=fs.readFileSync(new URL('../web/myview.js',import.meta.url),'utf8');
 for(const id of ['wallpaper-file','wallpaper-remove','wallpaper-shade','wallpaper-status'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(personal,/newview\.home\.wallpaper\.v1/);
 assert.match(personal,/file\.size>950000/);
 assert.match(personal,/localStorage\.setItem\(wallpaperKey/);
 assert.match(personal,/localStorage\.removeItem\(wallpaperKey/);
});
