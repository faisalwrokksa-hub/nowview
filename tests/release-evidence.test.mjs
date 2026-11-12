import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,validate} from '../tools/check-release-evidence.mjs';
test('empty release evidence fails closed',()=>{const result=evaluate([]);assert.equal(result.ready,false);assert.equal(result.missing.length,20);assert.equal(result.summary['NOT RUN'],20);});
test('unsupported or duplicate evidence cannot pass',()=>{assert.ok(validate({id:'TV-99',result:'PASS'}).length);assert.ok(evaluate([{id:'TV-01',result:'NOT RUN'},{id:'TV-01',result:'NOT RUN'}]).problems.some(x=>x.includes('Duplicate')));});
test('PASS requires observed device evidence and full build identity',()=>{assert.ok(validate({id:'TV-01',result:'PASS'}).includes('PASS missing observed'));assert.ok(validate({id:'TV-01',result:'PASS',device:'TV',buildCommit:'a'.repeat(40),expected:'opens',observed:'opened',tester:'QA',date:'2026-11-12',evidence:'issue URL'}).some(x=>x.includes('APK SHA-256')));});
test('all fully evidenced acceptance cases can pass',()=>{const ids=[...Array.from({length:12},(_,i)=>'TV-'+String(i+1).padStart(2,'0')),...Array.from({length:8},(_,i)=>'WEB-'+String(i+1).padStart(2,'0'))];const records=ids.map(id=>({id,result:'PASS',device:'test hardware',buildCommit:'a'.repeat(40),apkSha256:'b'.repeat(64),expected:'works',observed:'verified',tester:'QA',date:'2026-11-12',evidence:'recorded report'}));assert.equal(evaluate(records).ready,true);});

test('invalid calendar date cannot be accepted as a PASS',()=>{
 const record={id:'WEB-01',result:'PASS',device:'Chrome',buildCommit:'a'.repeat(40),expected:'loads',observed:'loaded',tester:'QA',date:'2026-02-30',evidence:'report'};
 assert.ok(validate(record).includes('Invalid date'));
});
test('Windows-safe CLI module URL handling is used',()=>{
 const source=readFileSync(new URL('../tools/check-release-evidence.mjs',import.meta.url),'utf8');
 assert.match(source,/fileURLToPath\(import\.meta\.url\)/);
});
