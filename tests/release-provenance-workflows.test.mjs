import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('main merges generate their own test APK bundle with exact source SHA',()=>{
 const workflow=read('.github/workflows/complete-apk-bundle.yml');
 assert.match(workflow,/^  push:\n    branches: \[main\]/m);
 assert.match(workflow,/^  pull_request:/m);
 assert.match(workflow,/github\.event\.pull_request\.head\.sha \|\| github\.sha/g);
 assert.match(workflow,/ACTUAL_SOURCE_SHA="\$\(git rev-parse HEAD\)"/);
 assert.match(workflow,/sha256sum -c SHA256SUMS\.txt/);
 assert.match(workflow,/development signing identities and are NOT app-store production releases/);
});

test('only Cloudflare Builds publishes automatically; main gets independent read-only verification',()=>{
 const verifier=read('.github/workflows/verify-live-worker.yml');
 const deployment=read('.github/workflows/deploy-production.yml');
 const build=read('cloud/build.mjs');
 assert.match(verifier,/^  push:\n    branches: \[main\]/m);
 assert.match(verifier,/Verify public routes after exact revision matches/);
 assert.match(verifier,/NEWVIEW_EXPECTED_SHA: \$\{\{ github\.sha \}\}/);
 assert.match(verifier,/tools\/smoke-public-newview\.mjs/);
 assert.doesNotMatch(verifier,/wrangler deploy|CLOUDFLARE_API_TOKEN|write-all|contents: write/);
 assert.match(deployment,/workflow_dispatch/);
 assert.doesNotMatch(deployment,/^\s+push:/m);
 assert.match(build,/WORKERS_CI_COMMIT_SHA\|\|process\.env\.GITHUB_SHA/);
});
