import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('web/dashboard-tools.js'),html=read('web/index.html'),build=read('cloud/build.mjs');
const root={};vm.runInNewContext(source,{window:root,URL}, {timeout:2000});
const tools=root.NewViewDashboardTools;

test('Dashboard tools include safe HTTPS quick-link sanitization and deduplication',()=>{
 assert.equal(tools.normalizeLink({title:'Official news',url:'https://www.bbc.com/news'}).title,'Official news');
 for(const url of ['http://example.com','javascript:alert(1)','https://user:secret@example.com','https://example.com:8443','https://localhost/','https://host.local/','file:///etc/passwd']){
  assert.equal(tools.normalizeLink({title:'Bad',url}),null,url);
 }
 assert.equal(tools.normalizeLink({title:'  ',url:'https://example.com'}),null);
 const links=tools.sanitizeLinks(Array.from({length:15},(_,i)=>({title:'Site '+i,url:'https://site'+i+'.example.com'})));
 assert.equal(links.length,12);
 const deduped=tools.sanitizeLinks([{title:'First',url:'https://example.com'},{title:'Second',url:'https://example.com'}]);
 assert.equal(deduped.length,1);
});
test('Dashboard command search is bounded and local-only',()=>{
 const items=[{title:'MyView dashboard',keywords:'home widgets'}, {title:'Discover',keywords:'YouTube IPTV'},{title:'Markets',keywords:'quotes'}];
 assert.equal(tools.findCommands('IPTV',items).length,1);
 assert.equal(tools.findCommands('MARKETS',items)[0].title,'Markets');
 assert.equal(tools.findCommands('x'.repeat(110),items).length,0);
 assert.equal(tools.findCommands('',Array.from({length:50},(_,i)=>({title:'Entry '+i}))).length,18);
 assert.match(source,/e\.ctrlKey\|\|e\.metaKey/);
 assert.match(source,/e\.key==='Escape'/);
 assert.match(source,/role','dialog'/);
 assert.match(source,/aria-modal','true'/);
 assert.doesNotMatch(source,/(?:innerHTML|eval\(|new Function\()/);
});
test('Dashboard command palette and quick links are delivered to Worker and native APK',()=>{
 assert.match(html,/src="dashboard-tools\.js" defer/);
 assert.match(build,/dashboard-tools\.js/);
 assert.match(source,/newview-quicklinks/);
 assert.match(source,/newview-command-overlay/);
 assert.doesNotThrow(()=>new Function(source));
});
