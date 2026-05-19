# Cross-synthesis: round 1 (Spor A + B + C)

## TL;DR

**Spor C wins decisively. 100% point coverage AND 100% status-agreement vs Claude gold,
in ~10s wall-time, with only 6 LLM calls (the other 33/39 punkter are decided by 27
deterministic Python rules).** The right architecture for small models on this task is:
**deterministic rules layer + per-punkt LLM only for genuine judgment + concurrency=3**.

Spor A and Spor B both produced concrete artifacts the productized version will inherit
(the 5-line enum cheatsheet from A, the per-section orchestration pattern from B as a
useful intermediate fallback) — they did not win on metrics but they validated and
narrowed the design space.

## Head-to-head

| Metric | Spor A: prompt-tweaks | Spor B: decompose-sections | **Spor C: decompose-points + facts** |
|---|---:|---:|---:|
| Point coverage | partial (~7-11 punkter) | 100% | **100%** |
| Status agreement vs gold | 28.6% | 71.8% | **100%** |
| Wall-time | 16-24s | 110s | **10s** |
| LLM calls per run | 1 | 8 | **6** (rest deterministic) |
| Best run | run-007/011/012 | run-005/006/007 | **run-010** |
| Stopping condition | met (enum compliance) | met (≥70% agree + ≥90% cov) | **smashed** (≥80% / ≥95%) |

For reference: Claude monolithic = 100% by definition, ~119s, 1 call.
Pi-baseline (pre-experiment) = 0% (empty output).

## Convergent findings (all three sub-agents agreed)

1. **The 27 KB skill+guide system prompt is a permanent dead end for Gemma 4.**
   Spor A confirmed: NO system-prompt tweak unlocks the full default user prompt.
   The 260s gateway termination is generation-throughput-bound, not refusal-bound.
   **Decomposition is mandatory, not an optimization** — Spor A explicitly concluded
   "single-call full-checklist generation is infeasible at Gemma 4's gateway throughput."

2. **A 5-line status-enum cheatsheet is the single highest-ROI prompt addition.**
   - Spor A: restored 100% enum compliance with 5 lines added to a 627-char baseline.
   - Spor B: same 5 lines bought +41pp status agreement (15.4% → 56.4%).
   - Spor C: ~5 lines embedded in the micro-system-prompt prevented `godkjent`-style
     Norwegian-natural drift entirely (no synonym fallback ever triggered).
   - Norwegian and English phrasings are equivalent. System-prompt vs user-prompt
     placement is equivalent. Just **include it**.

3. **`maa_undersokes` vs `ikke_vurdert` is the dominant failure mode for Gemma's
   judgments.** Both Spor B and Spor C identified this; Spor C solved it by promoting
   "external-party uttalelse with no integration" to a deterministic rule that always
   emits `ikke_vurdert`. Worth +7pp on its own.

4. **Concurrency-3 is the sweet spot for sandkasse.** Confirmed in Spor C.
   Past 3 you hit per-call latency floor (~4-5s). At 1 you waste obvious parallelism.

## Why Spor C dominated

Spor B fairly described its own ceiling: with monolithic per-section Pi calls, Gemma
must evaluate 5-10 related criteria in one shot, and ~28pp of disagreement comes from
domain knowledge the model genuinely doesn't have (kommune-specific skjenketider,
when "ansatt"-punkter are N/A for enkeltbevillinger, habilitet-perspektiv).

Spor C's insight: **don't ask the model questions a one-line `if` could answer.**
Most checklist items are decidable from the application JSON alone (presence checks,
date math, time arithmetic, lookup tables, enum routing). Only ~15% of punkter need
genuine model judgment, and for those, focused per-punkt prompts with pre-computed
facts ("Styrer er 36 år (over 20)") turn the question into trivial classification.

This isn't a Pi/Gemma trick — it's the right architecture for any LLM pipeline where
many decisions are mechanically derivable. Even with Claude, you'd save ~80% of cost
and latency this way without losing quality.

## What each Spor contributed that survives the winner-takes-all reading

- **Spor A** → the canonical 5-line status-enum cheatsheet is the right shape; placement
  is flexible; English vs Norwegian doesn't matter. Use as system-prompt or as
  per-punkt-prompt header — Spor C already embeds it in `MICRO_SYSTEM_PROMPT`.

- **Spor B** → the per-section orchestration pattern is a viable intermediate
  productization step. 71.8% agreement in 110s is BETTER than the current state
  (which is the fallback to unevaluated data). Could ship Spor B's approach immediately
  while Spor C's rules layer is being productized and tested on a second application.

- **Spor C** → the orchestrator + rules + facts architecture is the recommended target
  state. ~600 LOC in `orchestrate_points.py`, no third-party deps.

## Risks and open questions

1. **Single-input validation only.** All three sub-agents ran against the same
   `julebord-kristiansand.json`. Spor C's rules in particular could be julebord-specific
   (e.g. `_r_brennevin_spisested` checks for "restaurant" in stedsnavn). **Before
   merging to v0.3, we should run Spor C against `minimal-arrangement.json`** and at
   least 1-2 hand-crafted variants (avslag-likely, missing-fields, different kommune).

2. **The rules layer is now a maintenance surface.** 27 rules in Python. New punkter
   added to `sjekkliste.json` won't get auto-evaluated until someone writes a rule
   (or leaves them to the LLM). Worth designing a "default = ask LLM" path so missing
   rules degrade gracefully.

3. **Gateway dependency.** All scoring is via sandkasse → Gemma 4 31b BF16. Different
   model behind a different gateway might invalidate specific findings (especially
   the 4-5s latency floor and the silent-refusal threshold). Architecture is portable;
   tuning isn't.

4. **`maa_undersokes` vs `ikke_vurdert` is still slightly subjective even after rules.**
   Spor B's remaining disagreement was largely this; Spor C eliminated it for the
   external-party cases via rules. For the genuinely-judgmental remaining cases,
   the gold standard is itself one Claude opinion — there isn't a "ground truth"
   beyond saksbehandler review.

## Recommended next step: produktifisering of Spor C to v0.3

Land the Spor C orchestrator on `feat/augmenter-agent-v0.3` as a new pipeline step
type. Concrete sequence:

1. **Validation against second input first** (Spor C's first follow-up). If rules don't
   generalize, expand them BEFORE shipping — easier to iterate now than after a v0.3
   merge.
2. **Wrap `orchestrate_points.py` as a new C# step type** `agent-pdf-decomposed` in
   `Pipelines/Generic/`. Either shell out to Python (simplest, depends on Pi container
   shipping Python) OR port the rules to C# (more work, no Python dep).
3. **Keep the existing `agent-pdf` step type** as a fallback for steps that don't have
   a rules layer (or as a "ship Spor B for steps without rules" path).
4. **Update `pipeline.yaml`** to use `agent-pdf-decomposed` for `checklist-agent`.
5. **Gold-standard regression test**: re-run with each PR.

Estimated effort: 1-2 days for shell-out path, 3-5 days for full C# port.

Alternative: ship the orchestrator as a sidecar utility that the augmenter-agent calls
via HTTP, keeping the Python and the JSON-rules concerns out of the C# codebase.

---

## Branches

| Branch | Status | Best run |
|---|---|---|
| `feat/augmenter-agent-v0.3-exp-prompt-tweaks` | committed `…` | 100% enum compliance, partial coverage |
| `feat/augmenter-agent-v0.3-exp-decompose-sections` | committed `745e3a22e8` | 71.8% / 100% / 110s |
| `feat/augmenter-agent-v0.3-exp-decompose-points` | committed `a1d8f3bdea` | **100% / 100% / 10s** |
| `feat/augmenter-agent-v0.3-autoresearch` | this branch — adds CROSS-SYNTHESIS.md | meta |
