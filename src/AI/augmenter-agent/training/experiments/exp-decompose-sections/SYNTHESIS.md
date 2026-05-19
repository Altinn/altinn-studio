# Synthesis: exp-decompose-sections (Spor B)

## TL;DR

**Per-seksjon decomposition + small system prompt + a 10-line status-enum
cheatsheet with usage hints unlocks Pi+Gemma 4 to produce a valid,
schema-conformant evaluation of the full 8-seksjon sjekkliste at 71.8%
status-agreement vs the Claude gold standard, in ~110s wall time. Three
back-to-back runs (005, 006, 007) all landed at exactly 71.8% — the result
is stable. Two prompt design moves matter, in this order:**

1. Decompose the work into one Pi call per seksjon (8 calls total) so each
   prompt stays inside the model's competence envelope.
2. Teach the enum with usage hints, not just the 5 allowed strings — the
   distinction between `maa_undersokes` (info missing, must obtain) and
   `ikke_vurdert` (waiting on external party) is the single biggest source
   of disagreement with gold.

## Hypothesis we tested

Decomposing the monolithic checklist evaluation into 8 separate Pi calls
(one per sjekkliste seksjon) lets Gemma 4 deliver valid JSON within its
competence envelope. The aggregator merges the 8 partial responses into
one sjekkliste structure the existing evaluator can score.

**Confirmed.** All 7 orchestrated runs in this experiment produced valid
JSON for every one of the 8 seksjoner (56/56 successful Pi calls). Point
coverage hit 100% on every run starting from iteration 1.

## What worked

### 1. Per-seksjon decomposition — unconditional win
- Every one of the 56 Pi calls across runs 1-7 returned valid JSON.
  Average per-seksjon wall time 13.7s (range 6.8-21.3s), exactly tracking
  the seksjon's punkter count.
- Compare to the exp-baseline monolithic call: 260s timeout on the full
  prompt vs Claude's 119s. Decomposed: ~110s and observable per-section.
- Aggregating per-section dicts under `sjekkliste.<sid>.punkter` produces
  the gold layout that `evaluate.py` already understands (after the
  flatten_punkter fix from exp-baseline).

### 2. Five-line status-enum cheatsheet — first big jump
- Without it (run-001): 25/41 punkter use non-enum words (`godkjent`,
  `mangler`, `ok`, `innvilget`, ...). status_agreement 15.4%.
- With it (run-002, +293 chars to system): all 25 disappear, status_agreement
  56.4%. **verdict=pass** on layer 1 for the first time.

### 3. Refined enum-v2 with usage hints + forbid-list — second big jump
- Adding `- "ikke_vurdert" - venter på ekstern uttalelse (politi/Skatteetaten/NAV)`
  fixed all 3 vandel.*_uttalelse points (the model previously used
  `maa_undersokes` for them; gold uses `ikke_vurdert`).
- Adding `- "maa_undersokes" - informasjonen finnes ikke i søknaden og må
  aktivt etterspørres` fixed the personkrav.*_kun_ett_sted points.
- Adding an explicit forbid line `Bruk ALDRI andre verdier som "godkjent",
  "ok", ...` provided redundancy — by this point the model already obeyed
  the enum but the line cost nothing.
- Run-005 → run-007: status_agreement 56.4 → 71.8 (+15pp). +378 chars to
  system prompt at zero wall-time cost.

### 4. Per-seksjon input subsetting — token win, accuracy-neutral
- Reducing each seksjon's user prompt to just the relevant FlatData keys
  (e.g. vandel only sees BrukerType + Innsender + Bevillingsansvarlig +
  PersonerMedInnflytelse) cut user prompts by ~25% on average.
- Quality identical (71.8% on both subset and non-subset enum-v2).
- Wall time also unchanged (Pi has a ~7s per-call overhead floor that
  dominates over token reduction at this prompt size).

## What did NOT work

### Subsetting did not buy speed
- Hypothesis was that smaller per-call user prompts would also speed up
  generation. Reality: Pi's per-call overhead is ~7s before any token
  generation begins (lowest observed: gebyr seksjon at 6.8s with a single
  punkt). At our prompt sizes (1-4 KB), token count is not the binding
  constraint.

### Determinism is "almost, not quite"
- Runs 002 and 004 (identical config) returned 56.4 and 59.0 respectively —
  about ±3pp noise on status agreement, driven by 1 point flipping between
  runs. So small enum tweaks need ≥2 runs to confirm direction.

### Easy wins remain unexploited (the last 28pp to 100%)
- 11 of 39 points still disagree at our best score. They fall into four
  buckets, each addressable but not a 5-line system-prompt fix:
  1. **Sak-spesific lokal kunnskap**: `lokalpolitisk.skjenketider_ok` — gold
     concludes `vurdert_ok` because 19:00-02:00 is within Kristiansand's
     local rules, but the model can't know the local rules without them in
     prompt → marks `maa_undersokes`.
  2. **Domenekunnskap om enkeltbevilling/arrangement**: gold marks
     `personkrav.styrer_ansatt = ikke_relevant` (correct — for arrangement
     bevillingen the ansatt-krav doesn't apply); model defaults to
     `maa_undersokes`. A 1-line "for arrangement-bevilling gjelder ikke
     krav om ansettelse" would likely fix this.
  3. **Forskjell på `maa_undersokes` vs `ikke_vurdert`** for politi/
     Skatteetaten — fixed by enum-v2 (was failure bucket in v1).
  4. **Subjektiv tolkning av "habilitet_vurdert" og "veiledningsplikt"** —
     gold treats them as `vurdert_ok`/`maa_undersokes` based on saksbehandler-
     perspektiv (the AI itself); model defaults to `ikke_vurdert`. Probably
     needs an explicit instruction.

## Generalizable lessons (other experiments should read these)

1. **Per-seksjon decomposition is the safe path for small models.** It moves
   the work into each model's competence envelope, makes failures local
   (one bad seksjon doesn't destroy the run), and produces JSON that's
   trivially aggregateable. Recommended as the default architecture for
   Pi+Gemma 4 going forward.

2. **A status-enum cheatsheet is the highest ROI prompt addition.** 5 lines
   bought +41pp status agreement (15.4 → 56.4). Each additional well-targeted
   line of usage hint bought ~3-5pp more. This is much cheaper than trying
   to bolt richer context into the user prompt.

3. **"Forbid wrong words explicitly" is cheap insurance.** Saying
   "Bruk ALDRI andre verdier som 'godkjent', 'ok', ..." cost 1 line and
   eliminated the model's instinct to localize the enum into natural
   Norwegian.

4. **Pi has a ~7s per-call overhead floor.** Token reduction below ~3 KB
   does not speed things up. If wall-time is a constraint, batch within
   one Pi call, don't shrink existing calls.

5. **Evaluation aggregation needs both list and dict layouts.** The
   skeleton we feed the model is `{seksjoner: [{id, punkter:{}}]}` but the
   gold uses `{<sid>: {punkter:{}}}`. The orchestrator normalizes to the
   dict form on aggregate so `evaluate.py` (with the flatten_punkter fix
   from exp-baseline) handles both seamlessly.

6. **Three identical runs at 71.8% is the determinism signal.** Once a
   variant stabilizes across reruns, further iterations probably need a
   prompt-design change, not another run.

## Concrete artifacts to consider productizing

- **`scripts/orchestrate-sections.py`** — the orchestrator. Reads
  sjekkliste config, builds focused per-seksjon prompts, parallelizable
  by seksjon (currently sequential), aggregates into a gold-compatible
  sjekkliste, writes both aggregated and per-seksjon-raw JSON.
- **Embedded `ENUM_CHEATSHEET_V2`** (in the orchestrator, ~380 chars).
  Drop-in addition to the trimmed system prompt that takes Gemma 4 from
  56% to 72% status agreement.
- **`scripts/diff-statuses.py`** — quick CLI diagnostic for "which points
  disagree with gold and what status did each side use". Made each
  iteration's analysis 1 command instead of a manual JSON read.
- **`SEKSJON_INPUT_HINTS`** mapping (in the orchestrator) — per-seksjon
  list of FlatData keys actually consulted. Free token reduction, no
  accuracy cost. Each value is a guess; revisit if a seksjon underperforms.

## What we would try with more time

- **Inject domain-specific rules per seksjon** rather than relying on
  generic enum hints. E.g. for the `personkrav` seksjon, prepend a 3-line
  "Ved enkeltbevilling/arrangement gjelder ikke krav om ansettelse for
  styrer eller stedfortreder." That should close the remaining
  styrer_ansatt/stedfortreder_ansatt disagreements (4-6pp).
- **Inject local kommune rules** when known (e.g. Kristiansand's
  serveringstidsregler) — closes `skjenketider_ok` (1pp).
- **Parallel Pi calls.** Currently the 8 seksjoner are sequential (~110s).
  With 4-8 concurrent calls the wall time could drop to ~20-30s. Pi+Gemma
  is one process per call though, so parallelism = process count.
- **Test if a 2-shot example per seksjon (1 vurdert_ok punkt + 1 maa_undersokes
  punkt with reasoning) further raises status agreement.**
- **Apply this approach to a second input file** to test how much of the
  71.8% is overfitting to julebord-kristiansand specifically. Hypothesis:
  general structural quality (100% point coverage) carries over; status
  agreement may dip 5-10pp depending on how prototypical the new case is.

## Methodology notes for future sub-agents

- **The `--variant` flag pattern works.** One orchestrator script, multiple
  named variants (`baseline`, `enum`, `subset`, `enum-v2`,
  `enum-v2-subset`). Each variant is a single function-level switch.
  Cheaper than maintaining 5 copies of the script.
- **Run the same variant twice before trusting a delta.** Determinism
  noise on Pi+Gemma is ±3pp.
- **Diff helper > opening the score JSON.** A `diff-statuses.py` style
  helper that prints the per-point exp-vs-gold table beat reading the
  score.json by hand at every iteration.
- **The aggregator wraps the aggregated checklist as `{"stdout": json.dumps(...), ...}`**
  so the unchanged `evaluate.py` (which expects a single-Pi-call format
  with `stdout` containing the model's JSON) consumes it without
  modification. Cheap shim, no fork of evaluate.py.

---

## Iteration log summary

| Run | Variant | Verdict | Point coverage | Status agreement | Merknad ratio | Wall time | Notes |
|---:|---|---|---:|---:|---:|---:|---|
| 001 | baseline | structural_fail | 100.0% | 15.4% | 0.35 | 108.2s | 8/8 valid JSON, 25/41 bad enum words |
| 002 | enum | **pass** | 100.0% | 56.4% | 0.35 | 109.6s | 5-line enum eliminates all bad enum strings |
| 003 | subset | pass | 100.0% | 56.4% | 0.34 | 109.5s | Subsetting = free token cut, no accuracy delta |
| 004 | enum (repeat) | pass | 100.0% | 59.0% | 0.39 | 111.0s | Determinism check: ±3pp noise |
| 005 | enum-v2 | pass | 100.0% | **71.8%** | 0.39 | 110.0s | Usage hints + forbid line — winner |
| 006 | enum-v2-subset | pass | 100.0% | **71.8%** | 0.38 | 109.5s | Combined wins, identical accuracy |
| 007 | enum-v2 (repeat) | pass | 100.0% | **71.8%** | 0.37 | 111.5s | Locks in 71.8% as stable |
