# Phase 3: Markdown-regler + LLM-driven tool routing — RESULTS

## TL;DR

**Hypotesen holdt.** Gemma 4 31B router korrekt mellom "mekanikk → tool"
og "vurdering → ingen tool" basert på fri-tekst markdown-regler. 3 representative
punkter testet × 3 iter = **9/9 perfekt status-match med gold**, ingen
prompt-tuning, ingen DSL. Modellen leste hjemmel + vurdering, valgte selv
verktøy, og produserte saksbehandler-kvalitet merknad.

## Resultater

| Punkt | Type | Status (alle 3 iter) | Tools brukt (alle 3 iter) | Wall-time iter 2-3 |
|---|---|---|---|---:|
| `personkrav.styrer_alder` | Mekanikk | vurdert_ok (gold ✓) | `path_value`×2 + `age_at_date_from_fnr` | 3.4-3.5s |
| `lokalpolitisk.skjenketider_ok` | Hybrid | vurdert_ok (gold ✓) | `path_value`×3 + `time_within_legal_schedule` | 3.8-3.9s |
| `vandel.vandel_styrer` | Vurdering | ikke_vurdert (gold ✓) | — (ingen) | 1.3s |

Iter 1 hadde 27s wall-time fordi gateway nettopp hadde kommet seg etter
503-outage (kald-start). Iter 2-3 viste steady state ~8.5s for alle 3 punkter
sekvensielt.

## Merknad-kvalitet (utdrag fra iter 2)

**Styrer alder:**
> "Styrer er født 1990-03-01 og er 36 år på arrangementets startdato (2026-12-12),
> noe som oppfyller kravet om minimum 20 år."

**Skjenketider:**
> "Skjenketidene 19:00–02:00 for gruppe tre (brennevin) ligger innenfor lovens
> makstider på 13:00–03:00. Verifiser mot kommunens lokale retningslinjer."

**Vandel styrer:**
> "Vandelsvurdering for styrer Sophie Salt avventer uttalelse fra politiet om
> alkohollovgivning. Skatte- og regnskapsforhold er ikke relevant for styrer
> (kun for bevillingshaver)."

Alle tre er på saksbehandler-nivå og inkluderer detaljene regelen ba om.

## Observasjoner

1. **Modellen er bemerkelsesverdig deterministisk i tool-routing.** På 3 iter:
   samme tools, samme rekkefølge, samme args, samme final-status. Spørsmål
   var om dette holder under last/parallellitet (svar i Phase 4).

2. **`path_value`-kallene er litt redundante.** For styrer_alder bruker modellen
   `path_value` to ganger (fnr + startdato) før den kaller `age_at_date_from_fnr`.
   Det kunne vært ett konsolidert kall. Tre runder med LLM legger til ~3-9s.
   **Optimerings-mulighet for Phase 4:** inkludér pre-ekstraherte fakta i
   user-prompten — da slipper modellen å lete.

3. **Vandel-punktet trengte ingen tools.** Modellen leste regelen ("alltid
   ikke_vurdert + skriv navn"), fant navnet selv i søknads-JSON-en, og svarte
   direkte i én LLM-runde. 1.3s vs 3-4s for tool-routede punkter.

4. **Markdown-regelen vinner mot Spor C-stil regel.** Spor C hadde 60+ linjer
   Python per regel; Phase 3-reglene er 10-15 linjer prosa hver. Saksbehandlere
   kan eie disse. Hjemmel kan kopieres direkte fra lovverket.

## Hva som overrasket

* **Modellen brukte ikke `lookup_kommune` for skjenketider-punktet** selv om
  regelen nevner "kommunens lokale retningslinjer". Det er korrekt — modellen
  forstod at den bare skulle nevne det i merknad, ikke verifisere.

* **`time_within_legal_schedule` ble kalt med `vare_gruppe: "gruppeTre"`** — modellen
  passet rå-verdien fra JSON videre uten å normalisere. Vårt verktøy håndterer
  det (etter Phase 2-fiksen som la til "brennevin" + "tre"-deteksjon).

## Phase 4 readiness

GO-kriteriet for Phase 3 (≥2/3 holder gold) er smashed. Phase 4 kan starte
med rimelig høy tillit. Justeringer å gjøre i Phase 4:

1. **Concurrency=5** (samme som Spor C optimal), forventet wall-time
   ~15-20s for 39 punkter (mot 8.5s for 3 sekvensielt).
2. **Pre-ekstraherte fakta i user-prompt** for å redusere antall LLM-kall
   per punkt fra 3 til 2 (kan kuttes til 1 hvis vi tester at modellen ikke
   trenger tool for å nå konklusjonen).
3. **Stream final-respons** for å unngå timeout på lange merknader.
4. **Generér 36 nye markdown-regler** — kan delvis automatiseres fra Spor C's
   `_r_*` + `fact_text_for()` for å sikre dekning, så håndredigeres.

## Files written

- `scripts/orchestrate_tools.py` (~250 LOC) — tool-loop + tracing
- `rules/personkrav.styrer_alder.md`
- `rules/lokalpolitisk.skjenketider_ok.md`
- `rules/vandel.vandel_styrer.md`
- `runs/tools-run-001..003.json` + `traces/tools-run-001..003/*.json`
