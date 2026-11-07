
[CmdletBinding()]
param(
  [string]$RepositoryRoot = (Join-Path $PSScriptRoot '..')
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $RepositoryRoot).Path
$failures = [Collections.Generic.List[string]]::new()

function Read-CacheList([string]$Path) {
  $entries = [Collections.Generic.List[string]]::new()
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*["'']\./([^"'']+)["'']\s*,?\s*$') {
      $entries.Add($Matches[1].Replace('/', [IO.Path]::DirectorySeparatorChar))
    }
  }
  return $entries
}

function Check-Tree([string]$TreeRoot, [string]$WorkerPath) {
  $entries = Read-CacheList $WorkerPath
  if (-not $entries.Count) { $failures.Add("No FILES entries found in $WorkerPath"); return @() }
  $duplicates = $entries | Group-Object | Where-Object Count -gt 1
  foreach ($duplicate in $duplicates) { $failures.Add("Duplicate cache entry in ${WorkerPath}: $($duplicate.Name)") }
  foreach ($entry in $entries) {
    if (-not (Test-Path -LiteralPath (Join-Path $TreeRoot $entry) -PathType Leaf)) {
      $failures.Add("Missing cached file under ${TreeRoot}: $entry")
    }
  }
  return $entries
}

$rootEntries = Check-Tree $root (Join-Path $root 'sw.js')
$publicRoot = Join-Path $root 'public'
$publicEntries = Check-Tree $publicRoot (Join-Path $publicRoot 'sw.js')

$rootOnly = Compare-Object $rootEntries $publicEntries | Where-Object SideIndicator -eq '<='
$publicOnly = Compare-Object $rootEntries $publicEntries | Where-Object SideIndicator -eq '=>'
foreach ($item in $rootOnly) { $failures.Add("Cache-list mismatch; root only: $($item.InputObject)") }
foreach ($item in $publicOnly) { $failures.Add("Cache-list mismatch; public only: $($item.InputObject)") }

foreach ($manifestPath in @((Join-Path $root 'manifest.webmanifest'), (Join-Path $publicRoot 'manifest.webmanifest'))) {
  try {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if (-not $manifest.name) { $failures.Add("$manifestPath has no name") }
    if (-not $manifest.start_url) { $failures.Add("$manifestPath has no start_url") }
    if (-not $manifest.icons -or $manifest.icons.Count -eq 0) { $failures.Add("$manifestPath has no icons") }
  } catch {
    $failures.Add("Invalid manifest JSON at ${manifestPath}: $($_.Exception.Message)")
  }
}

if ($failures.Count) {
  $failures | ForEach-Object { Write-Error $_ -ErrorAction Continue }
  throw "Offline audit failed with $($failures.Count) issue(s)."
}

Write-Host "Offline audit passed: $($rootEntries.Count) cached files exist in both root and public trees."

