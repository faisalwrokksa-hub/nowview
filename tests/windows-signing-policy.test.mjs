import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ps=readFileSync(new URL('../sign-release.ps1',import.meta.url),'utf8');
const shell=readFileSync(new URL('../sign-release.sh',import.meta.url),'utf8');
const policy=readFileSync(new URL('../docs/ANDROID_RELEASE_POLICY.md',import.meta.url),'utf8');

test('Windows signing is explicit, local and refuses missing credentials or missing SDK',()=>{
 assert.match(ps,/ANDROID_HOME/);
 assert.match(ps,/ANDROID_SDK_ROOT/);
 for(const key of ['NEWVIEW_RELEASE_KEYSTORE','NEWVIEW_RELEASE_ALIAS','NEWVIEW_RELEASE_STORE_PASSWORD','NEWVIEW_RELEASE_KEY_PASSWORD'])
  assert.ok(ps.includes(key));
 assert.match(ps,/GetEnvironmentVariable/);
 assert.match(ps,/apksigner\.bat/);
 assert.match(ps,/Existing release APK found/);
 assert.match(ps,/source repository/);
 assert.match(ps,/Get-FileHash/);
});

test('Windows and Linux signers do not echo passwords or hardcode keystore identities',()=>{
 for(const signer of [ps,shell]){
  assert.match(signer,/env:NEWVIEW_RELEASE_STORE_PASSWORD/);
  assert.match(signer,/env:NEWVIEW_RELEASE_KEY_PASSWORD/);
  assert.doesNotMatch(signer,/--ks-pass\s+\S*(?:[A-Za-z0-9]{7,}|pass:)/i);
  assert.doesNotMatch(signer,/--key-pass\s+\S*(?:[A-Za-z0-9]{7,}|pass:)/i);
 }
 assert.match(ps,/apksigner verify|& \$apksigner verify/);
 assert.match(policy,/sign-release\.ps1/);
 assert.match(policy,/has not been used to sign an owner build/);
});
