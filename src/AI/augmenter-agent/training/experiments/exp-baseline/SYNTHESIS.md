# Synthesis: exp-baseline

## TL;DR

**The 27 KB system prompt (skill.md + @guide.md) is what kills Gemma 4 — it triggers an
instant refusal (3s, 0 tokens). Shrinking the system prompt to ~600 chars unlocks the
model.** Once unlocked, Gemma can produce valid evaluated JSON per-section in ~9s. Three
parallel experiments should all start from a trimmed system prompt; what they vary is
*how* the trimmed prompt is restructured and how the work is decomposed.

## Hypothesis we tested

Whether the empty output from Pi+Gemma was driven by determinism, output cap, or input
size; and along which dimension(s) we should design remediation.

## What worked

### Decisive finding: drop @guide.md from the system prompt
- Full skill+guide system (27267 chars) → 100% refusal across all user-prompt variations tested
  (full, single-section, even "return {hello: world}"). Pi exits 0, 0 stdout, 3s.
- Skill-only system (627 chars) → model tries to generate; with full user prompt it runs
  for 260s and is gateway-terminated (`stderr: terminated`); with a focused user prompt
  it produces valid JSON in ~9s.
- Reference: run-001..003 (full skill, all empty); run-007 (skill-only + full user, terminated);
  run-008 (skill-only + single-section user, valid JSON output).

### Per-section decomposition gives clean output
- run-008: skill-only system (627 chars) + hand-crafted user prompt for ONE section with
  3 punkter → `805 chars valid JSON, all 3 punkter evaluated with reasonable merknader.`
- Wall time 9.3s per section × 8 sections ≈ 75s total vs Claude's 119s monolithic — actually
  *faster* in aggregate, with better per-call observability.

## What did NOT work

### Bumping maxTokens
- maxTokens 4096 / 6000 / 8000 all gave identical 3s refusal with full skill. The cap
  was never the binding constraint — the model decides to emit nothing *before* it would
  hit the cap. Theory: the model anticipates the work exceeds its capacity and short-circuits
  to EOS rather than generate partial output.

### Shrinking only one dimension
- Big system + small user → refusal (regardless of how small user is)
- Small system + big user → 260s timeout (terminated mid-generation)
- Big system + truncated-mid-character user → output (probably because the broken JSON
  triggers "completion" mode rather than "instruction following" mode; not a robust strategy)

### Status enum loss
- Without @guide.md, the model uses natural Norwegian status words like `godkjent` instead
  of the schema's `vurdert_ok`. Three options for downstream experiments:
  1. Include a tiny status-enum cheatsheet (~5 lines) in the trimmed system
  2. Post-process: synonym map (godkjent → vurdert_ok, avslag → vurdert_avslag, ...)
  3. Accept and update the schema (low priority — gold-standard uses the original enum)

## Generalizable lessons (other experiments should read these)

1. **Gemma 4 has a sharp "refuse silently" threshold around system prompt size + task
   complexity.** It's not a clean token-count cliff — it's a heuristic refusal that
   triggers when the model anticipates it can't deliver. Symptom is fast (3s) clean
   exit with 0 stdout AND 0 stderr.
2. **The 26 KB guide.md is dead weight for small models.** It was written for Claude's
   instruction-following capacity. For Gemma, condense to ~10 critical rules + the enum.
3. **Per-section decomposition is the lowest-risk direction.** It already works in
   isolation (run-008). The architecture work for Spor B is "wrap the existing
   per-section call in a loop + aggregator".
4. **Pre-computed facts (Spor C's premise) make smaller per-call prompts even smaller,
   compounding the benefit.** E.g. "Søker er 35 år" injected as a fact lets the model
   skip date math entirely.
5. **For debugging Gemma, ALWAYS capture stderr separately.** The "terminated" signal
   only appears in stderr; via the experiment endpoint we currently expose it as
   `errorMessage`, but only when Pi exits non-zero. Empty 3s success is the more common
   silent failure.
6. **Evaluation must accept both list-of-objects AND dict-keyed-by-id sjekkliste layouts.**
   The mapper produces the dict form; the original evaluator only knew the list form.
   Fixed in run-008's re-eval.

## Concrete artifacts to consider productizing

- `training/experiments/exp-baseline/artifacts/skill-no-guide.md` — minimal system prompt
  (627 chars) that unlocks Gemma. Likely the starting template for all three Spor A/B/C.
- `training/experiments/exp-baseline/artifacts/user-single-section.txt` — proof that the
  per-section decomposition shape works. Templating this is Spor B's first concrete step.
- `scripts/evaluate.py` flatten_punkter fix — committed for everyone.

## What we would try with more time

- Test how minimal a "status enum cheatsheet" can be while still producing valid enum
  values (5 lines? a single line?).
- Test other Gemma sizes (Gemma 4 12B, 27B if available on sandkasse). Maybe the refusal
  threshold scales with model size.
- Test other small open models via Pi (`local lmstudio/qwen2.5-coder:7b`, `mistral`,
  `llama3.1:8b`) — sanity check whether the refusal is Gemma-specific or general
  small-model behavior.

## Methodology notes for future sub-agents

- **Always vary one dimension at a time.** I almost concluded "size doesn't matter"
  before realizing the system+user *interaction* mattered.
- **When Pi returns 0 bytes, also call Pi directly inside the container** (`docker compose
  exec ... pi -p ... > /tmp/o.txt 2> /tmp/e.txt`) to see stderr. The harness obscures it.
- **Sanity-check the gold-checklist against the structure you expect**. I assumed
  list-of-sections, gold has dict-of-sections — discovered only when evaluate.py crashed.

---

## Iteration log summary

| Run | Variant | Verdict | Output (chars) | Notes |
|---:|---|---|---:|---|
| 001 | default × 1 | fail (empty) | 0 | 4.3s — silent refusal |
| 002 | default × 2 | fail (empty) | 0 | 3.5s |
| 003 | default × 3 | fail (empty) | 0 | 3.5s — deterministic |
| 004 | default + maxTokens=6000 | fail (empty) | 0 | 3.7s — maxTokens isn't binding |
| 005 | default + maxTokens=8000 | fail (empty) | 0 | 3.9s |
| 006 | full skill + single-section user | fail (empty) | 0 | 4.1s — full skill always refuses |
| 007 | skill-no-guide + full user | fail (terminated) | 0 | **260s** — gateway timeout, model tried |
| 008 | skill-no-guide + single-section user | structural_fail (1/8 sec) | **805** | **9.3s — valid JSON, vurdert_ok semantics correct but enum word wrong (`godkjent`)** |
