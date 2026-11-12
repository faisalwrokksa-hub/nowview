import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../.github/workflows/'+p+'.yml',import.meta.url),'utf8');

test('dashboard validation does not duplicate the two-APK build',()=>{
 const dashboard=read('dashboard');
 const apks=read('complete-apk-bundle');
 assert.match(dashboard,/node --test tests\/\*\.test\.mjs/);
 assert.match(dashboard,/node cloud\/build\.mjs/);
 assert.doesNotMatch(dashboard,/setup-android@|setup-java@|bash build-apk\.sh/);
 assert.match(apks,/bash build-apk\.sh/);
 assert.match(apks,/bash scripts\/verify-preview-apk\.sh/);
 assert.match(apks,/gradle -p phone-caster :app:assembleDebug/);
 assert.match(apks,/SHA256SUMS\.txt/);
});

test('feature branches run PR checks once and superseded checks cancel only on PRs',()=>{
 for(const name of ['dashboard','frontend-auto-publish']){
  const text=read(name);
  assert.match(text,/on:\s*\n\s+push:\s*\n\s+branches: \[main\]/);
  assert.match(text,/^\s+pull_request:/m);
  assert.match(text,/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
 }
 const phone=read('phone-caster');
 assert.match(phone,/on:\s*\n\s+push:\s*\n\s+branches: \[main\]/);
 assert.doesNotMatch(phone,/^\s+pull_request:/m,'Phone Caster PR must be built by the complete two-APK workflow only');
 assert.match(read('complete-apk-bundle'),/\s+pull_request:/);
 assert.match(read('complete-apk-bundle'),/gradle -p phone-caster :app:assembleDebug/);
 for(const name of ['ci','complete-apk-bundle']){
  const text=read(name);
  assert.match(text,/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
 }
});

test('GitHub frontend publishing is manual-only and Cloudflare native builds remain primary',()=>{
 const frontend=read('frontend-auto-publish');
 const primary=read('deploy-production');
 assert.match(frontend,/github\.event_name == 'workflow_dispatch' && inputs\.deploy == true/);
 assert.doesNotMatch(frontend,/github\.event_name == 'push' \|\|/);
 assert.match(frontend,/vars\.FRONTEND_DEPLOY_VIA_GITHUB == 'true'/);
 assert.match(frontend,/github\.ref == 'refs\/heads\/main'/);
 assert.match(primary,/workflow_dispatch:/);
 assert.doesNotMatch(primary,/^\s+workflow_run:/m);
});

test('self-hosted runner cannot accept public PRs and remains explicitly opt-in',()=>{
 const runner=read('self-hosted-accelerated-ci');
 assert.match(runner,/^\s+workflow_dispatch:/m);
 assert.doesNotMatch(runner,/^\s+(?:pull_request|push|workflow_run):/m);
 assert.match(runner,/vars\.NEWVIEW_SELF_HOSTED_ENABLED == 'true'/);
 assert.match(runner,/inputs\.expected_main_sha == github\.sha/);
 assert.match(runner,/environment: newview-self-hosted-approval/);
 assert.doesNotMatch(runner,/CLOUDFLARE_API_TOKEN/);
 assert.doesNotMatch(runner,/AWS_SECRET_ACCESS_KEY/);
});
