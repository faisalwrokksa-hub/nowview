import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('Markets board integration uses NewViewBoard consistently',()=>{
 const app=read('../web/app.js'),board=read('../web/stock-board.js');
 assert.match(board,/window\.NewViewBoard=\{/);
 assert.match(app,/window\.NewViewBoard\.build\(\)/);
 assert.match(app,/window\.NewViewBoard\.update\(data\)/);
 assert.doesNotMatch(app,/window\.NowViewBoard/);
});
test('MyView snapshots show source-data empty states',()=>{
 const js=read('../web/myview.js'),window={},document={getElementById:()=>null};
 vm.runInNewContext(js,{window,document});
 const p=window.NewViewPersonal;
 assert.match(p.preview.market(null),/No verified quote/);
 assert.match(p.preview.news(null),/Load official/);
 assert.match(p.preview.business(null),/Upload a CSV/);
 assert.match(p.preview.social(null),/No verified public-profile count/);
 assert.match(p.preview.media(),/no playback/);
});
test('Every source forwards minimal session data without fake records',()=>{
 const business=read('../web/business.js'),news=read('../web/news.js'),social=read('../web/social.js'),app=read('../web/app.js');
 for(const [src,id] of [[app,'market'],[business,'business'],[news,'news'],[social,'social']]){
  assert.match(src,new RegExp('newview:'+id));assert.match(src,/CustomEvent/);
 }
 assert.doesNotMatch(read('../web/myview.js'),/fakePrice|mockRevenue|Math\.random/);
});