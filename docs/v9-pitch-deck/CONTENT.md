# v8 → v9 town hall — content pack

Research basis: `altinn-studio` @ `main`, HEAD `470d043da5` (2026-09-10). All paths below are
relative to that repo root. v8 facts are read from the `v8.12.7` tag (last v8) via
`git show v8.12.7:<path>` — at that tag the library root *is* the repo root, so v8 paths read
`src/Altinn.App.Core/…` while v9 paths read `src/App/backend/src/Altinn.App.Core/…`.

Audience: ~300 people, mixed technical levels, Norwegian bokmål. Sections 2–4 are the deck.
Section 1 is for whoever builds it.

---

## 1. Fact sheet (English — for the deck builders)

### v8: who owned the work

1. In v8, `PUT .../process/next` executed the **entire** transition inline in the app pod, inside the
   one HTTP request — the controller simply awaits `_processEngine.Next(...)` — and consecutive
   service tasks auto-chained in that same request via a `do…while` loop capped at 100 iterations, so
   one click could run many transitions back-to-back on one connection. (source:
   `v8.12.7:src/Altinn.App.Api/Controllers/ProcessController.cs` L273–L308;
   `v8.12.7:src/Altinn.App.Core/Internal/Process/ProcessEngine.cs` L157–L222)
2. Task-end side effects ran as a flat `await` sequence in one handler: task end → finalize (saves to
   Storage) → app-defined end handlers → lock data → **PDF** → **eFormidling**. No transaction, no
   compensation, no retry. (source: `v8.12.7:src/Altinn.App.Core/Internal/Process/EventHandlers/ProcessTask/EndTaskEventHandler.cs` L43–L70)
3. v8's own source says so in its doc comments: the PDF and eFormidling shims are *"Called inline in
   `EndTaskEventHandler`, instead of through the service task system."* (source:
   `v8.12.7:src/Altinn.App.Core/Internal/Process/ProcessTasks/ServiceTasks/Legacy/PdfServiceTaskLegacy.cs` L12
   and `…/EformidlingServiceTaskLegacy.cs` L16)
4. Altinn Events registration was also inline — and its failures were **silently swallowed** into a
   log warning, so an event could go missing with no signal at all. (source:
   `v8.12.7:src/Altinn.App.Core/Internal/Process/ProcessEventDispatcher.cs`, `RegisterEventWithEventsComponent`)

### v8: what broke

5. **No durable record of an in-flight transition existed in v8** — `ProcessStatus` appears nowhere in
   the v8 source tree, and there is no outbox, job store, or resume endpoint. Worse, the ordering put
   side effects **before** the process state was persisted, so a pod kill between them left Storage on
   the *old* task while stripped form data was already saved, data elements were already locked, and a
   PDF may already have been stored — with nothing to re-drive it. (source: v8 tree-wide search;
   `v8.12.7:…/ProcessEngine.cs` `HandleEventsAndUpdateStorage` L400–L415)
6. **PDF succeeds, eFormidling fails** is the canonical partial: both are wrapped in
   `catch → unlock data → throw`, so the PDF stays stored, the transition never commits, and the user
   gets a 500. A retry re-runs the whole chain from the top. (source:
   `v8.12.7:…/EndTaskEventHandler.cs` L53–L70; test `v8.12.7:test/Altinn.App.Api.Tests/Controllers/ProcessControllerTests.cs`
   L226 `RunProcessNext_PdfFails_DataIsUnlocked` asserts a 500)
7. **Concurrency, precisely:** v8.0–v8.10 had **no** guard on `process/next` at all. A Storage-backed
   lock lease arrived in **v8.11.0** (commit `d82213d970`, 2026-02-16): a 5-minute TTL lease taken
   after authorization, returning 409 on contention, with best-effort release that swallows failure —
   so a crashed pod leaves the lock held until the TTL expires. Even at v8.12.7 there was still **no
   idempotency key and no version fence**, so the lease stops a simultaneous double-click but not a
   retried request after the first one's connection dropped. (source:
   `v8.12.7:src/Altinn.App.Core/Internal/InstanceLocking/InstanceLocker.cs`; integration test
   `…/InstanceLocking/InstanceLockTests.cs` `ProcessNext_ConcurrentRequests_OneRequestGetsConflict`)
8. v8's long-wait mechanism for eFormidling was the app **publishing a CloudEvent to itself** and
   abusing Altinn Events' retry backoff as a timer, with `HTTP 425` meaning "remind me later";
   expiry meant the platform team manually drained a dead-letter queue, and it could not be tested
   locally. (source: `docs/adr/2026-07-23-workflow-engine-durable-yield.md`, "Problem context")
9. That loop also produced a real double-advance bug, named in the v9 changelog: *"The task advanced
   as soon as the shipment was handed over, and the reminder loop then moved the process again when
   delivery was confirmed — against whatever task the instance had reached by then."* (source:
   `src/App/backend/CHANGELOG.md`, 9.0.0-preview.4 → Fixed)

### v9: what the engine actually does

10. In v9 the app **enqueues** the transition to an external workflow engine and waits on it; the
    engine executes each step by HTTP callback into the app. There is **no in-process fallback path**
    — `ProcessEngine` has only the engine call. (source:
    `src/App/backend/src/Altinn.App.Core/Internal/Process/ProcessEngine.cs` L865;
    `src/App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/WorkflowEngineService.cs` L69)
11. Steps are **durable rows in PostgreSQL** — the database is the single source of truth, with no
    in-memory queue. Workers claim work with `FOR UPDATE SKIP LOCKED` and stamp a fresh `lease_token`
    in the same atomic statement. (source: `src/Runtime/workflow-engine/src/WorkflowEngine.Data/Repository/EngineRepository.Writes.cs`,
    `FetchAndLockSql`)
12. **Lease-token compare-and-set** is what makes takeover safe: every write-back carries
    `AND w.lease_token = v.lease_token`, so a stalled worker whose row was reclaimed cannot clobber
    the new owner's result. Liveness is proved by a 10 s heartbeat; a workflow whose heartbeat is
    30 s stale is reclaimed by another worker, up to 5 reclaims before it is failed as poisoned.
    (source: same file, `BatchUpdateWorkflowsAndSteps` / `BatchUpdateHeartbeats`;
    `src/Runtime/workflow-engine/src/WorkflowEngine.Core/Constants/Defaults.cs`)
13. **Enqueue is idempotent.** Keys live in `engine.idempotency_keys` with PK `(idempotency_key,
    namespace)` plus a `request_body_hash`, inserted `ON CONFLICT DO NOTHING`. Same key + same body →
    **200, nothing created**, original workflow ids returned; same key + *different* body → **409**.
    The app's chain-initiating key is `process-next-operation-{instanceGuid:N}-{instanceVersion}` — a
    **version fence**, not just a mutex: the same instance+version deliberately collides regardless of
    action, task or flow. (source: `EngineRepository.Writes.cs` `InsertIdempotencyKeys`;
    `src/Runtime/workflow-engine/src/WorkflowEngine.Core/Engine.cs` L338–L350;
    `…/WorkflowEngine/WorkflowEngineService.cs` L988)
14. A second `process/next` while one is running is refused **before** anything happens, on the
    durable process status: `409 Conflict` with `processNextState: "retrying"` (still running) or
    `"resumeRequired"` (terminally failed). v9 replaced v8's lock lease with an
    idle→processing compare-and-set on the instance itself. (source:
    `src/App/backend/src/Altinn.App.Api/Controllers/ProcessController.cs` L852–L857;
    `…/WorkflowEngine/Commands/AcquireProcessingStatus.cs` L41)
15. Proven end-to-end, not just designed: `ProcessNext_WhileTransitionInFlight_ReturnsRetryingConflictWithoutSecondTransition`
    asserts the competing call gets 409 `retrying` **and** that the task-end side effect ran exactly
    once. (source: `src/App/backend/test/Altinn.App.Integration.Tests/ProcessNextConcurrency/ProcessNextConcurrencyTests.cs`)
16. **Automatic retry with backoff** is the deployed default: exponential, 1 s base, 5 min cap, 24 h
    total budget, no attempt limit inside it, with non-retryable statuses 400/401/403/404/422. Retry
    delays carry uniform **±20 % jitter**, deliberately a constant rather than a knob, so retry waves
    de-synchronise. (source: `src/Runtime/workflow-engine-app/src/WorkflowEngine.App/appsettings.json`;
    `src/Runtime/workflow-engine/src/WorkflowEngine.Resilience/Constants/Defaults.cs` L13)
17. **Non-critical side effects are split out.** Outbound Altinn Events and the instantiation
    notification are enqueued *at the commit* as separate single-step workflows — independent roots,
    `IsHead=false`, invisible to the wait — so a slow or failing event registration can never gate the
    API response or wedge the instance. They exist if and only if the transition committed. (source:
    `docs/adr/2026-07-10-workflow-engine-noncritical-side-effects.md`;
    `…/WorkflowEngine/Commands/EnqueueSideEffectsWorkflow.cs`)
18. **Waiting is a first-class, non-failure state.** A service task returns `ServiceTaskResult.Defer(delay,
    reason)`: the step parks in status `Waiting`, holds **no lease and no worker slot**, records no
    error history, and resets its retry counter. Total waiting is capped by a wait budget (default
    1 day, hard max 14 days). (source: `src/Runtime/workflow-engine/AGENTS.md`, "Deferral (durable yield)";
    `src/Runtime/workflow-engine/src/WorkflowEngine.Models/EngineSettings.cs`)
19. eFormidling is the live example: a `Stage(SendShipment)` that dispatches exactly once, then a
    `Finally(AwaitDelivery)` that polls on a 15 s → 1 min → 5 min → 15 min ladder within a 2.5-hour
    budget. The archive-system integration goes further and uses a **mailbox** — nothing polls and no
    worker is held for up to 7 days while the archive thinks. (source:
    `src/App/backend/src/Altinn.App.Core/Internal/Process/ProcessTasks/ServiceTasks/EFormidlingServiceTask.cs`
    L66–L67 and L333; `src/App/backend/src/Altinn.App.Clients.Fiks/FiksArkiv/FiksArkivServiceTask.cs` L40, L68)
20. **Observability**: the engine ships a built-in dashboard — live SSE stream of active workflows,
    chains grouped per instance, a per-step pipeline with execution durations and backoff countdowns,
    and a step modal with *Execution started*, retry strategy, a **full error history** (each entry:
    retryable/non-retryable badge, HTTP status, timestamp, message), a state-in/state-out JSON diff,
    and a Grafana trace deep-link. Operator actions — **Retry** (resume), **Retry now / Check now**
    (nudge), **Fail** — call the same public API anyone else would. (source:
    `src/Runtime/workflow-engine/src/WorkflowEngine.Core/wwwroot/DASHBOARD_SPEC.md`)
21. **Failure-storm throttling** is built: a per-namespace circuit breaker parks an app's already-
    failing population behind a jittered, exponentially growing window, keeps 3 rotating canaries on
    the normal schedule, and releases in doubling cohorts once a canary progresses. Every stamp is
    clamped to the step's retry deadline, so throttling never costs a workflow its final attempt.
    (source: `docs/adr/2026-08-13-workflow-engine-failure-throttling.md`;
    `src/Runtime/workflow-engine/src/WorkflowEngine.Data/Services/NamespaceThrottleService.cs`)
22. **What the user sees while it runs**: a processing view ("Vi jobber med skjemaet ditt"), escalating
    to a reassurance after 30 s, and a connection note after two failed poll cycles. A parked service
    task gets its own waiting view. A terminally failed workflow gets a support-reference page with
    **no** user retry — except a failure *owned by the current service task*, which offers "Prøv igjen"
    calling `process/resume`. (source: `src/App/frontend/src/components/process/WorkflowEngine.tsx`;
    `src/App/frontend/src/features/process/service/{ServiceTaskFailed,ServiceTaskWaiting}.tsx`;
    text keys in `src/common/ts/language/src/texts/nb.ts`)

### v9: what it costs an app developer

23. The engine is **mandatory in v9, not opt-in**: `AddWorkflowEngineIntegration()` is called
    unconditionally and there is no feature flag anywhere in the app libraries. The only configuration
    is a platform URL. (source: `src/App/backend/src/Altinn.App.Core/Extensions/ServiceCollectionExtensions.cs` L231;
    `src/App/backend/src/Altinn.App.Core/Configuration/PlatformSettings.cs` L62)
24. **BPMN for a plain form app is unchanged** — `src/App/template/v8/…/process.bpmn` and
    `src/App/template/v9/…/process.bpmn` are byte-identical, and the engine introduces no BPMN element
    or attribute of its own. Three cases *do* need process changes: PDF and eFormidling move from
    `applicationmetadata.json` flags to BPMN service tasks (both rewritten automatically), a feedback
    step behind an eFormidling task **must be removed**, and an archive-system task now requires a
    following exclusive gateway (by hand). (source: template diff;
    `src/App/backend/src/Altinn.App.Analyzers/Diagnostics.cs` ALTINNAPP0600/0601;
    `src/App/backend/CHANGELOG.md` 9.0.0-preview.4/.5)
25. The upgrade is **part-automatic, part TODO list**: `studioctl app upgrade v9` runs ~25 migration
    jobs, compiles the app against its v8 packages first for exact type information, rewrites what it
    can and prints `TODO` for what it cannot; some changes have **no** automated upgrade at all. Real
    work an app must do: task hooks renamed (`IProcessTaskStart/End/Abandon` →
    `IOnTaskStartingHandler`/`IOnTaskEndingHandler`/`IOnTaskAbandonHandler`), the Altinn Events
    **receive** stack removed entirely (`IEventHandler`, the `eventsreceiver` endpoint), eFormidling
    registration moved to a builder, and a new build check that the app's `policy.xml` grants the org
    the rights it now uses on its own behalf. (source:
    `src/cli/studioctl-server/Studioctl/Upgrade/v8Tov9/V8Tov9Upgrade.cs`; `src/cli/CHANGELOG.md` L33;
    `src/App/backend/CHANGELOG.md`, 9.0.0-preview.2/.4/.5)

### Do NOT claim (accuracy guardrails)

- ✗ **"Exactly once."** The engine's own words are *"at-least-once delivery, automatic retries,
  idempotency"* (`src/Runtime/workflow-engine/docs/technical-guide.md` L40). A step can run twice
  (crash after callback, before write-back). What is guaranteed: one owner at a time (row lock +
  lease CAS), enqueue dedupe by idempotency key, and a per-step idempotency key the app passes to
  Storage so its own writes dedupe. Say **"no duplicate side effects"**, not "exactly once".
- ✗ **"Race conditions are impossible."** Say what the mechanism is: a durable `processing` status
  with an idle→processing CAS, plus a version-fenced idempotency key.
- ✗ **"The circuit breaker protects production today."** It is code-complete, migrated and tested, but
  ships with `Enabled: false` and nothing on `main` turns it on. Say **"built, ready to enable per
  environment"**. (source: `src/Runtime/workflow-engine/src/WorkflowEngine.Core/Constants/Defaults.cs`)
- ✗ **"The submitting tab already shows the advancing view."** PR #20340 is **OPEN, not merged**
  (verified via `gh pr view 20340`). On `main` the submitting tab shows only the button spinner for
  its own request; a *reloaded* tab shows the advancing view. Present it as in progress.
- ✗ **"v8 had no protection against double submits."** True up to v8.10 only. From v8.11 there is a
  Storage lock lease (5 min TTL, 409 on contention). Frame v9 as durable-and-fenced, not first-ever.
- ✗ **"v9 is out, upgrade today."** Latest is **9.0.0-preview.5** (2026-09-04). The engine is deployed
  via Flux syncroot in **at23 and tt02 only** — not prod, yt01, at22 or at24 (source:
  `infra/runtime/syncroot/*/workflow-engine-app.yaml`). This is a "join the preview" pitch.
- ✗ Never name an archive-system vendor on a slide. Say *arkivintegrasjon* / *arkivsystem*.
- ⚠ UNVERIFIED: what the *deployed* engine's wait-budget and retry settings are (repo defaults only);
  whether a published v9 migration guide exists outside this repo; whether preview.5 entries survive
  to GA.

---

## 2. Slide script (norsk bokmål)

> Tone: trygg, varm, ikke nedlatende. Ingen «revolusjonerende», «game changer», «sømløs».
> Bruk *arkivintegrasjon*, aldri produktnavn.

### 1 — Ett klikk, mange ting

**Brødtekst**
Når en bruker trykker «Send inn», skjer det ti ting. I dag må alle ti lykkes i løpet av én
forespørsel.

**Taleranmerkning**
Dette er utgangspunktet for hele presentasjonen. Vi skal se på hva som faktisk skjer bak det klikket,
hvor det ryker, og hva vi har gjort med det. Ingen forkunnskaper trengs.

**Visuell**
Én stor «Send inn»-knapp, med ti tynne tråder som går ut av den mot ikoner (PDF, arkiv, varsel, …).

---

### 2 — Slik ser det ut i dag

**Brødtekst**
App-en låser instansen, avslutter oppgaven, låser data, lager PDF, sender forsendelse og registrerer
hendelser. Alt i én forespørsel.

**Taleranmerkning**
Rekkefølgen er en rett linje med «await» etter «await». Det finnes ingen transaksjon rundt den, og
ingenting som rydder opp hvis linjen brytes på midten.

**Visuell**
Vannrett tidslinje fra «Klikk» til «Ferdig», med seks bokser på rad inni én forespørselsboble.

---

### 3 — Alt henger i én tråd

**Brødtekst**
Ingenting er skrevet ned underveis. Faller app-en, finnes det ingen notat om hva som var i gang.

**Taleranmerkning**
Dette er kjernen. Det er ikke at koden er dårlig — den er god. Det er at arbeidet bare eksisterer i
minnet til én prosess, i den tiden nettleseren holder forbindelsen åpen.

**Visuell**
Samme tidslinje, men understreket med «ingen varig spor» og et tomt notatark ved siden av.

---

### 4 — Når det ryker midtveis

**Brødtekst**
Ny versjon rulles ut, poden stoppes. PDF-en er laget og lagret. Prosessen står igjen på forrige
oppgave. Brukeren ser en feilmelding.

**Taleranmerkning**
Sideeffektene kjørte før prosessteget ble lagret. Det betyr at vi kan sitte igjen med halvt utført
arbeid som ingen vet om. Neste forsøk begynner helt forfra.

**Visuell**
Tidslinjen kuttet av en rød strek midtveis; grønt hake-ikon til venstre, grå spøkelsesbokser til
høyre.

---

### 5 — Dobbeltinnsending

**Brødtekst**
To faner, eller ett nytt forsøk etter at forbindelsen røk. Fram til v8.11 kunne begge kjøre — to
PDF-er, to forsendelser.

**Taleranmerkning**
Fra v8.11 kom det en lås mot Storage, og den hjelper mot samtidige klikk. Men den er en leie med fem
minutters levetid, og det finnes ingen nøkkel som gjenkjenner at «dette er det samme forsøket én
gang til».

**Visuell**
To identiske klikk-piler som møtes i samme instans, med to PDF-ikoner ut på høyre side.

---

### 6 — Halvveis utført

**Brødtekst**
PDF-en ble laget. Forsendelsen feilet. Prosessen står stille. Hendelsen som skulle varslet andre
systemer, ble borte uten et lyd.

**Taleranmerkning**
Registrering mot hendelsestjenesten var pakket inn i en logglinje — feilet den, gikk den tapt uten
spor. Og en forsendelse som feiler halvveis, kan allerede ha lastet opp vedlegg på den andre siden.
Siste klikk: dobbeltklikk. Låsen fra v8.11 stopper to samtidige klikk, men kjenner ikke igjen det
samme forsøket én gang til — det gjør idempotensnøkkelen i v9.

**Visuell**
Fire statuskort: grønn PDF, rød forsendelse, grå «hendelse – ukjent», gul «vedlegg – halvveis». Under
dem en stripe med dobbeltklikk-saken: v8.11-låsen til venstre, prosessmotorens svar til høyre.

---

### 7 — Driftshverdagen

**Brødtekst**
Hvor mange instanser står fast akkurat nå? Hvorfor? I dag må noen lete i loggene for å svare.

**Taleranmerkning**
Den lange ventingen på leveransebekreftelse var bygget på at app-en sendte en hendelse til seg selv
og lånte en annen tjenestes forsøksrytme som klokke. Gikk tiden ut, måtte noen tømme en kø for hånd.

**Visuell**
Et loggvindu med tekstvegg, og et spørsmålstegn over.

---

### 8 — En motor for prosessen

**Brødtekst**
v9 flytter arbeidet mellom BPMN-oppgavene ut av forespørselen og inn i en egen prosessmotor med
database.

**Taleranmerkning**
App-en melder inn hva som skal skje og får svar. Motoren skriver hvert steg til Postgres, kjører dem
i rekkefølge, og kaller tilbake til app-en for hvert steg. Databasen er fasit — ingen kø i minnet.

**Visuell**
To bokser: «Altinn-app» og «Prosessmotor», med enqueue-pil én vei og callback-piler tilbake.

---

### 9 — Simulering 1: Innbyggeren

**Brødtekst**
Serveren restarter midt i innsendingen. Til venstre i dag. Til høyre med prosessmotoren.

**Taleranmerkning**
Samme uhell på begge sider — spørsmålet er hva det koster Kari. Til venstre: en feilmelding, og ingen
som vet om noe ble gjort. Til høyre er arbeidet skrevet ned før det utføres, så en annen server tar
over der den forrige slapp, og det som alt var gjort, gjøres ikke om igjen.

**Visuell**
To telefoner side om side, med en kort handlingsliste under hver. Se §3.1.

---

### 10 — Simulering 2: Mottakeren

**Brødtekst**
Mottakersystemet er nede en stund. Til venstre blir det brukerens feilmelding. Til høyre venter
motoren.

**Taleranmerkning**
Her er poenget at venting ikke er en feil. Steget parkeres, slipper arbeideren og sjekker igjen etter
avtalt tid. En ekte feil gir nytt forsøk med voksende pause — ett sekund, så mer, med litt tilfeldig
spredning så ikke alle banker på samtidig. Kari er ferdig lenge før mottakeren er oppe igjen.

**Visuell**
Et systemstatus-kort per side: mottakersystemet, og hva innbyggeren sitter igjen med. Se §3.2.

---

### 11 — Simulering 3: Driftsvakta

**Brødtekst**
Et steg feiler for alvor klokka 03:00. Til venstre: loggene. Til høyre: dashbordet.

**Taleranmerkning**
Feil skjer uansett, også med motoren. Forskjellen er natta etterpå: i dag leter vi i loggene og rydder
manuelt, sak for sak. Med motoren står steget i dashbordet med status, tidsbruk og hele
feilhistorikken — og drift kan kjøre det på nytt fra steget som feilet.

**Visuell**
To laptop-skjermer: en logg-vegg til venstre, steget i dashbordet med «Kjør på nytt» til høyre.
Se §3.3.

---

### 12 — Vi kan se hva som skjer

**Brødtekst**
Hver instans, hvert steg, hvert forsøk og hver feilmelding — med tidsbruk og full feilhistorikk.

**Taleranmerkning**
Dashbordet viser aktive kjeder i sanntid, tid brukt per steg, nedtelling til neste forsøk, og hele
feilhistorikken med statuskode. Derfra kan drift kjøre et steg på nytt, be det sjekke nå, eller gi
opp — knappene kaller det samme åpne API-et som alle andre bruker.

**Visuell**
Skjermbilde av dashbordet med steg-stolpen og et åpent steg-vindu.

---

### 13 — Hva betyr det for apputviklere

**Brødtekst**
BPMN-en din er den samme. Prosessmotoren er en del av plattformen — ikke noe du skrur på.

**Taleranmerkning**
Prosessfilen i maloppsettet er byte for byte lik mellom v8 og v9. Det som endrer seg, er noen navn i
koden, at PDF og forsendelse blir egne tjenesteoppgaver, og at oppgaver som venter lenge får et eget
API for det. `studioctl app upgrade v9` skriver om det den kan, og skriver «TODO» for resten.

**Visuell**
Delt skjerm: uendret BPMN-diagram til venstre, kort terminalutdrag av upgrade-kjøringen til høyre.

---

### 14 — Bli med i pilotene

**Brødtekst**
v9 er i preview og motoren kjører i testmiljøene. Vi ser etter apper som vil prøve den med oss.

**Taleranmerkning**
Vær ærlig her: dette er ikke ferdig, og det er nettopp derfor vi spør nå. Vi vil ha apper med ekte
tjenesteoppgaver — PDF, forsendelse, arkiv — fordi det er der forskjellen er størst og der vi trenger
tilbakemelding. Ta kontakt, så hjelper vi med oppgraderingen.

**Visuell**
Tre enkle steg: «Kjør upgrade» → «Test i testmiljø» → «Si fra hva som skurrer».

---

## 3. Simuleringsspesifikasjoner

Felles oppsett, likt for alle tre: øverst **én setning om hva som går galt**, med ett stort, flatt
ikon. I midten to kolonner — **«I dag (v8)»** til venstre og **«Med prosessmotor (v9)»** til høyre —
og hver kolonne viser (1) **skjermen til én person** og (2) under den en kort **handlingsliste** på
seks rader, én rad per takt. Radene er like på begge sider fram til historien deler seg; etter det er
venstre side gull/rød og høyre side blå/grønn. Nederst **én avsluttende setning**. Under alt en tynn
framdriftslinje med én markør per takt, som kan klikkes.

Ingen poder, leier, 409-er eller sammenlign-og-sett i scenene: rørleggerarbeidet forklares én gang,
på slide 8 (motoren) og slide 12 (dashbordet). Her handler det om personen.

En takt lander hvert ~2,2 sekund. Seks takter ≈ 12,5 s, så parkeres scenen på sluttbildet (~15 s
totalt). `Mellomrom`/klikk pauser, `R` spiller om igjen, klikk på en markør hopper til den takten.

### 1. Innbyggeren — serveren restarter midt i innsendingen

Skjerm: **telefon** på begge sider. Grunnlag: v8 har ingen varig registrering av arbeidet, og
sideeffektene kjører *før* prosessteget lagres (§1.5); v9 har steg i Postgres, leie og hjerteslag, og
en annen arbeider overtar etter 30 sekunder uten livstegn (§1.11, §1.12). Et fullført steg kjøres
aldri om igjen (ordlista, «Steg»).

| Takt | v8-kolonnen | v9-kolonnen |
|---|---|---|
| 1 | Kari trykker «Send inn» | Samme |
| 2 | Serveren restarter midt i arbeidet | Samme |
| 3 | Skjermen sier «Noe gikk galt» | Skjermen sier at vi jobber med saken |
| 4 | Gikk det gjennom? Kari vet ikke | En annen server tar over der den slapp |
| 5 | Hun ringer veiledningen for å spørre | Det som alt var gjort, gjøres ikke om igjen |
| 6 | Ukjent tilstand — noen må rydde opp | Kvitteringen er klar — og kom bare én gang |

Telefonen: v8 *Sender inn …* → **Noe gikk galt** → **Ingen kvittering**. v9 *Sender inn …* → **Vi
jobber med skjemaet ditt** → **Kvittering klar**.

⚠ Venteskjermen kommer **etter** at forbindelsen brytes. På `main` viser fanen som trykket «Send
inn», bare sin egen knappespinner; det er en *gjenlastet* fane som får behandlingsvisningen (§1.22 og
vokterregel 4). Ikke lov live status i den innsendende fanen.

Sluttsetning: **«Brukeren mister aldri arbeidet — en restart koster litt ventetid, ikke et nytt
forsøk.»**

### 2. Mottakeren — mottakersystemet er nede en stund

Skjerm: **systemstatus-kort** på begge sider, med én linje for mottakersystemet og én for hva
innbyggeren sitter igjen med. Grunnlag: v8 gjør nedstrømsfeilen til brukerens egen feil, og en
forsendelse som feiler halvveis kan alt ha lastet opp vedlegg (§1.6). I v9 er venting en
førsteklasses ikke-feil: steget parkeres, holder ingen arbeider og registrerer ingen feil (§1.18);
en ekte feil gir eksponentiell pause, 1 s basis, ±20 % spredning (§1.16).

| Takt | v8-kolonnen | v9-kolonnen |
|---|---|---|
| 1 | Skjemaet er ferdig — forsendelsen skal ut | Samme |
| 2 | Mottakersystemet svarer ikke | Samme |
| 3 | Kari får «Noe gikk galt» og må vente | Kari er ferdig — resten skjer i bakgrunnen |
| 4 | Vedlegg kan alt ligge halvveis hos mottaker | Venting er ikke feil — motoren sjekker igjen |
| 5 | Ingen prøver igjen — noen må oppdage det | Nytt forsøk med voksende pause: 1 s, 2 s, 4 s |
| 6 | Kari må sende inn hele skjemaet på nytt | Mottakeren er oppe — leveransen er bekreftet |

Kortet: **Mottakersystem** går *Tilgjengelig* → *Utilgjengelig* → *Tilgjengelig*, mens
**Innbyggeren** i v8 ender på *Må sende inn på nytt* og i v9 på *Ferdig for lenge siden*.
Aldri produktnavn — si *mottakersystem*.

Sluttsetning: **«Når mottakeren er nede, er det motoren som venter — ikke innbyggeren.»**

### 3. Driftsvakta — et steg feiler for alvor klokka 03:00

Skjerm: **laptop** på begge sider — en logg-vegg til venstre, dashbordet til høyre. Grunnlag: 422 er
en ikke-gjentakbar status, så «nytt forsøk hjelper ikke» er bokstavelig sant (§1.16); dashbordet
viser steget, tidsbruk og hele feilhistorikken, og driftsknappene kaller det samme åpne API-et som
alle andre (§1.20); en terminalt feilet arbeidsflyt gir brukeren en side med støttereferanse
(§1.22). v8-motstykket er loggjakten på slide 7 og køen som ble tømt for hånd (§1.8).

| Takt | v8-kolonnen | v9-kolonnen |
|---|---|---|
| 1 | 03:02 — et steg feiler, nytt forsøk hjelper ikke | Samme |
| 2 | Vakttelefonen ringer. Noen må opp. | Feilen er skrevet ned med tid og årsak |
| 3 | Leter i loggene: hvilken app, hvilken sak? | Brukeren får en referanse hun kan oppgi |
| 4 | Hvor mange andre står fast? Ingen vet. | Dashbordet viser steget og hele feilhistorikken |
| 5 | Neste morgen: manuell opprydding, én og én | Ett trykk: «Kjør på nytt» — steget fortsetter |
| 6 | Hva ble gjort, og hva ikke? Noen må gjette. | Steget er fullført. Prosessen gikk videre. |

Knappen heter **«Kjør på nytt»**, som på slide 12 — ikke å forveksle med brukerens egen «Prøv igjen»
(§1.22), som er en annen knapp på en annen skjerm.

Sluttsetning: **«Feil skjer uansett — forskjellen er om noen må lete, eller bare se og trykke.»**

### Dobbeltinnsending

Dekkes ikke lenger av en egen simulering. Den lever som slide 5 (v8-historien i tre klikk) og som
stripen nederst på slide 6: låsen fra v8.11 stopper to samtidige klikk, men kjenner ikke igjen det
samme forsøket én gang til (§1.7) — det gjør idempotensnøkkelen i v9, som svarer 200 og oppretter
ingenting nytt (§1.13). Si «sideeffekten kjørte én gang», aldri «umulig å kjøre to ganger».

---

## 4. Ordliste

| Norsk begrep | Forklaring |
|---|---|
| **Prosessmotor** | En egen tjeneste som utfører arbeidet mellom oppgavene i prosessen, i stedet for at app-en gjør alt mens brukeren venter. |
| **Steg** | Én avgrenset oppgave motoren utfører og skriver ned — for eksempel «lag PDF». Steg kjøres i rekkefølge, og et fullført steg kjøres aldri om igjen. |
| **Idempotens** | At det å be om det samme to ganger gir samme resultat som å be én gang. Sender du inn to ganger, kjenner motoren igjen forespørselen og oppretter ingenting nytt. |
| **Idempotensnøkkel** | Kvitteringen som gjør gjenkjenningen mulig. Her: instansen pluss versjonen av den — så «samme skjema, samme versjon» alltid regnes som samme forsøk. |
| **Leie (lease)** | En midlertidig eiendomsrett til et steg. Bare den som holder leia kan skrive resultatet. Slutter eieren å gi livstegn, overtar en annen — og den gamle får ikke lenger skrive. |
| **Hjerteslag** | Et livstegn eieren sender hvert tiende sekund. Uteblir det i 30 sekunder, regnes arbeidet som forlatt og hentes opp av noen andre. |
| **Nytt forsøk (retry)** | At motoren prøver et steg på nytt av seg selv når noe feiler, med stadig lengre pause mellom forsøkene og litt tilfeldig spredning så ikke alle prøver samtidig. |
| **Venting (parkert steg)** | «Jeg kjørte fint, svaret er bare ikke klart ennå.» Steget legges til side uten å telle som feil, uten å oppta kapasitet, og sjekkes igjen senere. |
| **Sidevirkning** | Noe som skjer i tillegg til selve prosessteget — en PDF, en forsendelse, et varsel. Noen må fullføres før brukeren kommer videre; andre kan trygt skje i bakgrunnen. |
| **Gjenopptak (resume)** | Å starte en feilet arbeidsflyt på nytt fra det steget som feilet — enten fra drift, eller fra brukerens «Prøv igjen»-knapp når feilen hører til oppgaven hun står på. |
