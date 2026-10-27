# How-to: Adopt AI enrichment in an Altinn app

This guide is for **service developers** who are adding an AI enrichment step
(`ai`) to an existing Altinn app. The step runs when the process leaves a data
task: an agent evaluates the form data item by item with an LLM and
deterministic tools, and the result is stored on the instance as JSON (and
optionally PDF) — ready for the caseworker, the archive or eFormidling.

All domain content (rules, prompts, lookup tables, templates) lives in **the
app's own repo** under `App/agents/`. The library is generic.

## Prerequisites

- The app uses `Altinn.App.Api`/`Altinn.App.Core` **>= 8.9** (custom service
  tasks). Recommended: upgrade to the same 8.12.x the library is built against.
- Access to an OpenAI-compatible chat completions gateway (URL + API key), or
  LM Studio locally for development.
- The `typst` binary in the app image — **only** if the agent renders PDF.
  JSON-only agents run in the standard image.

## Step 1 — The NuGet package

Until the package is published to a feed, build it from this repo and put it in
a local folder feed in the app repo:

```bash
# in the altinn-studio repo
dotnet pack src/AI/enrichment/src/Altinn.App.Ai.Enrichment -c Release -o artifacts
```

In the app repo: put the `.nupkg` file in `packages/`, point a `nuget.config`
at the folder, and reference the package:

```xml
<!-- nuget.config in the repo root -->
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
    <add key="local" value="packages" />
  </packageSources>
</configuration>
```

```xml
<!-- App/App.csproj -->
<PackageReference Include="Altinn.App.Ai.Enrichment" Version="0.5.0-preview.2" />
```

> **Note:** the `.gitignore` in app templates often excludes `packages/*` — check
> in the nupkg file with `git add -f` so the Docker build and your colleagues
> get it.

## Step 2 — One line in Program.cs

```csharp
void RegisterCustomAppServices(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
{
    services.AddAiEnrichment(config);
}
```

This registers the service task, binds the configuration and wires the API key
to the app's secrets client. No other custom code is needed.

## Step 3 — The process task in process.bpmn

Add a `<bpmn:serviceTask>` where in the process the enrichment should happen
(typically right after the form-filling task), and route the sequence flows
through it:

```xml
<bpmn:serviceTask id="Task_AiEnrichment" name="AI enrichment">
  <bpmn:extensionElements>
    <altinn:taskExtension>
      <altinn:taskType>ai</altinn:taskType>
    </altinn:taskExtension>
  </bpmn:extensionElements>
  <bpmn:incoming>Flow_FromFormFilling</bpmn:incoming>
  <bpmn:outgoing>Flow_ToNextTask</bpmn:outgoing>
</bpmn:serviceTask>
```

Service tasks run **inline in `process/next`** and move on automatically on
success. On failure the process stops at the task, and the next `process/next`
tries again — that is the retry mechanism.

## Step 4 — Authorization in policy.xml

The process engine authorizes `process/next` through a task via an XACML action
with **exactly the same name as the task type**. Add an `AttributeValue` for
`ai` to the same rule(s) that grant `write`:

```xml
<xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">ai</xacml:AttributeValue>
```

If you forget this, the user gets 403 on `process/next` into the task.

## Step 5 — Output data types in applicationmetadata.json

The results are stored as binary data elements. Define the data types (without
`appLogic`):

```json
{ "id": "ai-enrichment-json", "allowedContentTypes": ["application/json"], "maxCount": 0, "minCount": 0 },
{ "id": "ai-enrichment-pdf",  "allowedContentTypes": ["application/pdf"],  "maxCount": 0, "minCount": 0 }
```

These names are the defaults; they can be overridden per task in appsettings.
If the result should go on with eFormidling, add the data type to the
attachment list in the eFormidling configuration.

## Step 6 — appsettings

```json
"AiEnrichment": {
  "AgentsRoot": "agents",
  "Tasks": {
    "Task_AiEnrichment": {
      "Agent": "my-agent",
      "InputDataType": "DataModel"
    }
  },
  "Agent": {
    "BaseUrl": "https://<gateway-host>/v1",
    "Model": "<provider:model-name>",
    "ApiKeySecretName": "<key-vault-secret-name>"
  }
}
```

- **`Tasks`**: maps the BPMN task ID to an agent folder. Without an entry, the
  convention agent folder = task ID applies (`App/agents/Task_AiEnrichment/`).
- **`InputDataType`**: which data type the agent should evaluate. If the app
  has exactly one data type with `appLogic` (one form model), it is chosen
  automatically; if it has several, this **must** be set.
- **API key**: in an environment, `ApiKeySecretName` is resolved through the
  app's `ISecretsClient` (Key Vault). Locally a direct `ApiKey` wins — set it as
  an environment variable (`AiEnrichment__Agent__ApiKey`), **never** in
  checked-in config.
- **Timeouts and streaming**: `TimeoutSeconds` (default 300) is the library's
  budget _per LLM call_; exceeding it gives a clean `ikke_vurdert` verdict on
  the item instead of failing the whole step. The AI gateway itself cuts
  non-streaming requests after **30 minutes** — keep `TimeoutSeconds` well
  below that, and leave `UseStreaming` on (the default): with streaming, tokens
  flow the whole way, so the gateway's non-streaming limit does not apply.
- **Step budget (only apps on Altinn.App.Core v9+)**: on the workflow engine,
  the whole ai step has its own run-time budget. The library overrides the
  engine's 10-minute service task default through `AiEnrichment:Step`:
  `MaxExecutionTime` (default `"01:00:00"`), `MaxRetries` (default 2 — a retry
  runs the whole agent again, keep it low) and `RetryInterval` (default
  `"00:01:00"`). Apps on 8.x (classic synchronous `process/next`) ignore this.
- **Concurrency per environment**: `AiEnrichment:Agent:Concurrency` controls how
  many items an `agent-pdf-orchestrated` step assesses at the same time. Set it
  in `appsettings.<environment>.json` for each environment: a local LLM server
  that takes one request at a time wants `1`, and the gateway in the
  environments can take more. The order is `AiEnrichment:Agent:Concurrency`,
  then `concurrency` in agent.yaml, then 5. The value must be at least 1, or the
  app does not start. `concurrency` in agent.yaml still works but is
  deprecated: the file is shared by all environments, so a value meant for one
  environment ends up in all of them. The log shows which value each run used
  and where it came from.

## Step 7 — Build the agent (`App/agents/<name>/`)

One folder per AI step. Complete, runnable example: see the test fixture
[`TestData/agents/demo/`](../test/Altinn.App.Ai.Enrichment.Tests/TestData/agents/demo)
(fictional room-booking domain).

```
App/agents/my-agent/
├── agent.yaml           # the steps the agent runs
├── system-prompt.md     # the LLM's role + status vocabulary
├── rules/               # one .md per checklist item: <section>.<item>.md
├── tools/               # OpenAI definitions for the 10 built-in tools
├── registries/          # sjekkliste.json (output schema) + any lookup tables
├── mappings/            # JsonPathMapper spec(s)
└── templates/           # *.typ — only for PDF
```

**agent.yaml** — step types: `agent-pdf-orchestrated` (LLM per item; `template`
is optional — without it the step is JSON-only) and `mapping-pdf` (pure
deterministic mapping → PDF, no LLM):

```yaml
steps:
  - name: assessment
    type: agent-pdf-orchestrated
    mapper: envelope # mappings/envelope.json — the envelope around the verdicts
    template: assessment.typ # optional; requires typst
    output: assessment.pdf # required when template is set
    publishTo: assessment # key for the JSON result (default: the step name)
    maxToolIterations: 5 # tool rounds per item before the default verdict
```

**system-prompt.md** defines the role and — importantly — the **status
vocabulary**. The aggregator copies the statuses as they are, so the prompt, the
output schema and any typst template must use the same values (convention:
`vurdert_ok`, `vurdert_avslag`, `maa_undersokes`, `ikke_relevant`,
`ikke_vurdert`).

**rules/**: the file name is the item key — `formalia.soker_identifisert.md`
maps to section `formalia`, item `soker_identifisert` in the schema. Write the
rule as an instruction to the LLM: what to check, which tools to use, and which
statuses apply when. **The paths in the rules must match the form model as it
looks as JSON** (C# property names; a FlatData envelope, if any, is unwrapped
automatically before the agent sees the data).

**registries/sjekkliste.json** is the output schema: sections and items with
labels, plus `defaultStatus` for items without a rule or verdict:

```json
{
  "defaultStatus": "ikke_vurdert",
  "sections": [
    {
      "id": "formalia",
      "label": "Formalia",
      "items": [{ "id": "soker_identifisert", "label": "Søker er identifisert" }]
    }
  ]
}
```

**tools/**: all ten built-in tools (`age_from_id`, `days_between`,
`time_within_window`, `hours_between_times`, `current_date`, `lookup`,
`path_value`, `count_attachments`, `text_matches_any`, `text_contains_any`)
must have a definition file — copy them from the demo fixture and adjust the
descriptions (especially `lookup`: list which lookup tables the agent actually
has).

**mappings/**: a JsonPathMapper spec that builds the "envelope" around the
verdicts (metadata, applicant info and so on) — the key with the same name as
the schema's root (default `sjekkliste`) is overwritten by the aggregated
verdicts.

**templates/**: typst templates read the data with `json("data.json")`. See the
demo fixture's `sjekkliste.typ` for iterating over sections and items.

## Step 8 — Build and image

`agents/` must be included in the publish output — add to App.csproj:

```xml
<None Update="agents\**">
  <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
</None>
```

If the agent renders PDF, `typst` must go into the Dockerfile (Alpine example —
pin the version and SHA together):

```dockerfile
ARG TYPST_VERSION=0.14.2
ARG TYPST_SHA256_AMD64=a6044cbad2a954deb921167e257e120ac0a16b20339ec01121194ff9d394996d
RUN set -eux; \
    apk add --no-cache --virtual .typst-build-deps curl xz; \
    curl -fsSLo /tmp/typst.tar.xz "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-x86_64-unknown-linux-musl.tar.xz"; \
    echo "${TYPST_SHA256_AMD64}  /tmp/typst.tar.xz" | sha256sum -c -; \
    tar -xJf /tmp/typst.tar.xz -C /tmp; \
    mv /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst; \
    rm -rf /tmp/typst.tar.xz /tmp/typst-x86_64-unknown-linux-musl; \
    apk del .typst-build-deps
```

Remember also that the Docker build needs the local NuGet feed:
`COPY nuget.config .` and `COPY packages ./packages` before `dotnet restore`.

## Local testing

1. Start [app-localtest](https://github.com/Altinn/app-localtest) and the app
   (`dotnet run` from `App/`).
2. Use a local LLM server as the gateway, for example LM Studio
   (`http://localhost:1234/v1`). Lessons learned: use a model in the 12B class
   or larger for meaningful assessments; **warm up the model** with one small
   call before the process run (parallel calls otherwise race the JIT loading
   and get 400); small/local models may need
   `AiEnrichment__Agent__Concurrency=1`.

```bash
export AiEnrichment__Agent__BaseUrl="http://localhost:1234/v1"
export AiEnrichment__Agent__Model="<model name in LM Studio>"
export AiEnrichment__Agent__ApiKey="lm-studio"   # LM Studio does not validate the key
export AiEnrichment__Agent__Concurrency=1   # one request at a time; the environments set their own value
dotnet run
```

3. Run the flow through the API: get a test user token from localtest
   (`GET http://localhost:5101/Home/GetTestUserToken/<userId>?authenticationLevel=3`),
   create an instance, PUT the form data, and call `PUT …/process/next`.
   **Note:** if the app serves its own `testData.json` (wwwroot), localtest
   uses _its_ users — the endpoint returns 404 for every other userId. Check
   `GET <app-url>/testData.json` for valid userId/partyId values.
4. Verify: a `GET` on the instance should show new data elements
   (`ai-enrichment-json`/`ai-enrichment-pdf`), and the JSON should have real
   statuses and remarks per item. `HTTP/transport error` in the remarks means
   the gateway calls failed — check BaseUrl/key/model name.

## Common pitfalls

| Symptom                                                   | Cause                                                                                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 403 on `process/next` into the task                       | The `ai` action is missing from policy.xml (step 4)                                                                           |
| "Agent definition not found … agent.yaml"                 | The agent folder does not match the task ID and the `Tasks` mapping is missing; or `agents/**` has no copy rule (step 8)      |
| "ambiguous input — N candidate data elements"             | Several data types with `appLogic` → set `InputDataType` (step 6)                                                             |
| All items `ikke_vurdert` with an HTTP error in the remark | Wrong gateway config/key, model not loaded, or `AiEnrichment:Agent:Concurrency` too high for the gateway                      |
| "Typst compilation failed" / the process fails at PDF     | `typst` is missing from the image/PATH, or the template reads fields the mapper does not produce                              |
| Rules do not hit the data                                 | The paths in rules/mappings do not match the model's JSON shape — verify against an actual serialized instance                |
| `Transport: timeout after Ns` in the remarks              | The gateway took longer than the budget — raise `AiEnrichment:Agent:TimeoutSeconds` or lower `AiEnrichment:Agent:Concurrency` |
| The process stops at the task after a failure             | That is the retry semantics: fix the cause and call `process/next` again — the run resumes                                    |

## References

- [README](../README.md) — the library's contracts and architecture
- [PLAN.md](../PLAN.md) — background, design choices and phase status
- [The demo fixture](../test/Altinn.App.Ai.Enrichment.Tests/TestData/agents/demo) — a complete example agent
- [Custom service tasks in app-lib](https://docs.altinn.studio/altinn-studio/guides/development/service-tasks/custom/) — the mechanism under the hood
