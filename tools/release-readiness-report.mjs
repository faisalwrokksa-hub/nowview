#!/usr/bin/env node
// Local-only release readiness report. This tool cannot authorize a public release.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluate} from './check-release-evidence.mjs';

export function report(records,checks={}){
 const evidence=evaluate(records);
 const gates=['ci','mediaRights','securityReview','signing','upgradeTest','supportPolicy','ownerApproval'];
 const status=Object.fromEntries(gates.map(key=>[key,checks?.[key]===true?'CONFIRMED':'UNVERIFIED']));
 const unverified=gates.filter(key=>status[key]!=='CONFIRMED');
 return {releaseReady:evidence.ready&&unverified.length===0,acceptance:evidence,otherGates:status,unverified,
  warning:'This report validates submitted records only; it cannot prove physical execution, licensing, signatures or approval.'};
}
export function markdown(data){
 const lines=['# NewView release readiness report','',data.releaseReady?'**All recorded gates confirmed — human release review still required.**':'**NO-GO: release gates remain unverified.**','',
 '## Hardware and browser acceptance','',
 '| Result | Count |','|---|---:|',...Object.entries(data.acceptance.summary).map(([key,value])=>`| ${key} | ${value} |`),'',
 '## Additional release gates','',
 '| Gate | Status |','|---|---|',...Object.entries(data.otherGates).map(([key,value])=>`| ${key} | ${value} |`),'',
 '## Outstanding','',...data.acceptance.missing.map(id=>'- '+id+' not passed'),...data.acceptance.problems.map(message=>'- Evidence error: '+message),...data.unverified.map(key=>'- Gate unverified: '+key),'',
 '> '+data.warning,''];
 return lines.join('\n');
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 const input=process.argv[2],output=process.argv[3];
 if(!input){console.error('Usage: node tools/release-readiness-report.mjs <records.json> [report.md]');process.exitCode=2;}
 else try{
  const data=JSON.parse(readFileSync(input,'utf8'));
  const result=report(data?.records,data?.gates);
  const rendered=markdown(result);
  if(output)writeFileSync(output,rendered,'utf8');else console.log(rendered);
  if(!result.releaseReady)process.exitCode=1;
 }catch(error){console.error('Invalid readiness input: '+error.message);process.exitCode=2;}
}
