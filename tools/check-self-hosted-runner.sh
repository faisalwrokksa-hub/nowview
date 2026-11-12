#!/usr/bin/env bash
# Manual, trusted-main-only self-hosted build on a disposable dedicated Linux VM.
# Do not run this workflow on pull requests or a personal computer.
set -euo pipefail

fail() { printf 'SELF-HOSTED RUNNER NO-GO: %s\n' "$*" >&2; exit 1; }

[[ "${GITHUB_EVENT_NAME:-}" == 'workflow_dispatch' ]] || fail 'Only workflow_dispatch is permitted'
[[ "${GITHUB_ACTOR:-}" == 'faisalwrokksa-hub' ]] || fail 'Only the repository owner may dispatch'
[[ "$GITHUB_REF" == 'refs/heads/main' ]] || fail 'Only main is permitted'
[[ "$GITHUB_REPOSITORY" == 'faisalwrokksa-hub/nowview' ]] || fail 'Unexpected repository'
[[ "$GITHUB_SHA" =~ ^[a-f0-9]{40}$ ]] || fail 'Full GitHub source SHA is missing'
[[ "$(git rev-parse HEAD)" == "$GITHUB_SHA" ]] || fail 'Checkout differs from the approved revision'
[[ "$(id -u)" -ne 0 ]] || fail 'Runner must not execute as root'
[[ "$(uname -s)" == Linux && "$(uname -m)" == x86_64 ]] || fail 'Requires isolated Linux x64 VM'
for binary in git bash python3 curl node java javac jar keytool gradle unzip sha256sum setsid; do command -v "$binary" >/dev/null || fail "Missing $binary"; done
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 22 ]] || fail 'Preinstall Node.js 22'
java_version="$(javac -version 2>&1)"
[[ "$java_version" == 'javac 17.'* ]] || fail 'Preinstall JDK 17'
[[ "$(gradle --version)" == *'Gradle 8.9'* ]] || fail 'Preinstall Gradle 8.9'
# This attestation is provisioned by the VM owner, never by repository code.
# It records external firewall/image approval; it is not proof of network isolation.
[[ -n "${NEWVIEW_RUNNER_ROOT:-}" ]] || fail 'NEWVIEW_RUNNER_ROOT must identify the ephemeral runner'
python3 - <<'PY'
import json, os, stat
from pathlib import Path
marker = Path('/etc/newview-runner-isolation.json')
info = marker.lstat()
assert stat.S_ISREG(info.st_mode) and info.st_uid == 0 and not info.st_mode & 0o022, 'Unsafe isolation attestation'
approval = json.loads(marker.read_text())
assert approval.get('disposable_vm') is True and approval.get('network_policy_reviewed') is True, 'VM isolation approval missing'
runner = json.loads((Path(os.environ['NEWVIEW_RUNNER_ROOT']) / '.runner').read_text())
assert runner.get('ephemeral') is True, 'Persistent runners are prohibited'
PY

# No production credentials, even if incorrectly configured on the runner host.
# Never print secrets.
for secret in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN CLOUDFLARE_API_TOKEN \
 NEWVIEW_SIGNING_KEYSTORE_BASE64 NEWVIEW_SIGNING_STORE_PASSWORD NEWVIEW_RELEASE_STORE_PASSWORD \
 NEWVIEW_SIGNING_KEY_PASSWORD NEWVIEW_RELEASE_KEY_PASSWORD GOOGLE_APPLICATION_CREDENTIALS \
 AZURE_CLIENT_SECRET SSH_AUTH_SOCK; do
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
for path in platforms/android-34/android.jar platforms/android-35/android.jar \
 build-tools/34.0.0/aapt \
 build-tools/34.0.0/apksigner build-tools/34.0.0/aapt2 \
 build-tools/34.0.0/d8 build-tools/34.0.0/zipalign \
 build-tools/35.0.0/apksigner build-tools/35.0.0/aapt; do
 [[ -f "$sdk/$path" ]] || fail "Android SDK component is missing: $path"
done
mem_kib="$(awk '/MemTotal:/ {print $2}' /proc/meminfo)"
disk_kib="$(df -Pk . | awk 'NR==2 {print $4}')"
[[ "$mem_kib" =~ ^[0-9]+$ && "$disk_kib" =~ ^[0-9]+$ ]] || fail 'Cannot read host capacity'
(( $(getconf _NPROCESSORS_ONLN) >= 4 )) || fail 'At least 4 vCPUs required'
(( mem_kib >= 8000000 )) || fail 'At least 8 GB RAM required'
(( disk_kib >= 20971520 )) || fail 'At least 20 GiB free disk required'
printf 'PASS manual trusted-main CI preflight (source %s; no production secrets)\n' "$GITHUB_SHA"
