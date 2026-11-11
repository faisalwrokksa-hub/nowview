import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../web/'+name,import.meta.url),'utf8');
const ui=read('simplified-ui.js'),css=read('simplified-ui.css'),cast=read('cast-overlay.js');
test('NewView has exactly four top-level destinations and no duplicate header cast button',()=>{
 for(const label of ['Home','Watch','Read','Customize'])assert.match(ui,new RegExp("'"+label+"'"));
 assert.match(ui,/\['home','Home'\],\['watch','Watch'\],\['read','Read'\],\['customize','Customize'\]/);
 assert.match(cast,/No redundant header launcher/);
 assert.doesNotMatch(cast,/header\?\.append\(trigger\)/);
 assert.doesNotMatch(ui,/header\.append\(devices\)/);
});
test('Home always shows three primary choices with news, chart and floating IPTV split',()=>{
 assert.match(ui,/newview\.home\.box-count\.v2/);
 assert.match(ui,/state\.count=3/);
 assert.match(ui,/\.slice\(0,3\)/);
 assert.match(ui,/nv-home-top-news/);
 assert.match(ui,/nv-home-chart-preview/);
 assert.match(ui,/nv-home-featured/);
 assert.match(ui,/nv-home-article/);
 assert.match(ui,/NewViewCast\?\.playIPTV/);
 for(const key of ['markets','iptv','youtube','news','devices'])assert.match(ui,new RegExp("id:'"+key+"'"));
 assert.doesNotMatch(ui,/id:'business'|Power BI reports|app\.powerbi\.com/);
 assert.match(ui,/newview-cast-trigger'\)\?\.remove\(\)/);
 assert.match(css,/nv-simple-grid\[data-box-count="3"\]/);
 assert.match(css,/nv-home-lower/);
 assert.match(css,/nv-hub-panel/);
});
