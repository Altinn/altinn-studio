# Capture the raw checklist JSON the agent produces for the gold-standard input.
# evaluate.py needs a structured gold-checklist.json to score against (the PDFs
# in gold-standard/ aren't machine-readable for per-point comparison).
#
# Usage:
#   .\scripts\capture-gold-checklist.ps1                            # against local Claude on :8072
#   .\scripts\capture-gold-checklist.ps1 -Port 8072 -InputFile examples/applications/julebord-kristiansand.json
#
# Requires the agent to be running with a model that produces valid JSON
# (Claude CLI locally, or a tuned Pi setup).

param(
    [string]$InputFile = "examples/applications/julebord-kristiansand.json",
    [int]$Port = 8072,
    [string]$OutputFile = "training/gold-standard/gold-checklist.json"
)

$ErrorActionPreference = "Stop"
$base = "http://localhost:$Port"

if (-not (Test-Path $InputFile)) { throw "Input not found: $InputFile" }

Write-Host "Dumping prompt..."
$inputJson = Get-Content $InputFile -Raw
$dump = Invoke-RestMethod -Uri "$base/experiment/dump-prompt?step=checklist-agent" -Method Post `
    -Body $inputJson -ContentType "application/json"

Write-Host "Calling agent (system=$($dump.systemPrompt.Length) chars, user=$($dump.userPrompt.Length) chars)..."
$callBody = @{
    systemPrompt = $dump.systemPrompt
    userPrompt   = $dump.userPrompt
} | ConvertTo-Json -Compress -Depth 10

$result = Invoke-RestMethod -Uri "$base/experiment/agent-call" -Method Post -Body $callBody -ContentType "application/json"

if (-not $result.success) {
    throw "Agent call failed: $($result.errorMessage)"
}
if (-not $result.stdout) {
    throw "Agent returned empty output. Cannot use as gold standard."
}

# Strip markdown fences if present (mirror DefaultResponseParser)
$json = $result.stdout.Trim()
if ($json.StartsWith("``````")) {
    $nl = $json.IndexOf("`n")
    if ($nl -ge 0) { $json = $json.Substring($nl + 1) }
}
if ($json.EndsWith("``````")) {
    $json = $json.Substring(0, $json.Length - 3).TrimEnd()
}

# Verify it parses
$parsed = $json | ConvertFrom-Json
if (-not $parsed.sjekkliste) {
    throw "Response is missing 'sjekkliste' root key. Got: $($json.Substring(0, [Math]::Min(300, $json.Length)))"
}

# Save pretty-printed
$pretty = $parsed | ConvertTo-Json -Depth 20
Set-Content -Path $OutputFile -Value $pretty -Encoding UTF8
Write-Host "Saved $($json.Length) chars to $OutputFile"
Write-Host "Model used: $($result.model), elapsed: $($result.elapsedMs)ms"
