import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const js=fs.readFileSync(new URL('../web/external-links.js',import.meta.url),'utf8');
const chart=fs.readFileSync(new URL('../android/src/dev/fintech/marketcharts/ChartsView.java',import.meta.url),'utf8');
const activity=fs.readFileSync(new URL('../android/src/dev/fintech/marketcharts/MainActivity.java',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
test('Android outgoing links are bounded to trusted HTTPS hosts',()=>{
 const window={},document={addEventListener:()=>{}};
 vm.runInNewContext(js,{window,document,URL});
 const valid=window.NewViewExternal.approved;
 assert.equal(valid('https://www.sec.gov/newsroom/press-releases'),true);
 assert.equal(valid('https://x.com/OpenAI'),true);
 for(const u of ['http://x.com/a','https://x.com.evil.test/abc','https://www.sec.gov:8443/a','https://u:p@x.com/a','javascript:alert(1)','file:///etc/passwd'])assert.equal(valid(u),false);
 assert.match(chart,/private static boolean approvedUrl\(Uri uri\)/);
 assert.match(chart,/r\.isForMainFrame\(\)/);
 assert.match(chart,/Intent\.ACTION_VIEW/);
});
test('Android file chooser is explicitly CSV/document based with result callback',()=>{
 assert.match(chart,/onShowFileChooser/);
 assert.match(chart,/Intent\.ACTION_OPEN_DOCUMENT/);
 assert.match(chart,/Intent\.CATEGORY_OPENABLE/);
 assert.match(chart,/CSV_PICKER_REQUEST/);
 assert.match(chart,/pendingFiles\.onReceiveValue\(null\)/);
 assert.match(activity,/onActivityResult/);
 assert.match(activity,/web\.handleActivityResult/);
});
test('external-link bridge is installed in cloud bundle and HTML',()=>{
 assert.match(html,/src="external-links\.js"/);
 assert.match(build,/external-links\.js/);
 assert.match(chart,/openApprovedUrl\(String raw\)/);
});

test('document-picker content URI remains readable without raw file access',()=>{
 assert.match(chart,/setAllowContentAccess\(true\)/);
 assert.match(chart,/setAllowFileAccess\(false\)/);
 assert.match(chart,/"content"\.equals\(chosen\.getScheme\(\)\)/);
 assert.match(chart,/Intent\.ACTION_OPEN_DOCUMENT/);
});
