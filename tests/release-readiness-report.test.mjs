import test from 'node:test';
import assert from 'node:assert/strict';
import {report,markdown} from '../tools/release-readiness-report.mjs';
import {currentRights} from '../tools/check-commercial-rights.mjs';
test('readiness defaults to NO-GO without evidence or approvals',()=>{
 const result=report([]);
 assert.equal(result.releaseReady,false);
 assert.equal(result.unverified.length,7);
 assert.match(markdown(result),/NO-GO/);
 assert.match(markdown(result),/TV-01 not passed/);
});
test('passing test records alone never bypass owner approval and rights',()=>{
 const ids=[...Array.from({length:12},(_,i)=>'TV-'+String(i+1).padStart(2,'0')),...Array.from({length:8},(_,i)=>'WEB-'+String(i+1).padStart(2,'0'))];
 const records=ids.map(id=>({id,result:'PASS',device:'verified',buildCommit:'a'.repeat(40),apkSha256:'b'.repeat(64),expected:'ok',observed:'ok',tester:'QA',date:'2026-11-12',evidence:'issue'}));
 assert.equal(report(records).releaseReady,false);
 const gates={ci:true,mediaRights:true,securityReview:true,signing:true,upgradeTest:true,supportPolicy:true,ownerApproval:true};
 assert.equal(report(records,gates).releaseReady,false,'Unverified source rights cannot be overridden by a boolean');
 const fixture=currentRights();
 fixture.entries=fixture.entries.map(entry=>({...entry,status:'cleared',reviewer:'Synthetic QA fixture',reviewDate:'2026-11-12',evidenceUrl:'https://example.com/not-a-real-legal-clearance/'+entry.id}));
 const syntheticCandidate={sourceCommit:'a'.repeat(40),tvApkSha256:'b'.repeat(64),phoneApkSha256:'c'.repeat(64),tvSignerSha256:'d'.repeat(64),phoneSignerSha256:'e'.repeat(64),versionCode:2,previousVersionCode:1,versionName:'2.0',distributionChannel:'direct-sideload',privacyPolicyUrl:'https://example.org/privacy',supportUrl:'https://example.org/help',approvalEvidenceUrl:'https://example.org/approval',approvedBy:'Synthetic test approver',approvedAt:'2026-11-12'};
 assert.equal(report(records,gates,fixture).releaseReady,false,'Even fake all-true flags cannot waive missing signed candidate metadata');
 assert.equal(report(records,gates,fixture,syntheticCandidate).releaseReady,true,'Fully synthetic aligned fixture demonstrates code path only');
 const bad={...syntheticCandidate,tvApkSha256:'9'.repeat(64)};
 assert.equal(report(records,gates,fixture,bad).releaseReady,false,'Mismatched TV APK digest blocks release');
 const wrongCommit=records.map(r=>({...r,buildCommit:'0'.repeat(40)}));
 assert.equal(report(wrongCommit,gates,fixture,syntheticCandidate).releaseReady,false,'Stale acceptance from another build blocks release');

});

test('null or incomplete inputs produce a complete NO-GO report',()=>{
 for(const input of [null,{}, {records:null,gates:null}]){
  const result=report(input?.records,input?.gates);
  assert.equal(result.releaseReady,false);
  assert.equal(result.acceptance.missing.length,20);
  assert.equal(result.acceptance.summary['NOT RUN'],20);
  assert.match(markdown(result),/NO-GO/);
 }
});

test('real source rights registry leaves public distribution NO-GO even with synthetic PASS claims',()=>{
 const result=report([],{ci:true,mediaRights:true,securityReview:true,signing:true,upgradeTest:true,supportPolicy:true,ownerApproval:true});
 assert.equal(result.releaseReady,false);
 assert.ok(result.sourceRights.pending.length>=7);
 assert.match(markdown(result),/commercial source usage rights/);
});
