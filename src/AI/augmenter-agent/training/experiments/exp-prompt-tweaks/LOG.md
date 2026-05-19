# Log: exp-prompt-tweaks

Chronological log of every iteration. Append-only. One block per run.

## Format per entry

```
### run-NNN  (YYYY-MM-DD HH:MM)
- **What changed since previous run**: (prompt structure, model param, ...)
- **Why**: (intent — what we hoped this change would reveal)
- **Result**: (verdict from evaluate.py + 1-2 sentence read of stdout)
- **Decision for next iteration**: (continue this direction / pivot / abandon)
```

---

### run-001  (2026-05-19 22:36)
- **What changed**: V0 = `skill-v0-baseline.md` (627 chars, no enum) + default user prompt (10442 chars).
- **Why**: Replicate exp-baseline run-007 in this worktree to confirm the gateway-timeout wall.
- **Result**: FAIL — 260s, terminated by gateway, 0 stdout. Same as baseline.
- **Decision**: Confirms wall. Move on to enum variants; same user prompt to see if enum addition is enough.

### run-002  (2026-05-19 22:42)
- **What changed**: System → V1 (`skill-v1-no-enum-norsk.md`, 973 chars; +5-line Norwegian enum cheatsheet).
- **Why**: Test if a small enum addition trips refusal again (it doesn't trip, but model still can't finish).
- **Result**: FAIL — 250s, terminated, 0 stdout.
- **Decision**: System size isn't the binding constraint; output volume is. Continue probing system variants but pivot user prompt next.

### run-003  (2026-05-19 22:46)
- **What changed**: System → V2 (`skill-v2-enum-english.md`, 1140 chars; English enum cheatsheet).
- **Why**: Gemma is mostly English-trained; maybe English instructions land better.
- **Result**: FAIL — 260s, terminated, 0 stdout.
- **Decision**: Output ceiling confirmed independent of system content. Stop running V3/V4 against full user; pivot to compact user prompt.

### run-004  (2026-05-19 22:50)
- **What changed**: System → V3 (`skill-v3-oneshot.md`, 1186 chars; +one-shot JSON example).
- **Why**: One-shot examples sometimes flip small-model behavior; quick to test.
- **Result**: FAIL — 256s, terminated, 0 stdout. Same wall.
- **Decision**: Skip running V4 on full prompt; we have enough evidence the wall is the user-prompt/output, not system. Use compact user from baseline run-008 to probe enum compliance.

### run-005  (2026-05-19 22:54)
- **What changed**: System → V4 (`skill-v4-do-dont.md`, 1199 chars; +do/don't pairs).
- **Why**: Confirm one more time on the full user prompt that even the most "directive" system can't break the wall.
- **Result**: FAIL — 260s, terminated, 0 stdout.
- **Decision**: WALL CONFIRMED across all 4 system variants. **Generalizable finding for Spor B/C: single-call full-checklist generation is infeasible for Gemma 4 within the 260s gateway budget**, regardless of system-prompt shape. Pivot to compact user prompt.

### run-006  (2026-05-19 22:57)
- **What changed**: System → V0 baseline; user → `user-section-personkrav.txt` (1676 chars, one section).
- **Why**: Re-establish the enum-loss baseline in this worktree on the compact prompt that we know works.
- **Result**: OK — 16s, 1512 chars output, valid JSON. enum_ok=4/7 (uses `godkjent` 3×). Confirms enum-loss baseline.
- **Decision**: Now probe variants V1–V4 on the same compact user prompt.

### run-007  (2026-05-19 22:58)
- **What changed**: System → V1 (Norwegian enum cheatsheet, 973 chars); user unchanged.
- **Why**: Smallest possible enum recovery.
- **Result**: OK — 16s, 1557 chars, **enum_ok=7/7**. All statuses valid: vurdert_ok / maa_undersokes / ikke_vurdert.
- **Decision**: Winner candidate. Test V2 (English) and V4 (do/don't) for comparison.

### run-008  (2026-05-19 22:59)
- **What changed**: System → V2 (English enum cheatsheet, 1140 chars); user unchanged.
- **Why**: Does English phrasing land more reliably given Gemma's training mix?
- **Result**: OK — 17s, 1559 chars, **enum_ok=7/7**. Identical status distribution to V1.
- **Decision**: V1 wins on size (973 < 1140) for same quality. Continue.

### run-009  (2026-05-19 23:00)
- **What changed**: System → V4 (do/don't pairs, 1199 chars); user unchanged.
- **Why**: Negative examples sometimes help.
- **Result**: OK — 16s, 1486 chars, **enum_ok=7/7**. Identical status distribution.
- **Decision**: No advantage over V1; V1 remains the size-winner.

### run-010  (2026-05-19 23:01)
- **What changed**: System → V0 baseline (627 chars, no enum); user → enum cheatsheet appended to user prompt (`user-section-personkrav-with-enum.txt`, 2011 chars).
- **Why**: Test "move enum to user prompt" alternative — keeps system minimal.
- **Result**: OK — 16s, **enum_ok=7/7**. Identical status distribution to V1/V2/V4.
- **Decision**: Works equally well. Architectural choice for Spor B/C: enum can live in either system OR user; whichever is simpler to template.

### run-011  (2026-05-19 23:02)
- **What changed**: V1 stability re-run (same as run-007).
- **Why**: Confirm V1 reproducibility on identical inputs.
- **Result**: OK — 17s, **enum_ok=7/7**. Statuses identical to run-007. Deterministic.
- **Decision**: V1 confirmed stable. One scaling check next.

### run-012  (2026-05-19 23:03)
- **What changed**: V1 system + 2-section user prompt (`user-section-formelle-and-personkrav.txt`, 2277 chars, 11 punkter).
- **Why**: How does V1 scale beyond a single section?
- **Result**: OK — 24s, 2464 chars, **enum_ok=11/11**. All statuses valid. Output time grew sub-linearly with point count.
- **Decision**: V1 scales cleanly to at least 2 sections. Hand-off complete; declare V1 winner.
