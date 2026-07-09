# Plan: KI Beriking som 1st-party prosess-steg i Altinn-apper

> Status: fase 1 ferdig (2026-07-09) — biblioteket bygger, 96/96 tester grønne, inkl.
> ende-til-ende med demo-fixturen og typst-rendring. Neste: fase 2 (service task).
> Referanseimplementasjon (v0.4, frittstående mikrotjeneste) ligger på
> branchen `feat/augmenter-agent-v0.4-direct-tools` (`src/AI/augmenter-agent/`).

## Mål

Augmenter-kapabilitetene (per-punkt LLM-evaluering med deterministiske verktøy, mapping og
PDF-rendring) skal bli en førsteklasses egenskap i en standard Altinn-app, eksponert som et
eget prosess-steg **`kiBeriking`**. En app konfigurerer alt gjennom en `App/agents/`-mappe
med én undermappe per steg/agent.

## Vedtatte retningsvalg

1. **Bibliotek-varianten.** Alt bor i klassebiblioteket `Altinn.App.Ai.Enrichment`
   (net8.0, refererer `Altinn.App.Core` >= 8.12). Appen skal ha **minst mulig custom kode**:
   NuGet-referanse + én DI-linje (`services.AddAiEnrichment(...)`) + `App/agents/`-mappe +
   bpmn-task + policy-action + dataTypes. Selve `IServiceTask`-implementasjonen bor i
   biblioteket, ikke i appen. Presedens: `Altinn.App.Clients.Fiks`.
   Eventuell upstreaming til app-lib-dotnet er et senere, separat løp (fase 5).
2. **Rendring er pluggbar.** Berikelses-JSON skrives alltid som data-element (kjerneverdien).
   Typst-PDF er opsjonelt tillegg som krever `typst` i appens image (dokumentert
   Dockerfile-snippet). DOCX/Pandoc droppes i v1.
3. **Kjøremodell v1: inline service task.** Kjører i `process/next`-requesten med stramt
   timeout-budsjett og `FailedAbortProcessNext` som retry-mekanisme. Datakontrakten designes
   slik at bytte til feedback-task-mønsteret (for lange kjøringer) ikke endrer output.

## Nøkkelfakta fra research (2026-07-09)

- app-lib >= 8.9.0 støtter egendefinerte service tasks: `IServiceTask`
  (`Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks`, `[ImplementableByApps]`).
  Dispatch er strengmatch `Type` == `<altinn:taskType>` mot DI-registrerte implementasjoner.
  `Execute(ServiceTaskContext)` får `IInstanceDataMutator` med `AddFormDataElement` /
  `AddBinaryDataElement`; motoren lagrer selv etterpå. Data fra tidligere tasks er låst (les-only).
- Autorisasjon: `policy.xml` må gi en action med **nøyaktig samme navn som task-typen**
  (`kiBeriking`) til relevante roller.
- Egendefinert `<altinn:...Config>`-XML i bpmn er IKKE utvidbart fra app-kode → all config
  ligger i `App/agents/` + appsettings. Kobling task → agent-mappe: mappenavn = task-id,
  med overstyring `KiBeriking:Tasks:<taskId>:Agent` i appsettings.
- Designer/Studio: håndredigert bpmn med egen task-type lagres verbatim og deployer fint.
  `App/agents/` brytes ikke av noen validering. Full Designer-støtte (palett, config-panel,
  ikon, i18n — ~8 endringspunkter i process-editor + backend-enum) er valgfritt (fase 5).
- Secrets: `ISecretsClient` (Key Vault i TT02/prod, `secrets.json` lokalt). HTTP: typed
  clients via `IHttpClientFactory`.

## Config-kontrakten (`App/agents/`)

```
App/agents/
└── <agent-navn>/            # én mappe per KI-steg (navn = task-id, ev. appsettings-mapping)
    ├── agent.yaml           # pipeline-steg for agenten: modell-overrides, concurrency,
    │                        #   maxToolIterations, output-navn, rendring på/av
    ├── system-prompt.md     # orkestratorens systemprompt
    ├── rules/               # per-punkt *.md (uendret format fra v0.4)
    ├── tools/               # OpenAI tool-definisjoner, <tool_name>.json (uendret)
    ├── registries/          # oppslagstabeller + output-schema (uendret)
    ├── mappings/            # JsonPathMapper-spec, <mapper>.json (uendret)
    └── templates/           # *.typ (bare hvis PDF-rendring)
```

Input: skjemadata via `IInstanceDataAccessor.GetFormData()` (erstatter multipart-upload av
`{FlatData: ...}`). Output: verdicts-JSON (+ ev. PDF) som data-elementer definert i
`applicationmetadata.json`.

## Porteringskart fra v0.4

| v0.4 (mikrotjeneste) | v0.5 (bibliotek) |
|---|---|
| Orkestrator, chat-klient, 10 verktøy, JsonPathMapper, registries, aggregator, Typst-renderer | Porteres tilnærmet uendret (~70 % av koden) |
| Web-host, endpoints, multipart, callback, kø/background service, KeyVault-bootstrap, upload-options | Erstattes av app-lib (`IServiceTask`, `IInstanceDataMutator`, `ISecretsClient`, `IHttpClientFactory`) |
| `ContentPathsOptions` (globale roots under `/etc/augmenter`) | Per-agent mappeoppløsning fra `App/agents/<agent>/` |
| `pipeline.yaml` (global) | `agent.yaml` per agent (samme steg-schema) |
| `ConfigValidator` (fail-fast på mount) | Fail-fast-validering av `App/agents` ved oppstart |
| DOCX-generering (Pandoc) | Droppes i v1 |

## Faser

- **Fase 1 — biblioteket** *(ferdig)*: `src/AI/enrichment/` med `Altinn.App.Ai.Enrichment`
  + testprosjekt. Kjernen portert fra worktree-referansen; per-agent config-modell
  (`AgentFolder`/`AgentRuntimeFactory`); enhetstester portert + nye factory-tester.
  Bevisste avvik fra v0.4: steg-feil propagerer (var logg-og-fortsett), `template`
  valgfri for orchestrated-steg (JSON-only mulig), aggregator-rootKey schema-styrt,
  DOCX droppet, `publishTo` defaulter til steg-navnet.
- **Fase 2 — service task**: `KiBerikingServiceTask : IServiceTask` (`Type => "kiBeriking"`),
  agent-oppslag fra task-id, instansdata inn, data-elementer ut. `AddAiEnrichment()`-extension
  med options (BaseUrl, Model, ApiKey via `ISecretsClient`). Oppstartsvalidering.
- **Fase 3 — demo-app + lokal verifisering**: prosess `data → kiBeriking → confirmation`,
  `App/agents/sjekkliste/` portert fra v0.4-config, policy.xml, applicationmetadata,
  Dockerfile med typst. Kjøres mot app-localtest, ende-til-ende mot KI-gatewayen.
- **Fase 4 — herding + dokumentasjon**: timeout-/retry-budsjett, telemetri (app-libs
  OpenTelemetry), README med `App/agents`-kontrakten og Dockerfile-oppskrift.
- **Fase 5 — senere/valgfritt**: Designer-støtte i process-editor; upstreaming til
  app-lib-dotnet / publisering som NuGet-pakke.

## Risikoer

1. **Latens** inline i `process/next` (LLM-kjøring kan ta minutter) → concurrency + budsjett,
   exit til feedback-task-mønsteret finnes.
2. **Datamodell-adapter**: regler/tool-paths i v0.4 er skrevet mot FlatData-formen — må
   valideres mot appens faktiske datamodell i fase 3.
3. **Typst i app-image** → pluggbar rendring; JSON-output er uavhengig av typst.
4. **Task-type-kollisjon**: `Type` som kolliderer med innebygde (`pdf`, `eFormidling`, …)
   overstyres ikke — `kiBeriking` er unik.
