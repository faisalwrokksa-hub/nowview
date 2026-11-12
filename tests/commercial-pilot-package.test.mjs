import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRightsWorksheet} from '../tools/create-private-rights-worksheet.mjs';
import {createWorksheet} from '../tools/create-qa-worksheet.mjs';
import {inspectBundle,assembleBundle} from '../tools/assemble-release-bundle.mjs';

const digest=s=>createHash('sha256').update(s).digest('hex');
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'newview-pilot-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const tv=join(dir,'tv-signed.apk'),phone=join(dir,'phone-signed.apk');
 const tvBody=Buffer.alloc(2400,'T'),phoneBody=Buffer.alloc(2400,'P');
 writeFileSync(tv,tvBody);writeFileSync(phone,phoneBody);
 const tvSha=digest(tvBody),phoneSha=digest(phoneBody),sha='a'.repeat(40);
 const worksheet=createWorksheet();
 worksheet.candidate={
  sourceCommit:sha,tvApkSha256:tvSha,phoneApkSha256:phoneSha,
  tvSignerSha256:'b'.repeat(64),phoneSignerSha256:'c'.repeat(64),
  versionCode:17,previousVersionCode:16,versionName:'1.7.0',distributionChannel:'direct-sideload',
  privacyPolicyUrl:'https://example.org/privacy',supportUrl:'https://example.org/help',
  approvalEvidenceUrl:'https://example.org/release/approval',approvedBy:'Synthetic reviewer',
  approvedAt:'2026-11-12'
 };
 worksheet.records=worksheet.records.map(record=>({...record,
  result:'PASS',device:record.id.startsWith('TV-')?'synthetic Android TV':'synthetic desktop',
  buildCommit:sha,apkSha256:record.id.startsWith('TV-')?tvSha:'',
  expected:'Synthetic expected result',observed:'Synthetic observed result',
  tester:'Synthetic QA',date:'2026-11-12',evidence:'https://example.org/synthetic-evidence'
 }));
 for(const key of Object.keys(worksheet.gates))worksheet.gates[key]=true;
 const rights=createRightsWorksheet();
 rights.entries=rights.entries.map(e=>({...e,status:'cleared',reviewer:'Synthetic legal reviewer',
  reviewDate:'2026-11-12',evidenceUrl:'https://example.org/synthetic-rights/'+e.id}));
 return {tv,phone,dir,tvSha,phoneSha,rights,worksheet,out:join(dir,'pilot-output')};
}
test('private rights worksheet always starts with 7 unverified usages',()=>{
 const rights=createRightsWorksheet();
 assert.equal(rights.schemaVersion,1);
 assert.equal(rights.entries.length,7);
 assert.ok(rights.entries.every(e=>e.status==='unverified'&&e.reviewer===null&&e.evidenceUrl===null));
 assert.match(rights.scope,/PRIVATE owner/);
});
test('pilot assembler fails closed with real unverified rights, even when fictional QA passes',t=>{
 const f=fixture(t),result=inspectBundle({...f,rights:createRightsWorksheet()});
 assert.equal(result.ready,false);
 assert.ok(result.problems.some(x=>x.includes('rights unverified')));
 assert.equal(existsSync(f.out),false);
});
test('pilot assembler previews without writing, then hashes copied approved APK bytes',t=>{
 const f=fixture(t);
 const preview=assembleBundle({...f,create:false});
 assert.equal(preview.ready,true);
 assert.equal(preview.previewOnly,true);
 assert.equal(existsSync(f.out),false,'preview must never write a release');
 const made=assembleBundle({...f,create:true});
 assert.equal(made.ready,true);
 assert.equal(made.previewOnly,false);
 assert.equal(made.info.tvSha256,f.tvSha);
 assert.equal(made.info.phoneSha256,f.phoneSha);
 assert.equal(digest(readFileSync(join(f.out,'NewView-TV-signed.apk'))),f.tvSha);
 assert.equal(digest(readFileSync(join(f.out,'NewView-Phone-Caster-signed.apk'))),f.phoneSha);
 assert.match(readFileSync(join(f.out,'SHA256SUMS.txt'),'utf8'),new RegExp(f.tvSha));
 assert.match(readFileSync(join(f.out,'RELEASE-NOTES.txt'),'utf8'),/does not independently prove/);
 assert.equal(existsSync(join(f.out,'rights.private.json')),false,'do not copy confidential license evidence');
 assert.equal(assembleBundle({...f,create:true}).ready,false,'never overwrite an existing package');
});
test('pilot bundle cannot be created from modified APKs or a play-store APK-only candidate',t=>{
 const f=fixture(t);
 writeFileSync(f.phone,Buffer.alloc(2401,'X'));
 assert.equal(assembleBundle({...f,create:true}).ready,false);
 assert.equal(existsSync(f.out),false);
 writeFileSync(f.phone,Buffer.alloc(2400,'P'));
 f.worksheet.candidate.distributionChannel='play-store';
 const blocked=assembleBundle({...f,create:true});
 assert.equal(blocked.ready,false);
 assert.ok(blocked.problems.some(x=>x.includes('Android App Bundle')));
 assert.equal(existsSync(f.out),false);
});
test('mismatched source, fake owner approvals and missing acceptance records stop packaging',t=>{
 const f=fixture(t);
 f.worksheet.records[0].buildCommit='f'.repeat(40);
 assert.equal(inspectBundle(f).ready,false);
 f.worksheet.records[0].buildCommit=f.worksheet.candidate.sourceCommit;
 f.worksheet.candidate.approvedBy='';
 assert.equal(inspectBundle(f).ready,false);
 f.worksheet.candidate.approvedBy='Synthetic reviewer';
 f.worksheet.records[0].result='NOT RUN';
 assert.equal(inspectBundle(f).ready,false);
});
