#!/usr/bin/env node
// Local-only release readiness report. This tool cannot authorize a public release.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluate} from './check-release-evidence.mjs';
import {assessRights,currentRights} from './check-commercial-rights.mjs';
import {assessCandidate} from './check-release-candidate.mjs';

export function report(records,checks={},rights=currentRights(),candidate=null){
 const evidence=evaluate(records);
 const sourceRights=assessRights(rights);
 const releaseCandidate=assessCandidate(candidate,records);
 const gates=['ci','mediaRights','securityReview','signing','upgradeTest','supportPolicy','ownerApproval'];
 const status=Object.fromEntries(gates.map(key=>[key,checks?.[key]===true?'CONFIRMED':'UNVERIFIED']));
 const unverified=gates.filter(key=>status[key]!=='CONFIRMED');
 return {releaseReady:evidence.ready&&unverified.length===0&&sourceRights.ready&&releaseCandidate.ready,acceptance:evidence,sourceRights,releaseCandidate,otherGates:status,unverified,
  warning:'This report validates submitted records only; it cannot prove physical execution, licensing, signatures or approval.'};
}
export function markdown(data){
 const lines=['# NewView release readiness report','',data.releaseReady?'**All recorded gates confirmed — human release review still required.**':'**NO-GO: release gates remain unverified.**','',
 '## Hardware and browser acceptance','',
 '| Result | Count |','|---|---:|',...Object.entries(data.acceptance.summary).map(([key,value])=>`| ${key} | ${value} |`),'',
 '## Additional release gates','',
 '| Gate | Status |','|---|---|',...Object.entries(data.otherGates).map(([key,value])=>`| ${key} | ${value} |`),'',
 '## Signed release candidate and evidence consistency','',data.releaseCandidate.ready?'Candidate identity and recorded acceptance checks are structurally consistent (not cryptographically verified).':'**NO-GO: signed release candidate identity or owner proof is missing.**',...data.releaseCandidate.problems.map(message=>'- Candidate gate: '+message),'',
 '## Source and media rights','',data.sourceRights.ready?'**Documented source rights reviewed:** registry entries show clearance evidence; human legal review still required.':'**NO-GO: commercial source usage rights are not yet documented.**',...data.sourceRights.pending.map(id=>'- Source-rights review pending: '+id),...data.sourceRights.problems.map(message=>'- Source-rights error: '+message),'','## Outstanding','',...data.acceptance.missing.map(id=>'- '+id+' not passed'),...data.acceptance.problems.map(message=>'- Evidence error: '+message),...data.unverified.map(key=>'- Gate unverified: '+key),'',
 '> '+data.warning,''];
 return lines.join('\n');
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 const input=process.argv[2],output=process.argv[3];
 if(!input){console.error('Usage: node tools/release-readiness-report.mjs <records.json> [report.md]');process.exitCode=2;}
 else try{
  const data=JSON.parse(readFileSync(input,'utf8'));
  const result=report(data?.records,data?.gates,currentRights(),data?.candidate);
  const rendered=markdown(result);
  if(output)writeFileSync(output,rendered,'utf8');else console.log(rendered);
  if(!result.releaseReady)process.exitCode=1;
 }catch(error){console.error('Invalid readiness input: '+error.message);process.exitCode=2;}
}
