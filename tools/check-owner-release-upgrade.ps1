# Owner-only offline APK certificate/package/version continuity verifier.
# No credentials, keystore access, or signing operation. Optional ADB upgrade
# requires explicit -InstallOnDevice and a previously installed OWNER-SIGNED app.
param(
    [Parameter(Mandatory=$true)][string]$PreviousApk,
    [Parameter(Mandatory=$true)][string]$CandidateApk,
    [switch]$InstallOnDevice
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$expectedPackage='app.newview.dashboard'

function Require-SdkTool([string]$fileName) {
    $sdk=if($env:ANDROID_HOME){$env:ANDROID_HOME}else{$env:ANDROID_SDK_ROOT}
    if(-not $sdk){throw 'Set ANDROID_HOME or ANDROID_SDK_ROOT on the owner workstation.'}
    $path=Join-Path $sdk ("build-tools\34.0.0\"+$fileName)
    if(-not (Test-Path -LiteralPath $path -PathType Leaf)){throw "Missing trusted SDK tool: $path"}
    return $path
}
function Run-Checked([string]$tool,[string[]]$arguments) {
    $output=& $tool @arguments 2>&1 | Out-String
    if($LASTEXITCODE -ne 0){throw "SDK command failed ($tool) with exit code $LASTEXITCODE."}
    return $output
}
$old=(Resolve-Path -LiteralPath $PreviousApk -ErrorAction Stop).Path
$new=(Resolve-Path -LiteralPath $CandidateApk -ErrorAction Stop).Path
if($old -eq $new){throw 'Previous APK and candidate APK must be different files.'}
if($old -notmatch '\.apk$' -or $new -notmatch '\.apk$'){throw 'Expected APK files.'}
$apksigner=Require-SdkTool 'apksigner.bat'
$aapt=Require-SdkTool 'aapt.exe'

function Read-Identity([string]$apk) {
    $badging=Run-Checked $aapt @('dump','badging',$apk)
    $match=[regex]::Match($badging,"(?m)^package: name='([^']+)' versionCode='(\d+)'")
    if(-not $match.Success){throw 'Cannot identify APK package and versionCode.'}
    $certificate=Run-Checked $apksigner @('verify','--verbose','--print-certs',$apk)
    $fingerprint=[regex]::Match($certificate,'(?im)^Signer #1 certificate SHA-256 digest:\s*([0-9a-f:]+)\s*$')
    if(-not $fingerprint.Success){throw 'Cannot verify signer certificate fingerprint.'}
    return @{
        Package=$match.Groups[1].Value
        Version=[long]$match.Groups[2].Value
        Cert=($fingerprint.Groups[1].Value.ToLowerInvariant() -replace ':','')
    }
}
$previous=Read-Identity $old
$candidate=Read-Identity $new
if($previous.Package -ne $expectedPackage -or $candidate.Package -ne $expectedPackage) {
    throw "Both APKs must use the expected application ID $expectedPackage."
}
if($candidate.Version -le $previous.Version) {
    throw "Candidate versionCode must increase (old=$($previous.Version); new=$($candidate.Version))."
}
if($candidate.Cert -ne $previous.Cert) {
    throw 'APK signer certificate SHA-256 mismatch: not an in-place upgrade. DO NOT uninstall customer data.'
}
$hash=(Get-FileHash -LiteralPath $new -Algorithm SHA256).Hash
Write-Host "PASS offline APK package, signing certificate and versionCode continuity."
Write-Host "Package: $expectedPackage; versionCode $($previous.Version) -> $($candidate.Version)"
Write-Host "Candidate SHA256: $hash"

if($InstallOnDevice) {
    if(-not (Get-Command adb -ErrorAction SilentlyContinue)){throw 'adb is required for physical upgrade validation.'}
    $devices=& adb devices
    if($LASTEXITCODE -ne 0){throw 'ADB unavailable.'}
    $connected=@($devices | Where-Object {$_ -match '^\S+\s+device$'})
    if($connected.Count -ne 1){throw 'Connect exactly one approved physical test device via ADB.'}
    $installed=(& adb shell dumpsys package $expectedPackage | Out-String)
    if($LASTEXITCODE -ne 0 -or $installed -notmatch ('versionCode='+$previous.Version+'(?:\s|$)')) {
        throw 'Expected previous owner-signed build not installed; refusing to change device.'
    }
    & adb install -r $new
    if($LASTEXITCODE -ne 0){throw 'ADB in-place upgrade failed: stop, preserve device data and investigate.'}
    $installedAfter=(& adb shell dumpsys package $expectedPackage | Out-String)
    if($LASTEXITCODE -ne 0 -or $installedAfter -notmatch ('versionCode='+$candidate.Version+'(?:\s|$)')) {
        throw 'New versionCode could not be confirmed after installation.'
    }
    Write-Host 'PASS APK in-place install and versionCode. Now manually verify saved settings, D-pad, media and background recovery.'
} else {
    Write-Host 'No device was changed. Invoke -InstallOnDevice only on an authorized physical QA device.'
}
