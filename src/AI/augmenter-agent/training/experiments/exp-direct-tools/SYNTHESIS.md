# exp-direct-tools — Synthesis

## Spørsmålet vi stilte

> Kan Gemma 4 31B (via sandkasse, OpenAI-kompatibel) være "smart nok" til å rute
> "dette er matematikk → kall verktøy" vs "dette er en tekstlig vurdering" på egenhånd,
> basert på en regel skrevet som ren markdown (utdrag fra håndbok/lovverk)? Hvis ja,
> kan saksbehandlere (ikke-kodere) eie regelsettet uten en DSL.

## Svaret

**Ja.** Med direkte HTTP mot sandkasse, 8 deterministiske tool-primitiver, og 39
markdown-regler matcher arkitekturen Spor C's 100% / 100% gold-resultat på julebord-
kristiansand, og holder seg ikke-krasj på et andre input. Modellens tool-routing var
nesten 100% korrekt — feilene vi så på første iter skyldtes for liberale regler, ikke
modellens dømmekraft.

## Hva vi har bevist (i denne kontekst)

1. **Pi CLI er fjernbar uten kvalitets-tap.** Phase 1 viste 100% parity med Spor C
   ved å bytte ut shell-out med direct HTTP — og 3x speedup som bonus.

2. **`tools`-parameteren fungerer på sandkasse/Gemma 4 31B.** Phase 0's smoke
   bekreftet dette; Phase 3-4 bygde produktiv bruk oppå.

3. **Streaming støttes** (Phase 0). Vi har det klart for bruk hvis full-svar-generering
   slår mot gateway-timeout i framtidige scenarioer.

4. **Gemma 4 31B router korrekt** (mekanikk → tool, vurdering → resonner direkte).
   Identisk tool-routing across 3 iter på Phase 3-utvalget. Stabil og deterministisk i
   praksis (selv om temperatur=0).

5. **Markdown-regler kan eies av saksbehandlere.** Hjemmel kopieres fra lovverket,
   vurderings-tre skrives i prosa. Ingen Python, ingen DSL, ingen tagging-syntax.

## Hvor mye mer tid betaler vi?

Phase 4 wall-time (~26s for 39 punkter) er ~8x Phase 1's wall-time (~3.3s). Vi flyttet
27 deterministiske Python-regler til markdown+LLM. Bytte-handelen er:

| | Mistet | Vunnet |
|---|---|---|
| Latency | +22s wall-time per checklist | — |
| Determinisme | Tool-routing kan variere ±1 ekstra LLM-runde | Tool-resultater er fortsatt 100% deterministiske |
| Kompleksitet i kode | — | -27 regelfunksjoner, +8 generiske tools |
| Authorship | — | Saksbehandlere kan redigere alle regler |
| Audit | Per-regel-Python-stack-trace | Per-punkt LLM-meldings-historikk + tool-args-trace |

Innenfor latency-budsjettet vi satte (≤30s wall). Audit-laget er sannsynligvis et netto
plus: en LLM-trace er enklere å forklare en saksbehandler enn et Python-stack-frame.

## Hvor kan dette feile vi ikke har sett

1. **Mer-data søknader.** julebord-kristiansand er ~5 KB FlatData. Hvis søknader blir
   30-100 KB (mange vedlegg, mange personer med innflytelse), kan modellen bruke flere
   tokens på å lese JSON-en og flere runder for å hente data via `path_value`. Wall-time
   vil øke ikke-lineært. Mitigering: pre-extracter relevante facts før vi sender til
   modellen.

2. **Andre kommuner / andre saks-typer.** Markdown-reglene er kontekst-uavhengige nok
   til å fungere bredt, men `lookup_kommune` har hardkodet 4 kommuner. Tool-utvidelse er
   trivielt; tool-utvidelse til "datalast fra fil i drift" trengs ved produktivisering.

3. **Modell-bytte.** Hele systemet er prøvd på `telenor:gemma4` BF16. Hvis vi senere
   bytter til Q8 eller en annen modell, er det ingen kode-endring — men nye benchmarks
   bør kjøres på julebord + minimal-arrangement før produksjons-deploy.

4. **Tool-misbruk under høy variabilitet.** Vi så modellen kalle `path_value` 4-5 ganger
   per punkt i noen tilfeller (over-leting). Det er ineffektivt men ikke ugyldig. Hvis
   et tool feiler (f.eks. på malformed data), risikerer vi at modellen looper.
   `orchestrate_tools.py` har `max_tool_iterations=5` som sikkerhetsnett.

## Hvor er vi i forhold til opprinnelig roadmap

Plan-fasene 0-4 alle GO. Phase 5 (riv Pi ut av C# produksjonskoden) starter nå.
Phase 6 (dokumentasjon) til slutt.

## Hovedtall-side ved side

| Spor | wall | agreement | LLM-kall | Tool-kall | Python-regler-LOC |
|---|---:|---:|---:|---:|---:|
| Claude monolittisk | ~119s | 100% (gold) | 1 | — | 0 |
| Spor B (sections, Pi) | ~110s | 71.8% | 8 | — | 0 |
| Spor C (points + facts, Pi) | ~10s | 100% | 6 | — | 27 × ~25 LOC = ~680 LOC |
| Phase 1 (Pi-free) | ~3.3s | 100% | 6 | — | ~680 LOC gjenbrukt |
| **Phase 4 (markdown + tools)** | **~26s** | **100%** | **~80** | **~80** | **8 generiske tools × ~30 LOC = ~240 LOC** |

Phase 4 er **65% mindre Python-kode** enn Spor C, samtidig som regelsettet er
non-coder-redigerbart og full audit-trace per punkt.
