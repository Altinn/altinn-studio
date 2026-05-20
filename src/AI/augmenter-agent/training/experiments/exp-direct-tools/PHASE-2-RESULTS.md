# Phase 2: Tool registry — RESULTS

## TL;DR

8 deterministiske verktøy implementert + 45 unit-tester grønne. Verktøyene
dekker ~90% av mekanikken i Spor C's 27 `_r_*`-funksjoner. De resterende
~10% er "alltid samme svar"-regler som ikke trenger tools (politi-uttalelse,
NAV-uttalelse, etc.) — de kan adresseres med ren markdown-prosa i Phase 3-4
uten tool-kall.

## Verktøy-inventar

| Tool | Erstatter Spor C-regler | Beskrivelse |
|---|---|---|
| `age_at_date_from_fnr` | `_r_styrer_alder`, `_r_stedfortreder_alder` | Alder fra norsk fnr på ref-dato |
| `days_between` | `_r_arrangement_varighet`, `_r_saksbehandlingstid` | Kalenderdager mellom to ISO-datoer |
| `time_within_legal_schedule` | `_r_skjenketider_ok` | Alkohollovens makstider (gruppe 1-2 vs 3) |
| `lookup_kommune` | `_r_kommune_riktig` | Kommunenummer → navn/fylke |
| `path_value` | `_r_soker_identifisert`, `_r_fritak_stedfortreder` + generiske felt-sjekker | Dot-path JSON-uthenting med [n]-indeksering |
| `count_attachments` | `_r_plantegninger`, `_r_soknad_komplett`, `_r_leiekontrakt`, m.fl. | Telle vedlegg, valgfritt filtrert |
| `text_matches_any` | `_r_ikke_idrettsarrangement` | Eksakt enum-match (case-insensitiv) |
| `text_contains_any` | `_r_brennevin_spisested`, `_r_mattilsynet_registrering` | Substring-søk i fri tekst |

## Designvalg

1. **Returner errors som data, ikke exceptions.** Modellen må kunne lese
   et feilet tool-svar og resonnere om det (f.eks. "fnr har feil format
   → svar maa_undersokes med begrunnelse"). En thrown exception ville
   kortslutte loopen.

2. **`application`-JSON injiseres av dispatch, ikke av modellen.**
   `path_value` og `count_attachments` trenger hele søknads-JSON. Vi vil
   ikke at modellen skal sende den (det er 5 KB pent token-bruk per kall).
   `dispatch()` legger til `application=...` automatisk for de to verktøyene
   som trenger den.

3. **Verktøy er rene, deterministiske og uten I/O.** Tester kjører på
   < 10ms. Ingen mock-behov.

4. **Schema-validering i tests.** `SchemaConsistencyTests` sjekker at
   `TOOL_REGISTRY` og `TOOL_DEFINITIONS` har samme navnesett, og at
   `required:`-listen i schemaet matcher Python-signaturens påkrevde
   argumenter. Hindrer drift mellom implementasjon og hva modellen ser.

## Hva som IKKE er dekket av tools (med vilje)

Regler som alltid returnerer samme svar uten å konsultere data:
- `_r_politi_uttalelse`, `_r_skatteetaten_uttalelse`, `_r_nav_uttalelse` —
  alltid `ikke_vurdert` med standardtekst om at uttalelse må innhentes
- `_r_vandel_bevillingshaver`, `_r_vandel_styrer`, `_r_vandel_stedfortreder` —
  samme mønster, alltid `ikke_vurdert`
- `_r_habilitet` — alltid `vurdert_ok` med AI-disclaimer
- `_r_kunnskapsprove`, `_r_kun_ett_sted` — alltid `maa_undersokes` med
  P360-oppslag-instruks

Disse er rene "saksbehandler-instrukser" som markdown-regelen kan beskrive
direkte. Modellen produserer JSON-en uten å trenge et tool-kall — bare
ved å lese regelen og styrer/stedfortreder-navnet fra søknaden.

## Files written

- `scripts/tools.py` (~400 LOC) — 8 tools + dispatch + OpenAI tool defs
- `tests/test_tools.py` (~250 LOC) — 45 unit-tester

## Next

Phase 3 — bevise hypotesen på 3 representative punkter.
