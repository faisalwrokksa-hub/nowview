import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const p=readFileSync(new URL('../tools/secure-main.ps1',import.meta.url),'utf8');

test('admin helper defaults to dry-run and targets only the intended public NewView main',()=>{
 assert.match(p,/param\(\[switch\]\$Apply\)/);
 assert.match(p,/\$repo = 'faisalwrokksa-hub\/nowview'/);
 assert.match(p,/default_branch -ne 'main'/);
 assert.match(p,/if \(-not \$Apply\)/);
 assert.match(p,/DRY RUN/);
 assert.match(p,/NewView protected main release/);
 assert.match(p,/Duplicate named rulesets found/);
 assert.match(p,/ref_name = @\{ include = @\('refs\/heads\/main'\)/);
});

test('owner helper disables old automerge and verifies actions status before protection',()=>{
 assert.match(p,/auto-merge\.yml', 'safe-auto-merge\.yml/);
 assert.match(p,/gh api -X PUT/);
 assert.match(p,/actions\/workflows\/\$filename\/disable/);
 assert.match(p,/disabled_manually/);
 assert.match(p,/gh api -X POST/);
 assert.match(p,/repos\/\$repo\/rulesets/);
 assert.match(p,/\.enforcement -eq 'active'/);
 assert.doesNotMatch(p,/git push|gh pr merge|wrangler deploy|apksigner sign/);
});

test('owner helper requires a review and an always-on CI context, not path-filtered jobs',()=>{
 assert.match(p,/required_approving_review_count = 1/);
 assert.match(p,/require_last_push_approval = \$true/);
 assert.match(p,/required_review_thread_resolution = \$true/);
 assert.match(p,/dismiss_stale_reviews_on_push = \$true/);
 assert.match(p,/strict_required_status_checks_policy = \$true/);
 assert.match(p,/context = 'verify'/);
 assert.doesNotMatch(p,/context = 'import-safety'|context = 'dry-run'/);
 assert.match(p,/type = 'non_fast_forward'/);
 assert.match(p,/type = 'deletion'/);
});
