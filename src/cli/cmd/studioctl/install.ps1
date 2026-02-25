[CmdletBinding()]
param(
    [string]$Version,
    [string]$Repo,
    [string]$Asset,
    [string]$InstallDir,
    [switch]$SkipResources,
    [switch]$SkipChecksum
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not $Version) { $Version = $env:STUDIOCTL_VERSION }
if (-not $Version) { $Version = "latest" }
if (-not $Repo) { $Repo = $env:STUDIOCTL_REPO }
if (-not $Repo) { $Repo = "Altinn/altinn-studio" }
if (-not $Asset) { $Asset = $env:STUDIOCTL_ASSET }
if (-not $InstallDir) { $InstallDir = $env:STUDIOCTL_INSTALL_DIR }

if (-not $SkipResources -and $env:STUDIOCTL_SKIP_RESOURCES) {
    if ($env:STUDIOCTL_SKIP_RESOURCES -match "^(1|true|TRUE|True)$") {
        $SkipResources = $true
    }
}
if (-not $SkipChecksum -and $env:STUDIOCTL_SKIP_CHECKSUM) {
    if ($env:STUDIOCTL_SKIP_CHECKSUM -match "^(1|true|TRUE|True)$") {
        $SkipChecksum = $true
    }
}

if ($Version -ne "latest") {
    # Strip studioctl/ prefix if present
    if ($Version.StartsWith("studioctl/")) {
        $Version = $Version.Substring("studioctl/".Length)
    }

    # Validate and normalize to tag format
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

$os = "windows"

if (-not $Asset) {
    $Asset = "studioctl-$os-$arch.exe"
}

if (-not $InstallDir -and [Console]::IsInputRedirected) {
    if (-not $env:LOCALAPPDATA) { throw "LOCALAPPDATA not set and -InstallDir not provided" }
    $InstallDir = Join-Path (Join-Path $env:LOCALAPPDATA "Programs") "studioctl"
}

if ($Version -eq "latest") {
    $baseUrl = "https://github.com/$Repo/releases/latest/download"
} else {
    $baseUrl = "https://github.com/$Repo/releases/download/$Version"
}

$url = "$baseUrl/$Asset"
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

    # Parse checksums file to find our asset
    $checksumLines = Get-Content $checksumsPath
    $expected = $null
    foreach ($line in $checksumLines) {
        # Format: checksum  filename or checksum filename
        if ($line -match "^([a-f0-9]{64})\s+(.+)$") {
            if ($Matches[2] -eq $Asset) {
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

    Test-Checksum -BinaryPath $binPath -Asset $Asset -ChecksumsUrl $checksumsUrl

    $selfInstallArgs = @("self", "install")
    if ($InstallDir) { $selfInstallArgs += @("--path", $InstallDir) }
    if ($SkipResources) { $selfInstallArgs += "--skip-resources" }

    & $binPath @selfInstallArgs
} finally {
    if (Test-Path $tmpDir) {
        Remove-Item -Recurse -Force $tmpDir
    }
}
