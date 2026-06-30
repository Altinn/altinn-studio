# Unified Storage client (replace InstanceClient and DataClient)

- Status: Proposed
- Deciders: App libraries maintainers
- Date: 2026-06-30

## Result

Introduce a single `IStorageClient` / `StorageClient` that replaces `IInstanceClient` and
`IDataClient`. The new client is organized into resource sub-areas — `Instances`, `Data`,
`Events`, `Locks` — and is the low-level transport workhorse beneath
`IInstanceDataMutator` / `IInstanceDataAccessor`. Signing and process remain in their own
feature clients. The change is a hard cut in v9 (no binary-compatibility shims or `[Obsolete]`
forwarders), enabled by the move from the external v8 package to the v9 monorepo release.

## Problem context

`IInstanceClient` and `IDataClient` are the HTTP wrappers over the Altinn Platform **Storage**
service. Over multiple v8.x releases they accreted layers of cruft that the
binary-compatibility rules (Core interfaces must never remove a method within a major version)
prevented us from removing:

- **Doubled surface from binary-compat shims.** Nearly every method exists twice — a "full"
  signature `(…, StorageAuthenticationMethod? = null, CancellationToken = default)` plus a
  default-interface-implementation overload that drops both and forwards. Roughly half of
  `IInstanceClient` is forwarding shims.
- **Layers of `[Obsolete]` signatures** carrying unused `org`/`app` parameters, a redundant
  `Type` parameter, or `HttpRequest`-based bodies — all superseded by `Instance`- and
  `Stream`-based overloads. Survey of non-test code confirms **zero production callers** of any
  obsolete overload.
- **Deferred null hacks.** `GetBinaryData` returns `null!` on 404; `UpdateReadStatus` returns
  `null` on failure via `#nullable disable`; several `JsonConvert.DeserializeObject<…>(…)!`
  null-forgiving casts — all carrying `// TODO: fix in next major` comments.
- **Inconsistencies.** `InstanceClient` is `internal` with explicit DI; `DataClient` is `public`
  with an `IServiceProvider` service-locator constructor.

Separately, the codebase has matured two assets the new client should lean on:

- **`IInstanceDataMutator` / `IInstanceDataAccessor`** (impl `InstanceDataUnitOfWork`) is now the
  preferred *consumer-facing* API for apps (unit-of-work caching + change tracking). It already
  sits *on top of* these clients. The new client must serve as its transport layer, not compete
  with it as a second data API.
- **Typed identifiers** — `AppIdentifier`, `InstanceIdentifier`, `DataElementIdentifier` — are
  widely used (≈99 / 166 / 137 usages in Core) and should replace the
  `(string org, string app, int partyId, Guid instanceGuid, Guid dataId)` parameter soup at the
  client boundary.

The v8→v9 transition (first release in the monorepo) is the moment we are allowed to make
breaking changes, so we can finally collapse and clean this up.

## Decision drivers

- B1: Remove all obsolete/dead/shim surface that binary-compat previously forced us to keep.
- B2: One cohesive, discoverable client instead of two overlapping, confused ones.
- B3: Strongly-typed identifiers and DTOs at the boundary; no leaking `HttpRequest`/`HttpResponseMessage`.
- B4: Consistent error behavior (throw on non-success — never return `null`).
- B5: Keep the new client as a *transport* layer; do not duplicate the mutator/accessor role.
- B6: Draw the scope boundary on a defensible principle, not on coincidental URL structure.

## Scope principle

The dividing line is **generic persistence primitive vs. domain operation**, *not* "is the route
under `/instances/{id}/…`".

- **In scope — generic persistence/coordination primitives** that only have meaning at the
  storage boundary: instance metadata CRUD, data elements, instance events, and locking.
- **Out of scope — domain/feature operations** that own a subsystem and a domain model:
  - **Signing** (`SignClient`, POSTs `/instances/{id}/sign`): a business act with `SignatureContext`
    (signee, per-element signatures, generated-from-task), returns `void`. It is the transport arm
    of `Features/Signing`. Being instance-scoped is incidental to Storage's routing.
  - **Process** (`ProcessClient`): a feature client; its `GetProcessDefinition` reads the app's
    BPMN off local disk (`File.OpenRead`) and is not a Storage HTTP call at all.

Application metadata and texts (`ApplicationClient`, `TextClient`) are app-scoped (`/applications/…`)
and excluded for the same reason; `TextClient` is additionally already deprecated.

## Decided scope

`IStorageClient` =

| Sub-area    | Replaces                              | Notes |
|-------------|---------------------------------------|-------|
| `Instances` | `InstanceClient` / `IInstanceClient`  | metadata, status, process+events persistence |
| `Data`      | `DataClient` / `IDataClient`          | form + binary data elements, data-element lock/unlock |
| `Events`    | `InstanceEventClient`                 | instance event log (low current usage — verify) |
| `Locks`     | `InstanceLockClient`                  | instance-level lock token (currently `internal`) |

Sign and Process stay as their own clients. Shared HTTP plumbing (base address, subscription-key
header, `IAuthenticationTokenResolver`, lock-token, `PlatformHttpException`) is factored into a
shared `StorageTransportBase` so the feature clients dedupe the transport without merging.

## Alternatives considered

- **A — Instance + Data only.** Merge just the two messy clients. Smallest blast radius, but the
  boundary ("just these two") is arbitrary and leaves obviously-related events/locks outside.
- **A+ — everything instance-scoped (incl. Signing).** Draw the line at the `/instances/{id}/…`
  URL prefix. Rejected: route-adjacency is a weak signal; it drags signing (a domain feature) into
  a transport client.
- **B — unify all 8 Storage clients** into one `IStorageClient`. Rejected: pulls in app-scoped
  Application/Text and dead code, and risks a god-class; the six siblings are tiny and already clean.
- **Chosen — principled aggregate** (Instances · Data · Events · Locks): the instance and the
  generically-persisted/coordinated resources under it, by the persistence-vs-domain test (B6).

### Naming alternatives

- **`IStorageClient` (chosen).** Named after the Storage service it wraps — the right mental model
  for its platform-aware, primarily-internal audience. The resource sub-areas
  (`storage.Instances`, `storage.Data`) carry scope, so the top-level name should not re-encode it.
- **`IInstanceStorageClient`.** Precise but redundant against the `.Instances` sub-area
  (`instanceStorage.Instances…`) and implies a family of storage clients that will not exist.
- **`IInstanceRepository`.** Breaks the existing `*Client` convention and "Repository" misleadingly
  implies a local store rather than an HTTP client.

Caveat to neutralize in XML docs: `StorageClient` is not literally the only client hitting the
Storage endpoint (Sign/Process do too). The doc comment will state it is the central Storage client
and that signing/process are deliberate feature-client exceptions.

## Migration

v9 is a **hard cut** — first release in the monorepo, breaking changes allowed:

1. Build `IStorageClient` / `StorageClient` (+ `StorageTransportBase`).
2. Delete `IInstanceClient`, `IDataClient`, `InstanceEventClient`, `InstanceLockClient` (and their
   interfaces). No `[Obsolete]` forwarders.
3. Migrate all internal callers in the same change (≈28 files for instance/data, plus the mutator's
   8 delegations). The compiler enforces completeness.
4. Repoint `InstanceDataUnitOfWork` at the new client.
5. Update the one behavioral dependant: `DataService.cs` currently relies on `GetBinaryData`
   returning `null` on 404 — switch it to catch/rethrow once the client throws.
6. **External apps** are upgraded out-of-band by the studioctl upgrade scripts at
   `src/cli/studioctl-server/Studioctl/Upgrade/` (organized by version jump, e.g. `v8Tov9/`). The
   old→new signature mapping below is the input for that codemod.

### Cross-cutting cleanups (all enabled by the hard cut)

- Typed identifiers (`InstanceIdentifier`, `DataElementIdentifier`) replace org/app/guid soup.
- Throw `PlatformHttpException` on every non-success; remove all `null` returns and `null!` casts.
- Drop all `[Obsolete]` overloads, all no-auth/no-ct shims, and dead methods
  (`GetBinaryDataList`, `DeleteBinaryData`, `UpdateProcess`, `UpdateDataValue`-convenience).
- Keep `GetBinaryDataStream` and consider making it the primary binary read (newest method,
  streaming-friendly, 0 current callers = not-yet-wired, not dead) — confirm intent.
- No `HttpRequest`/`HttpResponseMessage` across the boundary; `…Request`/`…Response` DTOs per AGENTS.md.

### Old → new signature mapping (for the upgrade codemod)

`Instances`:

| Old (`IInstanceClient`)        | New (`storage.Instances.…`)       |
|--------------------------------|-----------------------------------|
| `GetInstance(app,org,party,guid)` / `GetInstance(Instance)` | `Get(InstanceIdentifier)` |
| `GetInstances(queryParams)`    | `Query(queryParams)`              |
| `CreateInstance(org,app,template)` | `Create(AppIdentifier, template)` |
| `DeleteInstance(party,guid,hard)` | `Delete(InstanceIdentifier, hard)` |
| `UpdateReadStatus(...)`        | `UpdateReadStatus(InstanceIdentifier, status)` (now throws) |
| `UpdateSubstatus(...)`         | `UpdateSubstatus(InstanceIdentifier, substatus)` |
| `UpdatePresentationTexts(...)` | `UpdatePresentationTexts(InstanceIdentifier, texts)` |
| `UpdateDataValues(...)`        | `UpdateDataValues(InstanceIdentifier, values)` |
| `AddCompleteConfirmation(...)` | `AddCompleteConfirmation(InstanceIdentifier)` |
| `UpdateProcessAndEvents(...)`  | `UpdateProcessAndEvents(Instance, events)` |
| `UpdateProcess(...)`           | **removed** (0 callers) |
| `UpdateDataValue(...)` convenience | **removed** (0 callers) |

`Data`:

| Old (`IDataClient`)            | New (`storage.Data.…`)            |
|--------------------------------|-----------------------------------|
| `GetBinaryData(party,guid,dataId)` | `GetBinary(InstanceIdentifier, DataElementIdentifier)` (now throws on 404) |
| `GetBinaryDataStream(...)`     | `GetBinaryStream(...)` (candidate primary read) |
| `GetDataBytes(...)`            | `GetBytes(...)`                   |
| `GetFormData(Instance, DataElement)` | `GetFormData(Instance, DataElement)` |
| `InsertBinaryData(instanceId, dataType, …, stream, …)` | `InsertBinary(InstanceIdentifier, dataType, …, stream, …)` |
| `InsertFormData(Instance, dataTypeId, obj)` | `InsertFormData(Instance, dataTypeId, obj)` |
| `UpdateBinaryData(InstanceIdentifier, …, dataGuid, stream)` | `UpdateBinary(InstanceIdentifier, …, DataElementIdentifier, stream)` |
| `UpdateFormData(Instance, obj, DataElement)` | `UpdateFormData(Instance, obj, DataElement)` |
| `Update(Instance, DataElement)` | `UpdateMetadata(Instance, DataElement)` |
| `DeleteData(party,guid,dataGuid,delay)` | `Delete(InstanceIdentifier, DataElementIdentifier, delay)` |
| `LockDataElement(...)` / `UnlockDataElement(...)` | `Lock(...)` / `Unlock(...)` |
| `GetBinaryDataList(...)`       | **removed** (0 callers) |
| `DeleteBinaryData(...)`        | **removed** (already `Obsolete(error)`) |
| all `[Obsolete]` org/app/Type/HttpRequest overloads | **removed** (0 callers) |

`Events` (from `InstanceEventClient`): `Get(...)`, `Save(...)`.
`Locks` (from `InstanceLockClient`): `Acquire(InstanceIdentifier, ttl)`, `Refresh(InstanceIdentifier, lockToken, ttl)`.

## Open questions

- `Locks` visibility: `InstanceLockClient` is currently `internal` and uses `IHttpClientFactory`
  (per-call client) rather than a shared injected `HttpClient`. Decide whether `storage.Locks` is
  public or internal-only, and reconcile the HttpClient lifecycle.
- Data-element lock (`/data/{id}/lock`) lives under `Data`; instance lock (`/lock`) under `Locks`.
  Confirm that split reads well.
- Confirm `GetBinaryDataStream` direction before finalizing the binary-read surface.
- Verify true `Events` usage (survey suggested very few non-test consumers).
