# Tiny static file server for Project Nova (used when Python is not installed). Ctrl+C or close the window to stop.
param([string]$Root = "..", [int]$Port = 8000)
$Root = (Resolve-Path $Root).Path
$types = @{ '.html'='text/html'; '.js'='text/javascript'; '.mjs'='text/javascript'; '.json'='application/json'; '.webmanifest'='application/manifest+json';
  '.glb'='model/gltf-binary'; '.gltf'='model/gltf+json'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.mp3'='audio/mpeg'; '.wav'='audio/wav'; '.css'='text/css'; '.ico'='image/x-icon' }
$l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$Port/"); $l.Start()
Write-Host " Serving $Root on http://localhost:$Port/  (Quest: http://localhost:$Port/standalone.html)"
while ($l.IsListening) {
  $c = $l.GetContext(); $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/')); if ($p -eq '') { $p = 'standalone.html' }
  $f = Join-Path $Root $p
  try {
    if ((Test-Path $f -PathType Leaf) -and ((Resolve-Path $f).Path.StartsWith($Root))) {
      $ext = [IO.Path]::GetExtension($f).ToLower(); $c.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' })
      $b = [IO.File]::ReadAllBytes($f); $c.Response.ContentLength64 = $b.Length; $c.Response.OutputStream.Write($b, 0, $b.Length)
    } else { $c.Response.StatusCode = 404 }
  } catch { $c.Response.StatusCode = 500 }
  $c.Response.Close()
}
