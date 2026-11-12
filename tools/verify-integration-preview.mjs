#!/usr/bin/env node
// Read-only check: the Cloudflare integration preview must serve this exact PR SHA.
// This does not deploy, mutate remote resources, or certify media/browser hardware.
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const PREVIEW_URL='https://integration-ux-media-business-20261112-nowview.faisalwrokksa.workers.dev/';
export function validateTarget(value,sha){
 if(typeof value!=='string'||typeof sha!=='string'||!/^[a-f0-9]{40}$/i.test(sha))throw Error('A full expected Git commit SHA is required');
 const url=new URL(value);
 if(url.href!==PREVIEW_URL||url.protocol!=='https:'||url.port||url.username||url.password||url.search||url.hash)throw Error('Refusing to test an unexpected preview URL');
 return url;
}
export async function checkRevision({url=PREVIEW_URL,sha,fetchImpl=fetch}){
 const target=validateTarget(url,sha);
 const response=await fetchImpl(new URL('/version',target),{redirect:'manual',signal:AbortSignal.timeout(10000)});
 if(response.status!==200)throw Error('/version HTTP '+response.status);
 if(!/application\/json/i.test(response.headers.get('content-type')||''))throw Error('/version must return JSON');
 const revision=await response.json();
 if(revision?.app!=='newview'||revision.revision!==sha)throw Error('Preview revision mismatch: expected '+sha+'; got '+String(revision?.revision||'unavailable'));
 return revision.revision;
}
export async function waitForPreview({url=PREVIEW_URL,sha,fetchImpl=fetch,attempts=20,intervalMs=15000,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 validateTarget(url,sha);
 let last=null;
 for(let attempt=1;attempt<=attempts;attempt++){
  try{await checkRevision({url,sha,fetchImpl});return {revision:sha,attempts:attempt};}
  catch(error){
   last=error;
   if(attempt<attempts){
    console.log('Preview not yet at expected revision (attempt '+attempt+'/'+attempts+'): '+error.message);
    await sleep(intervalMs);
   }
  }
 }
 throw new Error('Preview did not serve expected SHA after '+attempts+' attempts: '+String(last?.message||'unknown error'));
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 const sha=process.env.NEWVIEW_EXPECTED_SHA||'';
 const url=process.env.NEWVIEW_URL||PREVIEW_URL;
 try{
  const status=await waitForPreview({sha,url});
  console.log('PASS Cloudflare preview serves exact commit '+status.revision+' after '+status.attempts+' check(s).');
 }catch(error){console.error('FAIL '+error.message);process.exitCode=1;}
}
