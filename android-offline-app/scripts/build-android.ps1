$ErrorActionPreference = 'Stop'
function Get-ApkSha256([string]$FilePath) {
    $stream = [IO.File]::OpenRead((Join-Path $PWD $FilePath))
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
    finally { $stream.Dispose(); $algorithm.Dispose() }
}
Set-Location (Split-Path -Parent $PSScriptRoot)
if (!$env:JAVA_HOME -or !(Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $localJdk = Get-ChildItem .tools -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if (!$localJdk) { throw 'Set JAVA_HOME to a JDK 21 installation.' }
    $env:JAVA_HOME = $localJdk.FullName
}
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
if (!$env:ANDROID_HOME) { throw 'Set ANDROID_HOME to an Android SDK with platform 36 and build-tools 36.0.0.' }
$sdkPath = $env:ANDROID_HOME.Replace('\', '/')
[IO.File]::WriteAllText("$PWD\android\local.properties", "sdk.dir=$sdkPath`n")
New-Item -ItemType Directory -Force .keys,dist,build/apk | Out-Null
$apkName = 'EXPTRACK-1.10.0.apk'
$stagedApk = "build/apk/$apkName"
$finalApk = "dist/$apkName"
if (!(Test-Path .keys/release.json)) {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    @{ password = [Convert]::ToBase64String($bytes) } | ConvertTo-Json | Set-Content .keys/release.json
}
$env:EXPTRACK_SIGNING_PASSWORD = (Get-Content .keys/release.json | ConvertFrom-Json).password
try {
    if (!(Test-Path .keys/exptrack-release.jks)) {
        & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -keystore .keys/exptrack-release.jks -alias exptrack -keyalg RSA -keysize 3072 -validity 10000 -storepass:env EXPTRACK_SIGNING_PASSWORD -keypass:env EXPTRACK_SIGNING_PASSWORD -dname 'CN=EXPTRACK, OU=Android, O=EXPTRACK, C=BD'
        if ($LASTEXITCODE -ne 0) { throw 'Signing key generation failed.' }
    }
    & npm.cmd run build:mobile
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
    & npx.cmd cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'Android sync failed.' }
    Push-Location android
    try { & .\gradlew.bat :app:assembleRelease :app:assembleDebug --console=plain; if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' } }
    finally { Pop-Location }
    $buildTools = Join-Path $env:ANDROID_HOME 'build-tools\36.0.0'
    & "$buildTools\zipalign.exe" -f -p 4 android/app/build/outputs/apk/release/app-release-unsigned.apk build/apk/exptrack-aligned.apk
    if ($LASTEXITCODE -ne 0) { throw 'APK alignment failed.' }
    & "$buildTools\apksigner.bat" sign --ks .keys/exptrack-release.jks --ks-key-alias exptrack --ks-pass env:EXPTRACK_SIGNING_PASSWORD --key-pass env:EXPTRACK_SIGNING_PASSWORD --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --v4-signing-enabled false --out $stagedApk build/apk/exptrack-aligned.apk
    if ($LASTEXITCODE -ne 0) { throw 'APK signing failed.' }
    & "$buildTools\apksigner.bat" verify --verbose --min-sdk-version 24 $stagedApk
    if ($LASTEXITCODE -ne 0) { throw 'APK verification failed.' }
    # Force verification of the legacy JAR signature too; API 24+ prefers v2/v3.
    & "$buildTools\apksigner.bat" verify --min-sdk-version 23 --max-sdk-version 23 $stagedApk *> build/apk/legacy-signature-verification.txt
    if ($LASTEXITCODE -ne 0) { throw 'Legacy APK signature verification failed.' }
    & "$buildTools\zipalign.exe" -c -p 4 $stagedApk
    if ($LASTEXITCODE -ne 0) { throw 'Signed APK alignment verification failed.' }
    Copy-Item -LiteralPath $stagedApk -Destination $finalApk -Force
    if ((Get-ApkSha256 $stagedApk) -ne (Get-ApkSha256 $finalApk)) { throw 'Delivered APK differs from verified APK.' }
    $hash = [pscustomobject]@{ Algorithm = 'SHA256'; Hash = Get-ApkSha256 $finalApk; Path = (Join-Path $PWD $finalApk) }
    "$($hash.Hash.ToLower())  $apkName" | Set-Content "dist/$apkName.sha256" -Encoding ascii
    $releaseVersion = (Get-Content package.json | ConvertFrom-Json).version
    $releaseCode = [int]([regex]::Match((Get-Content android/app/build.gradle -Raw), 'versionCode\s+(\d+)').Groups[1].Value)
    if ($apkName -ne "EXPTRACK-$releaseVersion.apk" -or $releaseCode -lt 1) { throw 'Release version metadata does not match the APK.' }
    @{ version = $releaseVersion; code = $releaseCode; sha256 = $hash.Hash.ToLower() } | ConvertTo-Json | Set-Content android-update.json -Encoding ascii
    $hash | Format-List
} finally { Remove-Item Env:EXPTRACK_SIGNING_PASSWORD -ErrorAction SilentlyContinue }
