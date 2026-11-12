import test from 'node:test';
import assert from 'node:assert/strict';
import {report,markdown} from '../tools/release-readiness-report.mjs';
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
 assert.equal(report(records,gates).releaseReady,true);
});
