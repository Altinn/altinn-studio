# Hypothesis: exp-baseline

- **Created**: 2026-05-19
- **Branch**: `feat/augmenter-agent-v0.3-autoresearch`
- **Port**: 8072
- **Base prompt source**: `/experiment/dump-prompt?step=checklist-agent`

## What we believe

We do not yet know why Pi+Gemma returns 0 chars on the default prompt while Claude
produces a valid 14.5KB checklist. The failure is silent (Pi exit 0, no stderr).
Before designing remediation experiments, we need to characterize the failure surface
along three dimensions:

1. **Determinism** — does it always return empty, or sometimes succeed?
2. **Output cap** — does varying maxTokens change anything?
3. **Input size** — does shrinking system prompt OR user prompt change anything?

## Why we believe it

The infrastructure is end-to-end verified (Pi → sandkasse → Gemma "PONG"), so the
failure is in how Gemma handles the *specific* prompt content, size, or both.
Before we tweak structure (Spor A) or decompose (Spor B/C), knowing whether the
failure is size-driven vs content-driven changes which spor matter most.

## What we will vary

| Variation | Vary | Hold constant |
|---|---|---|
| baseline-default × 3 | nothing (same prompt 3 times) | everything |
| maxTokens-2k | sandkasse models.json `maxTokens: 2048` | system+user prompt |
| maxTokens-8k | sandkasse models.json `maxTokens: 8192` | system+user prompt |
| system-no-guide | strip `@guide.md` from skill.md | user prompt, maxTokens=4k |
| user-no-schema | drop the schema block from user prompt | system prompt, maxTokens=4k |
| user-tiny | minimal "fill in this JSON" wrapping | system prompt, maxTokens=4k |

8 runs. Sequential against the same container instance to keep model state constant.

## What we will hold constant

- Input: `examples/applications/julebord-kristiansand.json`
- Model: `sandkasse/telenor:gemma4`
- Container: the one running on port 8072 from autoresearch's compose

## Success criterion for this experiment

This is diagnostic, not optimization. "Success" = a SYNTHESIS.md that can
confidently answer:

1. Is the failure deterministic? (yes/no)
2. Is it size-driven? (yes/no, and at which threshold)
3. Is it content-driven? (which content elements correlate with failure)
4. Recommended starting point for each of Spor A/B/C

## Stopping condition

After 8 runs OR when 3 consecutive runs give the same failure mode and varying
the next dimension is unlikely to add information.
