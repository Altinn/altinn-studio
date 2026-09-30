# Workflow engine wire-contract drift guard

The workflow engine and the Altinn app backend (`Altinn.App.Core`, shipped as a NuGet package)
exchange data only over HTTP/JSON. The engine **owns** the contract; the app keeps its own curated,
internal copies of the request/response models rather than taking a binary dependency on the engine.

This folder holds the machinery that keeps those two model sets from drifting apart, without coupling
the two builds or shipping an engine DLL in the app's NuGet package.

## How it works

```
engine canonical types  ──describe──▶  wire-contract.verified.json  ◀──compare──  app curated copies
   (this project)                          (committed artifact)              (Altinn.App.Core.Tests)
```

- **`WireContract.cs`** — a shared, framework-agnostic reflection describer. It reduces a set of DTO
  types to a normalized, language-neutral description of their JSON wire shapes (property names,
  normalized kinds, nullability), deliberately ignoring CLR namespaces, accessibility, methods, and
  wire-equivalent converter differences (e.g. `JsonStringEnumConverter` vs `FlexibleEnumConverter`).
  This file is also compiled (as a linked source) into `Altinn.App.Core.Tests`.

- **`wire-contract.verified.json`** — the committed, canonical description of the engine contract.
  This is the single source of truth that both repositories check against.

- **`EngineWireContractTests`** (this project) — reflects over the engine's **real** types and asserts
  they still match `wire-contract.verified.json`. This keeps the committed artifact honest to the
  engine.

- **`AppWireContractTests`** (in `Altinn.App.Core.Tests`) — reflects over the app's curated copies and
  asserts they remain **compatible** with the committed artifact. The embedded copy of the JSON is
  pulled directly from this folder at build time.

The app check is directional (the app is a consumer, not a mirror): every field the app models must
exist on the engine with the same shape, and every non-nullable engine field must be modeled by the
app — but the app may omit optional engine fields and engine-only response variants.

## When the engine contract changes

1. Change the engine model(s).
2. Regenerate the snapshot:
   ```
   UPDATE_WIRE_CONTRACT=1 dotnet test --filter FullyQualifiedName~EngineWireContractTests
   ```
3. Review the `wire-contract.verified.json` diff and commit it.
4. Reconcile the app's copies in
   `src/App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/Models/` until `AppWireContractTests`
   passes again.

Because the committed JSON is in `app-backend-tests.yml`'s path triggers, an engine contract change
runs the app-side test too, so incompatibilities surface in the same PR.
