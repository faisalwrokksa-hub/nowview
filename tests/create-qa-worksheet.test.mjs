import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet,ids} from '../tools/create-qa-worksheet.mjs';
import {report} from '../tools/release-readiness-report.mjs';
test('worksheet has 20 distinct cases with no false passes',()=>{
 const data=createWorksheet();
 assert.equal(ids.length,20);assert.equal(new Set(ids).size,20);
 assert.equal(data.records.length,20);
 assert.ok(data.records.every(x=>x.result==='NOT RUN'));
 assert.ok(Object.values(data.gates).every(value=>value===false));
 assert.equal(data.candidate.sourceCommit,'');
 assert.equal(data.candidate.tvApkSha256,'');
 assert.equal(data.candidate.approvedAt,'');
 assert.equal(data.candidate.previousVersionCode,null);
});
test('new worksheet is rejected by release readiness gate',()=>{
 const data=createWorksheet();
 const result=report(data.records,data.gates);
 assert.equal(result.releaseReady,false);
 assert.equal(result.acceptance.summary['NOT RUN'],20);
});
