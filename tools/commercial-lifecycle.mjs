/*
 * NewView private operator workflow. NOT a payment processor or access-control
 * backend. This maintains local administrative requests only; no customer data
 * is sent to Cloudflare and no premium feature is unlocked from these records.
 */
import {readFileSync} from 'node:fs';

const REF=/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/;
const ALLOWED_CATEGORIES=new Set(['technical','account','billing','privacy','media','other']);
const TICKET_TRANSITIONS={
 open:new Set(['investigating','closed']),
 investigating:new Set(['awaiting-customer','resolved','closed']),
 'awaiting-customer':new Set(['investigating','resolved','closed']),
 resolved:new Set(['open','closed']),
 closed:new Set()
};
const LIMIT=1000;
export const catalog=Object.freeze(JSON.parse(readFileSync(new URL('../web/commercial-catalog.json',import.meta.url),'utf8')));

export function validateCatalog(value=catalog){
 const problems=[];
 if(value?.schemaVersion!==1||!Array.isArray(value.plans)||value.plans.length!==3)
  return {valid:false,problems:['Invalid or incomplete commercial plan catalog']};
 if(value.checkoutEnabled!==false||value.accountProvisioningEnabled!==false||
    value.salesStatus!=='not-open'||value.paymentProvider!==null)
  problems.push('Commercial purchase/account activation must remain disabled before owner approval');
 const ids=new Set();
 for(const p of value.plans){
  if(!REF.test(p?.id||'')||ids.has(p.id))problems.push('Invalid or duplicate plan id');
  ids.add(p.id);
  if(!['draft','internal-only'].includes(p.status)||p.price!==null||p.billingInterval!==null)
   problems.push(p.id+': plan must remain without prices, billing or publicly purchasable status');
  if(!Array.isArray(p.features)||p.features.some(x=>typeof x!=='string'||x.length>160))
   problems.push(p.id+': invalid feature list');
 }
 if(value.support?.intakeEnabled!==false||value.support?.policyApproved!==false)
  problems.push('Support submission must not be advertised as operational before approval');
 return {valid:!problems.length,problems};
}
function requireRef(value,label='Reference'){
 if(typeof value!=='string'||!REF.test(value))throw Error(label+' must be an opaque 3–64 character ID (letters, digits, _ or -)');
 return value;
}
function requireText(value,label,max){
 if(typeof value!=='string')throw Error(label+' must be text');
 const result=value.trim().replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ');
 if(result.length<3||result.length>max)throw Error(label+' must be between 3 and '+max+' characters');
 return result;
}
function timestamp(now){
 const date=new Date(now);
 if(!Number.isFinite(date.getTime()))throw Error('Invalid timestamp');
 return date.toISOString();
}
export function emptyState(now=new Date()){
 return {schemaVersion:1,mode:'owner-local-draft',createdAt:timestamp(now),updatedAt:timestamp(now),
  nextNumber:1,customers:{},tickets:{},notices:{},events:[]};
}
export function validateState(state){
 if(!state||state.schemaVersion!==1||state.mode!=='owner-local-draft'||
  !Number.isSafeInteger(state.nextNumber)||state.nextNumber<1||
  !state.customers||typeof state.customers!=='object'||Array.isArray(state.customers)||
  !state.tickets||typeof state.tickets!=='object'||Array.isArray(state.tickets)||
  !state.notices||typeof state.notices!=='object'||Array.isArray(state.notices)||
  !Array.isArray(state.events))throw Error('Invalid private owner operations store');
 if(Object.keys(state.customers).length>LIMIT||Object.keys(state.tickets).length>LIMIT||
    Object.keys(state.notices).length>LIMIT||state.events.length>LIMIT)
  throw Error('Owner operations store limit exceeded');
 return true;
}
export function entitlementFor(_state,_customerRef){
 // A local admin workflow is NOT server-side authentication or paid licensing.
 // No client-facing premium or subscription entitlement can originate here.
 return {verified:false,paid:false,features:[],reason:'No authenticated billing and entitlement service configured'};
}
function allocate(state,prefix){
 const n=state.nextNumber++;
 return prefix+'-'+String(n).padStart(6,'0');
}
function recordEvent(state,kind,ref,at){
 state.events.push({kind,ref,at});
 if(state.events.length>LIMIT)state.events.splice(0,state.events.length-LIMIT);
}
export function applyCommand(state,command,now=new Date()){
 validateState(state);
 if(!command||typeof command!=='object')throw Error('Invalid owner command');
 const at=timestamp(now),next=structuredClone(state);
 const ref=command.customerRef;
 switch(command.type){
  case 'customer:add':{
   requireRef(ref,'Customer reference');
   if(next.customers[ref])throw Error('Customer reference already exists');
   next.customers[ref]={customerRef:ref,status:'prospect',planRequest:null,createdAt:at,updatedAt:at};
   recordEvent(next,'customer-added',ref,at);
   break;
  }
  case 'subscription:request':{
   requireRef(ref,'Customer reference');
   const customer=next.customers[ref];if(!customer)throw Error('Unknown customer reference');
   const plan=validateCatalog().valid&&catalog.plans.find(p=>p.id===command.planId);
   if(!plan||plan.id==='preview')throw Error('Only draft Personal or Business plans may be requested');
   if(customer.planRequest&&['pending','reviewed','renewal-requested','cancellation-requested'].includes(customer.planRequest.status))
    throw Error('Existing plan request must be resolved first');
   customer.planRequest={id:allocate(next,'request'),planId:plan.id,status:'pending',requestedAt:at,
    cancellationRequestedAt:null};
   customer.updatedAt=at;recordEvent(next,'plan-requested',ref,at);
   break;
  }
  case 'subscription:review':{
   requireRef(ref,'Customer reference');
   const customer=next.customers[ref];if(!customer?.planRequest||customer.planRequest.status!=='pending')
    throw Error('No pending plan request for review');
   customer.planRequest.status='reviewed';customer.planRequest.reviewedAt=at;
   customer.updatedAt=at;recordEvent(next,'plan-reviewed-not-activated',ref,at);
   break;
  }
  case 'subscription:renewal':{
   requireRef(ref,'Customer reference');
   const customer=next.customers[ref];if(customer?.planRequest?.status!=='reviewed')
    throw Error('A reviewed draft plan request is required before requesting renewal');
   customer.planRequest.status='renewal-requested';customer.planRequest.renewalRequestedAt=at;
   customer.updatedAt=at;recordEvent(next,'renewal-requested-not-billed',ref,at);
   break;
  }
  case 'subscription:review-renewal':{
   requireRef(ref,'Customer reference');
   const customer=next.customers[ref];if(customer?.planRequest?.status!=='renewal-requested')
    throw Error('No pending renewal request for review');
   customer.planRequest.status='reviewed';customer.planRequest.renewalReviewedAt=at;
   customer.updatedAt=at;recordEvent(next,'renewal-reviewed-not-billed',ref,at);
   break;
  }
  case 'subscription:cancel':{
   requireRef(ref,'Customer reference');
   const customer=next.customers[ref];if(!customer?.planRequest)throw Error('No plan request to cancel');
   if(!['pending','reviewed','renewal-requested'].includes(customer.planRequest.status))throw Error('Request cannot be cancelled in its current status');
   customer.planRequest.status='cancellation-requested';
   customer.planRequest.cancellationRequestedAt=at;customer.updatedAt=at;
   recordEvent(next,'cancellation-requested',ref,at);
   break;
  }
  case 'subscription:close':{
   requireRef(ref,'Customer reference');
   const customer=next.customers[ref];if(customer?.planRequest?.status!=='cancellation-requested')
    throw Error('Cancellation request must be recorded first');
   customer.planRequest.status='closed';customer.planRequest.closedAt=at;customer.updatedAt=at;
   recordEvent(next,'cancellation-closed',ref,at);
   break;
  }
  case 'ticket:open':{
   requireRef(ref,'Customer reference');
   if(!next.customers[ref])throw Error('Customer reference does not exist');
   if(!ALLOWED_CATEGORIES.has(command.category))throw Error('Unsupported support category');
   const description=requireText(command.summary,'Support summary',500);
   const id=allocate(next,'case');
   next.tickets[id]={id,customerRef:ref,category:command.category,summary:description,
    status:'open',createdAt:at,updatedAt:at};
   recordEvent(next,'ticket-opened',id,at);
   break;
  }
  case 'ticket:status':{
   const id=requireRef(command.ticketId,'Ticket ID');
   const ticket=next.tickets[id];if(!ticket)throw Error('Unknown support ticket');
   if(!TICKET_TRANSITIONS[ticket.status]?.has(command.status))
    throw Error('Invalid support ticket transition');
   ticket.status=command.status;ticket.updatedAt=at;recordEvent(next,'ticket-'+command.status,id,at);
   break;
  }
  case 'notice:draft':{
   const title=requireText(command.title,'Release notice title',100);
   const message=requireText(command.message,'Release notice message',600);
   const id=allocate(next,'notice');
   next.notices[id]={id,title,message,status:'draft',createdAt:at,updatedAt:at,approvedBy:null};
   recordEvent(next,'notice-drafted',id,at);
   break;
  }
  case 'notice:approve':{
   const id=requireRef(command.noticeId,'Notice ID');
   const notice=next.notices[id];if(!notice||notice.status!=='draft')throw Error('Only drafted notices may be approved');
   notice.approvedBy=requireRef(command.approvedBy,'Reviewer reference');
   notice.status='approved';notice.updatedAt=at;
   recordEvent(next,'notice-approved-for-review-not-published',id,at);
   break;
  }
  case 'notice:retire':{
   const id=requireRef(command.noticeId,'Notice ID');
   const notice=next.notices[id];if(!notice||notice.status==='retired')throw Error('Notice unavailable');
   notice.status='retired';notice.updatedAt=at;recordEvent(next,'notice-retired',id,at);
   break;
  }
  default:throw Error('Unknown owner-only commercial command');
 }
 next.updatedAt=at;validateState(next);
 return next;
}
