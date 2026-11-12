param(
    [string]$PdfPath,
    [string]$Prefix
)

$bytes = [System.IO.File]::ReadAllBytes($PdfPath)
Write-Host "PDF Bytes: $($bytes.Length)"

$jpgStarts = @()
for ($i = 0; $i -lt ($bytes.Length - 3); $i++) {
    if ($bytes[$i] -eq 0xFF -and $bytes[$i+1] -eq 0xD8 -and $bytes[$i+2] -eq 0xFF) {
        $jpgStarts += $i
    }
}
Write-Host "JPG Starts Count: $($jpgStarts.Count)"

for ($k = 0; $k -lt $jpgStarts.Count; $k++) {
    $start = $jpgStarts[$k]
    $end = $bytes.Length
    for ($j = ($start + 2); $j -lt ($bytes.Length - 1); $j++) {
        if ($bytes[$j] -eq 0xFF -and $bytes[$j+1] -eq 0xD9) {
            $end = $j + 2
            break
        }
    }
    $len = $end - $start
    if ($len -gt 30000) {
        $imgBytes = New-Object byte[] $len
        [Array]::Copy($bytes, $start, $imgBytes, 0, $len)
        $outFile = "c:\Users\KIIT\Downloads\adventura real estate\adventura ai project\adventura website\${Prefix}_img_${k}.jpg"
        $publicOutFile = "c:\Users\KIIT\Downloads\adventura real estate\adventura ai project\adventura website\public\${Prefix}_img_${k}.jpg"
        [System.IO.File]::WriteAllBytes($outFile, $imgBytes)
        [System.IO.File]::WriteAllBytes($publicOutFile, $imgBytes)
        Write-Host "Extracted: $outFile ($len bytes)"
    }
}
