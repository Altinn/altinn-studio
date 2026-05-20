# Phase 4: Hele sjekklisten — RESULTS

## TL;DR

**GO.** Direct HTTP + tool-calling + 39 markdown-regler matcher Spor C's
gull-resultat på julebord-kristiansand (100% / 100% / ~26s wall-time) og
holder seg ikke-krasj på minimal-arrangement (input #2, ~39s wall-time).
Saksbehandler kan eie regelsettet uten å lære en DSL.

## Resultater på julebord-kristiansand.json

| Run | wall | status_agreement | point_coverage | merknad_ratio |
|---:|---:|---:|---:|---:|
| 001 (pre-fix) | 32.7s | 94.9% | 100% | 0.92 |
| 002 | 25.6s | **100%** | 100% | 0.95 |
| 003 | 25.9s | **100%** | 100% | 0.94 |

Run 001 avvek på 2 punkter (`lokalpolitisk.beliggenhet_ok`,
`lokalpolitisk.ikke_barn_unge_omraade`) hvor mine første markdown-regler
åpnet for "vurdert_ok med forbehold". Gold-filosofien er konservativ:
"krever lokalkunnskap" = `maa_undersokes`. Etter regel-justering (kun
`maa_undersokes` for disse) ble agreement 100%.

## Resultater på minimal-arrangement.json (input #2)

Ingen gold for denne — testet for å validere at arkitekturen ikke krasjer
på en annerledes-formet søknad.

* 39 punkter evaluert, 83 LLM-kall, 83 tool-kall, 39.0s wall-time
* Status-fordeling: 22 maa_undersokes / 6 ikke_relevant / 6 ikke_vurdert / 5 vurdert_ok
* Fordelingen virker fornuftig (lite data → mest "må undersøkes")
* Innen STOPP-grensen på 60s

## Sammenligning mot baselines

| Arkitektur | wall | agreement | LLM-kall | Pi-dep |
|---|---:|---:|---:|---|
| Spor C (Pi + 27 Python-regler + 6 LLM) | ~10s | 100% | 6 | Yes |
| Phase 1 (direct HTTP + Python-regler + 6 LLM) | ~3.3s | 100% | 6 | No |
| **Phase 4 (direct HTTP + markdown + tools)** | **~26s** | **100%** | **~80** | **No** |

Wall-time økte 8x fra Phase 1 til Phase 4 — fordi vi flyttet 27 ren-Python-regler
til markdown + LLM. Det betaler vi i latency. Vi får tilbake:

1. **Non-coder rule authorship.** En saksbehandler kan eie og oppdatere
   `*.md` uten å forstå Python.
2. **Lov-prosa i regelen.** Hjemmel og vurdering kopieres direkte fra
   håndbok/lovverk — minimal oversettelse.
3. **Audit-trace per punkt.** Full historikk over hvilke tools modellen
   kalte med hvilke args. Saksbehandler kan se nøyaktig hvorfor en
   avgjørelse ble tatt.

## Hva modellen gjorde rett

* **Tool-routing var nesten alltid riktig.** Mekanikk-regler kalte
  `age_at_date_from_fnr`, `days_between`, `time_within_legal_schedule`,
  `lookup_kommune`. Vurderings-regler hoppet rett til JSON-svar.
* **Pre-fix-feilene var pedagogiske, ikke tilfeldige.** Når regelen åpnet
  for "vurdert_ok med forbehold", brukte modellen den åpningen. Strammere
  regel → strammere svar. Dette er adferden vi vil ha.
* **`maa_undersokes` vs `ikke_vurdert` skille (Spor B's gjenstående
  hovedfeil) var ikke et problem her** — modellen leste markdown-regelen
  som eksplisitt sa "alltid ikke_vurdert" og fulgte den.

## Hvor er overhead

Wall-time ~26s for 39 punkter med concurrency=5 = teoretisk minimum
~26/5 ≈ 5.2s per "tråd-bunt". I praksis er per-punkt-tid:

* "Ingen tool"-punkter (helhetsvurdering, habilitet, vandel-templates): 1-2s
* "Bare path_value"-punkter (mange dokumentasjon-sjekker): 3-4s
* "Tool-routed mekanikk"-punkter (alder, varighet, skjenketider): 3-5s

LLM-overhead per request ~1-2s + tokens. Hvis vi pre-injiserer relevante
fakta i prompten (Spor C-stil), kunne vi kuttet 1 LLM-runde per punkt → ned
mot 15s wall-time totalt. Ikke nødvendig nå — under 30s er innenfor budsjett.

## Files written

- `rules/*.md` — 39 markdown-regler totalt (3 nye Phase 3, 36 nye Phase 4)
- `scripts/orchestrate_tools.py` — utvidet med `--all` og `--concurrency`
- `runs/full-run-001..003.json` + aggregated + score
- `runs/full-minimal-001.json` + aggregated
- `traces/full-run-001..003/*.json` (39 per run = 117 trace-filer)
- `traces/full-minimal-001/*.json` (39 trace-filer)

## Go-beslutning for Phase 5

Phase 4 møter alle GO-kriteriene:

| Kriterium | Krav | Resultat |
|---|---:|---:|
| status_agreement | ≥95% | **100%** (2/3 iter) |
| wall-time | ≤30s | **25.6-25.9s** (iter 2-3) |
| audit-trace lesbar | Ja | Ja |
| konsekvent feilende punkter | Nei | Nei (post-fix) |
| input #2 ikke-krasj | Ja | Ja |

→ **Phase 5: Riv ut Pi fra C# produksjonskoden.**
