import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCandidate} from '../tools/check-release-candidate.mjs';

const sha='a'.repeat(40),tv='b'.repeat(64),phone='c'.repeat(64);
const candidate=()=>({
 sourceCommit:sha,tvApkSha256:tv,phoneApkSha256:phone,
 tvSignerSha256:'d'.repeat(64),phoneSignerSha256:'e'.repeat(64),
 versionCode:12,previousVersionCode:11,versionName:'1.2.0',
 distributionChannel:'direct-sideload',
 privacyPolicyUrl:'https://example.org/privacy',
 supportUrl:'https://example.org/support',
 approvalEvidenceUrl:'https://example.org/approval',
 approvedBy:'Synthetic QA Owner',approvedAt:'2026-11-12'
});
const rec=(id,commit=sha,digest=tv)=>({id,result:'PASS',buildCommit:commit,apkSha256:digest});

test('an unprovided release candidate cannot be cleared by synthetic PASS records',()=>{
 const r=assessCandidate(null,[rec('TV-01')]);
 assert.equal(r.ready,false);
 assert.match(r.problems[0],/No signed release candidate/);
});
test('candidate ties every TV and web acceptance case to one full source commit and TV APK digest',()=>{
 const records=[rec('TV-01'),rec('WEB-01')];
 assert.deepEqual(assessCandidate(candidate(),records),{ready:true,problems:[]});
 assert.ok(assessCandidate(candidate(),[rec('TV-01','f'.repeat(40))]).problems.some(x=>/different source commit/.test(x)));
 assert.ok(assessCandidate(candidate(),[rec('TV-01',sha,'f'.repeat(64))]).problems.some(x=>/digest does not match/.test(x)));
 assert.ok(assessCandidate(candidate(),[rec('WEB-03','f'.repeat(40))]).problems.some(x=>/different source commit/.test(x)));
});
test('release candidate requires complete hashes, signer evidence, approved policy URLs and upgrade order',()=>{
 for(const invalid of [
  {sourceCommit:'a'.repeat(7)},
  {tvApkSha256:'bad'},
  {phoneApkSha256:'bad'},
  {tvSignerSha256:'bad'},
  {phoneSignerSha256:'bad'},
  {versionCode:0},
  {previousVersionCode:12},
  {versionName:''},
  {distributionChannel:'not-approved'},
  {privacyPolicyUrl:'http://example.org/privacy'},
  {supportUrl:'https://person:secret@example.org/support'},
  {approvalEvidenceUrl:'https://example.org/approval#unverified'},
  {approvedBy:''},
  {approvedAt:'2026-02-30'},
  {approvedAt:'2999-01-01'}
 ]){
  const result=assessCandidate({...candidate(),...invalid},[rec('TV-01')]);
  assert.equal(result.ready,false,JSON.stringify(invalid));
 }
});
test('explicit first release allows previous versionCode 0 but not a null or imaginary previous code',()=>{
 assert.equal(assessCandidate({...candidate(),previousVersionCode:0},[rec('TV-01')]).ready,true);
 assert.equal(assessCandidate({...candidate(),previousVersionCode:null},[rec('TV-01')]).ready,false);
});
