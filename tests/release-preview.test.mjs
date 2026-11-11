import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
test('app has unified branding with a distinct renamed package identifier',()=>{
 const manifest=read('../android/AndroidManifest.xml');
 assert.match(manifest,/android:label="NewView"/);
 assert.match(manifest,/package="app\.newview\.dashboard"/);
 assert.match(manifest,/android:allowBackup="false"/);
 assert.match(manifest,/android:usesCleartextTraffic="false"/);
 assert.doesNotMatch(manifest,/REQUEST_INSTALL_PACKAGES/);
});
test('footer identifies each workspace source truthfully',()=>{
 const shell=read('../web/workspace-shell.js');
 const html=read('../web/index.html');
 assert.match(html,/id="footer-source"/);
 for(const view of ['myview','markets','business','media','social'])assert.match(shell,new RegExp(view+":"));
 assert.match(shell,/U\.S\. stock quotes unavailable/);
 assert.match(shell,/no live feeds/);
 assert.match(shell,/never uploaded/);
});
test('preview APK verification checks legacy assets and package identity',()=>{
 const verifier=read('../scripts/verify-preview-apk.sh');
 const workflow=read('../.github/workflows/dashboard.yml');
 assert.match(verifier,/aapt" dump badging/);
 assert.match(verifier,/application-label:'NewView'/);
 for(const asset of ['myview.js','business.js','news.js','media.js','social.js','workspace-shell.js'])assert.match(verifier,new RegExp(asset.replace('.', '\\.') ));
 assert.match(workflow,/bash scripts\/verify-preview-apk\.sh/);
 assert.match(verifier,/NOT release-signing verification/);
});
