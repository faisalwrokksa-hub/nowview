#!/usr/bin/env bash
# Owner-initiated production signing only. Never run this in pull-request CI.
set -euo pipefail
cd "$(dirname "$0")"

: "${ANDROID_HOME:=${ANDROID_SDK_ROOT:-}}"
: "${ANDROID_HOME:?ANDROID_HOME must point to a local Android SDK}"
: "${NEWVIEW_RELEASE_KEYSTORE:?Set NEWVIEW_RELEASE_KEYSTORE to your protected external keystore path}"
: "${NEWVIEW_RELEASE_ALIAS:?Set NEWVIEW_RELEASE_ALIAS}"
: "${NEWVIEW_RELEASE_STORE_PASSWORD:?Provide NEWVIEW_RELEASE_STORE_PASSWORD through a secure local environment}"
: "${NEWVIEW_RELEASE_KEY_PASSWORD:?Provide NEWVIEW_RELEASE_KEY_PASSWORD through a secure local environment}"

tools="$ANDROID_HOME/build-tools/34.0.0"
source_apk="build/newview-unsigned.apk"
output_apk="build/newview-release.apk"

if [[ ! -f "$source_apk" ]]; then
  echo "Unsigned aligned APK not found; run build-apk.sh first." >&2
  exit 1
fi
if [[ ! -f "$NEWVIEW_RELEASE_KEYSTORE" ]]; then
  echo "Release keystore file does not exist." >&2
  exit 1
fi
if [[ ! -x "$tools/apksigner" ]]; then
  echo "Android SDK apksigner 34.0.0 not found." >&2
  exit 1
fi

# Refuse to overwrite an existing release artifact without explicit cleanup.
if [[ -e "$output_apk" ]]; then
  echo "Existing release APK found; archive/verify it before removing it." >&2
  exit 1
fi

# Passwords are read directly by apksigner from env; never written to command args
# as cleartext, logged, or included in GitHub Actions artifacts.
"$tools/apksigner" sign \
  --ks "$NEWVIEW_RELEASE_KEYSTORE" \
  --ks-key-alias "$NEWVIEW_RELEASE_ALIAS" \
  --ks-pass env:NEWVIEW_RELEASE_STORE_PASSWORD \
  --key-pass env:NEWVIEW_RELEASE_KEY_PASSWORD \
  --out "$output_apk" "$source_apk"
"$tools/apksigner" verify --verbose "$output_apk"
if command -v sha256sum >/dev/null 2>&1; then sha256sum "$output_apk"; fi
echo "Owner-signed candidate: $output_apk"
echo "This does not authorize release; verify signature lineage and versionCode on actual devices."
