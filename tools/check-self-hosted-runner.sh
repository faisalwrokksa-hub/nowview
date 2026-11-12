#!/usr/bin/env bash
# Manual, trusted-main-only self-hosted build on a disposable dedicated Linux VM.
# Do not run this workflow on pull requests or a personal computer.
set -euo pipefail

fail() { printf 'SELF-HOSTED RUNNER NO-GO: %s\n' "$*" >&2; exit 1; }

[[ "$GITHUB_EVENT_NAME" == 'workflow_dispatch' ]] || fail 'Only workflow_dispatch is permitted'
[[ "$GITHUB_REF" == 'refs/heads/main' ]] || fail 'Only main is permitted'
[[ "$GITHUB_REPOSITORY" == 'faisalwrokksa-hub/nowview' ]] || fail 'Unexpected repository'
[[ "$GITHUB_SHA" =~ ^[a-f0-9]{40}$ ]] || fail 'Full GitHub source SHA is missing'
[[ "$(git rev-parse HEAD)" == "$GITHUB_SHA" ]] || fail 'Checkout differs from the approved revision'
[[ "$(id -u)" -ne 0 ]] || fail 'Runner must not execute as root'
[[ "$(uname -s)" == Linux && "$(uname -m)" == x86_64 ]] || fail 'Requires isolated Linux x64 VM'
for binary in git bash python3 curl; do command -v "$binary" >/dev/null || fail "Missing $binary"; done

# No production credentials, even if incorrectly configured on the runner host.
# Never print secrets.
for secret in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN CLOUDFLARE_API_TOKEN \
 NEWVIEW_SIGNING_KEYSTORE_BASE64 NEWVIEW_SIGNING_STORE_PASSWORD NEWVIEW_RELEASE_STORE_PASSWORD; do
 if [[ -n "$(printenv "$secret" 2>/dev/null || true)" ]]; then
  fail "Unexpected production credentials are present ($secret)"
 fi
done

# Fail closed when main changes after owner approval. This is a read-only check.
current="$(git ls-remote --heads https://github.com/faisalwrokksa-hub/nowview.git refs/heads/main | awk '{print $1}')"
[[ "$current" == "$GITHUB_SHA" ]] || fail 'main advanced since manual approval; dispatch again on latest main'

sdk="$(printenv ANDROID_HOME 2>/dev/null || printenv ANDROID_SDK_ROOT 2>/dev/null || true)"
[[ -n "$sdk" && -d "$sdk" ]] || fail 'ANDROID_HOME / ANDROID_SDK_ROOT must point to a preinstalled Android SDK'
export ANDROID_HOME="$sdk"
for path in platforms/android-34/android.jar \
 build-tools/34.0.0/apksigner build-tools/34.0.0/aapt2 \
 build-tools/34.0.0/d8 build-tools/34.0.0/zipalign \
 build-tools/35.0.0/apksigner build-tools/35.0.0/aapt; do
 [[ -f "$sdk/$path" ]] || fail "Android SDK component is missing: $path"
done
mem_kib="$(awk '/MemTotal:/ {print $2}' /proc/meminfo)"
disk_kib="$(df -Pk . | awk 'NR==2 {print $4}')"
[[ "$mem_kib" =~ ^[0-9]+$ && "$disk_kib" =~ ^[0-9]+$ ]] || fail 'Cannot read host capacity'
if (( mem_kib < 8388608 )); then echo "::warning::Less than 8 GiB RAM; acceleration may be limited"; fi
if (( disk_kib < 12582912 )); then echo "::warning::Less than 12 GiB free disk; Android build may fail"; fi
printf 'PASS manual trusted-main CI preflight (source %s; no production secrets)\n' "$GITHUB_SHA"
