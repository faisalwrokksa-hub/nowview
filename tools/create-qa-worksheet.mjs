#!/usr/bin/env node
// Creates a local, non-sensitive acceptance worksheet; never marks a test PASS.
import {writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const ids=[...Array.from({length:12},(_,i)=>'TV-'+String(i+1).padStart(2,'0')),...Array.from({length:8},(_,i)=>'WEB-'+String(i+1).padStart(2,'0'))];
export function createWorksheet(){return {candidate:{sourceCommit:'',tvApkSha256:'',phoneApkSha256:'',tvSignerSha256:'',phoneSignerSha256:'',versionCode:null,previousVersionCode:null,versionName:'',distributionChannel:'',privacyPolicyUrl:'',supportUrl:'',approvalEvidenceUrl:'',approvedBy:'',approvedAt:''},records:ids.map(id=>({id,result:'NOT RUN',device:'',buildCommit:'',apkSha256:'',expected:'',observed:'',tester:'',date:'',evidence:''})),gates:{ci:false,mediaRights:false,securityReview:false,signing:false,upgradeTest:false,supportPolicy:false,ownerApproval:false}};}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 const output=process.argv[2]||'newview-qa-evidence.local.json';
 if(existsSync(output)){console.error('Refusing to overwrite existing evidence: '+output);process.exitCode=2;}
 else{try{writeFileSync(output,JSON.stringify(createWorksheet(),null,2)+'\n',{flag:'wx',mode:0o600});console.log('Created local NOT RUN worksheet: '+output);}catch(error){console.error('Cannot create worksheet: '+error.message);process.exitCode=2;}}
}
