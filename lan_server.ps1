$port = 3000
$distPath = Join-Path $PSScriptRoot "dist"

if (-not (Test-Path $distPath)) {
    Write-Host "[!] Error: 'dist' folder not found. Please build the project first." -ForegroundColor Red
    Pause
    exit 1
}

# Discover local LAN IP
$lanIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" } | Select-Object -ExpandProperty IPAddress -First 1)
if (-not $lanIP) { $lanIP = "127.0.0.1" }

Clear-Host
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "       🌌 WORMHOLE RESURRECTED // PORTABLE LAN SERVER 🌌        " -ForegroundColor Yellow
Write-Host "================================================================`n" -ForegroundColor Cyan
Write-Host "  [+] Local Host URL:   http://localhost:$port" -ForegroundColor Green
Write-Host "  [+] LAN Player URL:   http://$($lanIP):$port" -ForegroundColor Magenta
Write-Host "`n----------------------------------------------------------------" -ForegroundColor Gray
Write-Host "  Share the LAN Player URL with anyone on your local Wi-Fi/LAN!" -ForegroundColor White
Write-Host "  Press Ctrl + C in this window to stop the server." -ForegroundColor Gray
Write-Host "================================================================`n" -ForegroundColor Cyan

# Launch default browser
Start-Process "http://localhost:$port"

# Native .NET HttpListener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:$port/")
try {
    $listener.Start()
} catch {
    # If wildcard binding requires admin, bind to localhost + lanIP
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Prefixes.Add("http://127.0.0.1:$port/")
    $listener.Start()
}

$mimeTypes = @{
    ".html" = "text/html; charset=UTF-8"
    ".js"   = "application/javascript; charset=UTF-8"
    ".css"  = "text/css; charset=UTF-8"
    ".json" = "application/json; charset=UTF-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".wav"  = "audio/wav"
    ".mp3"  = "audio/mpeg"
    ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    $res.Headers.Add("Access-Control-Allow-Origin", "*")
    $res.Headers.Add("Cache-Control", "no-cache")

    $urlPath = $req.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrEmpty($urlPath) -or $urlPath -eq "") {
        $urlPath = "index.html"
    }

    $targetFile = Join-Path $distPath $urlPath
    if (-not (Test-Path $targetFile -PathType Leaf)) {
        $targetFile = Join-Path $distPath "index.html"
    }

    $ext = [System.IO.Path]::GetExtension($targetFile).ToLower()
    $mime = $mimeTypes[$ext]
    if (-not $mime) { $mime = "application/octet-stream" }

    try {
        $bytes = [System.IO.File]::ReadAllBytes($targetFile)
        $res.ContentType = $mime
        $res.ContentLength64 = $bytes.Length
        $res.StatusCode = 200
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
        $res.StatusCode = 500
    } finally {
        $res.OutputStream.Close()
    }
}
