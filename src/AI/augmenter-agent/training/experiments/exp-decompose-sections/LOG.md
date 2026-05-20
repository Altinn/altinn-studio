# Log: exp-decompose-sections

Chronological log of every iteration. Append-only. One block per run.

## Format per entry

```
### run-NNN  (YYYY-MM-DD HH:MM)
- **What changed since previous run**: (prompt structure, model param, ...)
- **Why**: (intent — what we hoped this change would reveal)
- **Result**: (verdict from evaluate.py + 1-2 sentence read of stdout)
- **Decision for next iteration**: (continue this direction / pivot / abandon)
```

If a run reveals a generalizable lesson (not just a result), copy it into `SYNTHESIS.md` immediately under "Observations".

---

### run-001  (2026-05-19, variant=baseline)
- **What changed since previous run**: first orchestrated run. Small system (skill-no-guide.md, 627 chars), no enum cheatsheet, full FlatData per seksjon.
- **Why**: establish per-seksjon decomposition baseline; replicate run-008 conditions across all 8 seksjoner.
- **Result**: 8/8 seksjoner parsed OK in 108s wall (per-seksjon 7-20s). point_coverage=100%, status_agreement=15.4%, merknad_ratio=0.35. **structural_fail** purely due to invalid status enum values: model emits `godkjent`/`mangler`/`ok`/`mangelfull`/`fullstendig`/`innvilget` (25/41 punkter use non-enum words).
- **Decision for next iteration**: add 5-line enum cheatsheet to the system prompt (variant=enum). Hypothesis: most of the structural failures will disappear and status_agreement should jump above 50%.

### run-002  (2026-05-19, variant=enum)
- **What changed since previous run**: appended 5-line status-enum cheatsheet (no usage hints) to system prompt (system: 627 → 920 chars).
- **Why**: address the lone failure mode from run-001 (invalid status enum strings).
- **Result**: 8/8 OK in 109.6s. point_coverage=100%, **status_agreement jumped 15.4% → 56.4%**, no invalid statuses. **verdict=pass.** All 25 bad enum words disappeared. The "natural" Norwegian words (godkjent, mangler, ok) were replaced with proper enum values.
- **Decision for next iteration**: explore input subsetting (subset variant) — same enum cheatsheet but only feed per-seksjon relevant FlatData keys. Hypothesis: smaller prompts → faster, no quality regression.

### run-003  (2026-05-19, variant=subset)
- **What changed since previous run**: turned on per-seksjon input subsetting (e.g. vandel only gets BrukerType + Innsender + Bevillingsansvarlig + PersonerMedInnflytelse, not Arrangement/Lokale).
- **Why**: test whether token reduction speeds up Pi or improves focus.
- **Result**: 8/8 OK in 109.5s. point_coverage=100%, status_agreement=56.4% (identical to run-002). Per-section prompts dropped 15-35% in length but elapsed unchanged (Pi has ~7s overhead floor + tokens/sec ceiling — subsetting saves no wall-time at this scale).
- **Decision for next iteration**: subsetting is a free win for token cost but neutral for wall time and accuracy. Pivot to enum prompt quality — gold uses precise distinctions (maa_undersokes vs ikke_vurdert) the 5-line cheatsheet doesn't teach.

### run-004  (2026-05-19, variant=enum)
- **What changed since previous run**: no change — repeat of run-002 to test determinism.
- **Why**: before tuning, verify Gemma 4 is reasonably deterministic so observed deltas are signal not noise.
- **Result**: 8/8 OK in 111.0s. status_agreement=59.0% (vs run-002's 56.4%). Variance is small but non-zero — same prompts shifted 1 status between runs. So +/-3pp of noise is expected.
- **Decision for next iteration**: refine enum cheatsheet (variant `enum-v2`) — add usage hints distinguishing `maa_undersokes` (info missing, must be obtained) from `ikke_vurdert` (waiting for external party). Also list forbidden words explicitly.

### run-005  (2026-05-19, variant=enum-v2)
- **What changed since previous run**: replaced 5-line cheatsheet with 10-line cheatsheet that explains *when* to use each status, names the typical case (e.g. `ikke_vurdert` for politi/Skatteetaten/NAV uttalelser), AND explicitly forbids the wrong words seen in run-001.
- **Why**: the diff between gold and run-004 showed 6 confusions on vandel.*_uttalelse (model used `maa_undersokes`, gold uses `ikke_vurdert`); fix the semantic gap directly.
- **Result**: 8/8 OK in 110.0s. **status_agreement=71.8%** (vs 56.4-59.0% on enum v1). **All 3 vandel.*_uttalelse points + 2 personkrav.*_kun_ett_sted points moved into agreement** — exactly the semantic distinction the cheatsheet added. system prompt grew 920 → 1298 chars (+30%) at no perf cost.
- **Decision for next iteration**: **stopping condition met** (status_agreement ≥ 70%, point_coverage ≥ 90%). Confirm stability with two more runs (enum-v2-subset + enum-v2 repeat).

### run-006  (2026-05-19, variant=enum-v2-subset)
- **What changed since previous run**: combined the wins — refined enum + per-seksjon input subsetting.
- **Why**: verify subsetting still doesn't regress accuracy when the better enum is in play.
- **Result**: 8/8 OK in 109.5s. **status_agreement=71.8%** (identical to run-005). Subsetting is a clean win for token spend without quality cost. User prompts down ~25% (avg).
- **Decision for next iteration**: one final stability run on enum-v2.

### run-007  (2026-05-19, variant=enum-v2 stability)
- **What changed since previous run**: re-run of run-005 to confirm reproducibility.
- **Why**: lock in the result before declaring a winner.
- **Result**: 8/8 OK in 111.5s. **status_agreement=71.8%** for the third run in a row at this enum-v2 design. Tight cluster of 3 runs at 71.8% with merknad_ratio 0.37-0.39 — winning variant is stable.
- **Decision for next iteration**: stop. Update SYNTHESIS.

