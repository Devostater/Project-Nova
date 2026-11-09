[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidatePattern('^https://')]
  [string]$SiteUrl,
  [string]$OutputApk = 'dist/ProjectNova-Quest.apk',
  [string]$WorkDirectory = '.build/quest-pwa',
  [switch]$Install,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$site = $SiteUrl.TrimEnd('/')
$manifestUrl = "$site/manifest.webmanifest"
$workPath = [IO.Path]::GetFullPath((Join-Path $repoRoot $WorkDirectory))
$outputPath = [IO.Path]::GetFullPath((Join-Path $repoRoot $OutputApk))

function Require-Command([string]$Name, [string]$Help) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. $Help"
  }
}

Require-Command 'node' 'Install Node.js 18 or newer.'
Require-Command 'npx' 'Install Node.js 18 or newer, including npm/npx.'
$nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 18) { throw "Node.js 18+ is required; found $(& node --version)." }

Write-Host "Checking hosted manifest: $manifestUrl"
$manifest = Invoke-RestMethod -Uri $manifestUrl -Method Get
if (-not $manifest.name -or -not $manifest.start_url -or -not $manifest.icons) {
  throw 'Hosted manifest must include name, start_url and icons.'
}
Invoke-WebRequest -Uri "$site/standalone.html" -Method Head | Out-Null
Invoke-WebRequest -Uri "$site/sw.js" -Method Head | Out-Null

if (Test-Path -LiteralPath $workPath) {
  if (-not $Force) {
    throw "Work directory already exists: $workPath. Re-run with -Force to rebuild it."
  }
  $resolvedWork = (Resolve-Path -LiteralPath $workPath).Path
  $allowedRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot '.build'))
  if (-not $resolvedWork.StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to delete a work directory outside $allowedRoot"
  }
  Remove-Item -LiteralPath $resolvedWork -Recurse -Force
}
New-Item -ItemType Directory -Path $workPath -Force | Out-Null

$bubblewrap = @('--yes', '--package', '@meta-quest/bubblewrap-cli@1.24.1', 'bubblewrap')
Push-Location $workPath
try {
  Write-Host 'Initializing the Meta Quest PWA project. Bubblewrap may prompt for signing information.'
  & npx @bubblewrap init "--manifest=$manifestUrl" --metaquest
  if ($LASTEXITCODE -ne 0) { throw "Bubblewrap init failed with exit code $LASTEXITCODE." }

  Get-ChildItem -Path $workPath -Recurse -Filter '*.gradle' -File | ForEach-Object {
    $text = Get-Content -LiteralPath $_.FullName -Raw
    $updated = $text -replace 'jcenter\(\)', 'mavenCentral()'
    $targetReplacement = '$1//noinspection ExpiredTargetSdkVersion' + [Environment]::NewLine + '$1targetSdk 32'
    $updated = $updated -replace '(?m)^(\s*)targetSdk(?:Version)?\s+\d+\s*$', $targetReplacement
    if ($updated -ne $text) {
      [IO.File]::WriteAllText($_.FullName, $updated, [Text.UTF8Encoding]::new($false))
    }
  }

  & npx @bubblewrap build
  if ($LASTEXITCODE -ne 0) { throw "Bubblewrap build failed with exit code $LASTEXITCODE." }
} finally {
  Pop-Location
}

$built = Get-ChildItem -Path $workPath -Recurse -Filter 'app-release-signed.apk' -File |
  Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
if (-not $built) { throw 'Build completed without producing app-release-signed.apk.' }

New-Item -ItemType Directory -Path (Split-Path -Parent $outputPath) -Force | Out-Null
Copy-Item -LiteralPath $built.FullName -Destination $outputPath -Force
Write-Host "Built: $outputPath"

if ($Install) {
  Require-Command 'adb' 'Install Android Platform Tools and enable Developer Mode on the Quest.'
  & adb install -r $outputPath
  if ($LASTEXITCODE -ne 0) { throw "adb install failed with exit code $LASTEXITCODE." }
}

Write-Host 'Open the app once online, wait for the model-loaded indicator, then perform the airplane-mode test in OFFLINE_PLAY.md.'

