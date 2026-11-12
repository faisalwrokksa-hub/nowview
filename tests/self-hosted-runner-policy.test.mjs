import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const workflow=readFileSync(new URL('../.github/workflows/self-hosted-accelerated-ci.yml',import.meta.url),'utf8');
const preflight=readFileSync(new URL('../tools/check-self-hosted-runner.sh',import.meta.url),'utf8');
const docs=readFileSync(new URL('../docs/SELF_HOSTED_ACCELERATED_CI.md',import.meta.url),'utf8');
const checks=readFileSync(new URL('../tools/run-accelerated-checks.sh',import.meta.url),'utf8');
const start=readFileSync(new URL('../tools/start-newview-ephemeral-runner.sh',import.meta.url),'utf8');

test('self-hosted runner never runs untrusted PR/push jobs and requires exact approved main',()=>{
 assert.match(workflow,/^on:\s*\n\s+workflow_dispatch:/m);
 assert.doesNotMatch(workflow,/^\s{2}(pull_request|push|workflow_run|schedule):/m);
 assert.match(workflow,/github.event_name == 'workflow_dispatch'/);
 assert.match(workflow,/github.actor == github.repository_owner/);
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
 assert.match(workflow,/bash tools\/run-accelerated-checks.sh/);
 assert.match(checks,/npm run verify/);
 assert.match(checks,/bash build-apk.sh/);
 assert.match(checks,/gradle -p phone-caster :app:assembleDebug/);
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
 for(const name of ['check-self-hosted-runner.sh','run-accelerated-checks.sh','start-newview-ephemeral-runner.sh']){
  const path=fileURLToPath(new URL('../tools/'+name,import.meta.url));
  if(process.env.NEWVIEW_SHELL_PARSER){
   execFileSync(process.env.NEWVIEW_SHELL_PARSER,['-ln','bash','-tojson'],{input:readFileSync(path)});
  }else{execFileSync('bash',['-n',path]);}
 }
});

test('preinstalled image and ephemeral lifecycle fail closed before builds',()=>{
 for(const required of ['Node.js 22','JDK 17','Gradle 8.9','platforms/android-35/android.jar','20 GiB','ephemeral','network_policy_reviewed'])
  assert.ok(preflight.includes(required),required);
 assert.match(start,/--unattended --ephemeral/);
 assert.match(start,/read -r -s/);
 assert.match(start,/unset ACTIONS_RUNNER_INPUT_TOKEN/);
 assert.match(start,/trap cleanup EXIT/);
 assert.doesNotMatch(start,/--replace|sudo|curl.*\|.*(?:sh|bash)/);
 assert.match(workflow,/if: always\(\)/);
 assert.match(workflow,/cache-cleanup: on-success/);
 assert.doesNotMatch(workflow,/actions\/setup-node|actions\/setup-java|android-actions\/setup-android/);
});

test('parallel checks preserve failures, process cleanup, versions and actual timing',()=>{
 assert.match(checks,/setsid bash/);
 assert.match(checks,/wait "\$pid" \|\| result=1/);
 assert.match(checks,/kill -- "-\$pid"/);
 assert.match(checks,/trap finish EXIT/);
 assert.match(checks,/--build-cache/);
 assert.doesNotMatch(checks,/--offline.*\|\|/);
 for(const identity of ['app.newview.phonecaster',"versionCode='1'","versionName='0.1.0-preview'"])
  assert.ok(checks.includes(identity));
 assert.match(checks,/date \+%s/);
 assert.match(checks,/logs\/\$name.log/);
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
