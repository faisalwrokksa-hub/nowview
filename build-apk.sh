#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_HOME:=${ANDROID_SDK_ROOT:-}}"
: "${ANDROID_HOME:?Set ANDROID_HOME to an Android SDK containing platform 34 and build-tools 34.0.0}"
tools="$ANDROID_HOME/build-tools/34.0.0"
platform="$ANDROID_HOME/platforms/android-34/android.jar"
mkdir -p build
# Remove only generated intermediates; preserve the aligned unsigned release input and local test keystore.
rm -f build/resources.zip build/unsigned.apk
stage="$(mktemp -d "$PWD/build/obj.XXXXXX")"
cleanup() { rm -rf "$stage"; rm -f build/resources.zip build/unsigned.apk; }
trap cleanup EXIT
mkdir -p "$stage/classes" "$stage/dex"
"$tools/aapt2" compile --dir android/res -o build/resources.zip
"$tools/aapt2" link -o build/unsigned.apk -I "$platform" --manifest android/AndroidManifest.xml -A web build/resources.zip
mapfile -t sources < <(find android/src -name '*.java' | sort)
javac -encoding UTF-8 -source 8 -target 8 -classpath "$platform" -d "$stage/classes" "${sources[@]}"
mapfile -t classes < <(find "$stage/classes" -name '*.class' | sort)
"$tools/d8" --lib "$platform" --min-api 24 --output "$stage/dex" "${classes[@]}"
apk="$PWD/build/unsigned.apk"
(cd "$stage/dex" && jar uf "$apk" classes.dex)
"$tools/zipalign" -f 4 build/unsigned.apk build/newview-unsigned.apk
# This is a local/test signing identity, not a production release certificate.
if [[ ! -f build/local-signing.jks ]]; then
 keytool -genkeypair -keystore build/local-signing.jks -storepass android -keypass android -alias newview-local -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=NewView Local Build' -noprompt
fi
"$tools/apksigner" sign --ks build/local-signing.jks --ks-key-alias newview-local --ks-pass pass:android --key-pass pass:android --out build/newview.apk build/newview-unsigned.apk
"$tools/apksigner" verify --verbose build/newview.apk
echo 'APK: build/newview.apk'
