import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../web/style.css',import.meta.url),'utf8');
test('workspace navigation retains 44px touch targets and horizontal scrolling',()=>{
 assert.match(css,/\.workspace-switcher\s*\{[^}]*overflow-x:auto/s);
 assert.match(css,/\.workspace-switcher\s+\.workspace-tab\s*\{[^}]*min-height:44px/s);
});
test('focus indicators and reduced-motion support are present',()=>{
 assert.match(css,/\.workspace-switcher\s+\.workspace-tab:focus-visible/);
 assert.match(css,/@media\s*\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\s*\(forced-colors:active\)/);
});
test('compact displays and status text have overflow protection',()=>{
 assert.match(css,/@media\s*\(max-width:400px\)/);
 assert.match(css,/\[role="alert"\]/);
 assert.match(css,/overflow-wrap:anywhere/);
});
