# Owner-admin action for NewView. NO GitHub secrets/passwords embedded.
# Default is read-only. Run -Apply only after reviewing the plan and confirming
# there is an independent collaborator who can approve PRs.
param([switch]$Apply)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repo = 'faisalwrokksa-hub/nowview'
$ruleName = 'NewView protected main release'

function Invoke-GHJson([string]$Route) {
    $output = & gh api $Route
    if ($LASTEXITCODE -ne 0) { throw "GitHub API read failed: $Route" }
    return ($output | ConvertFrom-Json)
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'Install GitHub CLI (gh) and sign in with your owner/admin account.'
}
& gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI is not authenticated.' }
$repository = Invoke-GHJson "repos/$repo"
if ($repository.full_name -ne $repo -or $repository.default_branch -ne 'main') {
    throw 'Unexpected repository or default branch. Refusing changes.'
}
$main = Invoke-GHJson "repos/$repo/branches/main"
if (-not $main.commit.sha -or $main.commit.sha.Length -ne 40) {
    throw 'Could not confirm current main commit.'
}
$rules = @(Invoke-GHJson "repos/$repo/rulesets?per_page=100")
$existing = @($rules | Where-Object { $_.name -eq $ruleName })
if ($existing.Count -gt 1) { throw 'Duplicate named rulesets found; resolve manually.' }

# The CI "verify" job runs on every PR, including documentation-only changes.
# Other checks use path filters and therefore MUST NOT be universal requirements.
$payload = @{
    name = $ruleName
    target = 'branch'
    enforcement = 'active'
    bypass_actors = @()
    conditions = @{ ref_name = @{ include = @('refs/heads/main'); exclude = @() } }
    rules = @(
        @{ type = 'deletion' }
        @{ type = 'non_fast_forward' }
        @{ type = 'pull_request'; parameters = @{
            dismiss_stale_reviews_on_push = $true
            require_code_owner_review = $false
            require_last_push_approval = $true
            required_approving_review_count = 1
            required_review_thread_resolution = $true
        }}
        @{ type = 'required_status_checks'; parameters = @{
            do_not_enforce_on_create = $false
            strict_required_status_checks_policy = $true
            required_status_checks = @(@{ context = 'verify' })
        }}
    )
}
$body = $payload | ConvertTo-Json -Depth 20
Write-Host "Repository: $repo"
Write-Host "Current main: $($main.commit.sha)"
Write-Host 'Planned: disable auto-merge.yml and safe-auto-merge.yml on CURRENT main.'
Write-Host 'Planned: protect main with a required PR, 1 independent approval and passing verify check.'
if ($existing.Count -eq 1) {
    Write-Host "Named ruleset already exists (ID $($existing[0].id)); no automatic override."
}
if (-not $Apply) {
    Write-Host 'DRY RUN — no GitHub settings changed. Run with -Apply after owner review.'
    Write-Output $body
    exit 0
}
if ($existing.Count -eq 1 -and $existing[0].enforcement -ne 'active') {
    throw 'An existing namesake ruleset is not active. Inspect it manually; refusing to override.'
}

# Disable the two legacy scheduled/CI-triggered merge workflows first.
foreach ($filename in @('auto-merge.yml', 'safe-auto-merge.yml')) {
    & gh api -X PUT "repos/$repo/actions/workflows/$filename/disable" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not disable $filename. Resolve permissions (Actions write) before continuing."
    }
    $status = Invoke-GHJson "repos/$repo/actions/workflows/$filename"
    if ($status.state -ne 'disabled_manually') {
        throw "Workflow $filename did not report disabled_manually."
    }
    Write-Host "Disabled legacy workflow: $filename"
}

# File-backed gh request: avoids putting JSON or credentials in shell arguments.
if ($existing.Count -eq 0) {
    $tmp = [System.IO.Path]::GetTempFileName()
    try {
        [System.IO.File]::WriteAllText($tmp, $body, [System.Text.UTF8Encoding]::new($false))
        & gh api -X POST "repos/$repo/rulesets" --input $tmp | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw 'Ruleset create failed. Ensure repository Administration write permission.'
        }
    }
    finally { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
} else {
    Write-Host "Using existing active ruleset $($existing[0].id); review rules manually for parity."
}
$after = @(Invoke-GHJson "repos/$repo/rulesets?per_page=100")
$active = @($after | Where-Object { $_.name -eq $ruleName -and $_.enforcement -eq 'active' })
if ($active.Count -ne 1) {
    throw 'Protection not yet confirmed. Check Settings > Rulesets immediately.'
}
Write-Host "SUCCESS: 2 legacy merge workflows disabled; $ruleName is active."
Write-Host 'This does not merge PR #167, deploy production or approve release signing/licensing.'
