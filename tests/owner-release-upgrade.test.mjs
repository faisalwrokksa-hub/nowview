import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../tools/check-owner-release-upgrade.ps1',import.meta.url),'utf8');

test('release-upgrade validator compares two real signed APKs before any device modification',()=>{
 assert.match(source,/PreviousApk/);
 assert.match(source,/CandidateApk/);
 assert.match(source,/param\(/);
 assert.match(source,/expectedPackage='app\.newview\.dashboard'/);
 assert.match(source,/apksigner\.bat/);
 assert.match(source,/aapt\.exe/);
 assert.match(source,/--print-certs/);
 assert.match(source,/certificate SHA-256/);
 assert.match(source,/candidate\.Version -le \$previous\.Version/);
 assert.match(source,/candidate\.Cert -ne \$previous\.Cert/);
 assert.match(source,/Get-FileHash/);
 assert.doesNotMatch(source,/keytool -genkeypair|--ks-pass|--key-pass/);
});

test('on-device release upgrade requires explicit owner switch and refuses unexpected existing version',()=>{
 assert.match(source,/\[switch\]\$InstallOnDevice/);
 assert.match(source,/if\(\$InstallOnDevice\)/);
 assert.match(source,/connected\.Count -ne 1/);
 assert.match(source,/previous owner-signed build not installed/);
 assert.match(source,/adb install -r \$new/);
 assert.doesNotMatch(source,/adb uninstall|adb shell pm clear|adb install -r \$old/);
});
