# Run one experiment iteration against a running augmenter-agent instance.
#
# Usage:
#   .\scripts\run-experiment.ps1 -InputFile examples/applications/julebord-kristiansand.json `
#                                -ExperimentDir training/experiments/exp-baseline `
#                                -Iteration 1
#   .\scripts\run-experiment.ps1 ... -Port 8073                              # custom port
#   .\scripts\run-experiment.ps1 ... -SystemPromptFile prompts/v2.md         # override system prompt
#   .\scripts\run-experiment.ps1 ... -Step checklist-agent                   # pipeline step name
#
# Writes runs/run-NNN.json with:
#   { iteration, timestamp, model, promptLengths, elapsedMs, success, stdout, errorMessage }

param(
    [Parameter(Mandatory = $true)][string]$InputFile,
    [Parameter(Mandatory = $true)][string]$ExperimentDir,
    [Parameter(Mandatory = $true)][int]$Iteration,
    [string]$Step = "checklist-agent",
    [int]$Port = 8072,
    [string]$SystemPromptFile,
    [string]$UserPromptFile
)

$ErrorActionPreference = "Stop"
$base = "http://localhost:$Port"

if (-not (Test-Path $InputFile)) { throw "Input file not found: $InputFile" }

$runsDir = Join-Path $ExperimentDir "runs"
if (-not (Test-Path $runsDir)) { New-Item -ItemType Directory -Path $runsDir | Out-Null }

# 1. Dump the prompts the pipeline would build for this input + step
Write-Host "[1/2] Dumping prompts for step '$Step' from $base..."
$inputJson = Get-Content $InputFile -Raw
$dump = Invoke-RestMethod -Uri "$base/experiment/dump-prompt?step=$Step" -Method Post -Body $inputJson -ContentType "application/json"

$systemPrompt = if ($SystemPromptFile) { Get-Content $SystemPromptFile -Raw } else { $dump.systemPrompt }
$userPrompt   = if ($UserPromptFile)   { Get-Content $UserPromptFile   -Raw } else { $dump.userPrompt }

# 2. Call the agent with those prompts (or overrides)
Write-Host "[2/2] Calling agent (system=$($systemPrompt.Length) chars, user=$($userPrompt.Length) chars)..."
$callBody = @{
    systemPrompt = $systemPrompt
    userPrompt   = $userPrompt
} | ConvertTo-Json -Compress -Depth 10

$callResult = Invoke-RestMethod -Uri "$base/experiment/agent-call" -Method Post -Body $callBody -ContentType "application/json"

$runFile = Join-Path $runsDir ("run-{0:D3}.json" -f $Iteration)
$record = @{
    iteration       = $Iteration
    timestamp       = (Get-Date -Format "o")
    inputFile       = $InputFile
    step            = $Step
    model           = $callResult.model
    promptLengths   = $callResult.promptLengths
    elapsedMs       = $callResult.elapsedMs
    success         = $callResult.success
    stdout          = $callResult.stdout
    errorMessage    = $callResult.errorMessage
    systemPromptSrc = if ($SystemPromptFile) { $SystemPromptFile } else { "pipeline-default" }
    userPromptSrc   = if ($UserPromptFile)   { $UserPromptFile }   else { "pipeline-default" }
}
$record | ConvertTo-Json -Depth 10 | Set-Content -Path $runFile -Encoding UTF8

$status = if ($callResult.success) { "OK" } else { "FAIL" }
$len    = $callResult.stdout.Length
Write-Host ("  [{0}] {1}s, stdout={2} chars  ->  {3}" -f $status, ($callResult.elapsedMs / 1000), $len, $runFile)
