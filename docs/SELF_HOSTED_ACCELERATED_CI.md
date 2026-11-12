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

## Release boundary

Running the accelerated workflow does not close the 20 real-device/browser acceptance records, establish commercial IPTV/data licensing, sign Android releases, verify upgrades, or approve production. Keep draft PR #167 and the serving `main` unchanged until acceptance gates are complete.
