#!/usr/bin/env node
// Release-candidate metadata guard. Validates documented identity and evidence
// consistency; does not verify cryptographic signatures or approve distribution.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const HEX40=/^[0-9a-f]{40}$/i,HEX64=/^[0-9a-f]{64}$/i;
const FIELDS=['sourceCommit','tvApkSha256','phoneApkSha256','tvSignerSha256','phoneSignerSha256'];
const HTTPS=['privacyPolicyUrl','supportUrl','approvalEvidenceUrl'];
const channels=new Set(['play-store','enterprise-managed','direct-sideload']);

function safeHttps(value){
 try{
  if(typeof value!=='string')return false;
  const url=new URL(value);
  return url.protocol==='https:'&&url.hostname.includes('.')&&
   !url.username&&!url.password&&!url.port&&!url.hash&&url.href===value;
 }catch{return false;}
}
function validDate(value){
 if(typeof value!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value);
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value&&
   value<=new Date().toISOString().slice(0,10);
}
export function assessCandidate(candidate,records){
 const problems=[];
 if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))
  return {ready:false,problems:['No signed release candidate identity provided']};
 for(const field of FIELDS){
  if(!(field==='sourceCommit'?HEX40:HEX64).test(candidate[field]||''))
   problems.push(field+' must be a full hexadecimal '+(field==='sourceCommit'?'commit SHA':'SHA-256 digest'));
 }
 if(!channels.has(candidate.distributionChannel))
  problems.push('Distribution channel must be play-store, enterprise-managed or direct-sideload');
 if(!Number.isSafeInteger(candidate.versionCode)||candidate.versionCode<1)
  problems.push('Candidate versionCode must be a positive integer');
 if(!Number.isSafeInteger(candidate.previousVersionCode)||candidate.previousVersionCode<0||
     Number.isSafeInteger(candidate.versionCode)&&candidate.previousVersionCode>=candidate.versionCode)
  problems.push('Previous versionCode must be a nonnegative integer less than candidate versionCode (0 for first release)');
 if(typeof candidate.versionName!=='string'||candidate.versionName.length>64||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(candidate.versionName||''))
  problems.push('Candidate versionName is missing or invalid');
 for(const field of HTTPS)if(!safeHttps(candidate[field]))
  problems.push(field+' requires an approved public HTTPS URL (no credentials or fragments)');
 if(typeof candidate.approvedBy!=='string'||candidate.approvedBy.trim().length<3)
  problems.push('Human owner/release approver must be named');
 if(!validDate(candidate.approvedAt))problems.push('Owner approval requires a valid, non-future ISO date');
 if(!Array.isArray(records))problems.push('Release acceptance records are missing');
 else for(const record of records){
  if(record?.result!=='PASS')continue;
  if(record.buildCommit!==candidate.sourceCommit)
   problems.push(record.id+': test evidence belongs to a different source commit');
  if(typeof record.id==='string'&&record.id.startsWith('TV-')&&
      record.apkSha256?.toLowerCase()!==candidate.tvApkSha256?.toLowerCase())
   problems.push(record.id+': physical TV acceptance APK digest does not match candidate');
 }
 return {ready:problems.length===0,problems};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 if(!process.argv[2]){console.error('Usage: node tools/check-release-candidate.mjs <local-release-worksheet.json>');process.exitCode=2;}
 else try{
  const data=JSON.parse(readFileSync(process.argv[2],'utf8'));
  const result=assessCandidate(data?.candidate,data?.records);
  console.log(JSON.stringify(result,null,2));
  if(!result.ready)process.exitCode=1;
 }catch(error){console.error('Invalid release packet: '+error.message);process.exitCode=2;}
}
