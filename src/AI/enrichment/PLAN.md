# Plan: AI enrichment as a first-party process step in Altinn apps

> Status: phases 1 + 2 done (2026-07-09) — 106/106 tests green, incl. end to end
> with the demo fixture/typst and service task execution against a mocked IInstanceDataMutator.
> The library is packed as NuGet (`dotnet pack`) for consumption from app repos.
> Next: phase 3 — integration into the existing app **ttd/sjenk** (separate work item).
> Reference implementation (v0.4, standalone microservice) is on
> the branch `feat/augmenter-agent-v0.4-direct-tools` (`src/AI/augmenter-agent/`).

## Goal

The augmenter capabilities (per-item LLM evaluation with deterministic tools, mapping and
PDF rendering) become a first-class feature of a standard Altinn app, exposed as a
separate process step **`ai`**. An app configures everything through an `App/agents/` folder
with one subfolder per step/agent.

## Decided direction

1. **The library variant.** Everything lives in the class library `Altinn.App.Ai.Enrichment`
   (net8.0, references `Altinn.App.Core` >= 8.12). The app should have **as little custom code as possible**:
   a NuGet reference + one DI line (`services.AddAiEnrichment(...)`) + an `App/agents/` folder +
   a BPMN task + a policy action + dataTypes. The `IServiceTask` implementation itself lives in
   the library, not in the app. Precedent: `Altinn.App.Clients.Fiks`.
   Any upstreaming to app-lib-dotnet is a later, separate track (phase 5).
2. **Rendering is pluggable.** The enrichment JSON is always written as a data element (the core value).
   Typst PDF is an optional extra that requires `typst` in the app's image (documented
   Dockerfile snippet). DOCX/Pandoc is dropped in v1.
3. **Execution model v1: inline service task.** Runs in the `process/next` request with a tight
   timeout budget and `FailedAbortProcessNext` as the retry mechanism. The data contract is designed
   so that switching to the feedback task pattern (for long runs) does not change the output.

## Key facts from research (2026-07-09)

- app-lib >= 8.9.0 supports custom service tasks: `IServiceTask`
  (`Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks`, `[ImplementableByApps]`).
  Dispatch is a string match of `Type` == `<altinn:taskType>` against DI-registered implementations.
  `Execute(ServiceTaskContext)` gets an `IInstanceDataMutator` with `AddFormDataElement` /
  `AddBinaryDataElement`; the engine saves afterwards by itself. Data from earlier tasks is locked (read-only).
- Authorization: `policy.xml` must grant an action with **exactly the same name as the task type**
  (`ai`) to the relevant roles.
- Custom `<altinn:...Config>` XML in BPMN is NOT extensible from app code → all config
  lives in `App/agents/` + appsettings. Mapping task → agent folder: folder name = task ID,
  overridable with `AiEnrichment:Tasks:<taskId>:Agent` in appsettings.
- Designer/Studio: hand-edited BPMN with a custom task type is saved verbatim and deploys fine.
  `App/agents/` is not broken by any validation. Full Designer support (palette, config panel,
  icon, i18n — ~8 change points in the process editor + backend enum) is optional (phase 5).
- Secrets: `ISecretsClient` (Key Vault in TT02/prod, `secrets.json` locally). HTTP: typed
  clients via `IHttpClientFactory`.

## The config contract (`App/agents/`)

```
App/agents/
└── <agent-name>/            # one folder per AI step (name = task ID, or an appsettings mapping)
    ├── agent.yaml           # pipeline steps for the agent: model overrides, concurrency,
    │                        #   maxToolIterations, output names, rendering on/off
    ├── system-prompt.md     # the orchestrator's system prompt
    ├── rules/               # per-item *.md (format unchanged from v0.4)
    ├── tools/               # OpenAI tool definitions, <tool_name>.json (unchanged)
    ├── registries/          # lookup tables + output schema (unchanged)
    ├── mappings/            # JsonPathMapper spec, <mapper>.json (unchanged)
    └── templates/           # *.typ (only for PDF rendering)
```

Input: form data via `IInstanceDataAccessor.GetFormData()` (replaces the multipart upload of
`{FlatData: ...}`). Output: verdicts JSON (+ optional PDF) as data elements defined in
`applicationmetadata.json`.

## Porting map from v0.4

| v0.4 (microservice)                                                                                    | v0.5 (library)                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Orchestrator, chat client, 10 tools, JsonPathMapper, registries, aggregator, Typst renderer            | Ported nearly unchanged (~70 % of the code)                                                          |
| Web host, endpoints, multipart, callback, queue/background service, KeyVault bootstrap, upload options | Replaced by app-lib (`IServiceTask`, `IInstanceDataMutator`, `ISecretsClient`, `IHttpClientFactory`) |
| `ContentPathsOptions` (global roots under `/etc/augmenter`)                                            | Per-agent folder resolution from `App/agents/<agent>/`                                               |
| `pipeline.yaml` (global)                                                                               | `agent.yaml` per agent (same step schema)                                                            |
| `ConfigValidator` (fail-fast on mount)                                                                 | Fail-fast validation of `App/agents` at startup                                                      |
| DOCX generation (Pandoc)                                                                               | Dropped in v1                                                                                        |

## Phases

- **Phase 1 — the library** _(done)_: `src/AI/enrichment/` with `Altinn.App.Ai.Enrichment`
  - a test project. The core is ported from the worktree reference; per-agent config model
    (`AgentFolder`/`AgentRuntimeFactory`); unit tests ported + new factory tests.
    Deliberate deviations from v0.4: step errors propagate (was log-and-continue), `template`
    optional for orchestrated steps (JSON-only possible), aggregator rootKey driven by the schema,
    DOCX dropped, `publishTo` defaults to the step name.
- **Phase 2 — service task** _(done)_: `AiServiceTask : IServiceTask`
  (`Type => "ai"`), agent lookup from the task ID (overridable via
  `AiEnrichment:Tasks`), input = the only dataType with appLogic (otherwise config),
  output = JSON/PDF as binary data elements. `AddAiEnrichment()` registers everything;
  API key via `ISecretsClient` (`ApiKeySecretName`) with a direct `ApiKey` as a
  local-dev override. Agent validation happens on the first run (cached per folder) —
  separate startup validation postponed to phase 4 if wanted.
- **Phase 3 — integration into ttd/soknad-bevillinger** _(done 2026-07-09, separate repo)_:
  carried out on the branch `feat/ki-beriking` in the app's own repo (the domain rules and
  the agent configuration live there, not here). The old augmenter integration
  (callback controller, HTTP client, its own service task) is removed and replaced with
  `ai` + `AddAiEnrichment()`; app-lib upgraded 8.9.2 → 8.12.7; local
  NuGet feed in `packages/`.
  **E2E verified in app-localtest** with LM Studio as a local OpenAI-compatible gateway:
  process `data → ai → End`, all 39 items got real LLM verdicts,
  tool use confirmed (registry lookup), enrichment JSON + both PDFs stored as
  data elements, Norwegian characters intact.
  **Known issues**: (1) the AI gateway now requires a JWT bearer — the old API key is rejected;
  a new key must be obtained before running against it. (2) Small local models need
  `concurrency: 1` in agent.yaml (5-way parallelism gave 500/400 from LM Studio) —
  consider an appsettings override of concurrency in phase 4. (3) The app's data model has
  FlatData as its root property; the service task unwraps it (preview.2).
- **Phase 4 — hardening + documentation**: timeout/retry budget, telemetry (app-lib's
  OpenTelemetry), README with the `App/agents` contract and a Dockerfile recipe.
  - **Step budget on the workflow engine** _(done 2026-07-29, preview.6)_: PR #19571
    (main, 2026-07-21) gives service tasks a per-step `MaxExecutionTime`/retry via
    `IProcessStepConfigurable.StepOptions`, with a **10 min default** for
    `ExecuteServiceTask` — too short for long agent runs (observed ~13 min
    at concurrency 4). Solved by multi-targeting the library: `net8.0` against
    Altinn.App.Core 8.12.7 (unchanged, classic synchronous `process/next`) and `net10.0`
    against 9.0.0-preview.3, where `AiServiceTask.StepOptions` gives a 1 h `MaxExecutionTime`
    and at most 2 retries (constant 1 min interval), configurable via
    `AiEnrichment:Step`. On v9, config/contract errors map to `FailedPermanent`
    (no retries burned) and other errors to `FailedRetryable`.
    The AI gateway's own limit: 30 min per non-streaming request (streaming:
    unlimited) — keep `TimeoutSeconds` below this.
  - **Replay guard (done 2026-07-30, preview.7, net10/v9 only)**: the engine delivers
    callbacks at least once; if the success response is lost, the step is re-run under the same
    workflow ID. Outputs are now tagged with `aiEnrichmentWorkflowId` in the element metadata,
    and `AiServiceTask` checks (against a freshly fetched instance — the state blob is by
    definition stale) whether outputs for the workflow ID already exist: if so, the
    agent run is skipped and success is reported again. Prevents duplicate
    data elements and wasted LLM runs. The remaining problem (409 idempotency
    conflict on the auto-advance enqueue on replay) lies with the app-lib/engine team.
- **Phase 5 — later/optional**: Designer support in the process editor; upstreaming to
  app-lib-dotnet / publishing as a NuGet package.

## Risks

1. **Latency** inline in `process/next` (an LLM run can take minutes) → concurrency + budget,
   an exit to the feedback task pattern exists.
2. **Data model adapter**: rules/tool paths in v0.4 are written against the FlatData shape — must
   be validated against the app's actual data model in phase 3.
3. **Typst in the app image** → pluggable rendering; the JSON output is independent of typst.
4. **Task type collision**: a `Type` that collides with built-in ones (`pdf`, `eFormidling`, …)
   is not overridden — `ai` is unique.
