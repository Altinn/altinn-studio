$ErrorActionPreference = "Stop"

$Repository = if ($env:AGENT_GITHUB_REPOSITORY) { $env:AGENT_GITHUB_REPOSITORY } else { "Altinn/altinn-studio" }
$Version = $env:AGENT_VERSION
$LocalArchive = $env:AGENT_LOCAL_ARCHIVE
$InstallDirectory = if ($env:AGENT_INSTALL_DIR) {
    $env:AGENT_INSTALL_DIR
} else {
    Join-Path $env:LOCALAPPDATA "Agent\bin"
}

if (-not $LocalArchive -and -not $Version) {
    $Releases = Invoke-RestMethod "https://api.github.com/repos/$Repository/releases?per_page=100"
    $Release = $Releases | Where-Object { $_.tag_name -like "experimental-agent/v*" } | Select-Object -First 1
    if (-not $Release) { throw "Could not resolve the latest experimental Agent release" }
    $Version = $Release.tag_name.Substring("experimental-agent/".Length)
}

$Architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
$Platform = switch ($Architecture) {
    "X64" { "windows-x86_64" }
    "Arm64" { "windows-aarch64" }
    default { throw "Unsupported Windows architecture: $Architecture" }
}
$Temporary = Join-Path ([System.IO.Path]::GetTempPath()) ("altinn-agent-install-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $Temporary | Out-Null
try {
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
    New-Item -ItemType Directory -Force -Path $InstallDirectory | Out-Null
    tar -xzf (Join-Path $Temporary $Archive) -C $InstallDirectory
} finally {
    Remove-Item -Recurse -Force $Temporary
}

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (($UserPath -split ';') -notcontains $InstallDirectory) {
    [Environment]::SetEnvironmentVariable("Path", (($UserPath.TrimEnd(';') + ';' + $InstallDirectory).TrimStart(';')), "User")
}
Write-Host "Installed agentctl.exe and agentd.exe to $InstallDirectory"
