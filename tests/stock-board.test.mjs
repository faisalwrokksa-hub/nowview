import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync(new URL('../web/stock-board.js', import.meta.url),'utf8');
const window={};
vm.runInNewContext(src,{window});
const {points}=window.NowViewBoard;

test('stock-board sparkline uses no fake prices for empty data',()=>{
 assert.equal(points([]),'');
 assert.equal(points([NaN, 15]),'');
});
test('sparkline positions actual series endpoints',()=>{
 const p=points([10,20,15]);
 assert.equal(p.split(' ').length,3);
 assert.match(p,/0\.0,23\.0/);
 assert.match(p,/50\.0,3\.0/);
});
test('no embedded mock prices for Saudi and US quotes',()=>{
 assert.match(src,/Feed not connected/);
 assert.match(src,/No verified quote/);
 assert.doesNotMatch(src,/Math\.random\(/);
});
test('stock board script is included in both HTML and cloud bundle',()=>{
 const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const build=fs.readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
 assert.match(html,/src="stock-board\.js"/);
 assert.match(build,/stock-board\.js/);
});
