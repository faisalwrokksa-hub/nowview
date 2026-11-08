#!/usr/bin/env bash
# Local/CI-only packaging checks; never interprets a development certificate as production signing.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ANDROID_HOME:=${ANDROID_SDK_ROOT:-}}"
: "${ANDROID_HOME:?Set ANDROID_HOME}"
apk="build/newview.apk"
test -s "$apk"
badging="$("$ANDROID_HOME/build-tools/34.0.0/aapt" dump badging "$apk")"
printf '%s\n' "$badging" | grep -F "package: name='app.newview.dashboard'"
printf '%s\n' "$badging" | grep -F "application-label:'NewView'"
assets="$(unzip -Z1 "$apk")"
for name in index.html style.css app.js stock-board.js workspace-shell.js myview.js business.js news.js media.js social.js external-links.js live.js indicators.js market-data.mjs; do
  if ! printf '%s\n' "$assets" | grep -Fxq "assets/$name"; then
    echo "Missing packaged workspace asset: $name" >&2
    exit 1
  fi
done
"$ANDROID_HOME/build-tools/34.0.0/apksigner" verify --verbose "$apk" >/dev/null
echo "Verified test APK app label, package identity, signature and all dashboard assets."
echo "This is NOT release-signing verification."
