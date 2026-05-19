# Hypothesis: exp-prompt-tweaks (Spor A)

- **Created**: 2026-05-19
- **Branch**: `feat/augmenter-agent-v0.3-exp-prompt-tweaks`
- **Port**: 8073
- **Base prompt source**: `/experiment/dump-prompt?step=checklist-agent`

## What we believe

The full skill.md + guide.md system prompt (26785 chars) triggers Gemma 4's
silent-refusal heuristic. The minimal `skill-no-guide.md` (627 chars) unlocks
generation, but loses the `vurdert_ok / vurdert_avslag / maa_undersokes /
ikke_relevant / ikke_vurdert` enum vocabulary — Gemma falls back to natural
Norwegian (`godkjent`, `avslag`, ...).

We believe there exists a **short status-enum cheatsheet** (5-15 lines) that we
can add to the 627-char baseline to recover enum compliance *without* re-tripping
the refusal heuristic — and that this can still produce structured output on the
FULL (un-decomposed) user prompt within the 600s gateway budget.

## Why we believe it

- exp-baseline showed the cliff is between 627 chars (works) and 27267 chars
  (refuses). Empty middle ground.
- exp-baseline run-008 proved a 627-char system + decomposed user (single
  section) yields valid JSON in 9s — the model CAN do this; it just lost the
  enum.
- exp-baseline run-007 showed 627-char system + FULL user prompt was
  gateway-terminated at 260s. Open question whether that was generation
  capacity (model trying & timing out) or something else.

## What we will vary

Strict one-dimension-per-run:

1. **System-prompt content** (the primary axis):
   - V0: baseline = skill-no-guide.md (627 chars, no enum)
   - V1: + 5-line Norwegian enum cheatsheet
   - V2: + 5-line English enum cheatsheet (Gemma is English-trained)
   - V3: + a single one-shot example "punkt" as JSON
   - V4: + "do this / not that" pair
   - V5: move enum cheatsheet to USER prompt instead of system
2. **Best winning variant rerun for stability** (sanity check).

## What we will hold constant

- Input file: `examples/applications/julebord-kristiansand.json`
- Default user prompt from `/experiment/dump-prompt` (10442 chars) — NOT
  decomposed; that's Spor B/C's job.
- Model: `sandkasse/telenor:gemma4` (per gateway config).
- Gold standard: `training/gold-standard/gold-checklist.json`.
- Evaluator: `scripts/evaluate.py` unchanged.

## Success criterion for this experiment

A winning variant that:

- **Layer 1**: valid JSON, has sjekkliste root, status ∈ allowed enum for ≥80%
  of points.
- **Layer 2**: point_coverage ≥80%; status_agreement ≥40% would be a strong
  signal that the model is engaging with the data and not pattern-filling.
- Finishes (does not time out) on the full user prompt.

## Stopping condition

After 10 runs OR earlier if we have a winner that hits the success criterion
twice in a row. If we can't even break refusal on the full user prompt with any
variant ≤2KB, we report that as a finding and recommend Spor B/C take over.
