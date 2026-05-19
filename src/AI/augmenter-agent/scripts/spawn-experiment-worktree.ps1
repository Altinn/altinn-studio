# Spin up an isolated worktree for a sub-agent experiment: branch, .env copy,
# .pi-state folder, container on its own port.
#
# Usage:
#   .\scripts\spawn-experiment-worktree.ps1 -Name prompt-tweaks -Port 8073
#
# After running, cd into the new worktree and the container is already up.
# Stop with: docker compose -f docker-compose.yaml -f docker-compose.exp.yaml --project-name augmenter-exp-<name> down

param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][int]$Port,
    [string]$BaseBranch = "feat/augmenter-agent-v0.3-autoresearch",
    [string]$Hypothesis
)

$ErrorActionPreference = "Stop"

# Resolve paths: this script lives in src/AI/augmenter-agent/scripts/.
# Worktrees should be siblings of the *repo root*, not the agent subfolder.
$agentDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$repoRoot = & git -C $agentDir rev-parse --show-toplevel
$repoParent = Split-Path $repoRoot -Parent
$repoName = Split-Path $repoRoot -Leaf

$worktreeDir = Join-Path $repoParent "$repoName.exp-$Name"
$worktreeAgentDir = Join-Path $worktreeDir "src\AI\augmenter-agent"
$expBranch = "feat/augmenter-agent-v0.3-exp-$Name"
$composeProject = "augmenter-exp-$Name"
$piStateDir = "./.pi-state-$Name"

Write-Host "Spawning experiment worktree:"
Write-Host "  name           : $Name"
Write-Host "  worktree path  : $worktreeDir"
Write-Host "  branch         : $expBranch"
Write-Host "  port           : $Port"
Write-Host "  compose project: $composeProject"
Write-Host ""

if (Test-Path $worktreeDir) { throw "Worktree path already exists: $worktreeDir" }

# 1. Create worktree on a new branch
& git -C $agentDir worktree add $worktreeDir -b $expBranch $BaseBranch
if ($LASTEXITCODE -ne 0) { throw "git worktree add failed" }

# 2. Copy .env (gitignored, must be present per-worktree)
$srcEnv = Join-Path $agentDir ".env"
$dstEnv = Join-Path $worktreeAgentDir ".env"
if (Test-Path $srcEnv) {
    Copy-Item $srcEnv $dstEnv
    Write-Host "Copied .env to new worktree"
} else {
    Write-Warning ".env not found at $srcEnv — sub-agent must create one before docker compose up"
}

# 3. Create the .pi-state folder
$piStatePath = Join-Path $worktreeAgentDir ".pi-state-$Name"
New-Item -ItemType Directory -Path $piStatePath -Force | Out-Null

# 4. Scaffold the experiment folder with templates
$expDir = Join-Path $worktreeAgentDir "training\experiments\exp-$Name"
New-Item -ItemType Directory -Path "$expDir\runs" -Force | Out-Null
New-Item -ItemType Directory -Path "$expDir\artifacts" -Force | Out-Null

$templatesDir = Join-Path $agentDir "training\experiments\_templates"
foreach ($f in @("HYPOTHESIS.md", "LOG.md", "SYNTHESIS.md")) {
    $src = Join-Path $templatesDir $f
    $dst = Join-Path $expDir $f
    if (Test-Path $src) {
        $content = Get-Content $src -Raw
        $content = $content -replace "{{NAME}}", $Name `
                            -replace "{{PORT}}", $Port `
                            -replace "{{BRANCH}}", $expBranch `
                            -replace "{{DATE}}", (Get-Date -Format "yyyy-MM-dd")
        if ($Hypothesis -and $f -eq "HYPOTHESIS.md") {
            $content = $content -replace "{{HYPOTHESIS}}", $Hypothesis
        }
        Set-Content -Path $dst -Value $content -Encoding UTF8
    }
}

# 5. Start the container with overlay
Write-Host ""
Write-Host "Starting container..."
Push-Location $worktreeAgentDir
try {
    $env:EXP_NAME = $Name
    $env:EXP_PORT = "$Port"
    $env:EXP_PI_DIR = $piStateDir
    & docker compose -f docker-compose.yaml -f docker-compose.exp.yaml --project-name $composeProject up -d --build
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }

    # Health wait
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) { break }
        } catch { Start-Sleep -Seconds 1 }
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "=== Experiment worktree ready ==="
Write-Host "Working dir : $worktreeAgentDir"
Write-Host "Health      : http://localhost:$Port/health"
Write-Host "Stop with   : cd $worktreeAgentDir; docker compose -f docker-compose.yaml -f docker-compose.exp.yaml --project-name $composeProject down"
Write-Host "Remove with : git worktree remove $worktreeDir"
