import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=load('web/simplified-ui.js'),css=load('web/tv-fit.css');
test('Home provides persistent, bounded panel swapping without draggable offscreen coordinates',()=>{
 assert.match(ui,/newview\.home\.panel-layout\.v1/);
 assert.match(ui,/order:'chart-first',width:'balanced'/);
 assert.match(ui,/Swap panels/);
 assert.match(ui,/Left panel wider/);
 assert.match(ui,/Right panel wider/);
 assert.match(ui,/homeLower\.dataset\.panelOrder=layoutPrefs\.order/);
 assert.match(ui,/homeLower\.dataset\.panelWidth=layoutPrefs\.width/);
 assert.match(ui,/aria-pressed/);
 assert.match(css,/data-panel-order="video-first"/);
 assert.match(css,/data-panel-width="left-wide"/);
 assert.match(css,/data-panel-width="right-wide"/);
 assert.match(css,/minmax\(0,1fr\)/);
 assert.doesNotMatch(ui,/document\.body\.style\.transform|position:\\s*fixed/);
});
test('Home stays within card and nested scrollers on compact TV and mobile',()=>{
 assert.match(css,/overflow:auto!important/);
 assert.match(css,/max-width:100%/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/:focus-visible/);
});
