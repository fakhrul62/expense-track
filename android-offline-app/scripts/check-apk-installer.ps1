param([string]$Device = 'emulator-5554')
$ErrorActionPreference = 'Stop'
$adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
function Run-Adb { & $adb -s $Device @args; if ($LASTEXITCODE -ne 0) { throw 'ADB command failed' } }
function Read-Ui {
    Run-Adb shell uiautomator dump /sdcard/exptrack-installer.xml | Out-Null
    Run-Adb pull /sdcard/exptrack-installer.xml .tools/installer-current.xml | Out-Null
    [xml]$xml = Get-Content .tools/installer-current.xml
    return $xml
}
function Tap-Text([string]$Label) {
    $xml = Read-Ui
    $node = $xml.SelectNodes('//node') | Where-Object { $_.text -eq $Label } | Select-Object -First 1
    if (!$node) { throw "Installer control missing: $Label" }
    $numbers = [regex]::Matches($node.bounds, '\d+') | ForEach-Object { [int]$_.Value }
    Run-Adb shell input tap (($numbers[0] + $numbers[2]) / 2) (($numbers[1] + $numbers[3]) / 2) | Out-Null
}
Run-Adb push dist/EXPTRACK-1.1.0.apk /sdcard/Download/EXPTRACK-1.1.0.apk
Run-Adb shell appops set com.android.documentsui REQUEST_INSTALL_PACKAGES allow
Run-Adb shell am start -a android.intent.action.VIEW -d content://com.android.externalstorage.documents/root/primary -n com.android.documentsui/.files.FilesActivity
$xml = Read-Ui
if (!($xml.SelectNodes('//node') | Where-Object { $_.text -eq 'EXPTRACK-1.1.0.apk' })) {
    Tap-Text 'Download'
    $xml = Read-Ui
    if (!($xml.SelectNodes('//node') | Where-Object { $_.text -eq 'EXPTRACK-1.1.0.apk' })) { Tap-Text 'Download' }
}
Tap-Text 'EXPTRACK-1.1.0.apk'
$xml = Read-Ui
if ($xml.SelectNodes('//node') | Where-Object { $_.text -eq 'CONTINUE' }) { Tap-Text 'CONTINUE' }
Tap-Text 'INSTALL'
for ($attempt = 0; $attempt -lt 8; $attempt++) {
    $xml = Read-Ui
    if ($xml.SelectNodes('//node') | Where-Object { $_.text -eq 'App installed.' }) {
        Run-Adb pull /sdcard/exptrack-installer.xml "test-results/install-1.1.0-$Device.xml"
        Run-Adb shell screencap -p /sdcard/exptrack-install.png
        Run-Adb pull /sdcard/exptrack-install.png "test-results/install-1.1.0-$Device.png"
        Write-Output "PASS: Android package installer displayed App installed on $Device"
        exit 0
    }
}
throw 'Package installer did not confirm installation'
