# Workflow engine wire contract

The engine and the app backend exchange JSON over HTTP, and the engine owns the contract. The app backend ships as a
NuGet package, so it keeps its own internal copies of the models instead of depending on an engine DLL. These tests
keep the two sets of models from drifting apart without coupling the builds.

[`wire-contract.verified.json`](wire-contract.verified.json) describes the contract's JSON shapes. `WireContract.cs`
produces the description and ignores what does not change the JSON, such as namespaces and equivalent converters.
`EngineWireContractTests` here checks the engine's types against the file. `AppWireContractTests` in
`Altinn.App.Core.Tests` compiles in the same describer and checks the app's copies against it.

The app's check is directional, since the app consumes the contract rather than mirroring it. Every field the app
models must exist in the engine with the same shape, and the app must model every non-nullable engine field. The app
may leave out optional fields and responses it does not use.

When you change an engine model, regenerate the file with
`UPDATE_WIRE_CONTRACT=1 dotnet test --filter FullyQualifiedName~EngineWireContractTests`, review its diff, and update
the app's copies in [`Altinn.App.Core`](../../../../../App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/Models)
until `AppWireContractTests` passes. The app backend's workflow runs on a change to the file, so the pull request shows
an incompatibility.
