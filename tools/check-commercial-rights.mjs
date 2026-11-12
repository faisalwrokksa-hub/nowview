#!/usr/bin/env node
// Release policy check; a public URL or successful stream is never a rights grant.
// No external requests, payments or changes to publisher data.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const REQUIRED_IDS=Object.freeze([
 'binance-spot-display','official-news-feeds','iptv-directory',
 'third-party-live-streams','youtube-player','social-discovery-links','pipetv-companion'
]);
export function currentRights(){
 return JSON.parse(readFileSync(new URL('../config/commercial-source-rights.json',import.meta.url),'utf8'));
}
export function assessRights(registry){
 const problems=[],missing=[],seen=new Set(),pending=[];
 if(!registry||registry.schemaVersion!==1||!Array.isArray(registry.entries))
  return {ready:false,pending:[...REQUIRED_IDS],problems:['Rights registry must contain schemaVersion 1 and entries']};
 for(const entry of registry.entries){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)){problems.push('Malformed rights entry');continue;}
  if(typeof entry.id!=='string'||!REQUIRED_IDS.includes(entry.id)){problems.push('Unknown source-rights ID '+String(entry.id));continue;}
  if(seen.has(entry.id)){problems.push('Duplicate source-rights ID '+entry.id);continue;}
  seen.add(entry.id);
  if(!['unverified','restricted','cleared'].includes(entry.status))problems.push(entry.id+': invalid rights status');
  if(entry.status!=='cleared'){pending.push(entry.id);continue;}
  if(typeof entry.reviewer!=='string'||!entry.reviewer.trim())problems.push(entry.id+': clearance requires identified human reviewer');
  const date=entry.reviewDate;
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||
   Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)
    problems.push(entry.id+': clearance requires actual ISO review date');
  try{
   const url=new URL(entry.evidenceUrl);
   if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname.includes('.'))
    throw Error('unsafe proof URL');
  }catch{problems.push(entry.id+': clearance requires a safe HTTPS evidence link');}
 }
 for(const id of REQUIRED_IDS)if(!seen.has(id)){missing.push(id);pending.push(id);}
 return {ready:!problems.length&&!pending.length,problems,missing,pending};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 try{
  const registry=process.argv[2]?JSON.parse(readFileSync(process.argv[2],'utf8')):currentRights();
  const result=assessRights(registry);
  console.log(JSON.stringify(result,null,2));
  if(!result.ready)process.exitCode=1;
 }catch(error){console.error('Cannot validate source-rights registry: '+error.message);process.exitCode=2;}
}
