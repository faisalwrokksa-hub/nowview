import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('NewView privileged auto-merge requires manual release owner, never workflow_run',()=>{
 for(const file of ['.github/workflows/auto-merge.yml','.github/workflows/safe-auto-merge.yml']){
  const src=read(file);
  assert.match(src,/^on:\s*\n\s+workflow_dispatch:/m);
  assert.doesNotMatch(src,/^\s+(?:schedule|workflow_run|push|pull_request):/m);
  assert.doesNotMatch(src,/(?:gh pr merge|git merge|\/reusable-auto-merge\.yml@)/);
  assert.doesNotMatch(src,/^\s+(?:contents|pull-requests|actions|checks|statuses): write/m);
  assert.match(src,/contents: read/);
  assert.match(src,/approval|review|release/);
 }
});

test('draft integration retains independent Cloudflare build and manual GitHub fallback',()=>{
 const deploy=read('.github/workflows/deploy-production.yml');
 const frontend=read('.github/workflows/frontend-auto-publish.yml');
 assert.match(deploy,/^on:\s*\n\s+workflow_dispatch:/m);
 assert.doesNotMatch(deploy,/^\s+(?:workflow_run|push|pull_request):/m);
 assert.match(frontend,/github\.event_name == 'workflow_dispatch' && inputs\.deploy == true/);
 assert.doesNotMatch(frontend,/github\.event_name == 'push' \|\|/);
});

test('manual release policy never marks physical acceptance or media rights as complete',()=>{
 const rights=JSON.parse(read('config/commercial-source-rights.json'));
 assert.ok(rights.entries.length>=7);
 assert.ok(rights.entries.every(entry=>entry.status==='unverified'));
 const matrix=read('docs/RELEASE_ACCEPTANCE_MATRIX.md');
 assert.match(matrix,/TV-12/);
 assert.match(matrix,/WEB-08/);
 assert.match(matrix,/NOT RUN/);
 assert.match(matrix,/Production-sign/);
});
