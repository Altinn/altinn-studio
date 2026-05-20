# Phase 1: Pi-free baseline — RESULTS

## TL;DR

**Pi var ren overhead.** Replikerte Spor C run-010 ved å bytte ut shell-out
til Pi CLI med direkte HTTP-kall mot sandkasse. Samme regler, samme prompt,
samme modell — bare ny transport. Resultat: identisk kvalitet, **~3x raskere**.

| | Spor C (Pi shell-out) | Phase 1 (direct HTTP) |
|---|---:|---:|
| point_coverage | 100% | 100% |
| status_agreement | 100% | 100% |
| merknad_length_ratio | ~0.95 | 0.94 |
| wall-time | ~10s | **~3.3s** |
| iterations green | 1/1 | **3/3** |

## Iterations

| Run | wall | llm_phase | det | llm | verdict |
|---:|---:|---:|---:|---:|---|
| 001 | 3.40s | 3.33s | 33 | 6 | pass (100/100) |
| 002 | 3.19s | 3.19s | 33 | 6 | pass (100/100) |
| 003 | 3.24s | 3.23s | 33 | 6 | pass (100/100) |

## Hvor kom speedup fra?

`wall - llm_phase` er nesten 0 i Phase 1 (orchestrator-overhead < 100ms).
Det vil si: hele ~7s differansen mot Pi-versjonen var Pi-process-overhead per kall
— npm/node startup × 6 LLM-kall på 3 parallelle tråder = ~2-3 process spawns
serialized, hvor hver Pi-prosess bruker ~2-3s før første token. Direct HTTP
unngår alt det.

## Implikasjoner for resten av planen

1. **Pi-fjerning fra C# (Phase 5) er nå motivert av mer enn arkitektur** —
   det er også en konkret latency-gevinst på ~7s per checklist-kjøring.
2. **Spor C's "10s" wall-time-baseline var pessimistisk**. Det reelle gulvet
   med samme arkitektur men uten Pi er ~3s. Phase 3-4-budsjettet bør justeres:
   - GO-kriterium fra ≤30s wall-time → ≤15s wall-time (mer ambisiøst)
   - Verktøys-kall som legger til 1-2s per LLM-kall er nå mer signifikant
3. **Phase 0's stream-probe viste 151ms**, så streaming er bekreftet rask.
   Vi bruker det fra Phase 3 av (når responsene blir lengre med tool-loop).

## Files written

- `scripts/sandkasse_client.py` — full klient (chat + tools + streaming)
- `scripts/orchestrate_points_direct.py` — monkey-patcher inn `call_sandkasse_direct`
  som erstatning for `call_pi`, gjenbruker 100% av Spor C-baseline ellers
- `runs/run-001..003.json` + `runs/run-001..003.score.json`

## Next

Phase 2 — bygge tool-registry (`tools.py`). Phase 1's baseline forblir
beste sammenligningsgrunnlag for Phase 4 (100%/100%/~3.3s å slå/match).
