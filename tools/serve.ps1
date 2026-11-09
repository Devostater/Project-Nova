# Tiny static file server for Project Nova (used when Python is not installed). Ctrl+C or close the window to stop.
param([string]$Root = "..", [int]$Port = 8000)
$Root = (Resolve-Path $Root).Path
$types = @{ '.html'='text/html'; '.js'='text/javascript'; '.mjs'='text/javascript'; '.json'='application/json'; '.webmanifest'='application/manifest+json';
  '.glb'='model/gltf-binary'; '.gltf'='model/gltf+json'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.mp3'='audio/mpeg'; '.wav'='audio/wav'; '.mp4'='video/mp4'; '.webm'='video/webm'; '.vtt'='text/vtt'; '.css'='text/css'; '.ico'='image/x-icon' }
$l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$Port/"); $l.Start()
Write-Host " Serving $Root on http://localhost:$Port/  (Quest: http://localhost:$Port/standalone.html)"
while ($l.IsListening) {
  $c = $l.GetContext(); $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/')); if ($p -eq '') { $p = 'standalone.html' }
  $f = Join-Path $Root $p
  try {
    if ((Test-Path $f -PathType Leaf) -and ((Resolve-Path $f).Path.StartsWith($Root))) {
      $ext = [IO.Path]::GetExtension($f).ToLower(); $c.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' })
      $c.Response.Headers.Add("Accept-Ranges", "bytes")
      $rangeHeader = $c.Request.Headers["Range"]
      $fi = New-Object IO.FileInfo($f)
      $totalLen = $fi.Length

      if ($rangeHeader -and $rangeHeader.StartsWith("bytes=")) {
        $ranges = $rangeHeader.Substring(6).Split("-")
        $start = [int64]$ranges[0]
        $end = if ($ranges.Length -gt 1 -and $ranges[1] -ne "") { [int64]$ranges[1] } else { $totalLen - 1 }
        if ($end -ge $totalLen) { $end = $totalLen - 1 }
        $count = $end - $start + 1
        $c.Response.StatusCode = 206
        $c.Response.Headers.Add("Content-Range", "bytes $start-$end/$totalLen")
        $c.Response.ContentLength64 = $count
        $fs = [IO.File]::OpenRead($f)
        try {
          $fs.Seek($start, [IO.SeekOrigin]::Begin) | Out-Null
          $buffer = New-Object byte[] 65536
          $bytesRemaining = $count
          while ($bytesRemaining -gt 0) {
            $bytesToRead = [Math]::Min($bytesRemaining, [int64]$buffer.Length)
            $bytesRead = $fs.Read($buffer, 0, [int]$bytesToRead)
            if ($bytesRead -le 0) { break }
            $c.Response.OutputStream.Write($buffer, 0, $bytesRead)
            $bytesRemaining -= $bytesRead
          }
        } finally { $fs.Close() }
      } else {
        $c.Response.ContentLength64 = $totalLen
        $fs = [IO.File]::OpenRead($f)
        try { $fs.CopyTo($c.Response.OutputStream) } finally { $fs.Close() }
      }
    } else { $c.Response.StatusCode = 404 }
  } catch { $c.Response.StatusCode = 500 }
  $c.Response.Close()
}
