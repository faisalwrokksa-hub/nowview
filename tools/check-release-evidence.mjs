#!/usr/bin/env node
// Offline release evidence gate. Never signs, deploys, uploads or contacts a service.
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ids=[...Array.from({length:12},(_,i)=>'TV-'+String(i+1).padStart(2,'0')),...Array.from({length:8},(_,i)=>'WEB-'+String(i+1).padStart(2,'0'))];
const allowed=new Set(['PASS','FAIL','BLOCKED','NOT RUN']);
const required=['device','buildCommit','expected','observed','tester','date','evidence'];
export function validate(record){
 const errors=[];
 if(!record||typeof record!=='object'||Array.isArray(record))return ['Evidence must be an object'];
 if(!ids.includes(record.id))errors.push('Unknown test ID');
 if(!allowed.has(record.result))errors.push('Invalid result');
 if(record.result==='PASS'){
  for(const field of required)if(typeof record[field]!=='string'||!record[field].trim())errors.push('PASS missing '+field);
  if(!/^[a-f0-9]{40}$/i.test(record.buildCommit||''))errors.push('PASS requires full commit SHA');
  const d=record.date||'';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)errors.push('Invalid date');
  if(record.id?.startsWith('TV-')&&!/^[a-f0-9]{64}$/i.test(record.apkSha256||''))errors.push('TV PASS requires APK SHA-256');
 }
 return errors;
}
export function evaluate(records){
 const problems=[],byId=new Map();
 if(!Array.isArray(records))return {ready:false,problems:['Expected an array of evidence records'],summary:{}};
 for(const record of records){
  const errors=validate(record);if(errors.length)problems.push((record?.id||'unknown')+': '+errors.join('; '));
  if(record&&ids.includes(record.id)){if(byId.has(record.id))problems.push('Duplicate '+record.id);byId.set(record.id,record);}
 }
 const summary={PASS:0,FAIL:0,BLOCKED:0,'NOT RUN':0};
 for(const id of ids){const status=byId.get(id)?.result||'NOT RUN';if(allowed.has(status))summary[status]++;}
 const missing=ids.filter(id=>byId.get(id)?.result!=='PASS');
 return {ready:problems.length===0&&missing.length===0,problems,missing,summary};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 const path=process.argv[2];
 if(!path||!existsSync(path)){console.error('Usage: node tools/check-release-evidence.mjs <evidence.json>');process.exitCode=2;}
 else{
  try{const report=evaluate(JSON.parse(readFileSync(path,'utf8')));console.log(JSON.stringify(report,null,2));if(!report.ready)process.exitCode=1;}
  catch(error){console.error('Invalid evidence JSON: '+error.message);process.exitCode=2;}
 }
}
