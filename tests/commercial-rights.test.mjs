import test from 'node:test';
import assert from 'node:assert/strict';
import {REQUIRED_IDS,currentRights,assessRights} from '../tools/check-commercial-rights.mjs';

test('actual commercial source-rights registry is NO-GO, regardless of public availability',()=>{
 const rights=currentRights();
 assert.equal(rights.schemaVersion,1);
 assert.equal(rights.entries.length,REQUIRED_IDS.length);
 const result=assessRights(rights);
 assert.equal(result.ready,false);
 assert.deepEqual(result.pending,[...REQUIRED_IDS]);
 assert.deepEqual(result.missing,[]);
 assert.deepEqual(result.problems,[]);
});

test('duplicate, missing, malformed and fabricated rights clearances fail closed',()=>{
 const rights=currentRights();
 assert.equal(assessRights({...rights,entries:rights.entries.slice(1)}).ready,false);
 assert.ok(assessRights({...rights,entries:[...rights.entries,rights.entries[0]]}).problems.some(x=>x.includes('Duplicate')));
 const fake={...rights,entries:rights.entries.map(e=>({...e,status:'cleared'}))};
 assert.equal(assessRights(fake).ready,false);
 assert.ok(assessRights(fake).problems.some(x=>x.includes('human reviewer')));
 assert.ok(assessRights(fake).problems.some(x=>x.includes('HTTPS evidence')));
 assert.ok(assessRights({...rights,entries:[{...rights.entries[0],status:'licensed'}]}).problems.some(x=>x.includes('invalid rights status')));
});

test('only structurally complete synthetic reviewer evidence satisfies validator; it does not certify actual rights',()=>{
 const rights=currentRights();
 rights.entries=rights.entries.map(e=>({...e,status:'cleared',reviewer:'Fictional test reviewer',reviewDate:'2026-11-12',evidenceUrl:'https://example.com/qa-fixture/'+e.id}));
 assert.equal(assessRights(rights).ready,true);
 rights.entries[0].evidenceUrl='https://user:password@example.com/';
 assert.equal(assessRights(rights).ready,false);
 rights.entries[0].evidenceUrl='https://example.com/';
 rights.entries[0].reviewDate='2026-02-30';
 assert.equal(assessRights(rights).ready,false);
});
