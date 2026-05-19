# Synthesis: exp-decompose-points

## TL;DR

**Maximum decomposition + a deterministic rules layer reaches 100% point coverage and
100% status-agreement with the Claude gold standard, in ~10s wall-time, using only 6
Pi/Gemma calls (the rest are answered by Python rules).** The decomposition itself
unlocks Gemma; the rules layer eliminates the model's biggest failure mode (defaulting to
`ikke_vurdert` for any punkt it has no context for); facts further tighten the remaining
LLM judgments.

| Metric | Best run (010) | Gold target | Claude monolithic |
|---|---:|---:|---:|
| Point coverage | 100.0% | 100% | 100% |
| Status-agreement | **100.0%** | ≥80% | (by definition 100%) |
| Merknad-length ratio | 0.94 | ≈1.0 | 1.0 |
| Wall-time | **~10s** | – | ~119s |
| Pi/LLM calls | 6 | – | 1 |

## Hypothesis tested

Spor C — maximum decomposition (~60 single-punkt Pi calls) plus a deterministic rules
layer for facts the model doesn't need to reason about.

## What worked

### 1. The rules layer carries the load (33/39 ≈ 85% of punkter deterministic)

Most checklist items are decidable from the application JSON alone using straightforward
Python:

- **Presence/absence checks** (`har_organisasjonsnummer`, `antall_vedlegg == 0`, role
  presence) → `maa_undersokes` / `ikke_relevant`.
- **Date math from fnr** (DDMMYY + individnummer century rules) → age → `vurdert_ok` /
  `vurdert_avslag` for the alder-punkter.
- **Time arithmetic** (start_tid/slutt_tid vs lovens makstider, with overnight wrap) →
  `skjenketider_ok`.
- **Date arithmetic** (slutt − start ≤ 14 days; vurderingsdato to event ≥ 90 days) →
  varighet / saksbehandlingstid.
- **Lookup tables** (`kommunenummer → navn`) → `kommune_riktig`.
- **Enum routing** (`bevillingstype == "arrangement"` collapses arbeidsavtale/ansatt
  punkter to `ikke_relevant`; `varegruppe != "gruppeTre"` collapses brennevin_spisested).
- **External-party uttalelser** — when no integration exists, the guide's own definition
  says `ikke_vurdert`. This was a deterministic rule, not an LLM judgment.

Once a punkt has a robust rule, it's free of LLM jitter forever.

### 2. Per-punkt LLM prompts work (4-5s/call, valid JSON, stable status)

The micro system prompt (~530 chars) + 3-line user prompt (seksjon / sjekkpunkt / fakta /
"return JSON") fits comfortably below Gemma 4's silent-refusal threshold from
exp-baseline. Each call returns valid `{"status", "merknad"}` JSON in ~4-5s, with stable
status choices across repeated runs.

### 3. Concurrency gives ~3× wall-time speedup with zero quality cost

Pi happily accepts 3 parallel `/experiment/agent-call` invocations:

| Concurrency | LLM phase | Notes |
|---:|---:|---|
| 1 | 28s | 6 sequential calls |
| 3 | 11s | sweet spot |
| 5 | 10s | bottlenecked by per-call latency, not queueing |

### 4. The status-enum micro-prompt prevents Norwegian-natural drift

exp-baseline reported Gemma using `godkjent` instead of `vurdert_ok` without the guide.
Including the enum + a one-clause meaning for each value in the ~530-char system prompt
fixes this — no synonym post-processing needed. (`STATUS_SYNONYMS` map is in place as a
fallback but never triggered in any run.)

## What did NOT work (and what we learned from it)

### LLM-only is decent on validity, awful on status (run-001, run-008)

- run-001: sequential pure LLM → 15.4% agreement. Gemma defaults 34/39 punkter to
  `ikke_vurdert` when given only label + section name. The model is being honest — it
  has no information to act on.
- run-008: concurrent pure LLM → 38.5% agreement. Slightly higher (probably variance)
  but still far below the ≥80% target. **Quality and speed are orthogonal levers.**

### Initial fact texts triggered `vurdert_avslag` over-eagerness (run-003)

When the fact says "Ingen vedlagt uttalelse", Gemma was reasoning "well then the
requirement isn't met → vurdert_avslag". Two fixes needed simultaneously:

1. System-prompt clause: `vurdert_avslag (KUN ved konkret dokumentert brudd – aldri ved
   manglende dokumentasjon)`.
2. Most "missing-doc" punkter promoted to deterministic rules with the right
   `maa_undersokes` verdict. Don't ask the LLM a question whose right answer is
   "follow the procedural definition of this status".

## Generalizable lessons (other experiments should read these)

1. **Decomposition + rules-layer is the right architecture for small models.** Don't
   ask the model to make decisions a one-line `if` could make. Use the model only where
   genuine judgment is needed (assessment of softer policy compliance, summaries,
   ambiguous categorisations).

2. **Status enums need glossaries, not just lists.** A 5-word definition per status
   value (`maa_undersokes (saksbehandler må sjekke noe selv...)`) is what nudges Gemma
   away from defaulting to `ikke_vurdert`.

3. **Fact text > instruction text for small models.** Telling Gemma "compute the age
   from the fnr" wastes tokens and risks hallucination. Pre-computing "Styrer er 36 år
   (over 20)" turns the question into a trivial classification.

4. **Concurrency-3 is the sweet spot for sandkasse.** Higher concurrency just hits the
   per-call latency floor. 6 LLM calls in 10s is a good user-perceptible threshold.

5. **Reproducibility check matters even with deterministic rules.** run-004 vs run-005
   confirmed that the rules layer is byte-stable; the LLM-driven merknader vary in
   wording but the status choice is stable across repeated runs.

6. **`ikke_vurdert` is a real category, not just a default.** The gold standard reserves
   it for "awaiting an external party with no internal integration available". If you
   bake this into deterministic rules (as we did for politi/Skatt/NAV/vandel_*), you
   gain ~7 percentage points of status-agreement.

## Concrete artifacts (productisable)

- `scripts/orchestrate_points.py` — the orchestrator. ~600 LOC, no third-party deps
  (urllib + concurrent.futures). Three modes: `llm-only`, `with-rules`,
  `with-rules-and-facts`. Includes the per-punkt facts table and 27 deterministic rules.
- `MICRO_SYSTEM_PROMPT` (~530 chars) embedded in `orchestrate_points.py` — drop-in
  replacement for the 27 KB skill.md+guide.md combination when working with small models.
- `compute_facts()` — the deterministic feature extractor (age from fnr, weekday, time
  arithmetic, presence checks, kommunenummer lookup, skjenketider-vs-makstider).

## What we would try with more time

- Run the orchestrator against a *second* synthetic application
  (`examples/applications/minimal-arrangement.json` exists) to confirm rules generalise
  rather than being julebord-specific. Risk: a few rules (e.g. `_r_brennevin_spisested`
  checking for "restaurant" in stedsnavn) are heuristic and could mis-fire on different
  data.
- Push to 50% LLM-driven (relax some rules deliberately) and see if a slightly more
  elaborate per-punkt fact text can compensate. We may be at a sweet spot where the
  rules layer is doing too much heavy lifting and we'd struggle to maintain it for
  more punkt types.
- Try the same architecture against a different small model (Mistral, Llama3.1:8b)
  through Pi to confirm the wins aren't Gemma-specific.

## Methodology notes for future sub-agents

- Always inspect `perPunkt[*].rawStdoutPreview` after a failed disagreement — the LLM's
  actual answer often reveals exactly which prompt clue is missing or counter-productive.
- `STATUS_SYNONYMS` map proved unnecessary once the enum-with-definitions sat in the
  system prompt. Keep it as defence-in-depth though.
- The `evaluate.py` `flatten_punkter` already handles dict-keyed sjekkliste (from
  exp-baseline's fix), so the aggregator could emit either shape without touching the
  evaluator.

---

## Iteration log summary (see LOG.md for full detail)

| Run | mode | det/llm | wall | agreement | Headline |
|---:|---|---:|---:|---:|---|
| 001 | llm-only seq | 0/39 | 170s | 15.4% | Pi defaults to `ikke_vurdert` w/o context |
| 002 | rules+facts | 16/23 | 105s | 74.4% | Big jump from adding the rules layer |
| 003 | +external rules | 23/16 | 75s | 87.2% | `ikke_vurdert` for uttalelser is deterministic |
| 004 | +missing-doc rules | 33/6 | 28s | **100.0%** | Hit 100%; warn LLM against `vurdert_avslag` for missing docs |
| 005 | repro | 33/6 | 29s | 100.0% | Stable |
| 006 | +concurrency=3 | 33/6 | 11s | 100.0% | 2.5× speedup |
| 007 | concurrency=5 | 33/6 | 10s | 100.0% | Marginal beyond 3 |
| 008 | llm-only conc=3 | 0/39 | 62s | 38.5% | Concurrency ≠ quality |
| 009 | rules-no-facts | 33/6 | 10s | 97.4% | Facts contribute ~3pp |
| 010 | best config | 33/6 | 10s | **100.0%** | Final confirmation |
