import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../web/workspace-shell.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
test('six accessible workspaces have selector tabs',()=>{
 for(const id of ['myview','markets','business','news','media','social']){
  assert.match(html,new RegExp('data-workspace="'+id+'"'));
  assert.match(html,new RegExp('data-view-button="'+id+'"'));
 }
});
test('MyView is default and invalid saved workspaces fail closed',()=>{
 const window={};const document={body:{classList:{contains:()=>false}},readyState:'loading',addEventListener:()=>{}};
 const localStorage={getItem:()=>null,setItem:()=>{}};
 vm.runInNewContext(source,{window,document,localStorage});
 assert.equal(window.NowViewShell.getStored(),'myview');
 assert.equal(window.NowViewShell.views.length,6);
});
test('workspace and stock board remain separate from market engine',()=>{
 const board=fs.readFileSync(new URL('../web/stock-board.js',import.meta.url),'utf8');
 const build=fs.readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
 assert.match(build,/workspace-shell\.js/);
 assert.doesNotMatch(board,/Tadawul|id:'sa'|الأسهم السعودية/);
 assert.match(board,/U\.S\. Stocks/);
 assert.match(html,/id="business-file"/);
 assert.match(html,/id="business-kpis"/);
 assert.match(html,/Official feeds and embeds not connected/);
});
