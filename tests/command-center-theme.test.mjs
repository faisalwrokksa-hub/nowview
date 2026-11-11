import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../web/command-center.css',import.meta.url),'utf8');
test('command center theme is linked after baseline CSS',()=>{
 assert.match(html, /href="style\.css"[^>]*><link rel="stylesheet" href="command-center\.css"/);
});
test('redesign preserves the five existing workspace identities',()=>{
 assert.deepEqual([...html.matchAll(/data-view-button="([^"]+)"/g)].map(x=>x[1]),['myview','markets','business','media','social']);
});
test('theme excludes embedded Android home panel and accommodates TV, mobile and accessibility',()=>{
 assert.match(css,/body:not\(\.home-panel\)/);
 assert.match(css,/@media\(min-width:1200px\)/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css, /focus-visible/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(css, /forced-colors:active/);
});
