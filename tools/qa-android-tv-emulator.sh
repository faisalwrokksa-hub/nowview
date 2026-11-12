#!/usr/bin/env bash
# Synthetic Android TV emulator smoke. Never a physical-device or media-rights certification.
set -euo pipefail
APP_ID="app.newview.dashboard"
APK="build/newview.apk"
mkdir -p tv-emulator-evidence
test -s "$APK" || { echo "Missing unsigned/test APK; run build-apk.sh first" >&2; exit 1; }
adb wait-for-device
adb shell getprop sys.boot_completed | tr -d '\r' | grep -qx 1 || { echo "TV emulator not fully booted" >&2; exit 1; }
adb install -r "$APK"
adb shell pm path "$APP_ID" | grep -Fq "$APP_ID" || { echo "NewView package not installed" >&2; exit 1; }
adb shell am start -n "$APP_ID/.MainActivity"
sleep 12

verify_running() {
  local state
  state="$(adb shell pidof "$APP_ID" | tr -d '\r')"
  if [[ -z "$state" ]]; then
    echo "NewView process stopped after D-pad navigation" >&2
    return 1
  fi
}
verify_running
# Android KeyEvent codes are UP=19, DOWN=20, LEFT=21, RIGHT=22, DPAD_CENTER=23.
# These are synthetic ADB keys, not proof of remote manufacturer or focus behavior.
for key in 22 21 20 19 23 22 20 23; do
  adb shell input keyevent "$key"
  sleep 2
  verify_running
done
adb shell screencap -p /sdcard/newview-emulator-screenshot.png
adb pull /sdcard/newview-emulator-screenshot.png tv-emulator-evidence/synthetic-tv.png
adb shell rm -f /sdcard/newview-emulator-screenshot.png
adb shell input keyevent 4
sleep 2
adb shell am start -n "$APP_ID/.MainActivity"
sleep 4
verify_running
echo "PASS: install, TV-style D-pad keys, screenshot and relaunch on synthetic emulator"
echo "App package: $APP_ID" > tv-emulator-evidence/README.txt
echo "This is an Android TV emulator check, not physical TV acceptance, signed-APK upgrade verification or stream playback proof." >> tv-emulator-evidence/README.txt
sha256sum "$APK" >> tv-emulator-evidence/README.txt
