import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const workflow=readFileSync(new URL('../.github/workflows/self-hosted-accelerated-ci.yml',import.meta.url),'utf8');
const preflight=readFileSync(new URL('../tools/check-self-hosted-runner.sh',import.meta.url),'utf8');
const docs=readFileSync(new URL('../docs/SELF_HOSTED_ACCELERATED_CI.md',import.meta.url),'utf8');

test('self-hosted runner never runs untrusted PR/push jobs and requires exact approved main',()=>{
 assert.match(workflow,/^on:\s*\n\s+workflow_dispatch:/m);
 assert.doesNotMatch(workflow,/^\s{2}(pull_request|push|workflow_run|schedule):/m);
 assert.match(workflow,/github.event_name == 'workflow_dispatch'/);
 assert.match(workflow,/github.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/vars.NEWVIEW_SELF_HOSTED_ENABLED == 'true'/);
 assert.match(workflow,/inputs.approve_isolated_runner == true/);
 assert.match(workflow,/inputs.expected_main_sha == github.sha/);
 assert.match(workflow,/runs-on: \[self-hosted, linux, x64, newview-ci-isolated\]/);
 assert.match(workflow,/environment: newview-self-hosted-approval/);
 assert.match(workflow,/persist-credentials: false/);
 assert.match(workflow,/^permissions:\s*\n\s+contents: read/m);
});

test('self-hosted job can only build development test APKs, never publish or sign',()=>{
 assert.match(workflow,/npm run verify/);
 assert.match(workflow,/bash build-apk.sh/);
 assert.match(workflow,/gradle -p phone-caster :app:assembleDebug/);
 assert.match(workflow,/sha256sum/);
 assert.match(workflow,/actions\/upload-artifact@v4/);
 assert.doesNotMatch(workflow,/wrangler\s+(deploy|publish)/);
 assert.doesNotMatch(workflow,/apksigner\s+sign/);
 assert.doesNotMatch(workflow,/\bAWS_(ACCESS_KEY_ID|SECRET_ACCESS_KEY)\b/);
 assert.doesNotMatch(workflow,/secrets\./);
});

test('host preflight refuses stale SHA, PR events, root execution, missing SDK and production credentials',()=>{
 assert.match(preflight,/GITHUB_EVENT_NAME/);
 assert.match(preflight,/GITHUB_REF/);
 assert.match(preflight,/GITHUB_REPOSITORY/);
 assert.match(preflight,/git ls-remote --heads/);
 assert.match(preflight,/git rev-parse HEAD/);
 assert.match(preflight,/id -u/);
 assert.match(preflight,/ANDROID_HOME/);
 assert.match(preflight,/NEWVIEW_SIGNING_KEYSTORE_BASE64/);
 assert.match(preflight,/CLOUDFLARE_API_TOKEN/);
 assert.match(preflight,/AWS_ACCESS_KEY_ID/);
 execFileSync('bash',['-n',new URL('../tools/check-self-hosted-runner.sh',import.meta.url).pathname]);
});

test('public repository risk, environment reviewers and explicit disabled setup documented',()=>{
 assert.match(docs,/public.*repo|public-repository/i);
 assert.match(docs,/private repository/);
 assert.match(docs,/required reviewers/i);
 assert.match(docs,/NEWVIEW_SELF_HOSTED_ENABLED/);
 assert.match(docs,/ephemeral/);
 assert.match(docs,/has been registered or benchmarked/);
 assert.match(docs,/AWS EC2.*charges/);
});
