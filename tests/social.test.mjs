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
