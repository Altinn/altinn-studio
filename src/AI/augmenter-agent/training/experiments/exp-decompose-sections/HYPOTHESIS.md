# Hypothesis: exp-decompose-sections (Spor B)

- **Created**: 2026-05-19
- **Branch**: `feat/augmenter-agent-v0.3-exp-decompose-sections`
- **Port**: 8074
- **Base prompt source**: trimmed `skill-no-guide.md` (627 chars) from exp-baseline

## What we believe

Decomposing the monolithic checklist evaluation into 8 separate Pi calls (one per sjekkliste seksjon) lets Gemma 4 deliver valid JSON within its competence envelope. The aggregator then merges the 8 partial responses into one sjekkliste structure that the same evaluator can score against gold.

## Why we believe it

exp-baseline/run-008 already proved the per-section shape works:
small system + single-section user → 805 chars valid JSON in 9.3s. Aggregate
estimate for all 8 seksjoner: ~75s, which is actually *faster* than Claude's
119s monolithic baseline, with better per-call observability.

## What we will vary

1. **Variant `baseline`**: small system + full FlatData input per seksjon.
2. **Variant `enum`**: + 5-line status enum cheatsheet at end of system prompt.
3. **Variant `subset`**: + per-seksjon input subsetting (only FlatData fields
   relevant to that seksjon, e.g. `vandel` doesn't need `Arrangement.Lokale`).

## What we will hold constant

- Input file: `examples/applications/julebord-kristiansand.json`
- Model: `sandkasse/telenor:gemma4` (whatever container resolves)
- Gold standard: `training/gold-standard/gold-checklist.json`
- 8 seksjoner from `config/domain/sjekkliste.json`
- Skeleton shape: dict-keyed punkter under `sjekkliste.seksjoner[*].punkter`

## Success criterion for this experiment

A single run meeting BOTH:
- point coverage ≥ 90% (37/41 punkter)
- status agreement ≥ 70% on common points

## Stopping condition

After 10 runs OR when success criterion is met on a single run.
