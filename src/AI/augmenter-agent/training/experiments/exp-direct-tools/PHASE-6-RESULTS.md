# Phase 6: Dokumentasjon + cleanup — RESULTS

## Endringer

| Fil | Endring |
|---|---|
| `README.md` | Hele oversikten oppdatert — Pi-spesifikke seksjoner erstattet med `sandkasse-http`. Configuration reference oppdatert. Lagt til peker til `training/experiments/exp-direct-tools/SYNTHESIS.md`. |
| `.env.example` | Helt omskrevet. Bare 1 påkrevd variabel (`SANDKASSE_API_KEY`); resten har defaults i docker-compose. Pi/LM Studio/Ollama-blokker fjernet. |
| `.gitignore` | Fjernet `.pi-state*/`-pattern (ikke lenger relevant). |
| `training/notes/sandkasse-issues-for-admin.md` | Lagt til seksjon 6 (503/504 + retry) og seksjon 7 (tools+streaming bekreftet fungerer). Kontekst-seksjon oppdatert til "Pi er fjernet". |
| `training/notes/rule-dsl-vs-llm-routing.md` | Lagt til "UPDATE 2026-05-20"-seksjon: vi testet faktisk Design B på Gemma 4 31B med tools og det fungerte. Anbefaling revidert. |

## Hva som ikke ble endret (med vilje)

- `scripts/orchestrate_points.py` og `scripts/orchestrate-sections.py` — historiske
  Spor B/C-orkestratorer. Beholdes som referanse for sammenligning. Phase 1's
  Pi-free orchestrator monkey-patcher inn ny `call_pi`-erstatning uten å endre
  originalen.
- `scripts/spawn-experiment-worktree.ps1` og `scripts/capture-gold-checklist.ps1` —
  worktree-oppsett brukt under Spor A-C eksperimentene. Ikke produktiv kode.
- Filer i `training/experiments/exp-decompose-*/` — eksperiment-snapshots,
  beholdes for paper-trail.

## Verifisering

- `dotnet test` etter README/env-endringer: 34/34 PASS (uendret)
- README rendrer som forventet på GitHub (sjekk i UI etter merge)
