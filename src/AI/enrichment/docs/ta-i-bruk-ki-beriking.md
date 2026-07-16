# How-to: Ta i bruk KI-beriking i en Altinn-app

Denne guiden er for **tjenesteutviklere** som skal legge til et KI-berikingssteg
(`ai`) i en eksisterende Altinn-app. Steget kjører når prosessen forlater
et datasteg: en agent evaluerer skjemadataene punkt for punkt med en LLM og
deterministiske verktøy, og resultatet lagres på instansen som JSON (og valgfritt
PDF) — klart for saksbehandler, arkiv eller eFormidling.

Alt fag-innhold (regler, prompts, oppslagstabeller, maler) bor i **appens eget
repo** under `App/agents/`. Biblioteket er generisk.

## Forutsetninger

- Appen bruker `Altinn.App.Api`/`Altinn.App.Core` **>= 8.9** (custom service
  tasks). Anbefalt: oppgrader til samme 8.12.x som biblioteket er bygget mot.
- Tilgang til en OpenAI-kompatibel chat-completions-gateway (URL + API-nøkkel),
  eller LM Studio lokalt for utvikling.
- `typst`-binæren i app-imaget — **kun** hvis agenten skal rendre PDF.
  JSON-only agenter kjører i standard image.

## Steg 1 — NuGet-pakken

Inntil pakken er publisert på en feed, bygges den fra dette repoet og legges i
en lokal mappe-feed i app-repoet:

```bash
# i altinn-studio-repoet
dotnet pack src/AI/enrichment/src/Altinn.App.Ai.Enrichment -c Release -o artifacts
```

I app-repoet: legg `.nupkg`-fila i `packages/`, pek en `nuget.config` på mappa,
og referer pakken:

```xml
<!-- nuget.config i repo-rot -->
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

> **NB:** `.gitignore` i app-maler ekskluderer ofte `packages/*` — sjekk inn
> nupkg-fila med `git add -f` slik at docker-builden og kollegene dine får den.

## Steg 2 — Én linje i Program.cs

```csharp
void RegisterCustomAppServices(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
{
    services.AddAiEnrichment(config);
}
```

Dette registrerer service tasken, binder konfigurasjon og kobler API-nøkkelen
mot appens secrets-klient. Ingen annen custom kode trengs.

## Steg 3 — Prosess-steget i process.bpmn

Legg inn en `<bpmn:serviceTask>` der i prosessen berikingen skal skje (typisk
rett etter utfyllingssteget), og koble sequence flows gjennom den:

```xml
<bpmn:serviceTask id="Task_AiEnrichment" name="KI Beriking">
  <bpmn:extensionElements>
    <altinn:taskExtension>
      <altinn:taskType>ai</altinn:taskType>
    </altinn:taskExtension>
  </bpmn:extensionElements>
  <bpmn:incoming>Flow_FraUtfylling</bpmn:incoming>
  <bpmn:outgoing>Flow_TilNesteSteg</bpmn:outgoing>
</bpmn:serviceTask>
```

Service tasks kjører **inline i `process/next`** og går automatisk videre ved
suksess. Ved feil stopper prosessen på steget, og neste `process/next` prøver
igjen — det er retry-mekanismen.

## Steg 4 — Autorisasjon i policy.xml

Prosessmotoren autoriserer `process/next` gjennom et steg via en XACML-action
med **nøyaktig samme navn som task-typen**. Legg til en `AttributeValue` for
`ai` i samme regel(er) som gir `write`:

```xml
<xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">ai</xacml:AttributeValue>
```

Glemmer du dette, får brukeren 403 på `process/next` inn i steget.

## Steg 5 — Output-datatyper i applicationmetadata.json

Resultatene lagres som binære data-elementer. Definer datatypene (uten
`appLogic`):

```json
{ "id": "ai-enrichment-json", "allowedContentTypes": ["application/json"], "maxCount": 0, "minCount": 0 },
{ "id": "ai-enrichment-pdf",  "allowedContentTypes": ["application/pdf"],  "maxCount": 0, "minCount": 0 }
```

Navnene er standard; de kan overstyres per task i appsettings. Skal resultatet
videre med eFormidling, legg datatypen inn i eFormidling-konfigens
vedleggsliste.

## Steg 6 — appsettings

```json
"AiEnrichment": {
  "AgentsRoot": "agents",
  "Tasks": {
    "Task_AiEnrichment": {
      "Agent": "min-agent",
      "InputDataType": "DataModel"
    }
  },
  "Agent": {
    "BaseUrl": "https://<gateway-host>/v1",
    "Model": "<provider:modellnavn>",
    "ApiKeySecretName": "<key-vault-secret-navn>"
  }
}
```

- **`Tasks`**: kobler bpmn-task-id til agent-mappe. Uten oppføring brukes
  konvensjonen agent-mappe = task-id (`App/agents/Task_AiEnrichment/`).
- **`InputDataType`**: hvilken datatype agenten skal evaluere. Har appen
  nøyaktig én datatype med `appLogic` (én skjemamodell), velges den automatisk;
  har den flere, **må** denne settes.
- **API-nøkkel**: i miljø løses `ApiKeySecretName` via appens `ISecretsClient`
  (Key Vault). Lokalt vinner en direkte `ApiKey` — sett den som miljøvariabel
  (`AiEnrichment__Agent__ApiKey`), **aldri** i innsjekket config.

## Steg 7 — Bygg agenten (`App/agents/<navn>/`)

Én mappe per KI-steg. Komplett, kjørbart eksempel: se test-fixturen
[`TestData/agents/demo/`](../test/Altinn.App.Ai.Enrichment.Tests/TestData/agents/demo)
(fiktivt rombooking-domene).

```
App/agents/min-agent/
├── agent.yaml           # stegene agenten kjører
├── system-prompt.md     # LLM-ens rolle + status-vokabular
├── rules/               # én .md per sjekklistepunkt: <seksjon>.<punkt>.md
├── tools/               # OpenAI-definisjoner for de 10 innebygde verktøyene
├── registries/          # sjekkliste.json (output-schema) + ev. oppslagstabeller
├── mappings/            # JsonPathMapper-spec(er)
└── templates/           # *.typ — bare hvis PDF
```

**agent.yaml** — stegtyper: `agent-pdf-orchestrated` (LLM per punkt; `template`
er valgfri — uten den blir det JSON-only) og `mapping-pdf` (ren deterministisk
mapping → PDF, ingen LLM):

```yaml
steps:
  - name: vurdering
    type: agent-pdf-orchestrated
    mapper: envelope          # mappings/envelope.json — konvolutten rundt verdictene
    template: vurdering.typ   # valgfri; krever typst
    output: vurdering.pdf     # kreves når template er satt
    publishTo: vurdering      # nøkkel for JSON-resultatet (default: stegnavnet)
    concurrency: 4            # maks parallelle LLM-kall (default 5)
    maxToolIterations: 5      # verktøy-runder per punkt før default-verdict
```

**system-prompt.md** definerer rollen og — viktig — **status-vokabularet**.
Aggregatoren kopierer statusene rått, så prompt, output-schema og ev.
typst-mal må bruke samme verdier (konvensjon: `vurdert_ok`, `vurdert_avslag`,
`maa_undersokes`, `ikke_relevant`, `ikke_vurdert`).

**rules/**: filnavnet er punkt-nøkkelen — `formalia.soker_identifisert.md`
mapper til seksjon `formalia`, punkt `soker_identifisert` i schemaet. Skriv
regelen som en instruks til LLM-en: hva som skal sjekkes, hvilke verktøy den
skal bruke, og hvilke statuser som gjelder når. **Stiene i reglene må matche
skjemamodellen slik den ser ut som JSON** (C#-propertynavn; en ev.
FlatData-konvolutt pakkes ut automatisk før agenten ser dataene).

**registries/sjekkliste.json** er output-schemaet: seksjoner og punkter med
ledetekster, pluss `defaultStatus` for punkter uten regel/verdict:

```json
{
  "defaultStatus": "ikke_vurdert",
  "sections": [
    { "id": "formalia", "label": "Formalia", "items": [
      { "id": "soker_identifisert", "label": "Søker er identifisert" } ] }
  ]
}
```

**tools/**: alle ti innebygde verktøy (`age_from_id`, `days_between`,
`time_within_window`, `hours_between_times`, `current_date`, `lookup`,
`path_value`, `count_attachments`, `text_matches_any`, `text_contains_any`)
må ha en definisjonsfil — kopier fra demo-fixturen og juster beskrivelsene
(spesielt `lookup`: list opp hvilke oppslagstabeller agenten faktisk har).

**mappings/**: JsonPathMapper-spec som bygger «konvolutten» rundt verdictene
(metadata, søker-info osv.) — nøkkelen med samme navn som schemaets rot
(default `sjekkliste`) overskrives av de aggregerte verdictene.

**templates/**: typst-maler leser datagrunnlaget med `json("data.json")`.
Se demo-fixturens `sjekkliste.typ` for iterasjon over seksjoner/punkter.

## Steg 8 — Bygg og image

`agents/` må følge med i publish-output — legg til i App.csproj:

```xml
<None Update="agents\**">
  <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
</None>
```

Skal agenten rendre PDF, må `typst` inn i Dockerfile (Alpine-eksempel — pin
versjon og SHA sammen):

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

Husk også at docker-builden trenger den lokale NuGet-feeden:
`COPY nuget.config .` og `COPY packages ./packages` før `dotnet restore`.

## Lokal testing

1. Start [app-localtest](https://github.com/Altinn/app-localtest) og appen
   (`dotnet run` fra `App/`).
2. Bruk en lokal LLM-server som gateway, f.eks. LM Studio
   (`http://localhost:1234/v1`). Erfaringer: bruk en modell i 12B-klassen
   eller større for meningsfulle vurderinger; **forvarm modellen** med ett
   lite kall før prosesskjøringen (parallelle kall kappløper ellers med
   JIT-lastingen og får 400); små/lokale modeller kan trenge
   `concurrency: 1`.

```bash
export AiEnrichment__Agent__BaseUrl="http://localhost:1234/v1"
export AiEnrichment__Agent__Model="<modellnavn i LM Studio>"
export AiEnrichment__Agent__ApiKey="lm-studio"   # LM Studio validerer ikke nøkkelen
dotnet run
```

3. Kjør flyten via API-et: hent testbruker-token fra localtest
   (`GET http://localhost:5101/Home/GetTestUserToken/<userId>?authenticationLevel=3`),
   opprett instans, PUT skjemadata, og kall `PUT …/process/next`.
   **NB:** serverer appen sin egen `testData.json` (wwwroot), bruker localtest
   *dens* brukere — endepunktet gir 404 for alle andre userId-er. Sjekk
   `GET <app-url>/testData.json` for gyldige userId/partyId.
4. Verifiser: `GET` på instansen skal vise nye data-elementer
   (`ai-enrichment-json`/`ai-enrichment-pdf`), og JSON-en skal ha ekte statuser og
   merknader per punkt. `HTTP/transport error` i merknadene betyr at
   gateway-kallene feilet — sjekk BaseUrl/nøkkel/modellnavn.

## Vanlige fallgruver

| Symptom | Årsak |
|---|---|
| 403 på `process/next` inn i steget | Mangler `ai`-action i policy.xml (steg 4) |
| «Agent definition not found … agent.yaml» | Agent-mappe matcher ikke task-id og `Tasks`-mapping mangler; eller `agents/**` mangler copy-regel (steg 8) |
| «ambiguous input — N candidate data elements» | Flere datatyper med `appLogic` → sett `InputDataType` (steg 6) |
| Alle punkter `ikke_vurdert` med HTTP-feil i merknad | Gateway-config/nøkkel feil, modell ikke lastet, eller for høy `concurrency` for gatewayen |
| «Typst compilation failed» / prosess feiler ved PDF | `typst` mangler i image/PATH, eller malen leser felter mapperen ikke produserer |
| Regler treffer ikke dataene | Stier i rules/mappings matcher ikke modellens JSON-form — verifiser mot en faktisk serialisert instans |
| `Transport: timeout after Ns` i merknadene | Gatewayen brukte lengre tid enn budsjettet — øk `AiEnrichment:Agent:TimeoutSeconds` eller senk `concurrency` |
| Prosessen stopper på steget etter feil | Det er retry-semantikken: rett årsaken og kall `process/next` på nytt — kjøringen gjenopptas |

## Referanser

- [README](../README.md) — bibliotekets kontrakter og arkitektur
- [PLAN.md](../PLAN.md) — bakgrunn, designvalg og fase-status
- [Demo-fixturen](../test/Altinn.App.Ai.Enrichment.Tests/TestData/agents/demo) — komplett eksempel-agent
- [Custom service tasks i app-lib](https://docs.altinn.studio/altinn-studio/guides/development/service-tasks/custom/) — mekanismen under panseret
