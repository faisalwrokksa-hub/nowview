# Owner-invoked signing on Windows PowerShell 7 or Windows PowerShell 5.1.
# Do not run in GitHub pull-request CI or commit release keystores/passwords.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sdk = if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
if ([string]::IsNullOrWhiteSpace($sdk)) { throw 'Set ANDROID_HOME or ANDROID_SDK_ROOT to a trusted Android SDK.' }

$required = @('NEWVIEW_RELEASE_KEYSTORE','NEWVIEW_RELEASE_ALIAS','NEWVIEW_RELEASE_STORE_PASSWORD','NEWVIEW_RELEASE_KEY_PASSWORD')
foreach ($key in $required) {
    $value = [Environment]::GetEnvironmentVariable($key)
    if ([string]::IsNullOrWhiteSpace($value)) { throw "Missing $key. Provide release values through a secure local environment, never in repo files." }
}

$apksigner = Join-Path $sdk 'build-tools\34.0.0\apksigner.bat'
$unsignedApk = Join-Path $root 'build\newview-unsigned.apk'
$releaseApk = Join-Path $root 'build\newview-release.apk'
if (-not (Test-Path -LiteralPath $apksigner -PathType Leaf)) { throw 'Android SDK build-tools 34.0.0 apksigner.bat was not found.' }
if (-not (Test-Path -LiteralPath $unsignedApk -PathType Leaf)) { throw 'Unsigned aligned APK not found. Run build-apk.ps1 first.' }
if (-not (Test-Path -LiteralPath $env:NEWVIEW_RELEASE_KEYSTORE -PathType Leaf)) { throw 'Owner-held release keystore was not found.' }
if (Test-Path -LiteralPath $releaseApk) { throw 'Existing release APK found; archive and verify it before creating another.' }

# Prevent accidental use of a keystore stored anywhere inside the repository.
$rootPath = [System.IO.Path]::GetFullPath($root).TrimEnd('\','/') + [System.IO.Path]::DirectorySeparatorChar
$keyPath = [System.IO.Path]::GetFullPath($env:NEWVIEW_RELEASE_KEYSTORE)
if ($keyPath.StartsWith($rootPath,[StringComparison]::OrdinalIgnoreCase)) {
    throw 'Refusing to use a keystore stored inside the source repository.'
}

try {
    # apksigner reads passwords directly from the *names* of environment variables.
    # No secret values are inserted into command-line arguments or printed.
    & $apksigner sign --ks $keyPath --ks-key-alias $env:NEWVIEW_RELEASE_ALIAS --ks-pass 'env:NEWVIEW_RELEASE_STORE_PASSWORD' --key-pass 'env:NEWVIEW_RELEASE_KEY_PASSWORD' --out $releaseApk $unsignedApk
    if ($LASTEXITCODE -ne 0) { throw "apksigner sign exited $LASTEXITCODE" }
    & $apksigner verify --verbose $releaseApk
    if ($LASTEXITCODE -ne 0) { throw "apksigner verify exited $LASTEXITCODE" }
    $hash = (Get-FileHash -LiteralPath $releaseApk -Algorithm SHA256).Hash
    Write-Host "Signed candidate: $releaseApk"
    Write-Host "SHA-256: $hash"
    Write-Host 'This is an owner-held signing helper, NOT release approval. Verify signer continuity, versionCode and real-device upgrades.'
}
catch {
    # Do not keep a partially signed artifact that could be mistaken for a release.
    if (Test-Path -LiteralPath $releaseApk) { Remove-Item -LiteralPath $releaseApk -Force -ErrorAction SilentlyContinue }
    throw
}
