import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../web/workspace-shell.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../web/style.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
test('remote navigation filters hidden/disabled workspaces and respects text entry',()=>{
 assert.match(app,/getClientRects\(\)\.length>0/);
 assert.match(app,/closest\('\[hidden\], \[inert\], \[aria-hidden="true"\]'\)/);
 assert.match(app,/current\.matches\('input, textarea, select, \[contenteditable="true"\]'\)/);
 assert.match(app,/a\[href\]/);
});
test('market board action hides outside Markets and media is stopped on exit',()=>{
 assert.match(shell,/chartToggle\.hidden=view!=='markets'/);
 assert.match(shell,/view!=='media'&&window\.NowViewMedia\?\.stopPlayback/);
 assert.match(css,/#shell-market-actions button\[hidden\]/);
});
test('workspace tab current state and scrolling support mobile and television',()=>{
 assert.match(shell,/aria-current/);
 assert.match(css,/100dvh/);
 assert.match(css,/overscroll-behavior:contain/);
 for(const v of ['myview','markets','business','news','media','social'])assert.match(html,new RegExp('data-view-button="'+v+'"'));
});
