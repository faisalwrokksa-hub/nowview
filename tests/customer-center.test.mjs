import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../web/customer-center.js',import.meta.url),'utf8');
const bundled=JSON.parse(readFileSync(new URL('../web/commercial-catalog.json',import.meta.url),'utf8'));
const notices=JSON.parse(readFileSync(new URL('../web/release-notices.json',import.meta.url),'utf8'));
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const worker=readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
function service(){const window={};vm.runInNewContext(script,{window,Date,Set,Error,URL,AbortController,setTimeout,clearTimeout});return window.NewViewCustomer;}
test('customer plans are shown as prelaunch-only and cannot be represented as paid checkout',()=>{
 const app=service();
 assert.equal(app.secureCatalog(bundled),true);
 for(const changes of [{checkoutEnabled:true},{accountProvisioningEnabled:true},{salesStatus:'open'},{paymentProvider:'billing'}])
  assert.equal(app.secureCatalog({...bundled,...changes}),false);
 const fake=JSON.parse(JSON.stringify(bundled));fake.plans[0].price=12;
 assert.equal(app.secureCatalog(fake),false);
 assert.match(html,/customer-center\.js/);
 assert.match(worker,/'commercial-catalog\.json'/);
 assert.match(worker,/'release-notices\.json'/);
 assert.match(worker,/application\/json/);
});
test('release notice feed publishes only structurally valid owner-reviewed records',()=>{
 const app=service();
 assert.equal(app.publicNotices(notices).length,0);
 const accepted={id:'notice-000001',title:'Maintenance schedule',message:'Official release update approved',status:'published',publishedOn:'2026-11-12'};
 const data={schemaVersion:1,notices:[accepted,{...accepted,id:'notice-000002',status:'draft'}, {...accepted,id:'notice-000003',message:'x'.repeat(700)}]};
 assert.equal(app.publicNotices(data).length,1);
 assert.equal(app.publicNotices({schemaVersion:1,notices:[...Array(11).fill(accepted)]}).length,0);
});
test('support request is a local unsubmitted draft and blocks sensitive tokens',()=>{
 const app=service();
 const draft=app.supportDraft('technical','Screen stays black','Reproducible after selecting Watch');
 assert.equal(draft.delivery,'not-submitted');
 assert.equal(draft.category,'technical');
 assert.ok(!Object.keys(draft).some(x=>/deviceid|email|auth/i.test(x)));
 for(const payload of ['password=secret','Bearer abcdefgh','#sync=secret','api_key=my-secret']){
  assert.throws(()=>app.supportDraft('technical','Loading issue',payload),/Remove pairing links/);
 }
 assert.throws(()=>app.supportDraft('technical','short',''),/8 characters/);
 assert.throws(()=>app.supportDraft('unknown','Valid summary',''),/valid support category/);
 assert.match(script,/Nothing is submitted/);
 assert.match(script,/No customer releases announced/);
 assert.doesNotMatch(script,/checkout\.sessions|stripe\.com|fetch\([^)]*POST/);
});
