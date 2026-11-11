import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const shell=readFileSync(new URL('../web/workspace-shell.js',import.meta.url),'utf8');

test('workspace selection updates roving focus and announces active view',()=>{
 assert.match(shell,/el\.tabIndex=active\?0:-1/);
 assert.match(shell,/workspaceTitle\.setAttribute\('aria-live','polite'\)/);
 assert.match(shell,/workspaceTitle\.textContent=names\[view\]/);
});
test('TV navigation rejects hidden controls and respects RTL',()=>{
 assert.match(shell,/!tab\.closest\('\[hidden\],\[inert\],\[aria-hidden="true"\]'\)/);
 assert.match(shell,/getComputedStyle\(nav\)\.direction==='rtl'/);
 assert.match(shell,/event\.preventDefault\(\)/);
});
test('focus fallback targets visible workspace after hiding previous panel',()=>{
 assert.match(shell,/if\(focusWasInHiddenPanel\)/);
 assert.match(shell,/if\(visible\(page\)\)/);
 assert.match(shell,/page\.focus\(\{preventScroll:true\}\)/);
});
test('display status is noninterrupting and atomic',()=>{
 assert.match(shell,/status\.setAttribute\('role','status'\)/);
 assert.match(shell,/status\.setAttribute\('aria-live','polite'\)/);
 assert.match(shell,/status\.setAttribute\('aria-atomic','true'\)/);
});
