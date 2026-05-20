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

## Det vi ikke har sett

- Eksplisitt feilmelding for "modellen finnes ikke" — vi får 401 (auth) for ukjente modeller, ikke 404 (not found). Dette kan være riktig sikkerhetsdesign, men gjør debugging vanskelig — vurdér å returnere 404 for ukjente modeller selv om nøkkelen er gyldig.
- Streaming-respons har vi ikke testet — vet ikke om sandkasse støtter `stream: true`.

## Kontekst

Vi bygger en domain-spesifikk pipeline (kommunal saksbehandling) der vi bruker Pi-agent
med open-source modeller via sandkasse som alternativ til Anthropic. Vi har nådd
**100% status-agreement vs Claude gold-standard på 10s wall-time** med `telenor:gemma4` ved å
kombinere små per-punkt prompts med en deterministisk regel-layer. Vi vil teste flere
modeller (nemotron3, qwen3.6) for å se om vi får bedre kvalitet på de få vurderings-tunge
punktene som fortsatt går via LLM.
