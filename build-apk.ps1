param([string]$AndroidJar, [string]$BuildTools, [string]$JavaHome)
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
if(!$JavaHome){$JavaHome=(Get-ChildItem "$root\build-tools\jdk" -Directory | Select-Object -First 1).FullName}
if(!$AndroidJar){$AndroidJar="$root\build-tools\android-platform\android-34\android.jar"}
if(!$BuildTools){$BuildTools="$root\build-tools\android-build\android-14"}
$env:JAVA_HOME=$JavaHome
$env:PATH="$JavaHome\bin;$env:PATH"
$out=Join-Path $root 'build'
$stage=Join-Path $out ('obj-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path "$stage\classes","$stage\dex" | Out-Null
function RunChecked([string]$exe,[string[]]$arguments){& $exe @arguments;if($LASTEXITCODE -ne 0){throw "$exe failed: $LASTEXITCODE"}}
RunChecked "$BuildTools\aapt2.exe" @('compile','--dir',"$root\android\res",'-o',"$out\resources.zip")
RunChecked "$BuildTools\aapt2.exe" @('link','-o',"$out\unsigned.apk",'-I',$AndroidJar,'--manifest',"$root\android\AndroidManifest.xml",'-A',"$root\web","$out\resources.zip")
$sources=@(Get-ChildItem "$root\android\src" -Filter '*.java' -Recurse | ForEach-Object {$_.FullName})
RunChecked "$JavaHome\bin\javac.exe" (@('-encoding','UTF-8','-source','8','-target','8','-classpath',$AndroidJar,'-d',"$stage\classes")+$sources)
$classes=@(Get-ChildItem "$stage\classes" -Filter '*.class' -Recurse | ForEach-Object {$_.FullName})
RunChecked "$BuildTools\d8.bat" (@('--lib',$AndroidJar,'--min-api','24','--output',"$stage\dex")+$classes)
Push-Location "$stage\dex"
try{RunChecked "$JavaHome\bin\jar.exe" @('uf',"$out\unsigned.apk",'classes.dex')}finally{Pop-Location}
RunChecked "$BuildTools\zipalign.exe" @('-f','4',"$out\unsigned.apk","$out\aligned.apk")
$key=Join-Path $out 'local-signing.jks'
if(!(Test-Path $key)){RunChecked "$JavaHome\bin\keytool.exe" @('-genkeypair','-keystore',$key,'-storepass','android','-keypass','android','-alias','newview-local','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=NewView Local Build','-noprompt')}
RunChecked "$BuildTools\apksigner.bat" @('sign','--ks',$key,'--ks-key-alias','newview-local','--ks-pass','pass:android','--key-pass','pass:android','--out',"$out\newview.apk","$out\aligned.apk")
RunChecked "$BuildTools\apksigner.bat" @('verify','--verbose',"$out\newview.apk")
Write-Output "APK: $out\newview.apk"
