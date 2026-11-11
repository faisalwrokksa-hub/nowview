#!/usr/bin/env bash
# One-time, restricted NewView branch cleanup. NEVER deletes an unmerged or moved branch.
set -euo pipefail
: "${GITHUB_REPOSITORY:?}"
: "${GITHUB_SHA:?}"
if [[ "${GITHUB_REF:-}" != 'refs/heads/main' ]]; then echo 'Cleanup only runs on main';exit 1;fi
git fetch --no-tags origin main --quiet
if [[ "$(git rev-parse origin/main)" != "$GITHUB_SHA" ]]; then
 echo 'Main moved after workflow dispatch; refuse stale cleanup';exit 1
fi
# Explicitly allowlisted historical branch tips. Never wildcard-delete unrelated branches.
while read -r branch expected; do
 [[ -n "$branch" ]] || continue
 [[ "$branch" != 'main' ]] || exit 1
 if ! [[ "$branch" =~ ^[a-zA-Z0-9/_-]+$ ]];then echo "Unexpected branch name: $branch";exit 1;fi
 if ! git fetch --no-tags origin "+refs/heads/$branch:refs/remotes/origin/$branch" --quiet;then
  echo "Branch missing or inaccessible; skipping: $branch";continue
 fi
 current="$(git rev-parse "refs/remotes/origin/$branch")"
 if [[ "$expected" != '*' && "$current" != "$expected" ]];then
  echo "Branch advanced since audit; KEEP: $branch";continue
 fi
 if ! git merge-base --is-ancestor "$current" "$GITHUB_SHA";then
  echo "Unmerged branch; KEEP: $branch";continue
 fi
 # Fresh SHA comparison is the last guard before deleting a ref through the GitHub API.
 latest="$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/$branch" --jq '.object.sha')" || { echo "Branch lookup failed: $branch";continue; }
 if [[ "$latest" != "$current" ]];then echo "Branch moved during cleanup; KEEP: $branch";continue;fi
 gh api --method DELETE "repos/$GITHUB_REPOSITORY/git/refs/heads/$branch"
 echo "Deleted fully merged branch: $branch"
done <<'BRANCHES'
design/command-center-dashboard-20261111 *
fix/myview-chart-and-drag-integrity-20261111-1930 757d67e7b84c327295850dc43fe94ad36fb52721
fix/myview-chart-drag-safety-20261111-2029 7159fd2cfb21faa9763536c29de25c2b2a4a382b
fix/myview-chart-validity-20261111-1725 fc5c94cda47be96c1a3d8f94224701cfc9b389ce
fix/myview-internal-drag-only-20261111-1828 1f229145f05d23e7a2c447f3e2c8e58bb4335d34
fix/myview-observed-quote-caption-20261111 cfc3763fecedb6af7bc2cbb06a3fb4e8d4218ce4
fix/myview-quote-drag-guard-20261111-2131 5ef0ff52dfb5fecb5bab14e6adffa8344d629d22
fix/newview-tv-focus-status-20261111 894c759440ce1e1ebb48da588b7b1779078c0d26
fix/watch-directory-selection-attribution-20261111-1725 c7e45624fb5a7e9b001bcf4923add2d89563dd04
fix/watch-inline-guard-source-20261111-2128 2509ea07d1cc49412707c5c53b3401ab73eddee1
fix/watch-inline-playback-guard-20261111-2023 bf8094ef70349e6b0393fd6583bef194ff244af1
fix/watch-inline-selection-20261111-1928 24aadb4550d823c20ade5a9109d5c3272ca53dd1
fix/watch-selection-and-source-20261111-1825 e9c94491c9f0b84c90b37effc9d3007698448188
fix/watch-source-attribution-20261111-1631 04249de140909fadd40e65d8b0a7910771cda0f5
task3/market-data-integrity-20261111 88f863b3a5b2bedd97c9c14959b8dcb5e848d170
fix/myview-chart-drag-validation-20261111-2221 c16a639670614c34763a7ab3e989ecb86a4cd8a2
fix/newview-short-landscape-nav-20261111 *
fix/watch-inline-play-guard-20261111-2222 785af10c463493cd6cdb9881806d850d01272d7a
BRANCHES
