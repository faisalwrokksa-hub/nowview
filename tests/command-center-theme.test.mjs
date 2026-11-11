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

const shell=readFileSync(new URL('../web/workspace-shell.js',import.meta.url),'utf8');
test('command palette stays local, supports keyboard navigation, and preserves back dismissal',()=>{
 assert.match(shell,/function installCommandPalette\(\)/);
 assert.match(shell,/aria-keyshortcuts/);
 assert.match(shell,/aria-modal/);
 assert.match(shell,/e\.key==='ArrowDown'/);
 assert.match(shell,/e\.key==='Enter'/);
 assert.match(shell,/e\.key==='Escape'/);
 assert.match(shell,/NewViewCloseCommandPalette\?\.\(\)/);
 assert.match(shell,/window\.NewViewWatch\?\.select/);
 assert.match(css,/newview-command-overlay:not\(\[hidden\]\)/);
 assert.match(css,/newview-command-result\[aria-selected="true"\]/);
});

test('Homepage quick access remains visible at mobile and short TV heights',()=>{
 assert.match(css,/@media\(max-width:650px\)\{\s*body:not\(\.home-panel\)>main \.homepage-launcher\{display:flex/);
 assert.doesNotMatch(css,/\.homepage-launcher\{display:none\}/);
 assert.match(css,/homepage-launcher-tile:focus-visible/);
 assert.match(css,/@media\(hover:none\)/);
 assert.match(html,/data-home-view="markets"/);
 assert.match(html,/data-home-view="media" data-home-section="channels"/);
});

test('diagnostics check the server only on user action, without claiming upstream health',()=>{
 const source=readFileSync(new URL('../web/connectivity.js',import.meta.url),'utf8');
 const py=readFileSync(new URL('../dashboard.py',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
 assert.match(source,/button\.addEventListener\('click', async \(\) =>/);
 assert.match(source,/fetch\('\/healthz'/);
 assert.match(source,/AbortController/);
 assert.match(source,/cache: 'no-store'/);
 assert.match(source,/data\.scope !== 'worker-only'/);
 assert.match(source,/external feeds not checked/);
 assert.match(source,/credentials: 'same-origin'/);
 assert.match(py,/if parsed\.path == '\/healthz':/);
 assert.match(py,/'upstreamsChecked': False/);
 assert.match(worker,/upstreamsChecked:false/);
 assert.match(css,/newview-health-result\[data-health="error"\]/);
});
