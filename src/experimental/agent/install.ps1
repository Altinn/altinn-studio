$ErrorActionPreference = "Stop"

$Repository = if ($env:AGENT_GITHUB_REPOSITORY) { $env:AGENT_GITHUB_REPOSITORY } else { "Altinn/altinn-studio" }
$Version = $env:AGENT_VERSION
$InstallRoot = if ($env:AGENT_INSTALL_ROOT) { $env:AGENT_INSTALL_ROOT } else { Join-Path $env:LOCALAPPDATA "Agent" }
$BinDirectory = if ($env:AGENT_INSTALL_DIR) { $env:AGENT_INSTALL_DIR } else { Join-Path $InstallRoot "bin" }
$AgentHome = if ($env:AGENT_HOME) { $env:AGENT_HOME } else { Join-Path $env:USERPROFILE ".agent" }
$LocalArchive = $env:AGENT_LOCAL_ARCHIVE
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
$BinDirectory = [IO.Path]::GetFullPath($BinDirectory)
$AgentHome = [IO.Path]::GetFullPath($AgentHome)
if ($LocalArchive) { $LocalArchive = [IO.Path]::GetFullPath($LocalArchive) }
$JournalPath = Join-Path $InstallRoot "update.json"

function Invoke-Completion($Journal) {
    $Target = $Journal.targetRelease
    $TargetVersion = $Journal.targetVersion
    if (-not $Target -or -not $TargetVersion) {
        throw "The Agent update journal does not name a usable staged release: $JournalPath"
    }
    $Agentctl = Join-Path $Target "agentctl.exe"
    if (-not (Test-Path $Agentctl -PathType Leaf)) {
        throw "The Agent update journal does not name a usable staged release: $JournalPath"
    }
    $Arguments = @(
        "--home", $AgentHome, "self", "__complete-update",
        "--install-root", $InstallRoot, "--bin-directory", $BinDirectory,
        "--agent-home", $AgentHome, "--target-release", $Target,
        "--target-version", $TargetVersion, "--repository", $Repository
    )
    if ($Journal.previousRelease) { $Arguments += @("--previous-release", $Journal.previousRelease) }
    & $Agentctl @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Target Agent updater exited with code $LASTEXITCODE" }
}

if (Test-Path $JournalPath -PathType Leaf) {
    $Journal = Get-Content $JournalPath -Raw | ConvertFrom-Json
    if ($Journal.phase -ne "complete") {
        Invoke-Completion $Journal
        Write-Host "Installed agentctl and agentd to $BinDirectory"
        exit 0
    }
}

if ($LocalArchive -and -not $Version) { throw "AGENT_VERSION is required when AGENT_LOCAL_ARCHIVE is set" }
if (-not $Version) {
    $Page = 1
    do {
        $Releases = @(Invoke-RestMethod "https://api.github.com/repos/$Repository/releases?per_page=100&page=$Page")
        $Release = $Releases | Where-Object { $_.tag_name -like "experimental-agent/v*" } | Select-Object -First 1
        $Page++
    } while (-not $Release -and $Releases.Count -eq 100)
    if (-not $Release) { throw "Could not resolve the latest experimental Agent release" }
    $Version = $Release.tag_name.Substring("experimental-agent/".Length)
}
if (-not $Version.StartsWith("v")) { $Version = "v$Version" }

$Architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
$Platform = switch ($Architecture) {
    "X64" { "windows-x86_64" }
    "Arm64" { "windows-aarch64" }
    default { throw "Unsupported Windows architecture: $Architecture" }
}
$Temporary = Join-Path ([System.IO.Path]::GetTempPath()) ("altinn-agent-install-" + [guid]::NewGuid())
$SourceRelease = Join-Path $Temporary "release"
New-Item -ItemType Directory -Path $Temporary | Out-Null
try {
    $ReleasesDirectory = Join-Path $InstallRoot "releases"
    $Target = Join-Path $ReleasesDirectory "$Version-$Platform"
    if (-not (Test-Path $Target -PathType Container)) {
        if ($LocalArchive) {
            $Archive = Split-Path $LocalArchive -Leaf
            Copy-Item $LocalArchive (Join-Path $Temporary $Archive)
            $Checksum = if ($env:AGENT_LOCAL_ARCHIVE_SHA256) { $env:AGENT_LOCAL_ARCHIVE_SHA256 } else { "$LocalArchive.sha256" }
        } else {
            $Archive = "agent-$Platform.tar.gz"
            $Base = "https://github.com/$Repository/releases/download/experimental-agent/$Version"
            Invoke-WebRequest "$Base/$Archive" -OutFile (Join-Path $Temporary $Archive)
            $Checksum = Join-Path $Temporary "$Archive.sha256"
            Invoke-WebRequest "$Base/$Archive.sha256" -OutFile $Checksum
        }
        $Expected = (Get-Content $Checksum -Raw).Split(' ')[0].Trim().ToLowerInvariant()
        $Actual = (Get-FileHash (Join-Path $Temporary $Archive) -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($Actual -ne $Expected) { throw "Agent archive checksum mismatch" }
        New-Item -ItemType Directory -Path $SourceRelease | Out-Null
        Push-Location $Temporary
        try {
            tar -xzf $Archive -C $SourceRelease
            if ($LASTEXITCODE -ne 0) { throw "Failed to extract Agent archive" }
        } finally {
            Pop-Location
        }
        & (Join-Path $SourceRelease "agentctl.exe") --home $AgentHome self __publish-release `
            --install-root $InstallRoot --bin-directory $BinDirectory `
            --source-release $SourceRelease --target-version $Version
        if ($LASTEXITCODE -ne 0) { throw "Target Agent publisher exited with code $LASTEXITCODE" }
    }

    $Previous = $null
    $Current = Join-Path $InstallRoot "current"
    if (Test-Path $Current -PathType Leaf) { $Previous = (Get-Content $Current -Raw).Trim() }
    $Journal = [pscustomobject]@{
        targetRelease = $Target
        targetVersion = $Version
        previousRelease = $Previous
    }
    Invoke-Completion $Journal
} finally {
    if (Test-Path $Temporary) { Remove-Item -Recurse -Force $Temporary }
}

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (($UserPath -split ';') -notcontains $BinDirectory) {
    [Environment]::SetEnvironmentVariable("Path", (($UserPath.TrimEnd(';') + ';' + $BinDirectory).TrimStart(';')), "User")
}
Write-Host "Installed agentctl and agentd to $BinDirectory"
