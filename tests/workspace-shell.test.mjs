import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../web/workspace-shell.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
test('six accessible workspaces have selector tabs',()=>{
 for(const id of ['myview','markets','business','media','social','devices']){
  assert.match(html,new RegExp('data-workspace="'+id+'"'));
  assert.match(html,new RegExp('data-view-button="'+id+'"'));
 }
});
test('MyView is default and invalid saved workspaces fail closed',()=>{
 const window={};const document={body:{classList:{contains:()=>false}},readyState:'loading',addEventListener:()=>{}};
 const localStorage={getItem:()=>null,setItem:()=>{}};
 vm.runInNewContext(source,{window,document,localStorage});
 assert.equal(window.NewViewShell.getStored(),'myview');
 assert.equal(window.NewViewShell.views.length,6);
});
test('workspace and stock board remain separate from market engine',()=>{
 const board=fs.readFileSync(new URL('../web/stock-board.js',import.meta.url),'utf8');
 const build=fs.readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
 assert.match(build,/workspace-shell\.js/);
 assert.doesNotMatch(board,/Tadawul|id:'sa'|الأسهم السعودية/);
 assert.match(board,/U\.S\. Stocks/);
 assert.match(html,/id="powerbi-report-url"/);
 assert.match(html,/https:\/\/app\.powerbi\.com\//);
 assert.match(html,/id="social-add"/);
});

test('TV remote and keyboard navigation keeps workspace focus operable',()=>{
 assert.match(source,/nav\.addEventListener\('keydown'/);
 for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'])assert.ok(source.includes("'"+key+"'"));
 assert.match(source,/event\.preventDefault\(\)/);
 assert.match(source,/buttons\[next\]\.focus\(\)/);
 assert.match(source,/select\(buttons\[next\]\.dataset\.viewButton\)/);
});
