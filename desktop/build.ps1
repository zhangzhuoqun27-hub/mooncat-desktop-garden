param(
  [string]$AssetDirectory = (Join-Path $PSScriptRoot '..\app'),
  [string]$OutputPath = (Join-Path $PSScriptRoot 'Mooncat-dev.exe')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskAssetPath = (Resolve-Path -LiteralPath $AssetDirectory).Path
$taskBuildPath = [IO.Path]::GetFullPath($PSScriptRoot)
$taskOutputPath = [IO.Path]::GetFullPath($OutputPath)
$taskZipPath = Join-Path $taskBuildPath 'garden-assets.zip'
if (Test-Path -LiteralPath $taskZipPath) { Remove-Item -LiteralPath $taskZipPath }
[IO.Compression.ZipFile]::CreateFromDirectory($taskAssetPath,$taskZipPath,[IO.Compression.CompressionLevel]::Optimal,$false)
$taskDigest = (Get-FileHash -LiteralPath $taskZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText((Join-Path $taskBuildPath 'assets.sha256'),$taskDigest,[Text.Encoding]::ASCII)
& (Join-Path $PSScriptRoot 'make-icon.ps1')
$taskSdk = Join-Path $taskBuildPath 'sdk'
$taskCompiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$taskArguments = @(
  '/nologo', '/target:winexe', '/platform:x64', '/optimize+', '/utf8output',
  ('/out:' + $taskOutputPath),
  ('/win32manifest:' + (Join-Path $taskBuildPath 'app.manifest')),
  ('/win32icon:' + (Join-Path $taskBuildPath 'mooncat.ico')),
  '/reference:System.dll', '/reference:System.Core.dll', '/reference:System.Drawing.dll', '/reference:System.Windows.Forms.dll',
  '/reference:System.IO.Compression.dll', '/reference:System.IO.Compression.FileSystem.dll', '/reference:System.Web.Extensions.dll',
  ('/reference:' + (Join-Path $taskSdk 'lib\net462\Microsoft.Web.WebView2.Core.dll')),
  ('/reference:' + (Join-Path $taskSdk 'lib\net462\Microsoft.Web.WebView2.WinForms.dll')),
  ('/resource:' + $taskZipPath + ',Mooncat.assets.zip'),
  ('/resource:' + (Join-Path $taskBuildPath 'assets.sha256') + ',Mooncat.assets.sha256'),
  ('/resource:' + (Join-Path $taskBuildPath 'mooncat.ico') + ',Mooncat.icon.ico'),
  ('/resource:' + (Join-Path $taskSdk 'lib\net462\Microsoft.Web.WebView2.Core.dll') + ',Mooncat.sdk.Microsoft.Web.WebView2.Core.dll'),
  ('/resource:' + (Join-Path $taskSdk 'lib\net462\Microsoft.Web.WebView2.WinForms.dll') + ',Mooncat.sdk.Microsoft.Web.WebView2.WinForms.dll'),
  ('/resource:' + (Join-Path $taskSdk 'runtimes\win-x64\native\WebView2Loader.dll') + ',Mooncat.sdk.WebView2Loader.dll'),
  ('/resource:' + (Join-Path $taskSdk 'LICENSE.txt') + ',Mooncat.sdk.LICENSE.txt'),
  ('/resource:' + (Join-Path $taskSdk 'NOTICE.txt') + ',Mooncat.sdk.NOTICE.txt'),
  (Join-Path $taskBuildPath 'Mooncat.cs'),
  (Join-Path $taskBuildPath 'RoamingCat.cs')
)
New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($taskOutputPath)) -Force | Out-Null
& $taskCompiler @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'C# compilation failed.' }
Get-Item -LiteralPath $taskOutputPath | Select-Object FullName,Length
Get-FileHash -LiteralPath $taskOutputPath -Algorithm SHA256
Write-Output ('Asset archive SHA256: ' + $taskDigest)
