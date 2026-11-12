# ADVENTURA Local Development HTTP Web Server
# High Performance & Robust Exception Handler

$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "=======================================================" -ForegroundColor Red
    Write-Host " ADVENTURA Server running at http://localhost:$port/" -ForegroundColor Green
    Write-Host " Status: Active | Exception Handler: Enabled" -ForegroundColor Yellow
    Write-Host "=======================================================" -ForegroundColor Red
} catch {
    Write-Host "Failed to start listener on port $port : $_" -ForegroundColor Red
    exit 1
}

while ($listener.IsListening) {
    $response = $null
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        
        # Security sanitization - prevent path traversal
        $cleanPath = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $filePath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $cleanPath))
        
        # Verify file is within root directory and exists
        if ($filePath.StartsWith($PSScriptRoot) -and (Test-Path $filePath -PathType Leaf)) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Content Type Mapping
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".png"  { $response.ContentType = "image/png" }
                ".gif"  { $response.ContentType = "image/gif" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                ".webp" { $response.ContentType = "image/webp" }
                ".pdf"  { $response.ContentType = "application/pdf" }
                ".mp4"  { $response.ContentType = "video/mp4" }
                ".mov"  { $response.ContentType = "video/quicktime" }
                default { $response.ContentType = "application/octet-stream" }
            }
            
            # Write response safely with exception handling for early client disconnections
            try {
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                # Handle broken pipe or early disconnect silently
            }
        } else {
            $response.StatusCode = 404
            $buf = [System.Text.Encoding]::UTF8.GetBytes("<html><body style='font-family:sans-serif;background:#0a0a0d;color:#fff;text-align:center;padding:50px;'><h2>404 - Resource Not Found</h2><p><a href='/' style='color:#f0281f;'>Return to ADVENTURA Home</a></p></body></html>")
            $response.ContentType = "text/html; charset=utf-8"
            try {
                $response.OutputStream.Write($buf, 0, $buf.Length)
            } catch {}
        }
    } catch {
        # Log unexpected server errors cleanly
    } finally {
        if ($null -ne $response) {
            try { $response.Close() } catch {}
        }
    }
}
