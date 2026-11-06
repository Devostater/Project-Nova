# Creates cert.pem + key.pem (self-signed, 5 years) next to this script. No OpenSSL needed.
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
         Where-Object { $_.IPAddress -notlike '169.254*' } | ForEach-Object { $_.IPAddress })
$san = 'DNS=localhost&DNS=' + $env:COMPUTERNAME + '&' + (($ips | ForEach-Object { 'IPAddress=' + $_ }) -join '&')
$cert = New-SelfSignedCertificate -Subject 'CN=nova-local' -KeyAlgorithm RSA -KeyLength 2048 `
        -KeyExportPolicy Exportable -CertStoreLocation 'Cert:\CurrentUser\My' `
        -NotAfter (Get-Date).AddYears(5) -TextExtension @("2.5.29.17={text}$san")
function Wrap($label, [byte[]]$bytes) {
    "-----BEGIN $label-----`n" + [Convert]::ToBase64String($bytes, 'InsertLineBreaks').Replace("`r", '') + "`n-----END $label-----`n"
}
$rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
try { $keyBytes = $rsa.ExportPkcs8PrivateKey() }
catch { $keyBytes = $rsa.Key.Export([System.Security.Cryptography.CngKeyBlobFormat]::Pkcs8PrivateBlob) }
[IO.File]::WriteAllText((Join-Path $dir 'cert.pem'), (Wrap 'CERTIFICATE' $cert.RawData), [Text.Encoding]::ASCII)
[IO.File]::WriteAllText((Join-Path $dir 'key.pem'),  (Wrap 'PRIVATE KEY' $keyBytes),      [Text.Encoding]::ASCII)
Remove-Item ("Cert:\CurrentUser\My\" + $cert.Thumbprint) -ErrorAction SilentlyContinue
Write-Host 'Certificate created.'
