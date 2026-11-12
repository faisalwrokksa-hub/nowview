#!/usr/bin/env node
/*
 * Private owner workstation only. No network or payment side effects.
 * All state remains in an owner-owned 0600 file; mutations use a lock and
 * atomic replacement. This is NOT an authenticated customer account service.
 */
import {readFileSync,writeFileSync,openSync,closeSync,unlinkSync,renameSync,lstatSync,existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {emptyState,applyCommand,validateState,entitlementFor} from './commercial-lifecycle.mjs';

const HELP=[
 'NewView private owner operations (never charges or grants access)',
 'Usage: node tools/newview-ops.mjs <newview-ops.private.json> <command> [arguments]',
 'Commands:',
 '  init  | status',
 '  customer:add <opaque-ref>',
 '  subscription:request <opaque-ref> personal|business',
 '  subscription:review <opaque-ref> | subscription:renewal <opaque-ref> | subscription:review-renewal <opaque-ref>',
 '  subscription:cancel <opaque-ref> | subscription:close <opaque-ref>',
 '  ticket:open <opaque-ref> technical|account|billing|privacy|media|other <summary-private-file>',
 '  ticket:status <case-id> open|investigating|awaiting-customer|resolved|closed',
 '  notice:draft <title-private-file> <message-private-file>',
 '  notice:approve <notice-id> <reviewer-ref> | notice:retire <notice-id>',
 'No customer names, emails, payment methods, tokens, or license keys belong in this file.',
].join('\n');
function secure(path){
 if(!existsSync(path))throw Error('Owner file does not exist. Use init first.');
 const stat=lstatSync(path);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)
  throw Error('Owner data must be a small regular, non-symlink private file');
 if(process.platform!=='win32'&&(stat.mode & 0o077))
  throw Error('Owner data permissions are too broad; require chmod 600');
}
function textFromFile(file,max){
 const path=resolve(file);secure(path);
 const value=readFileSync(path,'utf8');
 if(value.length>max+40)throw Error('Private input is too long');
 return value.trim();
}
function readStore(path){
 secure(path);
 const state=JSON.parse(readFileSync(path,'utf8'));
 validateState(state);return state;
}
function transaction(path,action){
 const lock=path+'.lock';
 let fd;
 try{fd=openSync(lock,'wx',0o600);}
 catch{throw Error('Owner file is locked. Do not run concurrent modifications.');}
 try{
  const current=readStore(path),next=applyCommand(current,action);
  const temp=path+'.tmp-'+randomUUID();
  try{
   writeFileSync(temp,JSON.stringify(next,null,2)+'\n',{flag:'wx',mode:0o600});
   renameSync(temp,path);
  }catch(error){
   try{if(existsSync(temp))unlinkSync(temp);}catch{}
   throw error;
  }
  return next;
 }finally{
  if(fd!==undefined)closeSync(fd);
  unlinkSync(lock);
 }
}
function counts(store){
 return {mode:store.mode,customerCount:Object.keys(store.customers).length,
  supportCaseCount:Object.keys(store.tickets).length,
  pendingPlanRequests:Object.values(store.customers).filter(c=>c.planRequest&&
   ['pending','reviewed','renewal-requested','cancellation-requested'].includes(c.planRequest.status)).length,
  draftNotices:Object.values(store.notices).filter(n=>n.status==='draft').length,
  paidEntitlements:entitlementFor(store,'not-a-real-customer'),
  warning:'Owner-local administrative records, not authenticated accounts, billing, sent support tickets or a published release.'};
}
export function execute(argv){
 if(argv.length<2)throw Error(HELP);
 const [file,verb,...args]=argv;const path=resolve(file);
 if(verb==='init'){
  if(args.length)throw Error('init has no extra arguments');
  writeFileSync(path,JSON.stringify(emptyState(),null,2)+'\n',{flag:'wx',mode:0o600});
  return {created:path,warning:'Private draft only; no accounts provisioned or payments processed'};
 }
 if(verb==='status'){
  if(args.length)throw Error('status has no extra arguments');
  return counts(readStore(path));
 }
 let cmd;
 switch(verb){
  case 'customer:add':cmd={type:verb,customerRef:args[0]};break;
  case 'subscription:request':cmd={type:verb,customerRef:args[0],planId:args[1]};break;
  case 'subscription:review':
  case 'subscription:renewal':
  case 'subscription:review-renewal':
  case 'subscription:cancel':
  case 'subscription:close':cmd={type:verb,customerRef:args[0]};break;
  case 'ticket:open':
   cmd={type:verb,customerRef:args[0],category:args[1],summary:textFromFile(args[2],500)};break;
  case 'ticket:status':cmd={type:verb,ticketId:args[0],status:args[1]};break;
  case 'notice:draft':
   cmd={type:verb,title:textFromFile(args[0],100),message:textFromFile(args[1],600)};break;
  case 'notice:approve':cmd={type:verb,noticeId:args[0],approvedBy:args[1]};break;
  case 'notice:retire':cmd={type:verb,noticeId:args[0]};break;
  default:throw Error(HELP);
 }
 const next=transaction(path,cmd);
 const latest=next.events.at(-1);
 return {accepted:true,event:latest,summary:counts(next)};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 try{console.log(JSON.stringify(execute(process.argv.slice(2)),null,2));}
 catch(error){console.error('Owner operation rejected: '+error.message);process.exitCode=1;}
}
