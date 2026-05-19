# Extract base64-encoded files from a /generate response.
# Usage:
#   .\examples\extract-files.ps1 response.json                 # writes into current dir
#   .\examples\extract-files.ps1 response.json -OutDir out\    # writes into ./out/

param(
    [Parameter(Mandatory = $true)][string]$ResponsePath,
    [string]$OutDir = "."
)

if (-not (Test-Path $ResponsePath)) {
    Write-Error "Response file not found: $ResponsePath"
    exit 1
}

if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}

$response = Get-Content $ResponsePath -Raw | ConvertFrom-Json
foreach ($file in $response.pdfs) {
    $target = Join-Path $OutDir $file.name
    [IO.File]::WriteAllBytes($target, [Convert]::FromBase64String($file.data))
    Write-Host ("{0,12:N0} bytes  →  {1}" -f ([Convert]::FromBase64String($file.data)).Length, $target)
}
