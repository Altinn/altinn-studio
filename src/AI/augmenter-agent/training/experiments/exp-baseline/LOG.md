# Log: exp-baseline

Chronological log. Each run gets a block with what changed, why, result, decision for next.

---

### run-001, 002, 003  (2026-05-19) — default × 3 (determinism check)
- **What changed**: nothing — same prompt from `/experiment/dump-prompt` 3 times sequentially
- **Why**: confirm failure is deterministic, not flaky
- **Result**: ALL three: `success=true, stdout=0 chars, elapsedMs ≈ 3500-4300`. Container logs show `Pi CLI completed (0 chars output)` cleanly, no stderr.
- **Decision**: empty output is deterministic. Move to dimensional probing.

### probe-A  (direct `pi` invocation inside container, not via harness)
- **Setup**: copied the actual dumped system (26785 chars) and user (10442 chars) prompts to container, invoked `pi -p -nt -ns -nc -ne --no-session --model sandkasse/telenor:gemma4` directly with `< /tmp/user.txt`
- **Variants**:
  | system | user | exit | elapsed | stdout | stderr |
  |---|---|---|---|---|---|
  | tiny (~20) | tiny (~25) | 0 | <2s | `{}` | empty |
  | full (26785) | tiny (~50) | 0 | <2s | `{"sjekkliste":{"seksjoner":[]}}` | empty |
  | full (26785) | full (10442) | **0** | **3s** | **EMPTY** | empty |
  | full (26785) | head -c 5000 of user (truncated mid-char!) | 0 | ? | **3565 chars valid JSON with vurdert_ok statuses** | empty |
  | head -c 5000 of system | full (10442) | **1** | **260s** | empty | `terminated` |

**This is the breakthrough**:

1. The model is NOT refusing because of total input size (full sys + half user = 31785 chars works, full sys + full user = 37227 chars fails). The threshold isn't raw char count.
2. The model IS capable of producing the full checklist structure — when given partial input, it generates **the actual evaluated checklist** with realistic `vurdert_ok` statuses and Norwegian merknader.
3. When given the FULL user prompt (which contains the entire mapped sjekkliste skeleton it must fill out), it short-circuits in 3 seconds, producing nothing. Theory: the model anticipates that filling out the entire skeleton would exceed `maxTokens=4096` and emits an EOS token immediately rather than generating partial output.
4. When the user prompt is malformed (truncated mid-char at 5000 bytes), the model attempts to generate, takes 260s, then is terminated — probably by Pi's internal timeout, since `--no-session` doesn't free us from that.

**Action**: test by raising `maxTokens` so the model has room to complete the full structure.
