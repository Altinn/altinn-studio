# Log: exp-decompose-points

Chronological log of every iteration. Append-only. One block per run.

| Run | mode | concurrency | det/llm | llm_phase | agreement | merknad ratio | verdict |
|----:|---|---:|---:|---:|---:|---:|---|
| 001 | llm-only | 1 | 0/39 | 170s | 15.4% | 0.51 | pass (validity) |
| 002 | with-rules-and-facts | 1 | 16/23 | 105s | 74.4% | 0.75 | pass |
| 003 | with-rules-and-facts | 1 | 23/16 |  75s | 87.2% | 0.85 | pass |
| 004 | with-rules-and-facts | 1 | 33/6  |  28s | 100.0% | 0.93 | pass |
| 005 | with-rules-and-facts | 1 | 33/6  |  29s | 100.0% | 0.93 | pass (repro) |
| 006 | with-rules-and-facts | 3 | 33/6  |  11s | 100.0% | 0.94 | pass |
| 007 | with-rules-and-facts | 5 | 33/6  |  10s | 100.0% | 0.93 | pass |
| 008 | llm-only             | 3 | 0/39  |  62s | 38.5% | 0.63 | pass (validity) |
| 009 | with-rules           | 3 | 33/6  |  10s | 97.4% | 0.92 | pass |
| 010 | with-rules-and-facts | 3 | 33/6  |  10s | 100.0% | 0.94 | pass |

---

### run-001 (llm-only, concurrency=1)
- **What changed**: First run — pure LLM, no rules, no facts.
- **Why**: Establish a baseline for the per-punkt LLM call shape, validate the orchestrator.
- **Result**: 39 LLM calls in 170s. All JSON valid, but Gemma defaults 34/39 to `ikke_vurdert` (the schema default) when given only seksjon+label. Status-agreement 15.4%.
- **Decision**: Add facts AND rules.

### run-002 (with-rules-and-facts, concurrency=1)
- **What changed**: Added 16 deterministic rules (presence/age/time arithmetic) and per-punkt fact texts in the user prompt.
- **Why**: Pi has no context to decide a status without facts. Rules should claim the easy points.
- **Result**: det=16, llm=23, agreement 15.4% → 74.4% in one step. Most remaining disagreements: gold uses `ikke_vurdert` for "awaiting external party" (politi/Skatt/NAV) while LLM picked `maa_undersokes`.
- **Decision**: Add rules for the awaiting-external points + tweak system prompt to distinguish `ikke_vurdert` vs `maa_undersokes`.

### run-003 (with-rules-and-facts, concurrency=1)
- **What changed**: Added 7 more rules (politi/Skatteetaten/NAV/vandel_* + plantegninger). Improved system prompt with status-distinction guidance.
- **Why**: External-party uttalelser are deterministic ikke_vurdert when no integration exists.
- **Result**: det=23, llm=16, agreement 87.2%. Disagreements left: `vurdert_avslag` from LLM where gold has `maa_undersokes` (LLM too harsh on missing docs).
- **Decision**: Add rules for the remaining missing-doc punkter + strengthen system prompt warning against `vurdert_avslag` for missing documents.

### run-004 (with-rules-and-facts, concurrency=1)
- **What changed**: Added 10 more rules (soknad_komplett, leiekontrakt, personantall, bruksgodkjenning, kunnskapsprove, kun_ett_sted, veiledningsplikt, mattilsynet). Tightened system prompt to warn "aldri ved manglende dokumentasjon" for `vurdert_avslag`.
- **Why**: Cover all the "missing document" patterns that the LLM was hallucinating into `vurdert_avslag`.
- **Result**: **det=33, llm=6, agreement 100.0%, llm_phase 28s.** Success criteria met.
- **Decision**: Lock the configuration and run reproducibility + concurrency tests.

### run-005 (with-rules-and-facts, concurrency=1) — reproducibility
- **What changed**: Nothing. Re-ran exact same config.
- **Why**: Verify determinism end-to-end.
- **Result**: Identical metrics (100.0% / 0.93). Pi-generated merknader differ in wording from run-004 but status choices are stable for the 6 LLM-driven punkter.
- **Decision**: Proceed to concurrency.

### run-006 (with-rules-and-facts, concurrency=3)
- **What changed**: ThreadPoolExecutor with 3 workers for the 6 LLM calls.
- **Why**: Sandkasse should support modest concurrency.
- **Result**: llm_phase 28s → 11s, agreement remains 100%. 2.5× speedup.
- **Decision**: Try higher concurrency.

### run-007 (with-rules-and-facts, concurrency=5)
- **What changed**: 5 workers (almost matches the 6 LLM calls one-to-one).
- **Result**: llm_phase 10s (only marginally faster vs 3), 100% agreement. Bottleneck is Pi per-call latency floor (~4s), not queueing.
- **Decision**: 3 is the sweet spot.

### run-008 (llm-only, concurrency=3)
- **What changed**: Disabled all rules + facts; pure LLM with concurrency=3.
- **Why**: Quantify what the rules+facts layer contributes vs concurrency alone.
- **Result**: 62s, agreement only 38.5%. Concurrency helps wall-time, not quality.
- **Decision**: Establishes that rules+facts are the quality lever, concurrency is the speed lever.

### run-009 (with-rules, concurrency=3) — facts-ablation
- **What changed**: Kept rules, removed per-punkt fact texts from LLM prompts.
- **Why**: Measure marginal value of the fact-text injection.
- **Result**: 97.4% agreement (one extra disagreement vs the 100% in run-006). Per-punkt facts give ~3 percentage points; the rules-layer is the bulk of the win.
- **Decision**: Facts still worth keeping (cheap, +3pp).

### run-010 (with-rules-and-facts, concurrency=3) — final confirmation
- **What changed**: Nothing — exact best-config repeat.
- **Result**: 100% agreement, 10s, 0.94 merknad ratio. Stable.
- **Decision**: Stop. Hypothesis confirmed.
