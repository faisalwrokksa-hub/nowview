import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../web/'+name,import.meta.url),'utf8');
const html=read('index.html'),css=read('simplified-ui.css'),ui=read('simplified-ui.js'),connectivity=read('connectivity.js');
test('single clear NewView header and no inactive status or remote-help text',()=>{
 assert.doesNotMatch(html,/NEWVIEW \/ UNIVERSAL DASHBOARD/);
 assert.doesNotMatch(html,/Back Exit|OK Open|id="footer-source"/);
 assert.doesNotMatch(connectivity,/Browser online · live sources may vary/);
 assert.match(connectivity,/indicator\.hidden = !offline/);
});
test('advanced panels have accessible close buttons with focus return',()=>{
 assert.match(html,/data-close-panel="newview-settings"/);
 assert.match(html,/data-close-closest-details/);
 assert.match(ui,/button\.closest\('details'\)/);
 assert.match(ui,/panel\.open=false/);
 assert.match(ui,/summary'\)\?\.focus/);
 assert.match(css,/\.nv-close-panel/);
});
test('duplicates are suppressed only in simplified presentation while controllers remain',()=>{
 assert.match(css,/body\.nv-simple #newview-quick-actions/);
 assert.match(css,/body\.nv-simple \[data-home-view\]/);
 assert.match(css,/body\.nv-simple #newview-settings:not\(\[open\]\)/);
 assert.match(html,/data-workspace="markets"/);
 assert.match(html,/data-workspace="devices"/);
 assert.match(html,/id="newview-settings"/);
});
