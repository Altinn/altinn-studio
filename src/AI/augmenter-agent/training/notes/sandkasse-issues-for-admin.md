# Sandkasse-funn — spørsmål til admin

Observert under R&D-eksperimenter (augmenter-agent) mot `https://gw.sandkasse.ai/v1`,
mai 2026. Bruker Pi CLI (`@earendil-works/pi-coding-agent`) som klient.

## TL;DR — det vi trenger fra deg

1. **API-key scope:** kan nøkkelen vår få tilgang til flere modeller enn `telenor:gemma4`?
2. **Bekreft eller dokumenter:** max_total_tokens, max_completion_tokens, request-timeout per modell.
3. **Bekreft riktig base path:** er `/v1/chat/completions` riktig endepunkt?

## Detaljerte funn

### 1. Base path: `/v1` må være med — kan dokumenteres tydeligere

- Symptom: `404 unsupported path: /chat/completions` ved baseUrl `https://gw.sandkasse.ai/`
- Fix: baseUrl må være `https://gw.sandkasse.ai/v1` (Pi/OpenAI-klienter appender `/chat/completions`)
- **Ask:** kan dette stå tydelig i sandkasse-dokumentasjonen? Mange OpenAI-kompatible klienter trenger `/v1` på baseUrl-en.

### 2. Modell-tilgang begrenset til `telenor:gemma4` (mistanke om scope)

- Vi prøvde med samme API-nøkkel:

  | Modell-ID | Resultat på smoke-prompt ("Si PONG") |
  |---|---|
  | `sandkasse/telenor:gemma4` | ✓ Returnerer "PONG" |
  | `sandkasse/telenor:nemotron3` | ✗ `401 Client authentication failed` |
  | `sandkasse/telenor:qwen3.6` | ✗ `401 Client authentication failed` |

- Pi's `--list-models` gjenkjenner alle tre som registrerte modeller, så modell-ID-ene er gyldige fra klient-siden.
- **401 (auth) heller enn 404 (not found) tyder på scope-grense** på API-nøkkelen, ikke at modellen mangler.
- **Ask:** kan nøkkelen vår få tilgang til `telenor:nemotron3` og `telenor:qwen3.6`? Hvis det krever separate nøkler per modell-familie, gi oss beskjed om hvordan vi får dem.

### 3. `max_completion_tokens` default 16384 overskrider gateway-grense

- Symptom: `400 max_completion_tokens=16384 cannot be greater than max_model_len=max_total_tokens=16192. Please request fewer output tokens.`
- Pi default = 16384. Gateway grense for telenor:gemma4 = 16192. Forskjellen er liten men hard.
- Vi fikser klient-side ved å sette `maxTokens: 4096` per modell i Pi `models.json`.
- **Ask:** dokumenter `max_total_tokens` per modell på sandkasse. Spesielt: er 16192 spesifikt for gemma4, eller gjelder det alle telenor-modellene? Vil hjelpe oss å konfigurere klienter riktig fra starten.

### 4. Gateway-timeout ved ~260s

- Symptom: når modellen prøver å generere mye output (vi traff dette med stort user-prompt og lite system-prompt), så terminerer gateway etter ~260 sekunder med `stderr: terminated`.
- Indikerer en serverside request-timeout på rundt 4-5 minutter.
- **Ask:** dokumenter request-timeout. Hvis den kan justeres opp (eller streaming støttes) for klienter som forventer lange responser, ville det være nyttig — men ikke kritisk for oss (vi har gått over til dekomposisjon med små prompts).

### 5. Concurrency-toleranse — informativt, ikke et problem

- Vi har testet opptil 5 parallelle requests fra én klient — fungerte uten throttling eller feil.
- Bortenfor 3 traff vi en per-kall latency floor på ~4-5s (sannsynligvis modell-side), så vi har ikke pushet høyere.
- **Ask (valgfritt):** dokumenter rate-limits (per nøkkel, per modell). Vil informere klient-arkitektur når vi skal produktifisere.

### 6. Sporadiske 503/504 fra OpenAIBackendError — bekreftet eksisterer

- Symptom: HTTP 503 "OpenAIBackendError" eller 504 "Gateway Timeout" returneres
  intermittent på fungerende kall — vi så det rundt mai 2026 i flere minutter
  før det normaliserte seg.
- 504 ser ut til å treffe spesielt på lange monolittiske prompts (27 KB
  system-prompt + full søknad) der modellen ikke rekker å begynne å generere
  før gateway dropper forbindelsen.
- **Vår mitigering:** klient-side retry med exponential backoff (2s/4s/8s)
  for 502/503/504 — implementert både i Python (sandkasse_client.py) og C#
  (SandkasseHttpAgentService).
- **Ask:** dokumentér hvordan vi best bør handtere disse — er det et hard rate-
  limit, en intermittent backend-feil, eller noe annet? Bør vi sette en
  spesifikk Retry-After header og respektere den?

### 7. Tools-parameter og streaming — bekreftet fungerer ✓

- Vi testet OpenAI-API `tools`-parameter mot `telenor:gemma4` i mai 2026:
  modellen returnerer korrekt `tool_calls` med JSON-args ved første kall.
  Tool-routing er deterministisk i praksis ved temperature=0.
- `stream: true` fungerer som forventet — SSE-respons med `data:`-events,
  endelig `data: [DONE]`. Latency-til-første-token typisk ~150ms.
- **Ingen ask, kun bekreftelse for andre konsumenter:** disse er produksjons-
  klare features på `telenor:gemma4`.

## Det vi ikke har sett

- Eksplisitt feilmelding for "modellen finnes ikke" — vi får 401 (auth) for ukjente modeller, ikke 404 (not found). Dette kan være riktig sikkerhetsdesign, men gjør debugging vanskelig — vurdér å returnere 404 for ukjente modeller selv om nøkkelen er gyldig.

## Kontekst (oppdatert mai 2026)

Vi bygger en domain-spesifikk pipeline (kommunal saksbehandling) som tidligere brukte
Pi-CLI som agent-harness. Vi har siden bevist at direkte HTTP mot sandkasse er ~3x
raskere, og at `tools`/`streaming` kan brukes til en mer ambisiøs arkitektur (markdown-
regler + LLM-routed tool-bruk for mekanikk). Pi er nå fjernet fra produksjonskoden.

100% status-agreement mot Claude gold-standard er bekreftet både med (a) Spor C-arkitekturen
(deterministiske regler + 6 fokuserte LLM-kall, ~3s wall-time uten Pi) og (b) Phase 4-
arkitekturen (markdown-regler + tool-calling, ~26s wall-time, ikke-koder-eierskap).
