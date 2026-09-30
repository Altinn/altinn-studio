[CmdletBinding()]
param(
    [string]$Version
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-PathFromRoot([string]$Path, [string]$Root) {
    if ([IO.Path]::IsPathRooted($Path)) {
        return [IO.Path]::GetFullPath($Path)
    }
    return [IO.Path]::GetFullPath((Join-Path $Root $Path))
}

function Restore-ProcessEnvironment([string]$Name, [AllowNull()][string]$Value) {
    if ($null -eq $Value) {
        Remove-Item "Env:$Name" -ErrorAction SilentlyContinue
    } else {
        Set-Item "Env:$Name" $Value
    }
}

$Root = [IO.Path]::GetFullPath($PSScriptRoot)
if (-not $Version) {
    $Version = "v0.0.1-dev.$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))"
} elseif (-not $Version.StartsWith("v")) {
    $Version = "v$Version"
}

$TargetRoot = if ($env:CARGO_TARGET_DIR) {
    Resolve-PathFromRoot $env:CARGO_TARGET_DIR $Root
} else {
    Resolve-PathFromRoot "../../target" $Root
}
$ReleaseBinDirectory = Join-Path $TargetRoot "release"
$ArchiveDirectory = Join-Path $Root "build/user-install"
$ArchiveName = "agent-$Version.tar.gz"
$Archive = Join-Path $ArchiveDirectory $ArchiveName
$Installer = Join-Path $Root "agent/install.ps1"
$PreviousVersion = [Environment]::GetEnvironmentVariable("AGENT_VERSION", "Process")
$PreviousArchive = [Environment]::GetEnvironmentVariable("AGENT_LOCAL_ARCHIVE", "Process")
$PreviousChecksum = [Environment]::GetEnvironmentVariable("AGENT_LOCAL_ARCHIVE_SHA256", "Process")

Push-Location $Root
try {
    Write-Host "Building experimental Agent $Version..."
    $env:AGENT_VERSION = $Version
    & cargo build --release --locked -p agent --bins
    if ($LASTEXITCODE -ne 0) {
        throw "Cargo build exited with code $LASTEXITCODE"
    }

    foreach ($Binary in @("agentctl.exe", "agentd.exe")) {
        $BinaryPath = Join-Path $ReleaseBinDirectory $Binary
        if (-not (Test-Path -LiteralPath $BinaryPath -PathType Leaf)) {
            throw "Missing Agent binary: $BinaryPath"
        }
    }

    New-Item -ItemType Directory -Force -Path $ArchiveDirectory | Out-Null
    if (Test-Path -LiteralPath $Archive) {
        Remove-Item -LiteralPath $Archive -Force
    }
    & tar.exe -czf $Archive -C $ReleaseBinDirectory agentctl.exe agentd.exe
    if ($LASTEXITCODE -ne 0) {
        throw "Agent packaging exited with code $LASTEXITCODE"
    }

    $Digest = (Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash.ToLowerInvariant()
    $Checksum = "$Digest  $ArchiveName`n"
    [IO.File]::WriteAllText("$Archive.sha256", $Checksum, [Text.UTF8Encoding]::new($false))

    $env:AGENT_LOCAL_ARCHIVE = $Archive
    $env:AGENT_LOCAL_ARCHIVE_SHA256 = "$Archive.sha256"
    & $Installer
    if ($LASTEXITCODE -ne 0) {
        throw "Agent installer exited with code $LASTEXITCODE"
    }
} finally {
    Pop-Location
    Restore-ProcessEnvironment "AGENT_VERSION" $PreviousVersion
    Restore-ProcessEnvironment "AGENT_LOCAL_ARCHIVE" $PreviousArchive
    Restore-ProcessEnvironment "AGENT_LOCAL_ARCHIVE_SHA256" $PreviousChecksum
}
