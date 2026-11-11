import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../web/tv-guide.js',import.meta.url),'utf8');
const root={};vm.runInNewContext(code,{window:root,URL},{timeout:2000});
const guide=root.NewViewTVGuide;
const items=[{name:'Alpha',url:'https://streams.example.com/alpha.m3u8',category:'news'}, {name:'Beta',url:'https://streams.example.com/beta.m3u8',category:'sports'},{name:'Gamma',url:'https://streams.example.com/gamma.m3u8',category:'news'}];
test('TV guide hides known playback failures while retaining untested candidates',()=>{
 const status=url=>url.includes('alpha')?'ok':url.includes('beta')?'failed':'unknown';
 const filtered=guide.pick(items,{status});
 assert.equal(filtered.length,2);
 assert.equal(filtered[0].name,'Alpha');
 assert.equal(filtered[1].name,'Gamma');
 assert.equal(guide.pick(items,{status,onlyVerified:true}).length,1);
 assert.equal(guide.pick(items,{status,hideFailed:false}).length,3);
});
test('TV guide search, favorites and categories are bounded and normalized',()=>{
 assert.equal(guide.pick(items,{query:'gaMMa'}).length,1);
 assert.equal(guide.pick(items,{category:'favorites',favorites:new Set([items[1].url]),hideFailed:false}).length,1);
 assert.equal(guide.categoryMatches('News;Business','news'),true);
 assert.equal(guide.categoryMatches('Movies','sports'),false);
 assert.equal(guide.pick([{name:'Unsafe',url:'http://insecure.example/',category:'news'}]).length,0);
});
test('TV guide avoids fake uptime claims, arbitrary stream probing, and duplicate playlist fetches',()=>{
 assert.match(code,/Not playback-tested/);
 assert.match(code,/Verified playing/);
 assert.match(code,/newview:source-status/);
 assert.match(code,/MutationObserver/);
 assert.doesNotMatch(code,/fetch\(/);
 assert.doesNotMatch(code,/innerHTML\s*=/);
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const build=readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
 const apk=readFileSync(new URL('../scripts/verify-preview-apk.sh',import.meta.url),'utf8');
 assert.match(html,/src="tv-guide\.js" defer/);
 assert.match(build,/tv-guide\.js/);
 assert.match(apk,/tv-guide\.js/);
});
