#!/usr/bin/env node
/*
 * Local owner-only release bundle assembler. PREVIEW is read-only.
 * --create writes a directory of owner-supplied signed APKs only when all
 * recorded gates are structurally complete. Never signs, merges, uploads,
 * publishes, charges, or asserts that legal approvals are genuine.
 */
import {readFileSync,lstatSync,existsSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {report} from './release-readiness-report.mjs';

const HELP='Usage: node tools/assemble-release-bundle.mjs <worksheet.local.json> <rights.private.json> <tv-signed.apk> <phone-signed.apk> <output-directory> [--create]';
function sha256(path){
 const info=lstatSync(path);
 if(!info.isFile()||info.size<1024||!path.endsWith('.apk'))
  throw Error('Expected a nonempty regular signed APK, not a link or directory: '+path);
 return createHash('sha256').update(readFileSync(path)).digest('hex');
}
export function inspectBundle({worksheet,rights,tv,phone}){
 const gate=report(worksheet?.records,worksheet?.gates,rights,worksheet?.candidate);
 const problems=[...gate.acceptance.problems,...gate.acceptance.missing.map(x=>x+' not passed'),
  ...gate.sourceRights.problems,...gate.sourceRights.pending.map(x=>x+' rights unverified'),
  ...gate.releaseCandidate.problems,...gate.unverified.map(x=>x+' gate not confirmed')];
 if(!gate.releaseReady)return {ready:false,problems:[...new Set(problems)]};
 if(worksheet.candidate.distributionChannel==='play-store')
  return {ready:false,problems:['Play Store distribution needs an approved Android App Bundle/AAB pathway. APK files alone are insufficient.']};
 let tvDigest,phoneDigest;
 try{tvDigest=sha256(tv);phoneDigest=sha256(phone);}
 catch(error){return {ready:false,problems:[error.message]};}
 if(tvDigest.toLowerCase()!==worksheet.candidate.tvApkSha256.toLowerCase())
  problems.push('TV APK bytes do not match approved candidate SHA-256');
 if(phoneDigest.toLowerCase()!==worksheet.candidate.phoneApkSha256.toLowerCase())
  problems.push('Phone APK bytes do not match approved candidate SHA-256');
 return {ready:problems.length===0,problems,info:{
  commit:worksheet.candidate.sourceCommit,
  version:worksheet.candidate.versionName,
  versionCode:worksheet.candidate.versionCode,
  distributionChannel:worksheet.candidate.distributionChannel,
  tvSha256:tvDigest,phoneSha256:phoneDigest,
  privacyPolicyUrl:worksheet.candidate.privacyPolicyUrl,
  supportUrl:worksheet.candidate.supportUrl
 }};
}
export function assembleBundle({worksheet,rights,tv,phone,out,create=false}){
 const inspected=inspectBundle({worksheet,rights,tv,phone});
 if(!inspected.ready)return inspected;
 const destination=resolve(out);
 if(existsSync(destination))return {ready:false,problems:['Destination already exists; refuse to overwrite: '+destination]};
 if(!create)return {...inspected,previewOnly:true};
 mkdirSync(destination,{recursive:false,mode:0o700});
 try{
  const tvName='NewView-TV-signed.apk',phoneName='NewView-Phone-Caster-signed.apk';
  copyFileSync(tv,join(destination,tvName));copyFileSync(phone,join(destination,phoneName));
  // Rehash the final copied files, not only the source: never publish
  // a checksum describing bytes different from the artifact.
  if(sha256(join(destination,tvName))!==inspected.info.tvSha256||
     sha256(join(destination,phoneName))!==inspected.info.phoneSha256)
   throw Error('Copied artifact digest does not match');
  const checksums=[inspected.info.tvSha256+'  '+tvName,inspected.info.phoneSha256+'  '+phoneName,''].join('\n');
  writeFileSync(join(destination,'SHA256SUMS.txt'),checksums,{flag:'wx',mode:0o600});
  const note=[
   'NewView — owner-controlled release candidate',
   'Source commit: '+inspected.info.commit,
   'Version: '+inspected.info.version+' ('+inspected.info.versionCode+')',
   'Distribution: '+inspected.info.distributionChannel,
   'Privacy policy: '+inspected.info.privacyPolicyUrl,
   'Customer support: '+inspected.info.supportUrl,
   '',
   'Dashboard software only. Third-party media, news and market information remain subject to their owners rights and territories.',
   'This bundle was assembled from submitted approval records. This tool does not independently prove those approvals, verify signing lineage, or authorize public release.',
   'The owner must verify the exact signed APK certificate, supported devices, installation/upgrade continuity and commercial permissions before distribution.',
   ''
  ].join('\n');
  writeFileSync(join(destination,'RELEASE-NOTES.txt'),note,{flag:'wx',mode:0o600});
 }catch(error){
  rmSync(destination,{recursive:true,force:true});
  throw error;
 }
 return {...inspected,previewOnly:false,output:destination};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 const args=process.argv.slice(2);
 if(args.length<5||args.length>6||(args[5]&&args[5]!=='--create')){
  console.error(HELP);process.exitCode=2;
 }else try{
  const [worksheetPath,rightsPath,tv,phone,out]=args;
  const result=assembleBundle({
   worksheet:JSON.parse(readFileSync(worksheetPath,'utf8')),
   rights:JSON.parse(readFileSync(rightsPath,'utf8')),
   tv,phone,out,create:args[5]==='--create'
  });
  console.log(JSON.stringify(result,null,2));
  if(!result.ready)process.exitCode=1;
 }catch(error){console.error('Bundle not created: '+error.message);process.exitCode=2;}
}
