# NewView accelerated self-hosted CI — opt-in, not provisioned

**Status:** workflow and preflight implemented, **no self-hosted runner has been registered or benchmarked**. The existing GitHub-hosted CI, Android emulator and Cloudflare deployments continue unchanged. This is intentionally **manual only**.

## Important public-repository warning

The source repository `faisalwrokksa-hub/nowview` is public. GitHub advises **against** using ordinary/persistent self-hosted runners in public repositories: anyone who can contribute untrusted workflow code may compromise the runner and its networks. Labels and workflow guards reduce exposure but **do not create a security boundary**.

**Best security option:** move trusted accelerated CI into a separate private repository with an owner-controlled, disposable runner and deliberately reviewed source synchronization. Do not directly attach an always-on runner to the public repo.

If this single-repository workflow is used temporarily, run it only on a **fresh, disposable, network-isolated Linux x64 VM**, never on a personal Windows desktop, a Cloudflare credential machine, or an existing production VPS. Prefer an immutable prebuilt VM image that is destroyed after one job. Allow only outbound GitHub/package-manager connectivity; deny the VM access to production networks, cloud metadata endpoints, credentials, SSH agents and signing keys. Use no elevated runner account. Never build third-party pull requests on it.

GitHub references:
- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners
- https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow

## Zero-additional-runner-charge default: GitHub-hosted CI

As documented in GitHub Actions billing, **standard GitHub-hosted runner compute remains free for public repositories**. Larger runners, Actions artifact/cache storage beyond allowances, and other services can have different billing. NewView uses standard Ubuntu-hosted runners and currently does not need AWS EC2 or a self-hosted runner to avoid hosted compute charges. Verify your account billing/quotas separately; do not infer that stored artifacts and caches are unlimited.

The safest immediate acceleration is enabled in the draft integration PR: normal validation and dedicated Android APK jobs remain GitHub-hosted; the dashboard workflow no longer redundantly installs Android SDK/builds another Android TV APK; the two-APK bundle is the sole PR build for TV+Phone Caster; the independent Phone Caster workflow runs only for merged `main` or manual dispatch. Feature-branch `push` duplicates have been removed from dashboard/frontend/phone workflows and superseded PR runs are cancelled without interrupting main. GitHub-side frontend deployment is manual-only, avoiding competing Cloudflare publishers.

**No real-world speed-up percentage is claimed** until a completed workload comparison. Hosted pipelines continue to execute as usual while `NEWVIEW_SELF_HOSTED_ENABLED` remains unset.

Official current billing reference: https://docs.github.com/en/billing/concepts/product-billing/github-actions

## What has been implemented

`.github/workflows/self-hosted-accelerated-ci.yml` dispatches only after:
- An **owner-initiated** `workflow_dispatch` on `main`; it has no `push` or `pull_request` trigger.
- Repository variable `NEWVIEW_SELF_HOSTED_ENABLED` is exactly `true` (unset = disabled).
- The user submits the exact 40-character current `main` SHA and explicitly ticks the isolated-runner confirmation.
- The job enters environment `newview-self-hosted-approval`. **Configure required reviewers** before enabling; a newly-created environment with no protection is *not* an approval gate.
- GitHub matches runner labels `self-hosted`, `linux`, `x64`, `newview-ci-isolated`.
- `tools/check-self-hosted-runner.sh` checks repo, event type, main SHA versus live origin, Linux/non-root, no production credential environment variables, preinstalled Android SDK and disk/RAM recommendations.

The runner performs read-only Worker/Pages verification and produces **development/test Android TV and Phone Caster APKs only**, plus SHA256/provenance. No Cloudflare deployment, production signing or AWS resource provisioning is present. `gradle/actions/setup-gradle@v4` supports dependency caching; a preinstalled SDK/Java/Gradle image avoids repeatedly downloading multi-GB Android tools. Benchmark against the existing hosted APK build before assuming it is faster.

## Owner setup — required once per disposable runner image

1. Use a dedicated isolated Linux x64 VM with at least ~8 GiB RAM, 4 CPU cores and ~20 GiB free disk. If using an AWS EC2 VM, **it may incur charges**; no AWS capacity or account was provisioned by this change. Avoid reusing the production VPS or Windows workstation.
2. Install Python 3, Git, curl, a Java 17 JDK, Android SDK platform 34 and build-tools versions **34.0.0 and 35.0.0**. Ensure `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) is exported to the runner process. Preinstall GitHub Action runner dependencies and Gradle 8.9 or let the workflow configure Gradle.
3. Open [NewView runner settings](https://github.com/faisalwrokksa-hub/nowview/settings/actions/runners) → **New self-hosted runner** → **Linux x64**. Follow the **current commands GitHub gives you** to download and extract the official runner. Never commit the registration token or send it in chat. Tokens expire; generate one when provisioning the VM.
4. In the runner directory, register with the **ephemeral** option and the exact custom label. The official generated `config.sh` command can be augmented with `--ephemeral --labels newview-ci-isolated`. Run as a dedicated unprivileged account. Use `./run.sh` for one job, then destroy the VM. Do not run as root and do not install it as a long-lived service in this public-repo mode.
5. In [NewView environments](https://github.com/faisalwrokksa-hub/nowview/settings/environments), create `newview-self-hosted-approval`, set **required reviewers**, and restrict allowed deployment branches to `main`.
6. In [NewView Actions variables](https://github.com/faisalwrokksa-hub/nowview/settings/variables/actions), create `NEWVIEW_SELF_HOSTED_ENABLED=true` **only after** the isolated runner and approval environment exist. Do not add secrets to this environment.
7. **Only after this workflow file has been safely merged into the protected default branch** will its manual dispatch appear in GitHub Actions. Open [Actions](https://github.com/faisalwrokksa-hub/nowview/actions) → **NewView accelerated CI on isolated self-hosted runner** → Run workflow; select `main`, paste its full commit SHA, and tick the confirmation. A required reviewer must approve the queued job. Do not do this against draft PR #167 or a third-party PR.
8. Inspect the test artifacts, sha256 checksums and step timings. The runner will de-register after its one job (ephemeral mode); destroy/recreate its VM before another job. Disable `NEWVIEW_SELF_HOSTED_ENABLED` when not actively testing.

## Expected speedup and cost

Self-hosting does **not inherently speed up** CI. Gains require faster CPU, preinstalled Android SDK and dependency caches; cold VMs or an undersized EC2 instance can be slower than GitHub-hosted runners. GitHub does not charge self-hosted runner *minutes* in the same way as GitHub-hosted jobs, but the computer/storage/network/electricity/cloud provider still cost money. Compare the new workflow's per-step build timings against the hosted `NewView complete Android test APK bundle`.

## Why the linked AWS article is not applied directly

The AQ Tech article (November 2022) shows **Terraform provisioning AWS resources via GitHub Actions**. It does **not** provide an approved isolated runner or a NewView-specific AWS security and cost configuration. No Terraform provisioning, AWS access keys, role delegation, EC2 creation or AWS deployment was introduced. An AWS runner should use short-lived permissions and a documented cost cap only after the owner deliberately selects that hosting option.

## Prepared image and activation handoff (not activated)

No isolated VM is available. Do not attach the TheOrg Windows runner or install
NewView's runner on the personal workstation. Activation, Android APK success
and a speed improvement remain unverified.

Use Ubuntu 24.04 x64 with 4 vCPUs, 8 GB RAM and 20 GiB free disk. The owner must
approve infrastructure costs, network rules and GitHub administration. Install
these only inside the disposable build image:

```bash
sudo apt-get update
sudo apt-get install --no-install-recommends git curl unzip zip python3 openjdk-17-jdk-headless util-linux
```

Preinstall Node 22 from nodejs.org and Gradle 8.9 from services.gradle.org,
checking their official published checksums before extraction. Never pipe a
download to a shell. Install Android command-line tools from developer.android.com
using the published checksum, accept its licenses as the owner, then install:

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=/opt/android-sdk
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" \
  'platform-tools' 'platforms;android-34' 'platforms;android-35' \
  'build-tools;34.0.0' 'build-tools;35.0.0'
node --version   # 22.x
javac -version  # 17.x
gradle --version # 8.9
```

Platform **35** is mandatory for Phone Caster's compileSdk. The job refuses an
incomplete image rather than installing tools. There are no npm dependencies
or lockfile, so an npm dependency cache would cache nothing. Gradle caches build
tasks and dependencies. Never reuse an APK without verified provenance; this
job rebuilds APKs and lets Gradle validate cached tasks.

Before snapshotting the image, enforce network isolation outside the guest:
deny metadata endpoints, production/private networks and inbound connections;
allow only reviewed GitHub, Android and dependency-registry endpoints. Keep TLS
validation enabled. After reviewing this policy the owner creates:

```bash
printf '%s\n' '{"disposable_vm":true,"network_policy_reviewed":true}' | \
  sudo tee /etc/newview-runner-isolation.json >/dev/null
sudo chown root:root /etc/newview-runner-isolation.json
sudo chmod 644 /etc/newview-runner-isolation.json
```

This attestation records approval; it does not enforce network isolation.
Create an unprivileged account and install the current official Linux x64
Actions runner from the registration page, verifying its displayed SHA-256.
Then launch the prepared helper from that account:

```bash
export NEWVIEW_RUNNER_ROOT=/opt/newview-runner
bash /path/to/reviewed-source/tools/start-newview-ephemeral-runner.sh
```

Enter a fresh registration token only at the hidden local prompt. The helper
uses `--ephemeral`, never replaces a runner, and removes local runner credentials
on normal failure/cancellation. After one job **destroy the entire VM**, disk,
workspace and debug signing keys. A shell trap cannot handle SIGKILL or power
loss: an external VM supervisor must destroy interrupted VMs, and the owner must
remove any offline registration in GitHub runner settings. Do not snapshot or
reuse a registered runner. Crash cleanup is not verified without that supervisor.

Keep `NEWVIEW_SELF_HOSTED_ENABLED` unset/false until GitHub confirms the runner
online and `newview-self-hosted-approval` has required reviewers, prevents
self-review and allows only main. These administrative settings require owner
approval and were not changed. Do not merge PR #167 to activate this workflow.

The workflow also checks the owner actor and exact main SHA, runs independent
frontend/TV/phone checks in separate process groups, records duration and exit
status, retains failure logs, verifies phone version/package/signature, and
cleans generated outputs after upload. Whole-VM destruction is the final cleanup
boundary, including after forced cancellation. Development signing is separate
from production signing.

For a benchmark, use the **same source SHA** for the hosted bundle and approved
isolated run. Export their completed jobs:

```bash
gh api repos/faisalwrokksa-hub/nowview/actions/runs/HOSTED_RUN_ID/jobs > hosted-jobs.json
gh api repos/faisalwrokksa-hub/nowview/actions/runs/ISOLATED_RUN_ID/jobs > isolated-jobs.json
python3 tools/summarize-runner-benchmark.py hosted-jobs.json isolated-jobs.json
```

Combine API preparation/setup durations with artifact `*.tsv` timings,
`cache-evidence.txt`, Gradle profile dependency timings and logs. Total wall time
includes overlapping checks; never add parallel durations as total elapsed time.
Tool installation in the accelerated job is absent because the image preinstalls
tools. Compare cold and warm caches separately. Missing measurements remain
unavailable; the summary tool never certifies a speedup.

## Release boundary (unchanged)

Running the accelerated workflow does not close the 20 real-device/browser acceptance records, establish commercial IPTV/data licensing, sign Android releases, verify upgrades, or approve production. Keep draft PR #167 and the serving `main` unchanged until acceptance gates are complete.
