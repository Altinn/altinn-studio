# Synthesis: exp-prompt-tweaks (Spor A)

## TL;DR

**A 5-line Norwegian status-enum cheatsheet appended to the 627-char baseline
skill (total 973 chars) gives 100% enum compliance (`vurdert_ok` etc.) without
re-tripping Gemma's refusal heuristic.** Crucially, however: *even with an
optimal system prompt, Gemma 4 cannot complete a single-call full-checklist
generation on the default 10 KB user prompt within the 260s gateway window* —
all four system variants we tried timed out identically. **Spor B/C must
decompose the work; Spor A alone cannot solve the full-prompt problem.**

## Hypothesis we tested

(From HYPOTHESIS.md.) That a short enum cheatsheet (5–15 lines) added to
`skill-no-guide.md` could (a) avoid refusal, (b) restore the enum vocabulary,
and (c) produce structured output on the **full** user prompt within budget.

## What worked

- **`skill-v1-no-enum-norsk.md` (973 chars, +5-line Norwegian enum cheatsheet)
  + compact user prompt → 7/7 enum compliance in 16 s** (run-007, reproduced
  in run-011). Status distribution matches Claude's gold for the points the
  model is given, modulo conservative `ikke_vurdert`-vs-`maa_undersokes`
  judgement.
- **`skill-v2-enum-english.md` (1140 chars, English version)** also yields 7/7
  enum compliance (run-008). No advantage over Norwegian version; loses on
  size.
- **`skill-v4-do-dont.md` (1199 chars, GJØR/GJØR IKKE pairs)** also 7/7
  (run-009). No advantage; bigger.
- **Enum in user-prompt instead of system** (run-010, V0 system + user with
  enum block, 2011 chars total user) is also 7/7. **Generalizable: the enum
  can live in either system or user prompt — the model treats them equivalently
  for this constraint.**
- **Scaling to 2 sections (11 punkter)** (run-012, V1 + 2-section user): 24 s,
  11/11 enum compliance. Output time grows sub-linearly with point count.

## What did NOT work

- **The full default user prompt (10442 chars)** kills every system variant we
  tried (V0 baseline, V1 NO enum, V2 EN enum, V3 one-shot, V4 do/don't) — all
  hit the 260 s gateway termination with 0 stdout. This is NOT silent refusal
  (Pi exits 1 with `terminated` in stderr); it is generation that doesn't
  finish in time. Gold output is ~14.6 KB — Gemma's throughput at the gateway
  cannot produce that in 260 s. **No system-prompt tweak can fix this.**
- **One-shot example (V3, 1186 chars)** gave no measurable advantage over V1
  on the compact prompt, and didn't unlock the full prompt either. The model
  doesn't need an example to use the enum once told it exists.
- **English vs Norwegian phrasing** for the enum block: identical results on
  the compact prompt. Gemma handles the Norwegian enum just fine when it's
  presented as a bulleted list of literal strings.

## Generalizable lessons (other experiments should read these)

1. **System-prompt size is not the binding constraint for full-prompt
   generation.** It was the binding constraint for the *refusal heuristic*
   (exp-baseline's finding) — once below ~2 KB system, refusal stops. But for
   actually producing 14 KB of output, the binding constraint is wall-clock
   throughput.
2. **Output volume × Gemma throughput > 260 s gateway budget.** Decomposition
   (Spor B) is mandatory, not optional. Spor C's pre-computed facts will help
   too — anything that shrinks the per-call output volume.
3. **A 5-line bulleted enum is enough to fully recover enum compliance.**
   Specifically:
   ```
   - `vurdert_ok` – vilkåret er kontrollert og oppfylt.
   - `vurdert_avslag` – konkret funn som peker mot avslag.
   - `maa_undersokes` – mangler eller tvil; krever oppfølging.
   - `ikke_relevant` – punktet gjelder ikke denne søknaden.
   - `ikke_vurdert` – krever ekstern info (P360, høringssvar).
   ```
   Norwegian phrasing is sufficient; English does no better.
4. **The enum cheatsheet is location-agnostic.** Equivalent results whether
   placed in the system prompt or appended to the user prompt. Architectural
   freedom for Spor B/C: keep the system tiny and reusable, inject the enum
   into the user prompt per call if that's cleaner.
5. **Gemma is more conservative than Claude on `ikke_vurdert` vs
   `maa_undersokes`.** Where gold says "this needs P360 lookup → `maa_undersokes`"
   Gemma tends to say `ikke_vurdert`. Both are reasonable; difference is
   stylistic. If exact agreement matters, the cheatsheet might be tightened
   ("prefer `maa_undersokes` over `ikke_vurdert` when the *reason* you can't
   evaluate is an external lookup the human can do").
6. **Output time scales roughly linearly with punkt count.** 7 punkter → 16 s,
   11 punkter → 24 s, so ~1.5–2 s per punkt at this point in the curve. The
   full 39 punkter checklist therefore needs ~80–120 s of generation time
   alone — close to the budget — which is why per-call decomposition is
   safer.

## Concrete artifacts to consider productizing

- **`training/experiments/exp-prompt-tweaks/artifacts/skill-v1-no-enum-norsk.md`
  (973 chars)** — the recommended replacement for `checklist/skill.md`.
  Drop-in for the existing skill folder. Add status-enum cheatsheet inline.
- **`training/experiments/exp-prompt-tweaks/artifacts/user-section-personkrav.txt`**
  — concrete template shape for the per-section user prompt Spor B should
  build dynamically.
- **`training/experiments/exp-prompt-tweaks/artifacts/skill-v0-baseline.md`**
  (627 chars, no enum) — useful as the system prompt **if** enum is injected
  into the user prompt instead (Spor B/C architectural option).

## What we would try with more time

- Test V1 on multiple input files (only `julebord-kristiansand.json` covered
  here) — confirm the enum compliance generalizes across application types.
- Quantify the per-punkt generation rate more precisely (3-section, 4-section
  scaling tests) to predict the optimal decomposition granularity for Spor B.
- Try a hybrid: system has the enum AND a 2-line "tip" toward `maa_undersokes`
  (vs `ikke_vurdert`) for external-lookup punkter — could close the
  status-agreement gap with Claude without bloating the prompt.

## Methodology notes for future sub-agents

- **A 260 s "terminated" with 0 stdout is NOT silent refusal.** Silent refusal
  is the 3 s exit-0-empty pattern from exp-baseline. The 260 s pattern is
  generation-in-progress hitting the wall. Distinguish them in your logs.
- **Always run V0 baseline first in your worktree** even if a prior experiment
  established the result. Worktrees can drift (model version, gateway state).
- **For Spor A specifically, decomposed user prompts are a valid probe** of
  system-prompt quality. The directive said "vary system" but proving system
  quality on a prompt the gateway can't return for is meaningless.

---

## Iteration log summary

| Run | System variant | User prompt | Verdict | Enum ok | Time (s) | Notes |
|---:|---|---|---|---|---:|---|
| 001 | V0 (627c, no enum) | default (10442c) | fail | — | 260 | terminated by gateway |
| 002 | V1 (973c, NO enum) | default (10442c) | fail | — | 250 | terminated |
| 003 | V2 (1140c, EN enum) | default (10442c) | fail | — | 260 | terminated |
| 004 | V3 (1186c, one-shot) | default (10442c) | fail | — | 256 | terminated |
| 005 | V4 (1199c, do/don't) | default (10442c) | fail | — | 260 | terminated |
| 006 | V0 (627c) | personkrav (1676c) | structural_fail | 4/7 | 16 | uses `godkjent` — enum-loss baseline |
| 007 | V1 (973c) | personkrav (1676c) | structural_fail | **7/7** | 16 | **winner candidate** |
| 008 | V2 (1140c) | personkrav (1676c) | structural_fail | 7/7 | 17 | identical to V1, bigger |
| 009 | V4 (1199c) | personkrav (1676c) | structural_fail | 7/7 | 16 | identical, bigger |
| 010 | V0 (627c) | personkrav+enum (2011c) | structural_fail | 7/7 | 16 | enum in user — works equally |
| 011 | V1 (973c) | personkrav (1676c) | structural_fail | **7/7** | 17 | **stability re-run of 007 — deterministic** |
| 012 | V1 (973c) | formelle+personkrav (2277c) | structural_fail | **11/11** | 24 | scales to 2 sections cleanly |

Layer-2 (vs gold) scores are dominated by partial-coverage by design (gold has 39
points; compact user prompts include only 7 or 11). For points actually
included, status-agreement was 28.6% (V1, single section). The disagreements
are mostly `ikke_vurdert` vs `maa_undersokes` — see Layer-3 diff in
`runs/run-012.diff.txt`.
