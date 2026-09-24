# v9 town hall — content pack

Research basis: `altinn-studio` @ `main`, HEAD `470d043da5` (2026-09-10). All paths below are
relative to that repo root. v8 facts are read from the `v8.12.7` tag (last v8) via
`git show v8.12.7:<path>` — at that tag the library root *is* the repo root, so v8 paths read
`src/Altinn.App.Core/…` while v9 paths read `src/App/backend/src/Altinn.App.Core/…`.

The facts behind the three-part structure (infrastructure, frontend, developers, and the two
scenarios) were checked later, at `main` `9d1e65e7cd` (2026-09-23), and are marked with the PR or
path they come from.

Audience: ~300 people, mixed technical levels, Norwegian bokmål. Section 1 is for whoever builds the
deck; section 2 says where the copy lives; section 3 is the glossary.

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
    It is switched on in the engine host since #20404 (merged 2026-09-11).
22. **What the user sees while it runs**: one loading screen, escalating to the
    `process_workflow.still_working` reassurance after 8 s (#20403, which replaced the 30 s notice),
    and a connection note after two failed poll cycles. A parked service
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

### Infrastructure: what every app already has

26. **Most platform gains reach v8 apps too.** They live platform-side, so a v8 app gets them without
    upgrading:
    - Deploys from Studio run from one declared configuration, are followed until they complete, and
      each environment runs the declared version (#16429, #17174; flag removed in #19984).
    - The platform creates the Maskinporten client, hands it to the app, rotates the key and restarts
      the app afterwards. The managed client needs **8.3.0 or newer** (#18925 warns in Studio below
      that; rotation restarts in #19195).
    - Every PDF is generated by the new PDF service: routing is 100 % to it in every environment,
      prod included (`infra/runtime/syncroot/base/pdf.yaml`; cut over in #16930).
    - Service owners can be alerted by email, SMS or Slack (#17299, #17451, #18635).
27. **v9-only on the platform side:** the process engine; exactly one Maskinporten identity, which
    the app can no longer override (#20433, a breaking change); and graceful shutdown, so in-flight
    work finishes when an app restarts or scales (#20003).
28. **Coming, not shipped:** engine health in the Studio admin pages — which instances are stuck, and
    resume or abandon from there (#20233–#20236, open on 2026-09-24). Say «kommer».

### Frontend: what users notice

29. **Not a rebuild.** It is the same codebase, imported into the monorepo on 2025-09-23 and
    reworked in about 380 commits since; state management is still described as legacy
    (`src/App/frontend/AGENTS.md`). Do not say «bygget på nytt».
30. **The frontend ships with the app.** v8 loads frontend 4.x «latest» from the CDN, so new
    frontend versions reach users untested; v9 serves the frontend from inside the app's package, so
    each app version has exactly one frontend (#18947; `IndexPageGenerator.cs`).
31. **The one speed number:** page navigation in a 32-page test app went from ~280–310 ms to
    ~150–180 ms on simple pages, 40–50 % faster (#18987). One developer measurement, not production.
    Say «tidlig måling».
32. **What users notice** (#20403 and others, all merged): one calm loading screen during a
    submission, and after 8 s the text `process_workflow.still_working` («…Du kan trygt lukke siden og
    komme tilbake senere»); a reload shows the same state; the browser warns before closing with
    unsaved input (#20471); the error summary appears only when the user tries to move on, and takes
    focus (#19940).

### For developers: what service tasks can do now

33. **`IPipelineServiceTask`:** a service task defined as ordered durable stages and one conclusion.
    Each stage runs as its own engine step, and a completed stage never runs again; stages must be
    idempotent because a stage can be retried (`Features/Process/IPipelineServiceTask.cs`).
34. **Waiting for an outside answer:** a stage can open a mailbox and the task concludes on the
    replies. A mailbox stays open up to 21 days by default (`Features/Process/MailboxOptions.cs`).
35. **A service task is its own waiting step.** The user sees the default waiting view, or the app's
    own page once the task defers, until the task finishes; a failure always shows the default failure
    view (#19636, #20403). The `feedback` task type is mostly legacy: the v9 changelog says to remove a
    feedback step behind eFormidling, and `studioctl app upgrade v9` reports feedback steps behind a
    service task.
36. **Retry rules per step:** `ProcessStepOptions.RetryStrategy`. The engine default is exponential
    backoff from 1 s, capped at 5 min, for up to 24 h; HTTP 400/401/403/404/422 are never retried
    (`src/Runtime/workflow-engine-app/src/WorkflowEngine.App/appsettings.json`).

### The two scenarios

37. **v8 never moves the user back.** The process state is saved only after every hook has run, so a
    failure leaves the user on the same page with the toast `process_error.submit_error_please_retry`
    («Noe gikk galt under innsendingen, prøv igjen om noen minutter.»). Nothing retries by itself,
    and a retry runs every hook of the transition again; a PDF the first attempt stored is inserted a
    second time (`v8.12.7:…/ProcessEngine.cs` `HandleEventsAndUpdateStorage`; `PdfService.cs` L179).
38. **v9 retries by itself and skips what is done.** Each hook is its own engine step and a
    completed step is not re-run — but delivery is at-least-once, so a step can run twice if a server
    dies between doing the work and recording it (see the guardrail below). Storage de-duplicates the
    app's data writes by the step's idempotency key.
39. **A hook that throws is retried**, like any other failure (`OnTaskEndingHook.cs`, the `catch`).
    With the default budget a plain bug keeps the user on the waiting view for up to 24 h before the
    failure page. Do not raise this on stage; it is an open product question.

### Do NOT claim (accuracy guardrails)

- ✗ **"Exactly once."** The engine's own words are *"at-least-once delivery, automatic retries,
  idempotency"* (`src/Runtime/workflow-engine/docs/technical-guide.md` L40). A step can run twice
  (crash after callback, before write-back). What is guaranteed: one owner at a time (row lock +
  lease CAS), enqueue dedupe by idempotency key, and a per-step idempotency key the app passes to
  Storage so its own writes dedupe. Say **"no duplicate side effects"**, not "exactly once".
- ✗ **"Race conditions are impossible."** Say what the mechanism is: a durable `processing` status
  with an idle→processing CAS, plus a version-fenced idempotency key.
- ✗ **"The submitting tab shows nothing."** Out of date: #20403 (merged 2026-09-18) gives the
  submitting tab the calm loading screen and the 8 s notice. What is still true: a custom layout
  appears only while a service task deliberately waits, and **never** for a failure.
- ✗ **"v8 had no protection against double submits."** True up to v8.10 only. From v8.11 there is a
  Storage lock lease (5 min TTL, 409 on contention). Frame v9 as durable-and-fenced, not first-ever.
- ✗ **"v9 is out, upgrade today."** Latest is **9.0.0-preview.6** (2026-09-18). The engine is a
  closed beta, internal only for now (ttd → ring1), deployed in at23 and tt02 and opened to more
  organisations as needed or on request. This is a «bli med i pilotene» pitch.
- ✗ **"v9 is a new frontend" / "much faster".** See §1.29–31: same codebase, one measurement.
- ✗ **"Upgrade to get the new platform."** Most of it reaches v8 apps already (§1.26). Say so.
- ✗ **"Notifications and correspondence de-duplicate themselves in v9."** Correspondence
  de-duplication is opt-in (`WithIdempotentKey`, one recipient, a duplicate comes back as 409); the
  app-facing notification clients send no key at all.
- ✗ Never name an archive-system vendor on a slide. Say *arkivintegrasjon* / *arkivsystem*.
- ⚠ UNVERIFIED: what the *deployed* engine's wait-budget and retry settings are (repo defaults only);
  whether a published v9 migration guide exists outside this repo; whether preview.6 entries survive
  to GA.

---

## 2. Where the copy lives

The copy is not duplicated here, because a second copy drifts. Slide text is in `src/slides/*.tsx`,
the scenario scripts are in `src/sims/scenarios.ts`, and the spoken notes are the `notes` fields in
`src/slides/index.ts`, collected in `NOTES.md`. Every claim in them traces back to section 1.

> Tone: trygg, varm, ikke nedlatende. Ingen «revolusjonerende», «game changer», «sømløs». Ingen
> interne navn på scenen: ikke pod, forespørsel, transaksjon, lås, Postgres eller statuskoder. Bruk
> *arkivintegrasjon*, aldri produktnavn.

---

## 3. Ordliste

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
