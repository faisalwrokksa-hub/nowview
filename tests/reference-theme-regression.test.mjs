import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = file => readFileSync(join(root, file), 'utf8');
const html = read('web/index.html');
const shell = read('web/workspace-shell.js');
const tv = read('web/tv-home.js');
const css = read('web/style.css');

test('five workspace buttons retain their unique routing keys and accessible pressed state', () => {
  const matches = [...html.matchAll(/<button\b[^>]*data-view-button="([^"]+)"[^>]*>/g)];
  assert.deepEqual(matches.map(m => m[1]), ['myview', 'markets', 'business', 'media', 'social']);
  for (const [markup] of matches) assert.match(markup, /aria-pressed="false"/);
});

test('reference-theme workspace icons are SVG and decorative to screen readers', () => {
  assert.equal((html.match(/class="nv-nav-icon"/g) || []).length, 5);
  assert.equal((html.match(/class="nv-nav-icon" aria-hidden="true"/g) || []).length, 5);
  assert.match(css, /\.nv-nav-icon/);
});

test('display profiles are device-local, bounded and sanitized', () => {
  assert.match(shell, /newview\.display\.profiles\.v1/);
  assert.match(shell, /profiles\.slice\(0,5\)\.map\(sanitizeDisplay\)/);
  assert.match(shell, /\[0,30,60,120,300\]\.includes\(seconds\)/);
  assert.match(shell, /typeof chosen!=='string'/);
});

test('workspace navigation preserves focus and handles WebView limitations', () => {
  assert.match(shell, /focusWasInHiddenPanel/);
  assert.match(shell, /event\.target instanceof Element/);
  assert.match(shell, /page\.scrollTop=0/);
  assert.match(shell, /Promise\.resolve\(document\.documentElement\.requestFullscreen\(\)\)/);
});

test('TV app launcher is capability-gated and resilient to invalid app lists', () => {
  assert.match(tv, /if\(!window\.NewViewApps/);
  assert.match(tv, /typeof window\.NewViewApps\.listLaunchableApps!=='function'/);
  assert.match(tv, /Array\.isArray\(installed\)/);
  assert.match(tv, /typeof window\.NewViewApps\.launchApp==='function'/);
  assert.match(tv, /e\.key==='Backspace'/);
});


test('media and MyView tolerate missing or failing Android bridges', () => {
  const media = read('web/media.js');
  const myview = read('web/myview.js');
  assert.match(media, /typeof window\.NewViewNative\.isPipeTvInstalled!=='function'/);
  assert.match(media, /Unable to open PipeTv on this device/);
  assert.match(myview, /typeof response==='string'\?JSON\.parse\(response\):response/);
  assert.match(myview, /Unable to launch PipeTv on this TV/);
});


test('installed app package validator accepts normal Android package IDs', () => {
  const source = read('web/myview.js');
  assert.ok(source.includes(String.raw`/^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/`));
  const pattern = /^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/;
  assert.equal(pattern.test('com.example.tv'), true);
  assert.equal(pattern.test('com\\example\\tv'), false);
});

test('IPTV preserves selected channel and handles incomplete metadata', () => {
  const media = read('web/media.js');
  assert.match(media, /const previous=list\.value/);
  assert.match(media, /open\.href=list\.value/);
  assert.match(media, /String\(c\.category\|\|''\)/);
});

test('Watch and News restores keyboard focus when switching hidden panels', () => {
  const watch = read('web/watch.js');
  assert.match(watch, /focusInsideHiddenPanel/);
  assert.match(watch, /focus\(\{preventScroll:true\}\)/);
  assert.match(watch, /catch\{target\?\.focus\(\);\}/);
});


test('IPTV launch reports secure-stream and bridge errors', () => {
  const media = read('web/media.js');
  assert.match(media, /Only secure HTTPS streams can be launched/);
  assert.match(media, /Could not launch this stream/);
  assert.match(media, /Native IPTV playback is not available/);
});


test('TV installed-app discovery selects a capable bridge and caps rendering', () => {
  const myview=read('web/myview.js');
  assert.match(myview, /\[window\.NewViewApps,window\.NewViewNative\]\.find/);
  assert.match(myview, /if\(count>=100\)break/);
});

test('IPTV directory tolerates missing native category and playlist capabilities', () => {
  const media=read('web/media.js');
  assert.match(media, /typeof preferred\.categoriesFor==='function'/);
  assert.match(media, /typeof preferred\?\.parseM3U!=='function'/);
  assert.match(media, /Array\.isArray\(parsed\)/);
});


test('Cloudflare build includes every local script referenced by the dashboard', () => {
  const build=read('cloud/build.mjs');
  const assets=[...build.matchAll(/'([^']+\.(?:js|mjs|css|html))'/g)].map(match=>match[1]);
  const scripts=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match=>match[1]);
  for(const script of scripts){
    if(script.startsWith('https://'))continue;
    assert.ok(assets.includes(script), 'Missing bundled dashboard script: '+script);
  }
  assert.ok(assets.includes('tv-home.js'));
});


test('TV launcher uses local clock and tolerates missing optional Watch API', () => {
  assert.match(tv, /Local device time/);
  assert.doesNotMatch(tv, /timeZone:'Asia\/Riyadh'/);
  assert.match(tv, /NewViewWatch\?\.select\?\./);
});
