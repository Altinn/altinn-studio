# Hypothesis: exp-decompose-points

- **Created**: 2026-05-19
- **Branch**: `feat/augmenter-agent-v0.3-exp-decompose-points`
- **Port**: 8075
- **Base prompt source**: `/experiment/agent-call` with hand-built per-punkt prompts (NOT the pipeline default)

## What we believe

Maximum decomposition: ONE Pi call per punkt (~60 calls). Each call gets:

- An ultra-small (<300 chars) system prompt that explains the status enum and required JSON.
- A pre-computed *fact* specific to that punkt (e.g. "Styrer er 36 år (over 20)", "Skjenketid 19:00–02:00 er innenfor lovens grenser", "Søker har ikke organisasjonsnummer (privatperson)").
- The punkt's label.

Many punkter can be answered deterministically by Python rules (fnr-age, weekday, presence checks, lookup tables) — bypassing Pi entirely. Pi is only called when genuine qualitative judgment is needed.

## Why we believe it

- run-008 of exp-baseline proved that small system prompt (~600 chars) + tightly scoped user prompt produces valid JSON in ~9s with Gemma 4.
- Most checklist statuses in the gold standard depend on **deterministic facts** (age math from fnr, presence/absence of fields, hardcoded enum tables) rather than on subtle judgment. A rules layer can claim ~50% of points deterministically.
- Smaller per-call prompts compound the Gemma-friendliness win from exp-baseline.

## What we will vary

- Mix of deterministic rules vs LLM calls (runs 1-2 → 100% LLM; 3-5 → grow rules to ≥10; 6-8 → richer facts for remaining LLM calls).
- Parallel concurrency (runs 9-10 → cap=3 parallel HTTP calls to Pi).

## What we will hold constant

- Input file: `examples/applications/julebord-kristiansand.json`
- Model: `sandkasse/telenor:gemma4`
- Gold standard: `training/gold-standard/gold-checklist.json`
- Per-punkt system prompt template (text changes are tracked as iteration changes)
- Sjekkliste structure from `config/domain/sjekkliste.json`

## Success criterion for this experiment

- ≥95% point coverage (all 32 gold points present in aggregated output)
- ≥80% status-agreement vs gold
- Aggregate wall-time ≤ 90s with concurrency

## Stopping condition

After 10 runs OR earlier if success criteria are met AND a further run is unlikely to change the picture.
