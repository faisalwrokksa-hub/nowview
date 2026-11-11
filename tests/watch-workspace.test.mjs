import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../web/workspace-shell.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const watch = fs.readFileSync(new URL('../web/watch.js', import.meta.url), 'utf8');

function shell(saved = 'news') {
  const storage = new Map([['newview.workspace', saved]]);
  const window = {};
  const document = { readyState: 'loading', addEventListener() {}, body: { classList: { contains: () => false } } };
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  vm.runInNewContext(source, { window, document, localStorage });
  return window.NewViewShell;
}
test('exactly four top-level navigation tabs and Discover', () => {
  const buttons = [...html.matchAll(/data-view-button="([^"]+)"/g)].map(x => x[1]);
  assert.deepEqual(buttons, ['myview', 'markets', 'media', 'devices']);
  assert.match(html, /Discover<\/button>/);
  assert.match(html, /src="watch.js"/);
  assert.doesNotMatch(html, /data-view-button="news"/);
  assert.match(watch, /Headlines/);
  assert.match(watch, /Live TV/);
  assert.match(watch, /Videos/);
});
test('saved news tab migrates to Watch & News', () => {
  const api = shell('news');
  assert.equal(api.getStored(), 'media');
  assert.deepEqual(Array.from(api.views), ['myview','markets','media','devices']);
  assert.deepEqual(Array.from(api.sanitizeDisplay({views:['news','markets','media','unknown']}).views), ['media','markets']);
});
test('invalid legacy workspace remains closed', () => {
  assert.equal(shell('unknown').getStored(), 'myview');
});
test('headline panel keeps original nodes and event handlers rather than cloning', () => {
  assert.match(watch, /media\.appendChild\(news\)/);
  assert.match(watch, /news\.removeAttribute\('data-workspace'\)/);
  assert.doesNotMatch(watch, /cloneNode|innerHTML|new Function|eval\(/);
});
