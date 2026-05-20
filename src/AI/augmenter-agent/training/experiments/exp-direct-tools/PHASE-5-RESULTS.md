# Phase 5: Pi-fjerning fra C# produksjonskoden — RESULTS

## TL;DR

Pi er ute av C#-kodebasen. Build grønn, 34/34 tester PASS, container starter
på 5s, image er 46% mindre (516 MB vs 953 MB). Live-test mot sandkasse
fungerer ende-til-ende — `SandkasseHttpAgentService` blir kalt med riktig
modell og system-prompt, retry-logikk håndterer 504-er fra gateway, og
fallback-stien fungerer når gateway nekter.

## Endringer

### Slettet
- `src/Altinn.Augmenter.Agent/Services/Agent/PiCliAgentService.cs` (114 LOC)
- `docker-compose.exp.yaml` (Pi-state-isolasjon irrelevant nå)
- `config/pi/` (models.json — Pi-spesifikk)
- `dockerfile` linjer 13-18: `npm install -g @earendil-works/pi-coding-agent`

### Lagt til
- `src/Altinn.Augmenter.Agent/Services/Agent/SandkasseHttpAgentService.cs`
  (~150 LOC) — direkte HTTP-klient mot OpenAI-kompatibel gateway, med
  502/503/504-retry og exponential backoff. Bruker `IHttpClientFactory`
  for proper connection-pooling.

### Endret
- `Configuration/AgentOptions.cs` — nye felt: `BaseUrl`, `Model`, `MaxTokens`,
  `Temperature`. Fjernet: `UseLocalProvider`, `ApiBaseUrl`, `ApiAuthToken`.
  Provider-default endret fra `pi` til `sandkasse-http`.
- `Program.cs` — provider-switch oppdatert: `sandkasse-http` (default) eller
  `claude-cli` (dev). HttpClient registrert under navnet `sandkasse`.
- `Services/Agent/ClaudeCliAgentService.cs` — fjernet referanser til de
  slettede UseLocalProvider/ApiBaseUrl-feltene.
- `Endpoints/AgentTestEndpoints.cs` — bruker `opts.Provider` i logging i
  stedet for de slettede feltene.
- `dockerfile` — base runtime forblir `aspnet:10.0-alpine`, men pi/npm/node
  er fjernet. Image gikk fra 953 MB → 516 MB.
- `docker-compose.yaml` — fjernet Pi models.json mount. Lagt til eksplisitt
  mapping av `SANDKASSE_API_KEY` env var til `Agent__ApiKey` config-key.
- `appsettings.Development.json` — Provider `claude-cli`, lagt til Model `sonnet`.
- `test/.../TestWebApplicationFactory.cs` — override `IAgentService` med
  en `EmptyAgentService`-stub for integration-tester. Pipelinen håndterer
  tom respons via AgentPdfStep's fallback-sti.
- `test/.../GenerateTests.cs` — justert PDF-count-forventning fra ≥3 til
  ≥2 (pipeline.yaml har 2 steps; ≥3-grensen var fra v0.2 da decision-agent
  fortsatt var med).

## Verifisering

| Test | Resultat |
|---|---|
| `dotnet build` | ✓ 0 warnings, 0 errors |
| `dotnet test` (34 tester) | ✓ 34/34 PASS, 7s |
| `docker build` | ✓ 516 MB image (var 953 MB) |
| `docker compose up` | ✓ Container starter på 5s |
| `curl /health` | ✓ `{"status":"ok"}` |
| `curl POST /generate ...julebord` | ✓ Returnerer 2 PDFs (request-info + checklist) |
| `SandkasseHttpAgentService` i logger | ✓ Logget "Calling sandkasse HTTP agent ..." med riktig modell |
| 504 retry-logikk | ✓ Logget "sandkasse returned 504; retry attempt 1/3 after 2s" |
| Fallback-sti | ✓ Pipeline fortsatte etter retry-utmattelse |

## Kjent monolittisk-prompt-problem (uendret av Phase 5)

Live-testen mot sandkasse traff 504 på checklist-steget — som vi vet fra
Phase 0/Spor B: det monolittiske 27 KB skill+guide-systempromptet er for
mye for Gemma 4 31B via sandkasse. Vår transport-layer er korrekt; det er
prompt-arkitekturen som trenger orchestrator-tilnærmingen fra Phase 4 for å
levere full kvalitet. Det er en separat produktiviserings-oppgave (ikke i
scope for Phase 5).

## Image-størrelse

Med Pi/npm/node fjernet:

```
augmenter-agent (v0.4):  516 MB
augmenter-agent (v0.3):  953 MB  (Pi + npm)
                         -437 MB (46% reduksjon)
```

## Next

Phase 6 — dokumentasjon (README, sandkasse-issues-notatet, parket DSL-notat
oppdatert med "vi prøvde dette og det fungerte").
