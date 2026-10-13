$ErrorActionPreference='Stop'
$taskVersion='1.0.4258.31'
$taskExpectedHash='56F7F4B8BF9AEE4B8EFEFBBDD4F67D5F74EBD1B100ED0806DA71BF76AF481AA9'
$taskRoot=[IO.Path]::GetFullPath($PSScriptRoot)
$taskSdkPath=Join-Path $taskRoot 'sdk'
$taskPackagePath=Join-Path $taskRoot 'webview2.nupkg'
$taskUrl='https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/'+$taskVersion
if(Test-Path -LiteralPath (Join-Path $taskSdkPath 'lib\net462\Microsoft.Web.WebView2.Core.dll')) {
  Write-Output ('WebView2 SDK is already present at '+$taskSdkPath)
  exit 0
}
if(!(Test-Path -LiteralPath $taskPackagePath)) {
  & curl.exe --fail --location --retry 2 --connect-timeout 20 --max-time 180 $taskUrl --output $taskPackagePath
  if($LASTEXITCODE -ne 0){throw 'Download failed. Retry from a network that can reach the official NuGet service.'}
}
$taskHash=(Get-FileHash -LiteralPath $taskPackagePath -Algorithm SHA256).Hash
if($taskHash -ne $taskExpectedHash){throw 'The official SDK package digest did not match the pinned release. No package code has been loaded.'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskStagingPath=Join-Path $taskRoot ('sdk-stage-'+[Guid]::NewGuid().ToString('N'))
[IO.Compression.ZipFile]::ExtractToDirectory($taskPackagePath,$taskStagingPath)
$taskPrefix=$taskRoot.TrimEnd([IO.Path]::DirectorySeparatorChar)+[IO.Path]::DirectorySeparatorChar
if(!([IO.Path]::GetFullPath($taskStagingPath).StartsWith($taskPrefix,[StringComparison]::OrdinalIgnoreCase)) -or !([IO.Path]::GetFullPath($taskSdkPath).StartsWith($taskPrefix,[StringComparison]::OrdinalIgnoreCase))){throw 'SDK directories must remain inside this source folder.'}
if(Test-Path -LiteralPath $taskSdkPath){throw 'An incomplete sdk directory exists. Inspect it before moving the verified sdk-stage directory into place.'}
Move-Item -LiteralPath $taskStagingPath -Destination $taskSdkPath
$taskSignature=Get-AuthenticodeSignature -FilePath (Join-Path $taskSdkPath 'runtimes\win-x64\native\WebView2Loader.dll')
if($taskSignature.Status -ne 'Valid'){throw 'The Microsoft native loader signature could not be verified on this computer.'}
Write-Output ('Installed Microsoft.Web.WebView2 '+$taskVersion+'; package SHA256 '+$taskHash)
