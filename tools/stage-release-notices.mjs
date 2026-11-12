#!/usr/bin/env node
/*
 * Stage curated release notices from the PRIVATE owner operations file.
 * Produces a LOCAL preview JSON for review. Never updates web/ in place,
 * sends mail, calls GitHub, or asserts that a customer release occurred.
 */
import {readFileSync,writeFileSync,lstatSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateState} from './commercial-lifecycle.mjs';

export function stageNotices(state,publicationDate){
 validateState(state);
 if(typeof publicationDate!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(publicationDate)||
    !Number.isFinite(Date.parse(publicationDate))||
    new Date(publicationDate).toISOString().slice(0,10)!==publicationDate||
    publicationDate>new Date().toISOString().slice(0,10))
  throw Error('Use an actual, non-future ISO review date');
 const approved=Object.values(state.notices).filter(n=>n.status==='approved');
 if(approved.length>10)throw Error('Review at most ten notices per release');
 return {schemaVersion:1,publicationStatus:'owner-reviewed-preview',
  notices:approved.map(n=>({id:n.id,title:n.title,message:n.message,status:'published',
    publishedOn:publicationDate})),
  message:'Staged for final code review; this file has NOT been distributed to customers.'
 };
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 const [storePath,output,publicationDate]=process.argv.slice(2);
 if(!storePath||!output||!publicationDate){
  console.error('Usage: node tools/stage-release-notices.mjs <owner-ops.private.json> <newview-notices.preview.json> <review-date>');
  process.exitCode=2;
 }else try{
  if(existsSync(output))throw Error('Output already exists; refusing to overwrite an owner-reviewed notice packet');
  const stat=lstatSync(storePath);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576||
   process.platform!=='win32'&&(stat.mode&0o077))
   throw Error('Private owner operations file must be a small regular 0600 file');
  const data=JSON.parse(readFileSync(storePath,'utf8'));
  const result=stageNotices(data,publicationDate);
  writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Created unshipped release notice preview:',output);
 }catch(error){console.error('Notice staging failed:',error.message);process.exitCode=1;}
}
