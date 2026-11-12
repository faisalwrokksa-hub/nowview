import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const signed=readFileSync(new URL('../.github/workflows/signed-android-release.yml',import.meta.url),'utf8');
const candidate=readFileSync(new URL('../tools/check-release-candidate.mjs',import.meta.url),'utf8');
const readiness=readFileSync(new URL('../tools/release-readiness-report.mjs',import.meta.url),'utf8');

test('signed APK generation is disabled unless exact main SHA, owner toggle and explicit authorization match',()=>{
 assert.match(signed,/^\s+workflow_dispatch:/m);
 assert.doesNotMatch(signed,/^\s+(?:pull_request|push|workflow_run|schedule):/m);
 assert.match(signed,/github\.ref == 'refs\/heads\/main'/);
 assert.match(signed,/vars\.NEWVIEW_SIGNED_RELEASE_ENABLED == 'true'/);
 assert.match(signed,/inputs\.approve_release_signing == true/);
 assert.match(signed,/inputs\.expected_main_sha == github\.sha/);
 assert.match(signed,/environment: newview-android-release/);
 assert.match(signed,/persist-credentials: false/);
 assert.match(signed,/concurrency:\s*\n\s+group: newview-manual-signed-candidate[\s\S]*cancel-in-progress: false/);
});

test('signed artifact has verifiable provenance but release workflow never publishes or merges',()=>{
 assert.match(signed,/attestations: write/);
 assert.match(signed,/id-token: write/);
 assert.match(signed,/uses: actions\/attest@v4/);
 assert.match(signed,/subject-path: 'signed\/\*\.apk'/);
 assert.match(signed,/sha256sum signed\/\*\.apk > signed\/SHA256SUMS\.txt/);
 assert.match(signed,/apksigner/);
 assert.match(signed,/RELEASE-CANDIDATE\.txt/);
 assert.doesNotMatch(signed,/gh pr merge|wrangler deploy|git push|curl .*production/);
});

test('release report fails closed on missing candidate and binds same evidence to owner-approved hashes',()=>{
 assert.match(readiness,/assessCandidate\(candidate,records\)/);
 assert.match(readiness,/sourceRights\.ready&&releaseCandidate\.ready/);
 assert.match(readiness,/data\?\.candidate/);
 assert.match(candidate,/record\.buildCommit!==candidate\.sourceCommit/);
 assert.match(candidate,/record\.apkSha256\?\.toLowerCase\(\)!==candidate\.tvApkSha256\?\.toLowerCase\(\)/);
 assert.match(candidate,/signer/i);
});
