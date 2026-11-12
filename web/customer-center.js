'use strict';
/*
 * Customer-facing commercial preparation. No checkout, account enrollment,
 * customer ticket submission, payment endpoint or premium unlock. Source data
 * comes only from two first-party bundled JSON files, never arbitrary URLs.
 */
(function(root){
 const TYPES=new Set(['technical','account','billing','privacy','media','other']);
 const CHANNELS=new Set(['preview','pilot','production']);
 const MAX_NOTICES=10;
 function secureCatalog(x){
  return Boolean(x?.schemaVersion===1&&x.salesStatus==='not-open'&&
   x.checkoutEnabled===false&&x.accountProvisioningEnabled===false&&
   x.paymentProvider===null&&Array.isArray(x.plans)&&x.plans.length<=6&&
   x.plans.every(p=>typeof p.id==='string'&&p.id.length<=64&&
    ['draft','internal-only'].includes(p.status)&&p.price===null&&p.billingInterval===null&&
    typeof p.title==='string'&&p.title.length<=70&&
    Array.isArray(p.features)&&p.features.length<=10&&
    p.features.every(s=>typeof s==='string'&&s.length<=160)));
 }
 function publicNotices(x){
  if(!x||x.schemaVersion!==1||!Array.isArray(x.notices)||x.notices.length>MAX_NOTICES)return [];
  return x.notices.filter(n=>n&&typeof n.id==='string'&&n.id.length<=64&&
   typeof n.title==='string'&&n.title.length<=100&&
   typeof n.message==='string'&&n.message.length<=600&&n.status==='published'&&
   /^\d{4}-\d{2}-\d{2}$/.test(n.publishedOn||'')).slice(0,MAX_NOTICES);
 }
 async function readBundle(name){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try{
   const response=await fetch(name,{method:'GET',cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Bundled catalog unavailable');
   const contentType=response.headers?.get?.('content-type')||'';
   if(contentType&&!/json/i.test(contentType))throw Error('Unexpected catalog content type');
   const text=await response.text();
   if(text.length>24000)throw Error('Catalog exceeds local size limit');
   return JSON.parse(text);
  }finally{clearTimeout(timer);}
 }
 function createNode(tag,text){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  return node;
 }
 function safeSummary(text,max){
  if(typeof text!=='string')return '';
  return text.trim().replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').slice(0,max);
 }
 function supportDraft(category,summary,steps){
  if(!TYPES.has(category))throw Error('Choose a valid support category');
  const clean=safeSummary(summary,200),details=safeSummary(steps,1000);
  if(clean.length<8)throw Error('Describe the issue in at least 8 characters');
  if(/(?:#sync=|bearer\s+|password\s*[:=]|api[_-]?key\s*[:=])/i.test(clean+' '+details))
   throw Error('Remove pairing links, tokens and passwords before exporting');
  return {schemaVersion:1,kind:'support-request-draft',delivery:'not-submitted',category,
   summary:clean,steps:details,createdAt:new Date().toISOString()};
 }
 function saveJson(data,filename){
  if(typeof Blob!=='function'||typeof URL.createObjectURL!=='function')throw Error('Local export not supported on this device');
  const objectUrl=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));
  const a=createNode('a');a.href=objectUrl;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
 }
 function install(){
  if(document.getElementById('newview-customer-center')||document.body.classList.contains('home-panel'))return;
  const host=document.querySelector('#newview-settings .newview-settings-content');
  if(!host)return;
  const details=createNode('details');details.id='newview-customer-center';details.className='shell-card newview-customer-center';
  const summary=createNode('summary','Plans, support requests & updates');summary.setAttribute('aria-label','Open NewView commercial and support options');details.append(summary);
  const status=createNode('p','Preview product. Plans are not for sale; no subscription or payment service is connected.');
  status.id='newview-commercial-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  details.append(status);
  const planHeading=createNode('h3','Subscription plans');details.append(planHeading);
  const catalogHost=createNode('div');catalogHost.id='newview-commercial-plans';
  catalogHost.textContent='Open this panel to review draft software plans. No pricing or checkout is available.';
  details.append(catalogHost);
  const noticeHeading=createNode('h3','Release notices & updates');details.append(noticeHeading);
  const notices=createNode('div');notices.id='newview-release-notices';
  notices.textContent='No customer releases announced. Check your distributor or installed-app settings for verified updates.';
  details.append(notices);
  const guidance=createNode('p','Updates must come from your approved distributor using a verified Android signing certificate. Do not uninstall an existing app to force an update; saved settings may be lost.');
  details.append(guidance);
  const supportHeading=createNode('h3','Prepare a support request');details.append(supportHeading);
  const warning=createNode('p','This is a local draft only. Nothing is submitted, and a case number is not assigned until a real authorized support provider receives it. Do not enter passwords, pairing links, secrets or confidential CSV contents.');
  details.append(warning);
  const categoryLabel=createNode('label','Issue category');
  const category=createNode('select');category.setAttribute('aria-label','Support issue category');
  for(const id of TYPES){const option=createNode('option',id.replace('-',' '));option.value=id;category.append(option);}
  category.value='technical';categoryLabel.append(category);details.append(categoryLabel);
  const issueLabel=createNode('label','Brief issue summary');
  const issue=createNode('input');issue.type='text';issue.maxLength=200;issue.setAttribute('aria-label','Support issue summary');
  issueLabel.append(issue);details.append(issueLabel);
  const stepsLabel=createNode('label','Steps to reproduce (optional)');
  const steps=createNode('textarea');steps.maxLength=1000;steps.rows=3;steps.setAttribute('aria-label','Steps to reproduce');
  stepsLabel.append(steps);details.append(stepsLabel);
  const exportButton=createNode('button','Save support request draft (does not send)');
  exportButton.type='button';exportButton.id='newview-support-request-export';
  const result=createNode('p','No support request has been sent.');result.id='newview-support-request-status';
  result.setAttribute('role','status');result.setAttribute('aria-live','polite');
  exportButton.addEventListener('click',()=>{
   try{
    const draft=supportDraft(category.value,issue.value,steps.value);
    saveJson(draft,'newview-support-request-draft.json');
    result.textContent='Saved a local support draft. Send it only through an approved support contact when configured.';
   }catch(error){result.textContent=error?.message||'Could not save the local support request.';}
  });
  details.append(exportButton,result);host.append(details);
  let loaded=false;
  details.addEventListener('toggle',async()=>{
   if(!details.open||loaded)return;
   loaded=true;
   catalogHost.textContent='Reading bundled plan availability…';
   try{
    const x=await readBundle('commercial-catalog.json');
    if(!secureCatalog(x))throw Error('Unapproved catalog configuration');
    catalogHost.replaceChildren();
    for(const p of x.plans){
     const card=createNode('article');card.className='newview-plan-summary';
     card.append(createNode('h4',p.title));
     card.append(createNode('p','Unavailable for purchase · pricing and customer terms pending approval'));
     const list=createNode('ul');
     for(const feature of p.features)list.append(createNode('li',feature));
     card.append(list);catalogHost.append(card);
    }
    status.textContent='Prelaunch software plans only. Checkout, billing, sign-up and paid entitlements are disabled.';
   }catch{
    catalogHost.textContent='Plan availability could not be verified. No purchase or account activation is available.';
    status.textContent='Commercial services are not configured.';
   }
   try{
    const data=await readBundle('release-notices.json');
    const items=publicNotices(data);notices.replaceChildren();
    if(!items.length)notices.textContent='No approved customer release notices have been published.';
    for(const n of items){
     const item=createNode('article');item.className='newview-release-entry';
     item.append(createNode('h4',n.title));
     item.append(createNode('p',n.publishedOn+' · '+n.message));notices.append(item);
    }
   }catch{notices.textContent='Release notices are unavailable; no update claim can be verified.';}
  });
 }
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
 }
 root.NewViewCustomer=Object.freeze({secureCatalog,publicNotices,supportDraft});
})(typeof window!=='undefined'?window:globalThis);
