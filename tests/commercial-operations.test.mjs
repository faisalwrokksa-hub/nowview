import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,existsSync,rmSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {emptyState,applyCommand,validateCatalog,entitlementFor} from '../tools/commercial-lifecycle.mjs';
import {execute} from '../tools/newview-ops.mjs';
import {stageNotices} from '../tools/stage-release-notices.mjs';

const on='2026-11-12T15:00:00Z';
function apply(state,type,args={}){return applyCommand(state,{type,...args},on);}
test('commercial plans are closed and all paid entitlements fail closed',()=>{
 assert.equal(validateCatalog().valid,true);
 for(const bad of [{checkoutEnabled:true},{salesStatus:'open'},{paymentProvider:'test'}])
  assert.equal(validateCatalog({...JSON.parse(readFileSync(new URL('../web/commercial-catalog.json',import.meta.url))),...bad}).valid,false);
 const result=entitlementFor(emptyState(),'owner-123');
 assert.equal(result.verified,false);assert.equal(result.paid,false);assert.deepEqual(result.features,[]);
});
test('owner-local lifecycle supports plan requests, human review, renewal and cancellation without activating any service',()=>{
 let state=emptyState(on);
 state=apply(state,'customer:add',{customerRef:'trial-001'});
 state=apply(state,'subscription:request',{customerRef:'trial-001',planId:'personal'});
 assert.equal(state.customers['trial-001'].planRequest.status,'pending');
 assert.throws(()=>apply(state,'subscription:renewal',{customerRef:'trial-001'}),/reviewed draft/);
 state=apply(state,'subscription:review',{customerRef:'trial-001'});
 state=apply(state,'subscription:renewal',{customerRef:'trial-001'});
 assert.equal(state.customers['trial-001'].planRequest.status,'renewal-requested');
 state=apply(state,'subscription:review-renewal',{customerRef:'trial-001'});
 state=apply(state,'subscription:cancel',{customerRef:'trial-001'});
 assert.equal(state.customers['trial-001'].planRequest.status,'cancellation-requested');
 state=apply(state,'subscription:close',{customerRef:'trial-001'});
 assert.equal(state.customers['trial-001'].planRequest.status,'closed');
 assert.equal(entitlementFor(state,'trial-001').paid,false);
 assert.equal(state.events.some(x=>x.kind==='renewal-reviewed-not-billed'),true);
 assert.throws(()=>apply(state,'subscription:review',{customerRef:'trial-001'}),/No pending/);
 assert.throws(()=>apply(state,'subscription:request',{customerRef:'trial-001',planId:'preview'}),/Only draft/);
});
test('support tickets have bounded state transitions and never submit or notify a real customer',()=>{
 let state=apply(emptyState(on),'customer:add',{customerRef:'user-100'});
 state=apply(state,'ticket:open',{customerRef:'user-100',category:'technical',summary:'Cannot open dashboard'});
 const id=Object.keys(state.tickets)[0];assert.match(id,/^case-/);
 state=apply(state,'ticket:status',{ticketId:id,status:'investigating'});
 state=apply(state,'ticket:status',{ticketId:id,status:'resolved'});
 assert.throws(()=>apply(state,'ticket:status',{ticketId:id,status:'investigating'}),/Invalid support ticket/);
 state=apply(state,'ticket:status',{ticketId:id,status:'closed'});
 assert.equal(state.tickets[id].status,'closed');
 assert.throws(()=>apply(state,'ticket:status',{ticketId:id,status:'open'}),/Invalid support ticket/);
});
test('notices are reviewed locally, but never published by the private operations store',()=>{
 let state=apply(emptyState(on),'notice:draft',{title:'Preview release',message:'Manual owner review required before any release'});
 const id=Object.keys(state.notices)[0];
 assert.equal(stageNotices(state,'2026-11-12').notices.length,0);
 state=apply(state,'notice:approve',{noticeId:id,approvedBy:'reviewer-001'});
 assert.equal(state.notices[id].status,'approved');
 const preview=stageNotices(state,'2026-11-12');
 assert.equal(preview.publicationStatus,'owner-reviewed-preview');
 assert.equal(preview.notices[0].status,'published');
 assert.match(preview.message,/NOT been distributed/);
 assert.throws(()=>stageNotices(state,'2999-01-01'),/non-future/);
 state=apply(state,'notice:retire',{noticeId:id});
 assert.equal(stageNotices(state,'2026-11-12').notices.length,0);
});
test('private CLI uses an owner-only file, prevents overwrite, and never charges or unlocks entitlements',t=>{
 const dir=mkdtempSync(join(tmpdir(),'newview-ops-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const path=join(dir,'newview-ops.private.json');
 execute([path,'init']);
 assert.equal(existsSync(path),true);
 assert.throws(()=>execute([path,'init']),/EEXIST|already exists/i);
 execute([path,'customer:add','customer-001']);
 execute([path,'subscription:request','customer-001','business']);
 execute([path,'subscription:review','customer-001']);
 execute([path,'subscription:renewal','customer-001']);
 const report=execute([path,'status']);
 assert.equal(report.customerCount,1);
 assert.equal(report.pendingPlanRequests,1);
 assert.equal(report.paidEntitlements.paid,false);
 assert.equal(existsSync(path+'.lock'),false);
 if(process.platform!=='win32'){
  chmodSync(path,0o644);
  assert.throws(()=>execute([path,'status']),/permissions are too broad/);
 }
});
