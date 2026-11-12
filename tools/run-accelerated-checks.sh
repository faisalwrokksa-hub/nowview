#!/usr/bin/env bash
# One ephemeral job; independent checks share preinstalled tools, never credentials.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p accelerated-test-artifacts/logs
pids=()
finish() {
  local pid
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then kill -- "-$pid" 2>/dev/null || true; fi
  done
  if (( ${#pids[@]} )); then sleep 2; fi
  for pid in "${pids[@]}"; do kill -KILL -- "-$pid" 2>/dev/null || true; done
  for pid in "${pids[@]}"; do wait "$pid" 2>/dev/null || true; done
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
measure() {
  local name="$1" started ended result=0
  shift
  started=$(date +%s)
  "$@" >"accelerated-test-artifacts/logs/$name.log" 2>&1 || result=$?
  ended=$(date +%s)
  printf '%s\t%s\t%s\n' "$name" "$((ended-started))" "$result" >"accelerated-test-artifacts/$name.tsv"
  cat "accelerated-test-artifacts/logs/$name.log"
  return "$result"
}
tv() { bash build-apk.sh && bash scripts/verify-preview-apk.sh; }
phone() {
  gradle -p phone-caster :app:assembleDebug --build-cache --profile --no-daemon --console=plain || return
  local apk=phone-caster/app/build/outputs/apk/debug/app-debug.apk badging
  test -s "$apk" || return
  "$ANDROID_HOME/build-tools/35.0.0/apksigner" verify --verbose "$apk" || return
  badging="$("$ANDROID_HOME/build-tools/35.0.0/aapt" dump badging "$apk")" || return
  printf '%s\n' "$badging" | grep -F "package: name='app.newview.phonecaster'" || return
  printf '%s\n' "$badging" | grep -F "versionCode='1'" || return
  printf '%s\n' "$badging" | grep -F "versionName='0.1.0-preview'"
}
started=$(date +%s)
if [[ "${1:-}" == --task ]]; then
  case "${2:-}" in
    frontend) measure frontend npm run verify ;;
    android-tv) measure android-tv tv ;;
    phone-caster) measure phone-caster phone ;;
    *) exit 2 ;;
  esac
  exit
fi
for task in frontend android-tv phone-caster; do
  setsid bash "$0" --task "$task" & pids+=("$!")
done
result=0
for pid in "${pids[@]}"; do wait "$pid" || result=1; done
pids=()
if [[ -d phone-caster/build/reports/profile ]]; then
  cp -R phone-caster/build/reports/profile accelerated-test-artifacts/gradle-profile
fi
printf 'Gradle FROM-CACHE tasks: %s\nGradle UP-TO-DATE tasks: %s\n' \
  "$(grep -c 'FROM-CACHE' accelerated-test-artifacts/logs/phone-caster.log || true)" \
  "$(grep -c 'UP-TO-DATE' accelerated-test-artifacts/logs/phone-caster.log || true)" \
  > accelerated-test-artifacts/cache-evidence.txt
printf 'total\t%s\t%s\n' "$(( $(date +%s)-started ))" "$result" >accelerated-test-artifacts/total.tsv
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  { printf '| Check | Seconds | Exit |\n|---|---:|---:|\n';
    awk -F '\t' '{printf "| %s | %s | %s |\n",$1,$2,$3}' accelerated-test-artifacts/*.tsv;
  } >> "$GITHUB_STEP_SUMMARY"
fi
exit "$result"
