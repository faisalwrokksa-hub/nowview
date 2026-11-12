#!/usr/bin/env node
// Generates a private, unapproved local rights-review worksheet. No licensing
// fields are automatically marked cleared and no files are overwritten.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {REQUIRED_IDS} from './check-commercial-rights.mjs';

export function createRightsWorksheet(){
 const registry=JSON.parse(readFileSync(new URL('../config/commercial-source-rights.json',import.meta.url),'utf8'));
 const byId=new Map(registry.entries.map(row=>[row.id,row]));
 return {schemaVersion:1,
  scope:'PRIVATE owner/legal review; do not commit signed agreements or user records to public GitHub',
  entries:REQUIRED_IDS.map(id=>({
   id,
   usage:byId.get(id)?.usage||id,
   status:'unverified',
   reviewer:null,reviewDate:null,evidenceUrl:null,
   requiredReview:byId.get(id)?.requiredReview||'Confirm current provider terms and written authorization'
  }))
 };
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 const output=process.argv[2]||'newview-rights.private.json';
 if(existsSync(output)){console.error('Refusing to overwrite private review evidence: '+output);process.exitCode=2;}
 else try{
  writeFileSync(output,JSON.stringify(createRightsWorksheet(),null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Created PRIVATE UNVERIFIED source-rights review file: '+output);
  console.log('Every source requires a human reviewer, date and evidence before clearance.');
 }catch(error){console.error('Could not create private rights worksheet: '+error.message);process.exitCode=2;}
}
