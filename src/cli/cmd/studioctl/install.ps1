[CmdletBinding()]
param(
    [string]$Version,
    [string]$InstallDir,
    [switch]$SkipChecksum
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$DefaultVersion = "__STUDIOCTL_DEFAULT_VERSION__"
if ($DefaultVersion -eq "__STUDIOCTL_DEFAULT_VERSION__") { $DefaultVersion = "latest" }

if (-not $Version) { $Version = $env:STUDIOCTL_VERSION }
if (-not $Version) { $Version = $DefaultVersion }
if (-not $InstallDir) { $InstallDir = $env:STUDIOCTL_INSTALL_DIR }

if (-not $SkipChecksum -and $env:STUDIOCTL_SKIP_CHECKSUM) {
    if ($env:STUDIOCTL_SKIP_CHECKSUM -match "^(1|true|TRUE|True)$") {
        $SkipChecksum = $true
    }
}

if ($Version -ne "latest") {
    if ($Version.StartsWith("studioctl/")) {
        $Version = $Version.Substring("studioctl/".Length)
    }

    if (-not $Version.StartsWith("v")) {
        throw "Invalid version format: $Version (expected vX.Y.Z or studioctl/vX.Y.Z)"
    }

    $Version = "studioctl/$Version"
}

$arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
switch ($arch) {
    "x64" { $arch = "amd64" }
    "arm64" { $arch = "arm64" }
    default { throw "Unsupported architecture: $arch" }
}

$asset = "studioctl-windows-$arch.exe"
$repo = "Altinn/altinn-studio"

if ($Version -eq "latest") {
    $baseUrl = "https://github.com/$repo/releases/latest/download"
} else {
    $baseUrl = "https://github.com/$repo/releases/download/$Version"
}

$url = "$baseUrl/$asset"
$checksumsUrl = "$baseUrl/SHA256SUMS"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("studioctl-" + [System.Guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Path $tmpDir | Out-Null

$binPath = Join-Path $tmpDir "studioctl.exe"

function Get-FileChecksum {
    param([string]$FilePath)
    $hash = Get-FileHash -Path $FilePath -Algorithm SHA256
    return $hash.Hash.ToLowerInvariant()
}

function Test-Checksum {
    param(
        [string]$BinaryPath,
        [string]$Asset,
        [string]$ChecksumsUrl
    )

    if ($SkipChecksum) {
        Write-Host "Skipping checksum verification"
        return
    }

    $checksumsPath = Join-Path $tmpDir "SHA256SUMS"
    try {
        Invoke-WebRequest -Uri $ChecksumsUrl -OutFile $checksumsPath -UseBasicParsing
    } catch {
        throw "Failed to download SHA256SUMS"
    }

    $checksumLines = Get-Content $checksumsPath
    $expected = $null
    foreach ($line in $checksumLines) {
        if ($line -match "^([a-f0-9]{64})\s+(.+)$") {
            $name = $Matches[2].Trim().TrimStart('*')
            if ($name -eq $Asset) {
                $expected = $Matches[1].ToLowerInvariant()
                break
            }
        }
    }

    if (-not $expected) {
        throw "Asset $Asset not found in SHA256SUMS"
    }

    $actual = Get-FileChecksum -FilePath $BinaryPath

    if ($expected -ne $actual) {
        throw @"
Checksum verification failed
  Expected: $expected
  Actual:   $actual

The downloaded binary may be corrupted or tampered with.
Use -SkipChecksum to bypass this check (not recommended).
"@
    }

    Write-Host "Checksum verified: $actual"
}

try {
    Invoke-WebRequest -Uri $url -OutFile $binPath -UseBasicParsing

    Test-Checksum -BinaryPath $binPath -Asset $asset -ChecksumsUrl $checksumsUrl

    $selfInstallArgs = @("self", "install")
    if ($InstallDir) { $selfInstallArgs += @("--path", $InstallDir) }

    & $binPath @selfInstallArgs
} finally {
    if (Test-Path $tmpDir) {
        Remove-Item -Recurse -Force $tmpDir
    }
}
